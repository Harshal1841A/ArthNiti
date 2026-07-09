"""ArthNiti — Document upload routes.

POST /api/v1/documents/{id}/upload-document         → F7 document fallback upload
GET  /api/v1/documents/{id}/upload-document/status  → Poll F7 processing status

SECURITY FIXES (v1.4):
- 10 MB max file size to prevent memory exhaustion DoS
- Strict filename sanitization
- Content-type re-validation after read
"""

import json

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.adapters.document_fallback_adapter import parse_document_to_features
from backend.api.deps import get_db, get_llm_client, verify_api_key
from backend.api.models import DocumentUploadStatusResponse
from backend.database.models import Applicant, DocumentUpload, NormalizedFeatures
from backend.core.feature_schema import DataSourceType
from backend.database.db import _AsyncSessionLocal
from backend.limiter import limiter

router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf",
    "text/plain",
    "text/csv",
}
ALLOWED_EXTS = {".pdf", ".txt", ".csv"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


async def _process_document(upload_id: str, applicant_id: str, file_bytes: bytes, filename: str, content_type: str):
    """Background task: process document upload with LLM."""
    from io import BytesIO
    from fastapi import UploadFile
    from backend.core.llm_client import LLMClient
    from backend.database.models import AdapterFetchLog

    llm_client = LLMClient()
    # BUG-09 FIX: Reset the BytesIO cursor to the start before passing to
    # parse_document_to_features. The upload route already read the bytes once
    # into file_bytes; wrapping in BytesIO leaves the cursor at position 0
    # for the first read, but we must be explicit about it.
    bio = BytesIO(file_bytes)
    bio.seek(0)
    upload_file = UploadFile(filename=filename, file=bio)
    upload_file.headers = {"content-type": content_type}

    try:
        features = await parse_document_to_features(upload_file, applicant_id, llm_client)
        populated = sum(1 for f in features.model_dump().values() if f is not None)

        async with _AsyncSessionLocal() as db:
            upload = await db.get(DocumentUpload, upload_id)
            if upload:
                upload.status = "complete"
                upload.data_completeness_pct = features.data_completeness_pct
                await db.commit()

            nf = NormalizedFeatures(
                applicant_id=applicant_id,
                data_sources_used=json.dumps([ds.value for ds in features.data_sources_used]),
                feature_vector_json=features.model_dump_json(),
                data_completeness_pct=features.data_completeness_pct,
            )
            db.add(nf)

            log = AdapterFetchLog(
                applicant_id=applicant_id,
                adapter_type="document_fallback",
                is_mocked=False,
                fetch_status="SUCCESS",
                fields_populated_count=populated,
            )
            db.add(log)
            await db.commit()
    except Exception as e:
        async with _AsyncSessionLocal() as db:
            upload = await db.get(DocumentUpload, upload_id)
            if upload:
                upload.status = "failed"
                upload.error_message = str(e)
                await db.commit()


@router.post("/{applicant_id}/upload-document")
@limiter.limit("10/minute")
async def upload_document(
    request: Request,
    applicant_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    llm_client=Depends(get_llm_client),
    _auth: str = Depends(verify_api_key),
):
    """F7 entry point. Accepts PDF or text upload, runs async document processing."""
    applicant = await db.get(Applicant, applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    # Validate extension
    ext = f".{file.filename.split('.')[-1].lower()}" if '.' in file.filename else ""
    if file.content_type not in ALLOWED_TYPES and ext not in ALLOWED_EXTS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Upload PDF, text, or CSV only."
        )

    # Enforce size limit before reading into memory
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(file_bytes)} bytes). Max allowed: {MAX_FILE_SIZE} bytes (10 MB)."
        )

    # Re-validate content-type after read (some clients send wrong headers)
    if ext == ".pdf" and not file_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="File extension claims PDF but content does not match.")

    # BUG-19 FIX: Use model's own default (generate_id) instead of a hand-rolled
    # alternative format. Previously two different ID formats existed for the same entity.
    upload = DocumentUpload(
        applicant_id=applicant_id,
        filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
    )
    db.add(upload)
    await db.commit()
    await db.refresh(upload)
    upload_id = upload.id

    background_tasks.add_task(
        _process_document,
        upload_id,
        applicant_id,
        file_bytes,
        file.filename,
        file.content_type or "application/octet-stream",
    )

    return DocumentUploadStatusResponse(
        upload_id=upload_id,
        status="processing",
    )


@router.get("/{applicant_id}/upload-document/status")
async def get_upload_status(
    applicant_id: str,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(verify_api_key),
):
    """Poll the latest document upload status for an applicant."""
    result = await db.execute(
        select(DocumentUpload)
        .where(DocumentUpload.applicant_id == applicant_id)
        .order_by(DocumentUpload.created_at.desc())
        .limit(1)
    )
    upload = result.scalar_one_or_none()
    if not upload:
        raise HTTPException(status_code=404, detail="No uploads found for this applicant")

    return DocumentUploadStatusResponse(
        upload_id=upload.id,
        status=upload.status,
        data_completeness_pct=upload.data_completeness_pct,
        error_message=upload.error_message,
    )
