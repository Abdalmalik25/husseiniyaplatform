// Utility for generating official printable invoice / receipt documents with QR Code

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  institutionName?: string;
  currency?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  paidAmount?: number;
  paymentMethod?: string;
  notes?: string;
  status?: string;
  report?: {
    title: string;
    columns: string[];
    rows: (string | number)[][];
  };
}

export function generatePrintableInvoiceHtml(data: InvoiceData): string {
  const instName = data.institutionName || "الحسينية لخدمات الأعمال";
  const currencyStr = data.currency || "ريال يمني (YER)";
  const formattedDate = data.invoiceDate
    ? new Date(data.invoiceDate).toLocaleDateString("ar-EG")
    : new Date().toLocaleDateString("ar-EG");

  const itemsTableHtml = data.items
    .map(
      (item, idx) => `
    <tr>
      <td style="text-align: center; padding: 8px; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${item.description}</td>
      <td style="text-align: center; padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${item.quantity}</td>
      <td style="text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
      <td style="text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: bold;">${item.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
    </tr>
  `
    )
    .join("");

  const reportTableHtml = data.report
    ? `
    <h3 style="text-align: center; margin: 4px 0 12px; font-size: 14px; color: #102a2b;">${data.report.title}</h3>
    <table class="data-table">
      <thead>
        <tr>
          ${data.report.columns.map(c => `<th>${c}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${data.report.rows
          .map(
            (row, i) => `<tr>
          ${row
            .map(
              (cell, ci) =>
                `<td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: ${ci === 0 ? "right" : "center"}; font-family: ${typeof cell === "number" ? "monospace" : "inherit"};">${cell}</td>`
            )
            .join("")}
        </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `
    : "";

  const qrText = encodeURIComponent(
    `ALHUSAINIA-INV:${data.invoiceNumber}|TOTAL:${data.total}|DATE:${data.invoiceDate}`
  );
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrText}`;

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>فاتورة / سند ${data.invoiceNumber}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; margin: 0; padding: 24px; color: #102a2b; background: #fff; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2px solid #b87945; padding-bottom: 12px; }
    .brand-logo { font-size: 20px; font-weight: 800; color: #102a2b; }
    .brand-sub { font-size: 11px; color: #b87945; margin-top: 4px; }
    .inv-title { text-align: left; }
    .inv-number { font-size: 16px; font-weight: bold; color: #b87945; font-family: monospace; }
    .box-grid { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
    .info-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #f8fafc; font-size: 12px; }
    .info-box h3 { margin: 0 0 8px 0; font-size: 13px; color: #102a2b; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
    table.data-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
    table.data-table th { background: #102a2b; color: #fff; padding: 10px; text-align: right; }
    .totals-area { width: 300px; margin-right: auto; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #fafafa; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e2e8f0; }
    .totals-row.final { font-size: 14px; font-weight: bold; color: #b87945; border-bottom: none; padding-top: 8px; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td>
        <div class="brand-logo">${instName}</div>
        <div class="brand-sub">الاستشارات الهندسية والمؤسسية | الخدمات الطلابية | صيانة الأجهزة</div>
      </td>
      <td class="inv-title">
        <div style="font-size: 18px; font-weight: bold;">فاتورة / سند رسمية</div>
        <div class="inv-number">رقم: ${data.invoiceNumber}</div>
        <div style="font-size: 11px; color: #64748b;">التاريخ: ${formattedDate}</div>
      </td>
    </tr>
  </table>

  <div class="box-grid">
    <div class="info-box">
      <h3>بيانات العميل / الجهة</h3>
      <p><strong>الاسم:</strong> ${data.customerName || "عميل محترم"}</p>
      ${data.customerPhone ? `<p><strong>الهاتف:</strong> ${data.customerPhone}</p>` : ""}
      ${data.customerAddress ? `<p><strong>العنوان:</strong> ${data.customerAddress}</p>` : ""}
    </div>
    <div class="info-box" style="text-align: center; display: flex; align-items: center; justify-content: center; gap: 12px;">
      <div>
        <img src="${qrUrl}" alt="QR Code" width="100" height="100" style="border: 1px solid #cbd5e1; padding: 4px; border-radius: 6px;" />
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">تحقق رقمي معتمد</div>
      </div>
    </div>
  </div>

  ${
    data.report
      ? reportTableHtml
      : `<table class="data-table">
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">#</th>
        <th>البيان / تفاصيل الخدمة</th>
        <th style="width: 70px; text-align: center;">الكمية</th>
        <th style="width: 110px; text-align: left;">سعر الوحدة</th>
        <th style="width: 120px; text-align: left;">الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${itemsTableHtml}
    </tbody>
  </table>`
  }

  <div class="totals-area">
    <div class="totals-row">
      <span>المجموع الفرعي:</span>
      <span style="font-family: monospace;">${data.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currencyStr}</span>
    </div>
    ${
      data.discount
        ? `<div class="totals-row"><span>الخصم:</span><span style="font-family: monospace; color: #e11d48;">-${data.discount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>`
        : ""
    }
    <div class="totals-row final">
      <span>الإجمالي النهائي:</span>
      <span style="font-family: monospace;">${data.total.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currencyStr}</span>
    </div>
  </div>

  ${data.notes ? `<div style="margin-top: 20px; font-size: 11px; background: #fffbeb; border: 1px solid #fef3c7; padding: 10px; border-radius: 6px; color: #92400e;"><strong>ملاحظات:</strong> ${data.notes}</div>` : ""}

  <div class="footer">
    <div>توقيع المستلم: ___________________</div>
    <div style="text-align: center;">
      <strong>${instName}</strong><br />
      صدر إلكترونياً عبر منصة الحسينية الموحدة — ${formattedDate}
    </div>
    <div>توقيع البائع/الاستشاري: ___________________</div>
  </div>
</body>
</html>
  `;
}

export function openPrintableInvoiceWindow(data: InvoiceData) {
  const html = generatePrintableInvoiceHtml(data);
  const win = window.open("", "_blank", "width=850,height=900");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 400);
  }
}
