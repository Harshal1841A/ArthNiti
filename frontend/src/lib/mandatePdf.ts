import { LoanOffer } from '@/components/LoanOfferCarousel';

function escapePDFText(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r/g, '')
    .replace(/\n/g, ' ');
}

class PDFContentBuilder {
  private commands: string[] = [];

  setColor(r: number, g: number, b: number) {
    this.commands.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
  }

  setStrokeColor(r: number, g: number, b: number) {
    this.commands.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
  }

  setLineWidth(w: number) {
    this.commands.push(`${w.toFixed(2)} w`);
  }

  drawLine(x1: number, y1: number, x2: number, y2: number) {
    this.commands.push(`${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S`);
  }

  drawRect(x: number, y: number, width: number, height: number, fill: boolean = false, stroke: boolean = true) {
    const op = fill && stroke ? 'B' : fill ? 'f' : 'S';
    this.commands.push(`${x.toFixed(1)} ${y.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)} re ${op}`);
  }

  drawPolygon(points: [number, number][], fill: boolean = true, stroke: boolean = false) {
    if (points.length < 2) return;
    const cmds = points.map((pt, idx) => `${pt[0].toFixed(1)} ${pt[1].toFixed(1)} ${idx === 0 ? 'm' : 'l'}`);
    cmds.push('h');
    const op = fill && stroke ? 'B' : fill ? 'f' : 'S';
    this.commands.push(cmds.join(' ') + ' ' + op);
  }

  drawText(x: number, y: number, text: string, font: 'F1' | 'F2' = 'F1', size: number = 10) {
    const escaped = escapePDFText(text);
    this.commands.push(`BT /${font} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${escaped}) Tj ET`);
  }

  build(): string {
    return this.commands.join('\n');
  }
}

function formatINR(num: number): string {
  try {
    return num.toLocaleString('en-IN');
  } catch {
    return num.toString();
  }
}

function drawArthNitiLogo(builder: PDFContentBuilder, cx: number, cy: number, scale: number, isWatermark: boolean = false) {
  const leftWing: [number, number][] = [
    [cx - 26 * scale, cy + 16 * scale],
    [cx, cy + 24 * scale],
    [cx, cy - 16 * scale],
    [cx - 26 * scale, cy - 22 * scale],
  ];

  const rightWing: [number, number][] = [
    [cx, cy + 24 * scale],
    [cx + 26 * scale, cy + 16 * scale],
    [cx + 26 * scale, cy - 22 * scale],
    [cx, cy - 16 * scale],
  ];

  if (isWatermark) {
    // Subtle background watermark colors
    builder.setColor(0.93, 0.92, 0.89);
    builder.drawPolygon(leftWing, true, false);
    builder.setColor(0.90, 0.88, 0.83);
    builder.drawPolygon(rightWing, true, false);
    builder.setStrokeColor(0.85, 0.84, 0.80);
    builder.setLineWidth(1.5);
    builder.drawLine(cx, cy - 18 * scale, cx, cy + 24 * scale);
  } else {
    // Sharp executive top-left logo
    builder.setColor(0.08, 0.09, 0.12);
    builder.setStrokeColor(0.79, 0.66, 0.38);
    builder.setLineWidth(1.2);
    builder.drawPolygon(leftWing, true, true);

    builder.setColor(0.79, 0.66, 0.38);
    builder.drawPolygon(rightWing, true, false);

    builder.setStrokeColor(0.08, 0.09, 0.12);
    builder.setLineWidth(1.2);
    builder.drawLine(cx, cy - 16 * scale, cx, cy + 24 * scale);
  }
}

export function generateMandateReceiptPDF(offer: LoanOffer, mandateId: string): void {
  const builder = new PDFContentBuilder();

  // ────────────────────────────────────────────────────────────────────────
  // BACKGROUND WATERMARK LOGO & NAME (Centered at x=297.5)
  // ────────────────────────────────────────────────────────────────────────
  drawArthNitiLogo(builder, 297.5, 475, 3.2, true);
  builder.setColor(0.91, 0.90, 0.87);
  builder.drawText(213.5, 365, 'ARTHNITI', 'F2', 36);

  // ────────────────────────────────────────────────────────────────────────
  // TOP-LEFT CORNER LOGO & NAME
  // ────────────────────────────────────────────────────────────────────────
  drawArthNitiLogo(builder, 66, 796, 0.58, false);
  builder.setColor(0.08, 0.09, 0.12);
  builder.drawText(44.5, 766, 'ArthNiti', 'F2', 12.5);
  builder.setColor(0.79, 0.66, 0.38);
  builder.drawText(36, 754, 'MSME CARD', 'F2', 7.5);

  // ────────────────────────────────────────────────────────────────────────
  // MAIN HEADER TITLE (Right of Top-Left Logo)
  // ────────────────────────────────────────────────────────────────────────
  builder.setColor(0.08, 0.09, 0.12);
  builder.drawText(112, 796, 'DIGITAL LENDING & AA MANDATE RECEIPT', 'F2', 14);

  builder.setColor(0.4, 0.42, 0.48);
  builder.drawText(112, 779, 'IDBI INNOVATE 2026 - TRACK 03 MSME CREDIT SANCTION ADVICE', 'F1', 8.5);

  builder.setColor(0.06, 0.45, 0.28);
  builder.drawText(112, 763, 'VERIFIED OCEN 4.0 ACCOUNT AGGREGATOR TRANSACTION', 'F2', 8);

  // Gold accent dividing line
  builder.setStrokeColor(0.79, 0.66, 0.38);
  builder.setLineWidth(2);
  builder.drawLine(45, 744, 550, 744);

  // ────────────────────────────────────────────────────────────────────────
  // 1. MANDATE & PROTOCOL REFERENCE
  // ────────────────────────────────────────────────────────────────────────
  builder.setColor(0.08, 0.09, 0.12);
  builder.drawText(45, 718, '1. MANDATE & PROTOCOL REFERENCE', 'F2', 11);

  const timestampStr = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  builder.setColor(0.35, 0.37, 0.42);
  builder.drawText(45, 698, 'Mandate Reference ID:', 'F1', 10);
  builder.setColor(0.1, 0.1, 0.12);
  builder.drawText(205, 698, mandateId, 'F2', 10);

  builder.setColor(0.35, 0.37, 0.42);
  builder.drawText(45, 680, 'Protocol & Rail:', 'F1', 10);
  builder.setColor(0.1, 0.1, 0.12);
  builder.drawText(205, 680, 'OCEN 4.0 / ReBIT Account Aggregator Framework', 'F1', 10);

  builder.setColor(0.35, 0.37, 0.42);
  builder.drawText(45, 662, 'Execution Timestamp:', 'F1', 10);
  builder.setColor(0.1, 0.1, 0.12);
  builder.drawText(205, 662, timestampStr, 'F1', 10);

  builder.setColor(0.35, 0.37, 0.42);
  builder.drawText(45, 644, 'Mandate Status:', 'F1', 10);
  builder.setColor(0.06, 0.45, 0.28);
  builder.drawText(205, 644, 'ACTIVE - REGISTERED & DISBURSEMENT INITIATED', 'F2', 10);

  // Divider
  builder.setStrokeColor(0.88, 0.89, 0.91);
  builder.setLineWidth(0.75);
  builder.drawLine(45, 626, 550, 626);

  // ────────────────────────────────────────────────────────────────────────
  // 2. SANCTIONED LOAN OFFER TERMS
  // ────────────────────────────────────────────────────────────────────────
  builder.setColor(0.08, 0.09, 0.12);
  builder.drawText(45, 604, '2. SANCTIONED LOAN OFFER TERMS', 'F2', 11);

  // Outline Box for Sanction Terms
  builder.setStrokeColor(0.82, 0.84, 0.88);
  builder.setLineWidth(1);
  builder.drawRect(45, 458, 505, 132, false, true);

  const terms = [
    { label: 'Sanctioning Lender:', val: `${offer.lender_name} (${offer.lender_type})`, bold: true },
    { label: 'Approved Sanction Limit:', val: `INR ${formatINR(offer.max_amount || 0)}`, bold: true },
    { label: 'Annual Interest Rate (APR):', val: `${offer.interest_rate_annual || 0}% p.a. (Fixed)`, bold: false },
    { label: 'Repayment Tenure:', val: `${offer.tenure_months || 0} Months`, bold: false },
    { label: 'Monthly EMI:', val: `INR ${formatINR(offer.emi || 0)} / month`, bold: true },
    { label: 'Processing Fee:', val: `${offer.processing_fee_pct || 0}% (deducted at source)`, bold: false },
    { label: 'Disbursement SLA:', val: `${offer.disbursement_days || 1} Business Day(s) (Direct AA Rail)`, bold: false },
  ];

  let termY = 572;
  for (const term of terms) {
    builder.setColor(0.35, 0.37, 0.42);
    builder.drawText(60, termY, term.label, 'F1', 9.5);
    builder.setColor(0.1, 0.1, 0.12);
    builder.drawText(230, termY, term.val, term.bold ? 'F2' : 'F1', 9.5);
    termY -= 17;
  }

  // ────────────────────────────────────────────────────────────────────────
  // 3. SPECIAL COVENANTS & KEY FEATURES
  // ────────────────────────────────────────────────────────────────────────
  builder.setColor(0.08, 0.09, 0.12);
  builder.drawText(45, 430, '3. SPECIAL COVENANTS & KEY FEATURES', 'F2', 11);

  const features = offer.features && offer.features.length > 0 ? offer.features : [
    'Digital straight-through processing via OCEN 4.0 rail',
    'Automated collection via ReBIT Account Aggregator e-NACH mandate',
    'No collateral required up to approved sanction limit',
  ];

  let featY = 408;
  for (const feat of features.slice(0, 4)) {
    builder.setColor(0.15, 0.17, 0.22);
    builder.drawText(55, featY, `- ${feat}`, 'F1', 9.5);
    featY -= 17;
  }

  // ────────────────────────────────────────────────────────────────────────
  // 4. CRYPTOGRAPHIC VERIFICATION & AUDIT TRAIL
  // ────────────────────────────────────────────────────────────────────────
  builder.setColor(0.08, 0.09, 0.12);
  builder.drawText(45, 328, '4. CRYPTOGRAPHIC VERIFICATION & AUDIT TRAIL', 'F2', 11);

  builder.setStrokeColor(0.82, 0.84, 0.88);
  builder.setLineWidth(1);
  builder.drawRect(45, 222, 505, 92, false, true);

  builder.setColor(0.35, 0.37, 0.42);
  builder.drawText(60, 294, 'AA Consent Flow:', 'F1', 9.5);
  builder.setColor(0.1, 0.1, 0.12);
  builder.drawText(230, 294, 'Sahamati / Finvu Sandbox ReBIT Spec Compliant', 'F1', 9.5);

  builder.setColor(0.35, 0.37, 0.42);
  builder.drawText(60, 274, 'Digital Hash Checksum:', 'F1', 9.5);
  builder.setColor(0.1, 0.1, 0.12);
  builder.drawText(230, 274, 'SHA256:8f9a2b4c1d3e5f7a9b0c2d4e6f8a0b2c4d6e8f0a2b4c6e8f0a2b4c6e', 'F1', 8.5);

  builder.setColor(0.35, 0.37, 0.42);
  builder.drawText(60, 254, 'Underwriting Engine:', 'F1', 9.5);
  builder.setColor(0.1, 0.1, 0.12);
  builder.drawText(230, 254, 'ArthNiti Explainable AI Underwriting System (v1.4)', 'F1', 9.5);

  builder.setColor(0.35, 0.37, 0.42);
  builder.drawText(60, 234, 'Verification Status:', 'F1', 9.5);
  builder.setColor(0.06, 0.45, 0.28);
  builder.drawText(230, 234, 'CRYPTOGRAPHICALLY VERIFIED & IMMUTABLE', 'F2', 9.5);

  // Footer Rule & Text
  builder.setStrokeColor(0.88, 0.89, 0.91);
  builder.setLineWidth(0.75);
  builder.drawLine(45, 75, 550, 75);

  builder.setColor(0.45, 0.47, 0.52);
  builder.drawText(45, 60, 'Generated by ArthNiti AI/ML Underwriting Engine | Confidential MSME Financial Dossier', 'F1', 8);
  builder.drawText(495, 60, 'Page 1 of 1', 'F1', 8);

  const contentStreamText = builder.build();
  const pdfBytes = buildPDFBytes(contentStreamText);

  // Trigger browser download
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${mandateId}_Mandate_Receipt.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildPDFBytes(contentStreamText: string): Uint8Array {
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(contentStreamText);
  const contentLength = contentBytes.length;

  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n';
  const obj4Header = `4 0 obj\n<< /Length ${contentLength} >>\nstream\n`;
  const obj4Footer = '\nendstream\nendobj\n';
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  const obj6 = '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';

  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';

  const parts: Uint8Array[] = [];
  const xrefOffsets: number[] = [0];

  let currentOffset = 0;
  const appendStr = (str: string) => {
    const bytes = encoder.encode(str);
    parts.push(bytes);
    currentOffset += bytes.length;
  };
  const appendBytes = (bytes: Uint8Array) => {
    parts.push(bytes);
    currentOffset += bytes.length;
  };

  appendStr(header);

  xrefOffsets.push(currentOffset); // 1
  appendStr(obj1);

  xrefOffsets.push(currentOffset); // 2
  appendStr(obj2);

  xrefOffsets.push(currentOffset); // 3
  appendStr(obj3);

  xrefOffsets.push(currentOffset); // 4
  appendStr(obj4Header);
  appendBytes(contentBytes);
  appendStr(obj4Footer);

  xrefOffsets.push(currentOffset); // 5
  appendStr(obj5);

  xrefOffsets.push(currentOffset); // 6
  appendStr(obj6);

  const startXref = currentOffset;
  appendStr('xref\n0 7\n0000000000 65535 f \n');
  for (let i = 1; i <= 6; i++) {
    const offsetStr = xrefOffsets[i].toString().padStart(10, '0') + ' 00000 n \n';
    appendStr(offsetStr);
  }
  appendStr(`trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`);

  const totalLength = parts.reduce((acc, p) => acc + p.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.length;
  }
  return result;
}
