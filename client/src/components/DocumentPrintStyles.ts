import { type DocumentTemplate } from "@shared/documentTemplate";

const escHtml = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    m =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[m] as string
  );

export function buildDocumentHeader(template: DocumentTemplate): string {
  if (
    !template.header.showCompanyName &&
    !template.header.showLogo &&
    !template.header.customTextAbove &&
    !template.header.customTextBelow
  ) {
    return "";
  }

  const fontSizeMap = { sm: "11px", md: "14px", lg: "18px" };
  const fs = fontSizeMap[template.header.fontSize];

  return `
    <div class="doc-header" style="
      background: ${escHtml(template.header.backgroundColor)};
      color: ${escHtml(template.header.textColor)};
      font-size: ${fs};
      ${template.header.borderBottom ? "border-bottom: 2px solid #b87945; padding-bottom: 14px; margin-bottom: 20px;" : "padding-bottom: 10px; margin-bottom: 16px;"}
      direction: ${template.rtl ? "rtl" : "ltr"};
      text-align: ${template.rtl ? "right" : "left"};
    ">
      ${template.header.customTextAbove ? `<div class="doc-header-above">${escHtml(template.header.customTextAbove)}</div>` : ""}
      ${template.header.showLogo && template.header.logoUrl ? `<img src="${escHtml(template.header.logoUrl)}" class="doc-header-logo" alt="logo"/>` : ""}
      ${template.header.showCompanyName && template.header.companyName ? `<div class="doc-header-company" style="font-weight:900;">${escHtml(template.header.companyName)}</div>` : ""}
      ${template.header.customTextBelow ? `<div class="doc-header-below">${escHtml(template.header.customTextBelow)}</div>` : ""}
    </div>
  `;
}

export function buildDocumentFooter(template: DocumentTemplate): string {
  if (
    !template.footer.showPageNumbers &&
    !template.footer.showDate &&
    !template.footer.showCompanyName &&
    !template.footer.customTextAbove &&
    !template.footer.customTextBelow
  ) {
    return "";
  }

  const fontSizeMap = { sm: "10px", md: "12px", lg: "14px" };
  const fs = fontSizeMap[template.footer.fontSize];

  return `
    <div class="doc-footer" style="
      background: ${escHtml(template.footer.backgroundColor)};
      color: ${escHtml(template.footer.textColor)};
      font-size: ${fs};
      ${template.footer.borderTop ? "border-top: 1px solid #b87945; padding-top: 10px; margin-top: 20px;" : "padding-top: 8px; margin-top: 16px;"}
      direction: ${template.rtl ? "rtl" : "ltr"};
      text-align: ${template.rtl ? "right" : "left"};
    ">
      ${template.footer.showPageNumbers ? `<span class="doc-footer-pages">صفحة ${escHtml("")}</span>` : ""}
      ${template.footer.showDate ? `<span class="doc-footer-date">${new Date().toLocaleDateString("ar-EG")}</span>` : ""}
      ${template.footer.showCompanyName && template.header.companyName ? `<span class="doc-footer-company">${escHtml(template.header.companyName)}</span>` : ""}
      ${template.footer.customTextBelow ? `<span class="doc-footer-custom">${escHtml(template.footer.customTextBelow)}</span>` : ""}
    </div>
  `;
}

export function buildDocumentStyle(template: DocumentTemplate): string {
  return `
    <style>
      @page {
        size: ${template.paperSize === "custom" ? "A4" : template.paperSize} ${template.orientation};
        margin: ${template.marginTop}mm ${template.marginRight}mm ${template.marginBottom}mm ${template.marginLeft}mm;
      }
      * { box-sizing: border-box; }
      body {
        font-family: ${escHtml(template.fontFamily)};
        direction: ${template.rtl ? "rtl" : "ltr"};
        text-align: ${template.rtl ? "right" : "left"};
        margin: 0;
        padding: 0;
        color: #17211f;
        background: #fff;
      }
      .doc-header {
        ${template.header.borderBottom ? "border-bottom: 2px solid #b87945;" : ""}
        padding-bottom: ${template.header.borderBottom ? "14px" : "10px"};
        margin-bottom: ${template.header.borderBottom ? "20px" : "16px"};
      }
      .doc-footer {
        ${template.footer.borderTop ? "border-top: 1px solid #b87945;" : ""}
        padding-top: ${template.footer.borderTop ? "10px" : "8px"};
        margin-top: 20px;
      }
      @media print {
        body { padding: 0; }
        .doc-header, .doc-footer { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
  `;
}
