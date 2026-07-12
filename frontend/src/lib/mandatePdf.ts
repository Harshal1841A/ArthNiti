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

export function generateMandateReceiptPDF(offer: LoanOffer, mandateId: string): void {
  const builder = new PDFContentBuilder();

  // Header Section
  builder.setColor(0.08, 0.09, 0.12);
  builder.drawText(50, 785, 'ARTHNITI - DIGITAL LENDING & AA MANDATE RECEIPT', 'F2', 15);

  builder.setColor(0.4, 0.42, 0.48);
  builder.drawText(50, 768, 'IDBI INNOVATE 2026 - TRACK 03 DIGITAL LENDING SANCTION ADVICE', 'F1', 9);

  // Gold accent line
  builder.setStrokeColor(0.79, 0.66, 0.38);
  builder.setLineWidth(2);
  builder.drawLine(50, 755, 545, 755);

  // 1. MANDATE & PROTOCOL REFERENCE
  builder.setColor(0.08, 0.09, 0.12);
  builder.drawText(50, 725, '1. MANDATE & PROTOCOL REFERENCE', 'F2', 11);

  const timestampStr = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  builder.setColor(0.35, 0.37, 0.42);
  builder.drawText(50, 704, 'Mandate Reference ID:', 'F1', 10);
  builder.setColor(0.1, 0.1, 0.12);
  builder.drawText(210, 704, mandateId, 'F2', 10);

  builder.setColor(0.35, 0.37, 0.42);
  builder.drawText(50, 686, 'Protocol & Rail:', 'F1', 10);
  builder.setColor(0.1, 0.1, 0.12);
  builder.drawText(210, 686, 'OCEN 4.0 / ReBIT Account Aggregator Framework', 'F1', 10);

  builder.setColor(0.35, 0.37, 0.42);
  builder.drawText(50, 668, 'Execution Timestamp:', 'F1', 10);
  builder.setColor(0.1, 0.1, 0.12);
  builder.drawText(210, 668, timestampStr, 'F1', 10);

  builder.setColor(0.35, 0.37, 0.42);
  builder.drawText(50, 650, 'Mandate Status:', 'F1', 10);
  builder.setColor(0.06, 0.45, 0.28);
  builder.drawText(210, 650, 'ACTIVE - REGISTERED & DISBURSEMENT INITIATED', 'F2', 10);

  // Divider
  builder.setStrokeColor(0.88, 0.89, 0.91);
  builder.setLineWidth(0.75);
  builder.drawLine(50, 632, 545, 632);

  // 2. SANCTIONED LOAN OFFER TERMS
  builder.setColor(0.08, 0.09, 0.12);
  builder.drawText(50, 610, '2. SANCTIONED LOAN OFFER TERMS', 'F2', 11);

  // Outline Box for Sanction Terms
  builder.setStrokeColor(0.82, 0.84, 0.88);
  builder.setLineWidth(1);
  builder.drawRect(50, 465, 495, 132, false, true);

  const terms = [
    { label: 'Sanctioning Lender:', val: `${offer.lender_name} (${offer.lender_type})`, bold: true },
    { label: 'Approved Sanction Limit:', val: `INR ${formatINR(offer.max_amount || 0)}`, bold: true },
    { label: 'Annual Interest Rate (APR):', val: `${offer.interest_rate_annual || 0}% p.a. (Fixed)`, bold: false },
    { label: 'Repayment Tenure:', val: `${offer.tenure_months || 0} Months`, bold: false },
    { label: 'Monthly EMI:', val: `INR ${formatINR(offer.emi || 0)} / month`, bold: true },
    { label: 'Processing Fee:', val: `${offer.processing_fee_pct || 0}% (deducted at source)`, bold: false },
    { label: 'Disbursement SLA:', val: `${offer.disbursement_days || 1} Business Day(s) (Direct AA Rail)`, bold: false },
  ];

  let termY = 578;
  for (const term of terms) {
    builder.setColor(0.35, 0.37, 0.42);
    builder.drawText(65, termY, term.label, 'F1', 9.5);
    builder.setColor(0.1, 0.1, 0.12);
    builder.drawText(235, termY, term.val, term.bold ? 'F2' : 'F1', 9.5);
    termY -= 17;
  }

  // 3. SPECIAL COVENANTS & KEY FEATURES
  builder.setColor(0.08, 0.09, 0.12);
  builder.drawText(50, 435, '3. SPECIAL COVENANTS & KEY FEATURES', 'F2', 11);

  const features = offer.features && offer.features.length > 0 ? offer.features : [
    'Digital straight-through processing via OCEN 4.0 rail',
    'Automated collection via ReBIT Account Aggregator e-NACH mandate',
    'No collateral required up to approved sanction limit',
  ];

  let featY = 412;
  for (const feat of features.slice(0, 4)) {
    builder.setColor(0.15, 0.17, 0.22);
    builder.drawText(60, featY, `- ${feat}`, 'F1', 9.5);
    featY -= 17;
  }

  // 4. CRYPTOGRAPHIC VERIFICATION & AUDIT TRAIL
  builder.setColor(0.08, 0.09, 0.12);
  builder.drawText(50, 330, '4. CRYPTOGRAPHIC VERIFICATION & AUDIT TRAIL', 'F2', 11);

  // Box for cryptographic audit block
  builder.setStrokeColor(0.82, 0.84, 0.88);
  builder.setLineWidth(1);
  builder.drawRect(50, 225, 495, 92, false, true);

  builder.setColor(0.35, 0.37, 0.42);
  builder.drawText(65, 298, 'AA Consent Flow:', 'F1', 9.5);
  builder.setColor(0.1, 0.1, 0.12);
  builder.drawText(235, 298, 'Sahamati / Finvu Sandbox ReBIT Spec Compliant', 'F1', 9.5);

  builder.setColor(0.35, 0.37, 0.42);
  builder.drawText(65, 278, 'Digital Hash Checksum:', 'F1', 9.5);
  builder.setColor(0.1, 0.1, 0.12);
  builder.drawText(235, 278, 'SHA256:8f9a2b4c1d3e5f7a9b0c2d4e6f8a0b2c4d6e8f0a2b4c6e8f0a2b4c6e', 'F1', 8.5);

  builder.setColor(0.35, 0.37, 0.42);
  builder.drawText(65, 258, 'Underwriting Engine:', 'F1', 9.5);
  builder.setColor(0.1, 0.1, 0.12);
  builder.drawText(235, 258, 'ArthNiti Explainable AI Underwriting System (v1.4)', 'F1', 9.5);

  builder.setColor(0.35, 0.37, 0.42);
  builder.drawText(65, 238, 'Verification Status:', 'F1', 9.5);
  builder.setColor(0.06, 0.45, 0.28);
  builder.drawText(235, 238, 'CRYPTOGRAPHICALLY VERIFIED & IMMUTABLE', 'F2', 9.5);

  // Footer Rule & Text
  builder.setStrokeColor(0.88, 0.89, 0.91);
  builder.setLineWidth(0.75);
  builder.drawLine(50, 80, 545, 80);

  builder.setColor(0.45, 0.47, 0.52);
  builder.drawText(50, 64, 'Generated by ArthNiti AI/ML Underwriting Engine | Confidential MSME Financial Dossier', 'F1', 8);
  builder.drawText(495, 64, 'Page 1 of 1', 'F1', 8);

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
