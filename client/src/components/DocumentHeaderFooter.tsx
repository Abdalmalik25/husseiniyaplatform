import { type DocumentTemplate } from "@shared/documentTemplate";

/**
 * buildDocumentHeaderFooter — HTML string builder (NOT a React component).
 * Professional document headers and footers for all operational modules.
 * Supports ZATCA-compliant templates, RTL/Arabic, and customizable branding.
 * Returns an HTML string for print windows / server-side rendering.
 */

interface HeaderFooterProps {
  template: DocumentTemplate;
  type: "header" | "footer";
  pageNumber?: string;
  totalPages?: string;
}

export function buildDocumentHeaderFooter({
  template,
  type,
  pageNumber = "1",
  totalPages = "1",
}: HeaderFooterProps): string {
  if (type === "header") {
    return buildHeader(template, pageNumber);
  }
  return buildFooter(template, pageNumber, totalPages);
}

/** @deprecated Use buildDocumentHeaderFooter instead (this function returns a string, not JSX). */
export const DocumentHeaderFooter = buildDocumentHeaderFooter;

function buildHeader(template: DocumentTemplate, pageNumber: string): string {
  const h = template.header;
  if (
    !h.showCompanyName &&
    !h.showLogo &&
    !h.customTextAbove &&
    !h.customTextBelow
  ) {
    return `<!-- header suppressed -->`;
  }

  const fontSize =
    h.fontSize === "lg" ? "18px" : h.fontSize === "md" ? "14px" : "11px";
  const bgStyle = `background-color:${h.backgroundColor};color:${h.textColor};font-size:${fontSize};direction:${template.rtl ? "rtl" : "ltr"};text-align:${template.rtl ? "right" : "left"};padding:10px 15px;border-bottom:${h.borderBottom ? "2px solid #b87945" : "none"};margin-bottom:16px;`;

  let inner = "";
  if (h.customTextAbove)
    inner += `<div class="doc-hdr-above">${h.customTextAbove}</div>`;
  if (h.showLogo && h.logoUrl)
    inner += `<img src="${h.logoUrl}" class="doc-hdr-logo" style="width:48px;height:48px;border-radius:8px;" alt="logo"/>`;
  if (h.showCompanyName && h.companyName)
    inner += `<div class="doc-hdr-company" style="font-weight:900;">${h.companyName}</div>`;
  if (h.customTextBelow)
    inner += `<div class="doc-hdr-below">${h.customTextBelow}</div>`;
  inner += `<div class="doc-hdr-page">صفحة ${pageNumber}</div>`;

  return `<div class="doc-header" style="${bgStyle}">${inner}</div>`;
}

function buildFooter(
  template: DocumentTemplate,
  pageNumber: string,
  totalPages: string
): string {
  const f = template.footer;
  if (
    !f.showPageNumbers &&
    !f.showDate &&
    !f.showCompanyName &&
    !f.customTextAbove &&
    !f.customTextBelow
  ) {
    return `<!-- footer suppressed -->`;
  }

  const fontSize =
    f.fontSize === "lg" ? "14px" : f.fontSize === "md" ? "12px" : "10px";
  const bgStyle = `background-color:${f.backgroundColor};color:${f.textColor};font-size:${fontSize};direction:${template.rtl ? "rtl" : "ltr"};text-align:${template.rtl ? "right" : "left"};padding:8px 15px;border-top:${f.borderTop ? "1px solid #b87945" : "none"};margin-top:20px;`;

  let inner = "";
  if (f.showPageNumbers)
    inner += `<span class="doc-ft-pages">صفحة ${pageNumber} من ${totalPages}</span>`;
  if (f.showDate)
    inner += `<span class="doc-ft-date">${new Date().toLocaleDateString("ar-EG")}</span>`;
  if (f.showCompanyName && template.header.companyName)
    inner += `<span class="doc-ft-company">${template.header.companyName}</span>`;
  if (f.customTextBelow)
    inner += `<span class="doc-ft-custom">${f.customTextBelow}</span>`;

  return `<div class="doc-footer" style="${bgStyle}">${inner}</div>`;
}

export function buildDocumentCSS(template: DocumentTemplate): string {
  return `
    <style>
      @page {
        size: ${template.paperSize === "custom" ? "A4" : template.paperSize} ${template.orientation};
        margin: ${template.marginTop}mm ${template.marginRight}mm ${template.marginBottom}mm ${template.marginLeft}mm;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: ${template.fontFamily};
        direction: ${template.rtl ? "rtl" : "ltr"};
        text-align: ${template.rtl ? "right" : "left"};
        color: ${template.header.textColor};
        background: #ffffff;
      }
      .doc-header { transition: all 0.3s ease; }
      .doc-footer { transition: all 0.3s ease; }
      .doc-hdr-above { margin-bottom: 4px; }
      .doc-hdr-company { font-size: 1.2em; letter-spacing: 0.5px; }
      .doc-hdr-logo { object-fit: contain; }
      .doc-hdr-page { margin-top: 4px; opacity: 0.8; }
      .doc-ft-pages { margin-left: 12px; }
      .doc-ft-date { margin-left: 12px; }
      .doc-ft-company { margin-left: 12px; }
      .doc-ft-custom { margin-left: 12px; }
      @media print {
        body { padding: 0; }
        .doc-header, .doc-footer { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
        .doc-header, .doc-footer { break-inside: avoid; }
      }
    </style>
  `;
}
