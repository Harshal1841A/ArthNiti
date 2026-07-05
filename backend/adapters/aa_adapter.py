"""ArthNiti — AA Adapter: FIU-side integration against Finvu sandbox.

Consent flow follows Sahamati's actual artifact model: purpose-limited,
time-bound, revocable. Dummy accounts ONLY per Sahamati UAT rules.

FIXED (v1.3 audit): map_to_normalized_schema is now IMPLEMENTED against
ReBIT DEPOSIT schema structure, computing all features including the
new payment_time_consistency_score via circular statistics.
"""

import base64
import json
import logging
import math
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

import httpx
from pydantic import BaseModel

from backend.config import get_settings
from backend.core.feature_schema import DataSourceType, NormalizedApplicantFeatures

if TYPE_CHECKING:
    from jwcrypto import jwk

_settings = get_settings()
logger = logging.getLogger(__name__)

FINVU_BASE = _settings.FINVU_SANDBOX_BASE


# ---------------------------------------------------------------------------
# Consent models
# ---------------------------------------------------------------------------
class ConsentRequest(BaseModel):
    applicant_id: str
    fi_types: list[str]
    purpose: str
    purpose_code: str
    data_range_from: datetime
    data_range_to: datetime
    consent_expiry: datetime


# ---------------------------------------------------------------------------
# Consent flow
# ---------------------------------------------------------------------------
async def request_consent(req: ConsentRequest) -> dict:
    """Call AA /Consent API. Returns consent handle for applicant approval."""
    async with httpx.AsyncClient(base_url=FINVU_BASE, timeout=30.0) as client:
        resp = await client.post(
            "/Consent",
            json=req.model_dump(mode="json"),
        )
        resp.raise_for_status()
        return resp.json()


async def poll_consent_status(consent_handle: str) -> str:
    """Returns PENDING | ACTIVE | REJECTED | REVOKED | EXPIRED."""
    async with httpx.AsyncClient(base_url=FINVU_BASE, timeout=10.0) as client:
        resp = await client.get(f"/Consent/{consent_handle}/status")
        resp.raise_for_status()
        return resp.json()["status"]


async def fetch_financial_data(consent_handle: str) -> dict:
    """Call AA Data Flow API once consent is ACTIVE.

    Returns decrypted FI data. Never logs decrypted payload.
    """
    async with httpx.AsyncClient(base_url=FINVU_BASE, timeout=30.0) as client:
        resp = await client.post(
            "/FI/fetch",
            json={"consentHandle": consent_handle},
        )
        resp.raise_for_status()
        encrypted = resp.json()
        return decrypt_fi_payload(encrypted)


# ---------------------------------------------------------------------------
# JWE decryption
# ---------------------------------------------------------------------------
def decrypt_fi_payload(encrypted_payload: dict) -> dict:
    """Decrypt AA JWE-encrypted FI data using FIU's ECDH private key.

    Requires:
        1. FIU ECDH P-256 private key in FIU_PRIVATE_KEY_JWK env var.
        2. jwcrypto library.

    VERIFY: inspect the JWE header of the first real sandbox response to
    confirm alg="ECDH-ES" and enc="A256GCM" before relying on this.
    """
    from jwcrypto import jwk, jwe as jwe_lib

    fiu_key_json = _settings.FIU_PRIVATE_KEY_JWK
    if not fiu_key_json:
        raise EnvironmentError(
            "FIU_PRIVATE_KEY_JWK not set. Generate keys with scripts/generate_fiu_keys.py"
        )

    fiu_key = jwk.JWK.from_json(fiu_key_json)

    jwe_token = encrypted_payload.get("fiObjects") or encrypted_payload.get("FIObjects")
    if not jwe_token:
        raise ValueError(
            f"Unexpected AA response shape — no fiObjects key. "
            f"Keys present: {list(encrypted_payload.keys())}"
        )

    if isinstance(jwe_token, list):
        decrypted_items = []
        for token in jwe_token:
            token_str = token if isinstance(token, str) else json.dumps(token)
            decrypted_items.append(_decrypt_single_jwe(token_str, fiu_key))
        return {"fiItems": decrypted_items}

    token_str = jwe_token if isinstance(jwe_token, str) else json.dumps(jwe_token)
    return _decrypt_single_jwe(token_str, fiu_key)


def _decrypt_single_jwe(token_str: str, fiu_key: "jwk.JWK") -> dict:
    from jwcrypto import jwe as jwe_lib

    # Log header for verification (sandbox only, never production)
    try:
        header_b64 = token_str.split(".")[0]
        header = json.loads(
            base64.urlsafe_b64decode(header_b64 + "==")
        )
        logger.info(f"JWE header from sandbox: {header}")
    except Exception:
        pass

    token = jwe_lib.JWE()
    token.deserialize(token_str, key=fiu_key)
    plaintext = token.payload.decode("utf-8")
    return json.loads(plaintext)


# ---------------------------------------------------------------------------
# Feature extraction from ReBIT DEPOSIT data
# ---------------------------------------------------------------------------
def map_to_normalized_schema(
    fi_data: dict, applicant_id: str, had_bureau_record: bool = False
) -> NormalizedApplicantFeatures:
    """Translate ReBIT DEPOSIT FI-Type data into NormalizedApplicantFeatures.

    This is implemented against the ReBIT DEPOSIT schema structure.
    VERIFY against real Finvu sandbox responses before claiming correctness.

    ReBIT DEPOSIT schema (simplified):
        {
          "account": {
            "type": "DEPOSIT",
            "transactions": [
              {
                "txnId": "...",
                "txnDate": "2024-01-15T18:30:00+05:30",
                "txnType": "CREDIT" | "DEBIT",
                "amount": 15000.0,
                "narration": "...",
                "mode": "UPI" | "NEFT" | ...
              },
              ...
            ]
          }
        }
    """
    items = fi_data.get("fiItems", [fi_data])
    if not items:
        items = [fi_data]

    all_transactions = []
    for item in items:
        account = item.get("account", item)
        txs = account.get("transactions", account.get("transaction", []))
        if isinstance(txs, dict):
            txs = [txs]
        all_transactions.extend(txs)

    if not all_transactions:
        return NormalizedApplicantFeatures(
            applicant_id=applicant_id,
            data_sources_used=[DataSourceType.AA_BANK_STATEMENT],
            had_bureau_record=had_bureau_record,
            data_completeness_pct=0.0,
        )

    # Parse dates and amounts
    credits = []
    debits = []
    balances = []
    valid_dates = []
    for tx in all_transactions:
        amt = _parse_amount(tx.get("amount", tx.get("txnAmount", 0)))
        txn_type = tx.get("txnType", tx.get("type", "")).upper()
        txn_date = _parse_txn_date(tx.get("txnDate", tx.get("date", "")))
        if txn_date:
            valid_dates.append(txn_date)

        if txn_type == "CREDIT":
            credits.append({"amount": amt, "date": txn_date})
        elif txn_type == "DEBIT":
            debits.append({"amount": amt, "date": txn_date, "narration": tx.get("narration", "")})

        # Closing balance if present
        bal = tx.get("balance", tx.get("currentBalance"))
        if bal is not None:
            balances.append(_parse_amount(bal))

    latest_date = max(valid_dates) if valid_dates else None

    # Sort by date
    credits.sort(key=lambda x: x["date"] or datetime.min.replace(tzinfo=timezone.utc))

    # Compute features
    avg_inflow = _avg_monthly_inflow(credits)
    volatility = _inflow_volatility(credits)
    avg_balance = sum(balances) / len(balances) if balances else None
    neg_days = _days_with_negative_balance(all_transactions, latest_date)
    emi_ratio = _existing_emi_to_inflow_ratio(debits, avg_inflow)
    bounce_count = _bounce_count(all_transactions, latest_date)
    txn_count_30d = _txn_count_30d(all_transactions, latest_date)
    counterparties = _unique_counterparties(all_transactions, latest_date)
    pay_consistency = _payment_time_consistency(credits)

    # Consistent denominator: total features in FEATURE_ORDER
    from backend.core.scoring_engine import FEATURE_ORDER
    populated = sum(
        v is not None
        for v in [
            avg_inflow,
            volatility,
            avg_balance,
            neg_days,
            emi_ratio,
            bounce_count,
            txn_count_30d,
            counterparties,
            pay_consistency,
        ]
    )
    completeness = populated / len(FEATURE_ORDER)

    return NormalizedApplicantFeatures(
        applicant_id=applicant_id,
        data_sources_used=[DataSourceType.AA_BANK_STATEMENT],
        avg_monthly_inflow=avg_inflow,
        inflow_volatility_coefficient=volatility,
        avg_closing_balance=avg_balance,
        days_with_negative_balance_90d=neg_days,
        existing_emi_to_inflow_ratio=emi_ratio,
        bounce_count_90d=bounce_count,
        txn_count_30d=txn_count_30d,
        unique_counterparties_30d=counterparties,
        payment_time_consistency_score=pay_consistency,
        had_bureau_record=had_bureau_record,
        data_completeness_pct=completeness,
    )


# ---------------------------------------------------------------------------
# Helper computations
# ---------------------------------------------------------------------------
def _parse_amount(val) -> float:
    if val is None:
        return 0.0
    try:
        return float(val)
    except (TypeError, ValueError):
        return 0.0


def _parse_txn_date(date_str: str) -> datetime | None:
    if not date_str:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def _avg_monthly_inflow(credits: list[dict]) -> float | None:
    if not credits:
        return None
    # Group by month
    monthly = {}
    for c in credits:
        d = c["date"]
        if d is None:
            continue
        key = (d.year, d.month)
        monthly[key] = monthly.get(key, 0.0) + c["amount"]
    if not monthly:
        return None
    return sum(monthly.values()) / len(monthly)


def _inflow_volatility(credits: list[dict]) -> float | None:
    monthly = {}
    for c in credits:
        d = c["date"]
        if d is None:
            continue
        key = (d.year, d.month)
        monthly[key] = monthly.get(key, 0.0) + c["amount"]
    if len(monthly) < 2:
        return None
    vals = list(monthly.values())
    mean = sum(vals) / len(vals)
    if mean == 0:
        return None
    std = (sum((v - mean) ** 2 for v in vals) / len(vals)) ** 0.5
    return std / mean


def _days_with_negative_balance(transactions: list[dict], latest_date: datetime | None = None) -> int | None:
    cutoff = (latest_date - timedelta(days=90)) if latest_date else None
    neg = 0
    for tx in transactions:
        d = _parse_txn_date(tx.get("txnDate", tx.get("date", "")))
        if cutoff and d and d < cutoff:
            continue
        bal = tx.get("balance", tx.get("currentBalance"))
        if bal is not None and _parse_amount(bal) < 0:
            neg += 1
    return neg if neg > 0 else 0


def _existing_emi_to_inflow_ratio(debits: list[dict], avg_inflow: float | None) -> float | None:
    if not avg_inflow or avg_inflow <= 0:
        return None
    monthly_emi = {}
    for d in debits:
        narration = str(d.get("narration", "")).upper()
        if any(k in narration for k in ("EMI", "LOAN", "NACH", "AUTO DEBIT")):
            dt = d.get("date")
            key = (dt.year, dt.month) if dt else "unknown"
            monthly_emi[key] = monthly_emi.get(key, 0.0) + d["amount"]
    if not monthly_emi:
        return 0.0
    avg_monthly_emi = sum(monthly_emi.values()) / len(monthly_emi)
    ratio = avg_monthly_emi / avg_inflow
    return min(ratio, 1.0)


def _bounce_count(transactions: list[dict], latest_date: datetime | None = None) -> int | None:
    cutoff = (latest_date - timedelta(days=90)) if latest_date else None
    count = 0
    for tx in transactions:
        d = _parse_txn_date(tx.get("txnDate", tx.get("date", "")))
        if cutoff and d and d < cutoff:
            continue
        narration = str(tx.get("narration", "")).upper()
        if any(k in narration for k in ("BOUNCE", "RETURNED", "FAILED", "NACH RETURN")):
            count += 1
    return count


def _txn_count_30d(transactions: list[dict], latest_date: datetime | None = None) -> int | None:
    cutoff = (latest_date - timedelta(days=30)) if latest_date else (datetime.now(timezone.utc) - timedelta(days=30))
    count = 0
    for tx in transactions:
        d = _parse_txn_date(tx.get("txnDate", tx.get("date", "")))
        if d and d >= cutoff:
            count += 1
    return count


def _unique_counterparties(transactions: list[dict], latest_date: datetime | None = None) -> int | None:
    cutoff = (latest_date - timedelta(days=30)) if latest_date else None
    counterparties = set()
    for tx in transactions:
        d = _parse_txn_date(tx.get("txnDate", tx.get("date", "")))
        if cutoff and d and d < cutoff:
            continue
        narration = str(tx.get("narration", ""))
        parts = narration.split("/")
        for part in parts:
            part = part.strip()
            if "@" in part or len(part) > 5:
                counterparties.add(part)
                break
    return len(counterparties) if counterparties else None


def _payment_time_consistency(credits: list[dict]) -> float | None:
    """Compute circular std-dev of incoming payment timestamps.

    Returns 1 - normalized_circular_std, where higher = more consistent.
    """
    if len(credits) < 3:
        return None

    # Extract hour angles (0-2π)
    angles = []
    for c in credits:
        d = c["date"]
        if d is None:
            continue
        hour = d.hour + d.minute / 60.0
        angle = (hour / 24.0) * 2 * math.pi
        angles.append(angle)

    if len(angles) < 3:
        return None

    # Circular mean and std dev
    sin_sum = sum(math.sin(a) for a in angles)
    cos_sum = sum(math.cos(a) for a in angles)
    r = math.sqrt(sin_sum**2 + cos_sum**2) / len(angles)
    circ_std = math.sqrt(-2 * math.log(max(r, 1e-10)))
    normalized = circ_std / math.pi  # max possible is π
    return max(0.0, min(1.0, 1.0 - normalized))
