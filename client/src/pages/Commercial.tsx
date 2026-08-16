import { useState, useMemo, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useOffline } from "@/lib/offline/OfflineContext";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Package, Users, Truck, ShoppingCart, ShoppingBag, ClipboardList,
  Plus, Search, Edit, Trash2, Barcode, MapPin, Phone, Mail, User, PackagePlus,
  Wifi, WifiOff, CheckCircle, XCircle, Clock, AlertTriangle, Printer, Wallet, Loader2, Upload, Download, ReceiptText
} from "lucide-react";
import { toast } from "sonner";

type Tab = "products" | "customers" | "suppliers" | "sales" | "purchases" | "orders";

export default function Commercial() {
  const { user, isAuthenticated } = useAuth();
  const { isOnline } = useOffline();
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Products
  const { data: productsResponse, refetch: refetchProducts, isLoading: loadingProducts } = trpc.products.list.useQuery({ search: debouncedSearch || undefined }, { staleTime: 60_000, refetchOnWindowFocus: false });
  const productsData = productsResponse?.items ?? [];
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [productForm, setProductForm] = useState({ code: "", name: "", category: "", unit: "قطعة", purchasePrice: "0", salePrice: "0", minStock: 0, barcode: "" });
  const createProduct = trpc.products.create.useMutation({
    onSuccess: () => { toast.success("تم إضافة المنتج"); refetchProducts(); setShowProductDialog(false); setProductForm({ code: "", name: "", category: "", unit: "قطعة", purchasePrice: "0", salePrice: "0", minStock: 0, barcode: "" }); },
    onError: (e) => toast.error(e.message)
  });
  const isCreatingProduct = createProduct.isPending;

  const [editProduct, setEditProduct] = useState<any>(null);
  const [editProductForm, setEditProductForm] = useState({ id: 0, name: "", salePrice: "", purchasePrice: "", minStock: 0, barcode: "" });
  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => { toast.success("تم تحديث المنتج"); setEditProduct(null); refetchProducts(); },
    onError: (e) => toast.error(e.message)
  });

  const [adjustProduct, setAdjustProduct] = useState<any>(null);
  const [adjustForm, setAdjustForm] = useState({ quantity: 1, type: "in" as "in" | "out" | "adjustment", notes: "" });
  const adjustStock = trpc.products.adjustStock.useMutation({
    onSuccess: () => { toast.success("تم تعديل المخزون"); setAdjustProduct(null); refetchProducts(); },
    onError: (e) => toast.error(e.message)
  });

  const customerNameOf = (id: number | null | undefined) => {
    if (!id) return "عميل نقدي";
    return customersData.find(c => c.id === id)?.name ?? `عميل رقم ${id}`;
  };
  const supplierNameOf = (id: number | null | undefined) => {
    if (!id) return "مورد نقدي";
    return suppliersData.find(s => s.id === id)?.name ?? `مورد رقم ${id}`;
  };
  const isWebOrder = (o: any) => String(o.orderNumber || "").startsWith("WEB-");

  // CSV Import/Export (الأصناف والخدمات)
  const PRODUCT_CSV_HEADER = "code,name,type,category,unit,purchasePrice,salePrice,wholesalePrice,minStock,currentStock,barcode";
  const PRODUCT_CSV_ALIASES: Record<string, string> = {
    "رمز": "code", "الكود": "code", "كود": "code",
    "اسم": "name", "الاسم": "name",
    "نوع": "type", "النوع": "type",
    "فئة": "category", "الفئة": "category",
    "وحدة": "unit", "الوحدة": "unit",
    "سعر الشراء": "purchasePrice", "شراء": "purchasePrice",
    "سعر البيع": "salePrice", "بيع": "salePrice",
    "سعر الجملة": "wholesalePrice", "جملة": "wholesalePrice",
    "حد الإنذار": "minStock", "حد التنبيه": "minStock",
    "الرصيد": "currentStock", "المخزون": "currentStock",
    "باركود": "barcode", "الباركود": "barcode",
  };
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importRows, setImportRows] = useState<any[] | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const importCsv = trpc.products.importCsv.useMutation({
    onSuccess: (r) => {
      toast.success(`أُضيف ${r.created} وحُدّث ${r.updated}${r.errors.length ? ` — أخطاء: ${r.errors.length}` : ""}`);
      setShowImportDialog(false);
      setImportRows(null);
      refetchProducts();
    },
    onError: (e) => toast.error(String(e.message || "فشل الاستيراد"))
  });

  const exportProductsCsv = () => {
    const esc = (v: any) => { const s = String(v ?? ""); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [PRODUCT_CSV_HEADER];
    for (const p of filteredProducts) {
      lines.push([
        esc(p.code), esc(p.name), p.type || "goods", esc(p.category), esc(p.unit),
        p.purchasePrice, p.salePrice, p.wholesalePrice ?? p.salePrice,
        p.minStock, p.currentStock, esc(p.barcode)
      ].join(","));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `products_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`تم تصدير ${filteredProducts.length} صنفاً/خدمة`);
  };

  const downloadProductTemplate = () => {
    const esc = (v: any) => { const s = String(v ?? ""); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const sample = [
      ["P001", "دجاج بلدي", "goods", "مواد غذائية", "كيلو", "1800", "2200", "2000", "5", "50", ""],
      ["S001", "خدمة توصيل", "service", "خدمات", "رحلة", "0", "500", "0", "0", "0", ""],
    ].map(row => row.map(esc).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + PRODUCT_CSV_HEADER + "\n" + sample], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "products_template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const parseProductCsv = (text: string) => {
    const rows: any[] = [];
    const errors: string[] = [];
    const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { toast.error("الملف فارغ أو لا يحتوي صفوفاً"); return; }
    const splitLine = (ln: string) => {
      const cells: string[] = [];
      let cur = "", inQ = false;
      for (const ch of ln) {
        if (ch === '"') { inQ = !inQ; continue; }
        if (ch === "," && !inQ) { cells.push(cur.trim()); cur = ""; continue; }
        cur += ch;
      }
      cells.push(cur.trim());
      return cells;
    };
    const headerCells = splitLine(lines[0]);
    const colMap: string[] = headerCells.map(h => {
      const key = h.trim().toLowerCase();
      return PRODUCT_CSV_ALIASES[h.trim()] || PRODUCT_CSV_ALIASES[key] || key;
    });
    for (let i = 1; i < lines.length; i++) {
      const cells = splitLine(lines[i]);
      const obj: Record<string, any> = {};
      colMap.forEach((col, ci) => { if (col) obj[col] = cells[ci]; });
      if (!obj.code || !obj.name) { errors.push(`سطر ${i + 1}: الرمز والاسم إلزاميان`); continue; }
      const type = String(obj.type || "goods").trim();
      rows.push({
        code: String(obj.code).trim(),
        name: String(obj.name).trim(),
        type: type === "خدمة" || type === "service" ? "service" as const : "goods" as const,
        category: obj.category ? String(obj.category).trim() : undefined,
        unit: obj.unit ? String(obj.unit).trim() : "قطعة",
        purchasePrice: String(obj.purchasePrice ?? obj["سعر الشراء"] ?? "0").trim() || "0",
        salePrice: String(obj.salePrice ?? obj["سعر البيع"] ?? "0").trim() || "0",
        wholesalePrice: String(obj.wholesalePrice ?? obj["سعر الجملة"] ?? "0").trim() || "0",
        minStock: Math.max(0, parseInt(String(obj.minStock ?? "0")) || 0),
        currentStock: Math.max(0, parseInt(String(obj.currentStock ?? "0")) || 0),
        barcode: obj.barcode ? String(obj.barcode).trim() : undefined,
      });
    }
    setImportRows(rows);
    if (errors.length) toast.warning(`${errors.length} سطراً تم تجاهله: ${errors.slice(0, 3).join("، ") || ""}`);
    if (rows.length === 0) toast.error("لا توجد صفوف صالحة للاستيراد");
    else toast.success(`تم قراءة ${rows.length} صفاً صالحاً`);
  };

  const onImportFile = (file: File | null) => {
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => parseProductCsv(String(reader.result || ""));
    reader.readAsText(file, "utf-8");
  };

  // Order → Sales Invoice conversion (web orders)
  const [convertOrder, setConvertOrder] = useState<any>(null);
  const [convertForm, setConvertForm] = useState({ paymentMethod: "cash", paidAmount: "0" });
  const convertToInvoice = trpc.orders.createSaleInvoice.useMutation({
    onSuccess: (r) => { toast.success(`تم إنشاء فاتورة المبيعات ${r.invoiceNumber}`); setConvertOrder(null); refetchSales(); refetchOrders(); },
    onError: (e) => toast.error(String(e.message || "فشل تحويل الطلب إلى فاتورة"))
  });

  // Customers
  const { data: customersResponse, refetch: refetchCustomers, isLoading: loadingCustomers } = trpc.customers.list.useQuery({ search: debouncedSearch || undefined }, { staleTime: 60_000, refetchOnWindowFocus: false });
  const customersData = customersResponse?.items ?? [];
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [customerForm, setCustomerForm] = useState({ code: "", name: "", phone: "", email: "", address: "", city: "" });
  const createCustomer = trpc.customers.create.useMutation({
    onSuccess: () => { toast.success("تم إضافة العميل"); refetchCustomers(); setShowCustomerDialog(false); setCustomerForm({ code: "", name: "", phone: "", email: "", address: "", city: "" }); },
    onError: (e) => toast.error(e.message)
  });
  const isCreatingCustomer = createCustomer.isPending;

  // Suppliers
  const { data: suppliersResponse, refetch: refetchSuppliers, isLoading: loadingSuppliers } = trpc.suppliers.list.useQuery({ search: debouncedSearch || undefined }, { staleTime: 60_000, refetchOnWindowFocus: false });
  const suppliersData = suppliersResponse?.items ?? [];
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ code: "", name: "", phone: "", email: "", address: "", city: "" });
  const createSupplier = trpc.suppliers.create.useMutation({
    onSuccess: () => { toast.success("تم إضافة المورد"); refetchSuppliers(); setShowSupplierDialog(false); setSupplierForm({ code: "", name: "", phone: "", email: "", address: "", city: "" }); },
    onError: (e) => toast.error(e.message)
  });
  const isCreatingSupplier = createSupplier.isPending;

  // Sales
  const { data: salesResponse, refetch: refetchSales, isLoading: loadingSales } = trpc.sales.list.useQuery({}, { staleTime: 60_000, refetchOnWindowFocus: false });
  const salesData = salesResponse?.items ?? [];
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [saleItems, setSaleItems] = useState<{ productId: number; productName: string; quantity: number; unitPrice: string }[]>([]);
  const [saleCustomerId, setSaleCustomerId] = useState<number | undefined>();
  const [salePayment, setSalePayment] = useState<"cash" | "card" | "transfer" | "credit">("cash");
  const createSale = trpc.sales.create.useMutation({
    onSuccess: () => { toast.success("تم إنشاء فاتورة المبيعات"); refetchSales(); refetchProducts(); setShowSaleDialog(false); setSaleItems([]); },
    onError: (e) => toast.error(e.message)
  });
  const isCreatingSale = createSale.isPending;

  // Purchases
  const { data: purchasesResponse, refetch: refetchPurchases, isLoading: loadingPurchases } = trpc.purchases.list.useQuery({}, { staleTime: 60_000, refetchOnWindowFocus: false });
  const purchasesData = purchasesResponse?.items ?? [];
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState<{ productId: number; productName: string; quantity: number; unitPrice: string }[]>([]);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState<number | undefined>();
  const createPurchase = trpc.purchases.create.useMutation({
    onSuccess: () => { toast.success("تم إنشاء فاتورة المشتريات"); refetchPurchases(); refetchProducts(); setShowPurchaseDialog(false); setPurchaseItems([]); },
    onError: (e) => toast.error(e.message)
  });
  const isCreatingPurchase = createPurchase.isPending;

  // Orders
  const { data: ordersResponse, refetch: refetchOrders, isLoading: loadingOrders } = trpc.orders.list.useQuery({});
  const ordersData = ordersResponse?.items ?? [];
  const pendingWebOrders = ordersData.filter(o => isWebOrder(o) && o.status === "pending").length;
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderItems, setOrderItems] = useState<{ productId: number; productName: string; quantity: number; unitPrice: string }[]>([]);
  const [orderCustomerId, setOrderCustomerId] = useState<number | undefined>();
  const [orderAddress, setOrderAddress] = useState("");
  const createOrder = trpc.orders.create.useMutation({
    onSuccess: () => { toast.success("تم إنشاء الطلب"); refetchOrders(); setShowOrderDialog(false); setOrderItems([]); },
    onError: (e) => toast.error(e.message)
  });
  const isCreatingOrder = createOrder.isPending;
  const updateOrderStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => { toast.success("تم تحديث حالة الطلب"); refetchOrders(); },
    onError: (e) => toast.error(e.message)
  });
  const updateSaleStatus = trpc.sales.updateStatus.useMutation({
    onSuccess: () => { toast.success("تم تحديث حالة الفاتورة"); refetchSales(); refetchProducts(); },
    onError: (e) => toast.error(e.message)
  });
  const updatePurchaseStatus = trpc.purchases.updateStatus.useMutation({
    onSuccess: () => { toast.success("تم تحديث حالة الفاتورة"); refetchPurchases(); refetchProducts(); },
    onError: (e) => toast.error(e.message)
  });

  const utils = trpc.useUtils();

  // Payments (installments & settlements)
  const printAfterSaveRef = useRef(false);
  const pendingReceiptRef = useRef<{ invoice: any; amount: string; method: string; date: string; source: "sales" | "purchases" } | null>(null);
  const [printAfterSave, setPrintAfterSave] = useState(true);
  const createPayment = trpc.payments.create.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الدفعة بنجاح");
      setPayTarget(null);
      setPayAmount("");
      refetchSales();
      refetchPurchases();
      refetchCustomers();
      refetchSuppliers();
      if (printAfterSaveRef.current && pendingReceiptRef.current) {
        const r = pendingReceiptRef.current;
        pendingReceiptRef.current = null;
        printAfterSaveRef.current = false;
        printPaymentReceipt(r);
      }
    },
    onError: (e) => toast.error(e.message),
  });
  const [payTarget, setPayTarget] = useState<{ invoice: any; source: "sales" | "purchases" } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "transfer" | "credit" | "online">("cash");
  const [payDate, setPayDate] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const openPayDialog = (invoice: any, source: "sales" | "purchases") => {
    const remaining = Number(invoice.total ?? 0) - Number(invoice.paidAmount ?? 0);
    if (remaining <= 0.01) { toast.info("الفاتورة مسددة بالكامل"); return; }
    setPayTarget({ invoice, source });
    setPayAmount("");
    setPayMethod(invoice.paymentMethod === "credit" ? "cash" : invoice.paymentMethod || "cash");
    setPayDate("");
    setPayNotes("");
  };

  const handlePay = () => {
    if (!payTarget) return;
    const amt = parseFloat(payAmount);
    const remaining = Number(payTarget.invoice.total) - Number(payTarget.invoice.paidAmount ?? 0);
    if (!payAmount || isNaN(amt) || amt <= 0) { toast.error("أدخل مبلغاً موجباً"); return; }
    if (amt > remaining + 0.01) { toast.error(`المبلغ يتجاوز المتبقي (${remaining.toLocaleString("en-US")})`); return; }
    printAfterSaveRef.current = printAfterSave;
    pendingReceiptRef.current = printAfterSave
      ? { invoice: payTarget.invoice, amount: payAmount, method: payMethod, date: payDate, source: payTarget.source }
      : null;
    createPayment.mutate({
      source: payTarget.source,
      invoiceId: payTarget.invoice.id,
      amount: payAmount,
      paymentMethod: payMethod,
      paymentDate: payDate || undefined,
      notes: payNotes.trim() || undefined,
    });
  };

  const printPaymentReceipt = async (data: { invoice: any; amount: string; method: string; date: string; source: "sales" | "purchases" }) => {
    try {
      const settings = await utils.accounting.getSettings.fetch().catch(() => null);
      const institutionName = settings?.institutionName ?? "مؤسسة الحسينية لخدمات الأعمال";
      const managerName = settings?.managerName ?? "";
      const currency = settings?.currency ?? "ريال يمني (YER)";
      const esc = (v: any) => String(v ?? "").replace(/[&<>"']/g, (m) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[m] as string));
      const amt = (v: any) => Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const d = (v: any) => (v ? new Date(v).toLocaleDateString("ar-EG") : "—");
      const isReceipt = data.source === "sales";
      const payLabel: Record<string, string> = { cash: "نقدي", card: "بطاقة", transfer: "تحويل بنكي", credit: "آجل", online: "إلكتروني" };
      const remaining = Math.max(0, Number(data.invoice.total) - Number(data.invoice.paidAmount ?? 0) - Number(data.amount));
      const payDateStr = data.date ? d(data.date) : d(new Date());

      const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>${isReceipt ? "سند قبض" : "سند صرف"} ${esc(data.invoice.invoiceNumber)}</title>
<style>
*{box-sizing:border-box}body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;direction:rtl;margin:0;padding:26px;color:#17211f;background:#fff}
.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #b87945;padding-bottom:14px}
.brand{display:flex;align-items:center;gap:10px}.logo{width:46px;height:46px;border-radius:12px;background:#102a2b;color:#d4a574;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px}
.brand .b1{font-weight:900;font-size:16px;color:#102a2b}.brand .b2{font-size:11px;color:#7a6a52;margin-top:2px}
.meta{text-align:left}.meta h1{margin:0 0 4px;font-size:20px;color:#102a2b}.meta .m{font-size:11px;color:#555;margin:2px 0}
.amount-box{margin:26px auto;padding:22px;border:2px dashed #b87945;border-radius:14px;text-align:center;max-width:420px;background:#fdf9f2}
.amount-box .lbl{font-size:12px;color:#8a6a4a}.amount-box .val{font-size:30px;font-weight:900;color:#102a2b;margin-top:6px;letter-spacing:1px}
.serial{display:inline-block;margin-top:8px;padding:3px 12px;border-radius:999px;background:#efefe9;color:#555;font-size:10px;font-family:monospace}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:12px}
.box{border:1px solid #ddd;border-radius:10px;padding:12px}.box h3{margin:0 0 8px;font-size:12px;color:#b87945}.box p{margin:3px 0;color:#333}
table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}th,td{border:1px solid #ddd;padding:8px 10px;text-align:right}th{background:#102a2b;color:#fff;font-size:11px}td.c{text-align:center}
.footer{margin-top:52px;display:flex;justify-content:space-between;font-size:11px;color:#777}
.sign{width:38%;text-align:center}.sign .line{border-top:1px dashed #999;padding-top:6px;margin-top:58px}
.note{margin-top:18px;font-size:10px;color:#999;text-align:center}
@media print{body{padding:10px}}
</style></head><body>
<div class="head">
  <div class="brand"><div class="logo">ح</div><div><div class="b1">${esc(institutionName)}</div><div class="b2">نظام الحسابات ALHUSAINIA — إدارة مالية متكاملة</div></div></div>
  <div class="meta"><h1>${isReceipt ? "سند قبض" : "سند صرف"}</h1><div class="m">رقم السند: <b>${isReceipt ? "RC" : "PY"}-${String(Date.now()).slice(-8)}</b></div><div class="m">التاريخ: ${payDateStr}</div><div class="m">فاتورة: <b>${esc(data.invoice.invoiceNumber)}</b></div></div>
</div>
<div class="amount-box"><div class="lbl">${isReceipt ? "المبلغ المقبوض" : "المبلغ المدفوع"}</div><div class="val">${amt(data.amount)} ${esc(currency)}</div><div class="serial"># ${esc(data.invoice.invoiceNumber)}</div></div>
<div class="grid">
  <div class="box"><h3>بيانات السند</h3>
    <p>طريقة الدفع: <b>${payLabel[data.method] || data.method}</b></p>
    <p>تاريخ الدفعة: ${payDateStr}</p>
    <p>نوع السند: <b>${isReceipt ? "تحصيل من عميل" : "سداد لمورد"}</b></p>
  </div>
  <div class="box"><h3>حساب الفاتورة</h3>
    <p>إجمالي الفاتورة: <b>${amt(data.invoice.total)}</b></p>
    <p>المدفوع سابقاً: <b>${amt(data.invoice.paidAmount)}</b></p>
    <p>المتبقي بعد هذه الدفعة: <b>${amt(remaining)}</b></p>
  </div>
</div>
<div class="footer">
  <div class="sign"><div class="line">توقيع المستلم</div></div>
  <div>${esc(institutionName)}<br/>${managerName ? "أمين الصندوق: " + esc(managerName) : ""}</div>
  <div class="sign"><div class="line">توقيع أمين الصندوق</div></div>
</div>
<div class="note">صدر بواسطة نظام ALHUSAINIA — ${new Date().toLocaleDateString("ar-EG")} — سند صادر بموجب النظام، يُحفظ في ملف السندات.</div>
</body></html>`;

      const win = window.open("", "_blank", "width=880,height=720");
      if (!win) { toast.error("الرجاء السماح بالنوافذ المنبثقة لطباعة السند"); return; }
      win.document.open();
      win.document.write(html);
      win.document.close();
      const doPrint = () => { win.focus(); setTimeout(() => win.print(), 400); };
      if (win.document.readyState === "complete") doPrint();
      else win.onload = doPrint;
    } catch (e: any) {
      toast.error("فشل تجهيز السند: " + (e?.message || ""));
    }
  };

  const handlePrintSaleInvoice = async (invId: number) => {
    try {
      const [detail, settings] = await Promise.all([
        utils.sales.getInvoiceDetails.fetch({ id: invId }),
        utils.accounting.getSettings.fetch().catch(() => null),
      ]);
      if (!detail?.invoice) { toast.error("تعذر تحميل تفاصيل الفاتورة"); return; }
      const { invoice, customer, items } = detail as any;
      const institutionName = settings?.institutionName ?? "مؤسسة الحسينية لخدمات الأعمال";
      const managerName = settings?.managerName ?? "";
      const currency = settings?.currency ?? "ريال يمني (YER)";
      const esc = (v: any) => String(v ?? "").replace(/[&<>"']/g, (m) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[m] as string));
      const amt = (v: any) => Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const d = (v: any) => (v ? new Date(v).toLocaleDateString("ar-EG") : "—");
      const statusLabel: Record<string, string> = { draft: "مسودة", confirmed: "مؤكدة", paid: "مدفوعة", partial: "مدفوعة جزئياً", cancelled: "ملغاة" };
      const payLabel: Record<string, string> = { cash: "نقدي", card: "بطاقة", transfer: "تحويل", credit: "آجل", online: "إلكتروني" };
      const remaining = Number(invoice.total ?? 0) - Number(invoice.paidAmount ?? 0);
      const itemsRows = (items || []).map((it: any, i: number) => `
      <tr><td class="c">${i + 1}</td><td>${esc(it.productName)}</td><td class="c">${it.quantity}</td><td class="c">${amt(it.unitPrice)}</td><td class="c">${amt(it.discount)}</td><td class="c">${amt(it.total)}</td></tr>`).join("");

      const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>فاتورة ${esc(invoice.invoiceNumber)}</title>
<style>
*{box-sizing:border-box}body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;direction:rtl;margin:0;padding:26px;color:#17211f;background:#fff}
.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #b87945;padding-bottom:14px}
.brand{display:flex;align-items:center;gap:10px}.logo{width:46px;height:46px;border-radius:12px;background:#102a2b;color:#d4a574;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px}
.brand .b1{font-weight:900;font-size:16px;color:#102a2b}.brand .b2{font-size:11px;color:#7a6a52;margin-top:2px}
.meta{text-align:left}.meta h1{margin:0 0 4px;font-size:20px;color:#102a2b}.meta .m{font-size:11px;color:#555;margin:2px 0}
.badge{display:inline-block;margin-top:6px;padding:3px 12px;border-radius:999px;background:#f5e9d8;color:#8a5a1e;font-size:11px;font-weight:700}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px}
.box{border:1px solid #ddd;border-radius:10px;padding:12px;font-size:12px}.box h3{margin:0 0 8px;font-size:13px;color:#b87945}.box p{margin:3px 0;color:#333}
table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
th,td{border:1px solid #ddd;padding:8px 10px;text-align:right}th{background:#102a2b;color:#fff;font-size:11px}
td.c{text-align:center}tr:nth-child(even) td{background:#faf6ef}
.totals{display:flex;justify-content:flex-end;margin-top:12px}.totals table{width:320px;margin:0}
.totals td{border:none;padding:5px 10px}.totals tr.total td{font-weight:900;font-size:14px;color:#102a2b;border-top:2px solid #b87945}
.notes{margin-top:14px;font-size:11px;color:#555;border-top:1px dashed #ccc;padding-top:10px}
.footer{margin-top:46px;display:flex;justify-content:space-between;font-size:11px;color:#777}
.sign{width:38%;text-align:center}.sign .line{border-top:1px dashed #999;padding-top:6px;margin-top:58px}
@media print{body{padding:10px}}
</style></head><body>
<div class="head">
  <div class="brand"><div class="logo">ح</div><div><div class="b1">${esc(institutionName)}</div><div class="b2">نظام الحسابات ALHUSAINIA — إدارة مالية متكاملة</div></div></div>
  <div class="meta"><h1>فاتورة مبيعات</h1><div class="m">رقم الفاتورة: <b>${esc(invoice.invoiceNumber)}</b></div><div class="m">التاريخ: ${d(invoice.invoiceDate)}</div><div class="m">تاريخ الاستحقاق: ${d(invoice.dueDate)}</div><span class="badge">${statusLabel[invoice.status] || invoice.status}</span></div>
</div>
<div class="grid2">
  <div class="box"><h3>بيانات العميل</h3>
    <p><b>${esc(customer?.name || "عميل نقدي")}</b></p>
    ${customer?.phone ? `<p>هاتف: ${esc(customer.phone)}</p>` : ""}
    ${customer?.address ? `<p>العنوان: ${esc(customer.address)}</p>` : ""}
    ${customer?.taxNumber ? `<p>الرقم الضريبي: ${esc(customer.taxNumber)}</p>` : ""}
  </div>
  <div class="box"><h3>بيانات الدفع</h3>
    <p>طريقة الدفع: <b>${payLabel[invoice.paymentMethod] || invoice.paymentMethod}</b></p>
    <p>المدفوع: <b>${amt(invoice.paidAmount)} ${esc(currency)}</b></p>
    <p>المتبقي: <b>${amt(remaining)} ${esc(currency)}</b></p>
  </div>
</div>
<table><thead><tr><th class="c">#</th><th>الصنف</th><th class="c">الكمية</th><th class="c">سعر الوحدة</th><th class="c">الخصم</th><th class="c">الإجمالي</th></tr></thead><tbody>${itemsRows || '<tr><td colspan="6" class="c">لا توجد أصناف</td></tr>'}</tbody></table>
<div class="totals"><table>
  <tr><td>المجموع الفرعي</td><td class="c">${amt(invoice.subtotal)}</td></tr>
  ${Number(invoice.discount) > 0 ? `<tr><td>الخصم</td><td class="c">-${amt(invoice.discount)}</td></tr>` : ""}
  ${Number(invoice.taxRate) > 0 ? `<tr><td>الضريبة (${invoice.taxRate}%)</td><td class="c">${amt(invoice.taxAmount)}</td></tr>` : ""}
  <tr class="total"><td>الإجمالي النهائي</td><td class="c">${amt(invoice.total)} ${esc(currency)}</td></tr>
</table></div>
${invoice.notes ? `<div class="notes"><b>ملاحظات: </b>${esc(invoice.notes)}</div>` : ""}
<div class="footer">
  <div class="sign"><div class="line">توقيع المستلم</div></div>
  <div>${esc(institutionName)}<br/>${managerName ? "المدير: " + esc(managerName) : ""}<br/>صدر بواسطة نظام ALHUSAINIA — ${new Date().toLocaleDateString("ar-EG")}</div>
  <div class="sign"><div class="line">توقيع البائع</div></div>
</div>
</body></html>`;

      const win = window.open("", "_blank", "width=920,height=760");
      if (!win) { toast.error("الرجاء السماح بالنوافذ المنبثقة لطباعة الفاتورة"); return; }
      win.document.open();
      win.document.write(html);
      win.document.close();
      const doPrint = () => { win.focus(); setTimeout(() => win.print(), 400); };
      if (win.document.readyState === "complete") doPrint();
      else win.onload = doPrint;
    } catch (e: any) {
      toast.error("فشل تجهيز الفاتورة: " + (e?.message || ""));
    }
  };

  const filteredProducts = useMemo(() => {
    return productsData;
  }, [productsData]);

  const filteredCustomers = useMemo(() => {
    return customersData;
  }, [customersData]);

  const filteredSuppliers = useMemo(() => {
    return suppliersData;
  }, [suppliersData]);

  const saleTotal = saleItems.reduce((sum, item) => sum + parseFloat(item.unitPrice) * item.quantity, 0);
  const purchaseTotal = purchaseItems.reduce((sum, item) => sum + parseFloat(item.unitPrice) * item.quantity, 0);
  const orderTotal = orderItems.reduce((sum, item) => sum + parseFloat(item.unitPrice) * item.quantity, 0);

  const addItemToSale = () => {
    if (productsData && productsData.length > 0) {
      const p = productsData[0];
      setSaleItems([...saleItems, { productId: p.id, productName: p.name, quantity: 1, unitPrice: p.salePrice || "0" }]);
    }
  };

  const addItemToPurchase = () => {
    if (productsData && productsData.length > 0) {
      const p = productsData[0];
      setPurchaseItems([...purchaseItems, { productId: p.id, productName: p.name, quantity: 1, unitPrice: p.purchasePrice || "0" }]);
    }
  };

  const addItemToOrder = () => {
    if (productsData && productsData.length > 0) {
      const p = productsData[0];
      setOrderItems([...orderItems, { productId: p.id, productName: p.name, quantity: 1, unitPrice: p.salePrice || "0" }]);
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    confirmed: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    shipped: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    partial: "bg-orange-100 text-orange-700",
  };

  const statusLabels: Record<string, string> = {
    draft: "مسودة", confirmed: "مؤكدة", paid: "مدفوعة", pending: "قيد الانتظار",
    processing: "قيد المعالجة", shipped: "تم الشحن", delivered: "تم التوصيل",
    cancelled: "ملغاة", partial: "مدفوعة جزئياً",
  };

  return (
    <div className="min-h-screen bg-[#fbf8f2]">
      <header className="bg-[#102a2b] text-white p-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#b87945] w-9 h-9 rounded-lg flex items-center justify-center font-bold">ح</div>
            <div>
              <h1 className="font-bold text-sm">النظام التجاري</h1>
              <p className="text-[10px] text-white/50">المبيعات • المشتريات • المخازن • الطلبات</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
            <Badge variant="outline" className={`text-[10px] ${isOnline ? "border-green-400 text-green-400" : "border-red-400 text-red-400"}`}>
              {isOnline ? "متصل" : "غير متصل"}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-3">
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="بحث في المنتجات، العملاء، الموردين..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border-gray-200 pr-10 h-9 text-sm"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
          <TabsList className="grid w-full grid-cols-6 h-10 mb-3 bg-white border">
            <TabsTrigger value="products" className="text-[10px]"><Package className="w-3 h-3 ml-1" />المنتجات</TabsTrigger>
            <TabsTrigger value="customers" className="text-[10px]"><Users className="w-3 h-3 ml-1" />العملاء</TabsTrigger>
            <TabsTrigger value="suppliers" className="text-[10px]"><Truck className="w-3 h-3 ml-1" />الموردين</TabsTrigger>
            <TabsTrigger value="sales" className="text-[10px]"><ShoppingCart className="w-3 h-3 ml-1" />المبيعات</TabsTrigger>
            <TabsTrigger value="purchases" className="text-[10px]"><ShoppingBag className="w-3 h-3 ml-1" />المشتريات</TabsTrigger>
            <TabsTrigger value="orders" className="text-[10px]"><ClipboardList className="w-3 h-3 ml-1" />الطلبات</TabsTrigger>
          </TabsList>

          {/* ─── Products Tab ─── */}
          <TabsContent value="products">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">المنتجات والمخازن</CardTitle>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" className="text-xs h-8 border-gray-200" onClick={exportProductsCsv} title="تصدير الأصناف الحالية إلى CSV">
                    <Download className="w-3 h-3 ml-1" />تصدير CSV
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-8 border-gray-200" onClick={() => setShowImportDialog(true)} title="استيراد أصناف/خدمات من ملف CSV">
                    <Upload className="w-3 h-3 ml-1" />استيراد CSV
                  </Button>
                  <Button size="sm" className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] text-xs h-8" onClick={() => setShowProductDialog(true)}>
                    <Plus className="w-3 h-3 ml-1" />منتج جديد
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {loadingProducts && <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>}
                  {!loadingProducts && filteredProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="bg-[#102a2b] text-[#b87945] w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs">
                          {p.code}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-[#102a2b]">{p.name}</p>
                          <p className="text-[10px] text-gray-500">{p.category || "بدون فئة"} • {p.unit}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-center">
                          <p className="text-[10px] text-gray-500">المخزون</p>
                          <p className={`font-bold ${p.currentStock <= p.minStock ? "text-red-600" : "text-green-600"}`}>{p.currentStock}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-gray-500">سعر الشراء</p>
                          <p className="font-bold text-[#102a2b]">{p.purchasePrice}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-gray-500">سعر البيع</p>
                          <p className="font-bold text-green-600">{p.salePrice}</p>
                        </div>
                        {p.barcode && <Barcode className="w-4 h-4 text-gray-400" />}
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="outline" className="w-6 h-6 text-[10px]" title="تعديل المنتج"
                            onClick={() => { setEditProductForm({ id: p.id, name: p.name, salePrice: p.salePrice, purchasePrice: p.purchasePrice, minStock: p.minStock, barcode: p.barcode || "" }); setEditProduct(p); }}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="outline" className="w-6 h-6 text-[10px]" title="تعديل المخزون"
                            onClick={() => { setAdjustForm({ quantity: 1, type: "in", notes: "" }); setAdjustProduct(p); }}>
                            <PackagePlus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredProducts.length === 0 && <p className="text-center text-gray-400 text-sm py-8">لا توجد منتجات</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Customers Tab ─── */}
          <TabsContent value="customers">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">العملاء</CardTitle>
                <Button size="sm" className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] text-xs h-8" onClick={() => setShowCustomerDialog(true)}>
                  <Plus className="w-3 h-3 ml-1" />عميل جديد
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {loadingCustomers && <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>}
                  {!loadingCustomers && filteredCustomers.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="bg-[#b87945] text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs">
                          {c.code}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-[#102a2b]">{c.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                            {c.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.city}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-gray-500">الرصيد</p>
                        <p className={`font-bold text-xs ${parseFloat(c.balance) > 0 ? "text-red-600" : "text-green-600"}`}>{c.balance}</p>
                      </div>
                    </div>
                  ))}
                  {filteredCustomers.length === 0 && <p className="text-center text-gray-400 text-sm py-8">لا يوجد عملاء</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Suppliers Tab ─── */}
          <TabsContent value="suppliers">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">الموردين</CardTitle>
                <Button size="sm" className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] text-xs h-8" onClick={() => setShowSupplierDialog(true)}>
                  <Plus className="w-3 h-3 ml-1" />مورد جديد
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {loadingSuppliers && <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>}
                  {!loadingSuppliers && filteredSuppliers.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="bg-[#102a2b] text-[#b87945] w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs">
                          {s.code}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-[#102a2b]">{s.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                            {s.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.city}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-gray-500">الرصيد</p>
                        <p className="font-bold text-xs text-red-600">{s.balance}</p>
                      </div>
                    </div>
                  ))}
                  {filteredSuppliers.length === 0 && <p className="text-center text-gray-400 text-sm py-8">لا يوجد موردين</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Sales Tab ─── */}
          <TabsContent value="sales">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">فواتير المبيعات / نقطة البيع</CardTitle>
                <Button size="sm" className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] text-xs h-8" onClick={() => setShowSaleDialog(true)}>
                  <Plus className="w-3 h-3 ml-1" />فاتورة جديدة
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {loadingSales && <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>}
                  {!loadingSales && salesData?.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div>
                        <p className="font-bold text-xs text-[#102a2b]">{inv.invoiceNumber}</p>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1"><User className="w-3 h-3" />{customerNameOf(inv.customerId)}</p>
                        <p className="text-[10px] text-gray-400">{new Date(inv.invoiceDate).toLocaleDateString("ar-EG")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`text-[10px] ${statusColors[inv.status] || ""}`}>{statusLabels[inv.status] || inv.status}</Badge>
                        <p className="font-bold text-xs text-green-600">{inv.total} ر.ي</p>
                        <p className="text-[9px] text-gray-400">المدفوع: {Number(inv.paidAmount || 0).toLocaleString("en-US")} · المتبقي: {Number(inv.total).toLocaleString("en-US")}</p>
                        {inv.status !== "cancelled" && Number(inv.total) - Number(inv.paidAmount || 0) > 0.01 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[9px] h-6 text-emerald-700 border-emerald-200"
                            onClick={() => openPayDialog(inv, "sales")}
                          >
                            <Wallet className="w-3 h-3" /> دفعة
                          </Button>
                        )}
                        {inv.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[9px] h-6 text-sky-700 border-sky-200"
                            onClick={() => handlePrintSaleInvoice(inv.id)}
                          >
                            <Printer className="w-3 h-3" /> طباعة
                          </Button>
                        )}
                        {inv.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[9px] h-6 text-red-600 border-red-200"
                            disabled={updateSaleStatus.isPending}
                            onClick={() => { if (confirm("إلغاء الفاتورة؟ سيتم عكس المخزون والرصيد.")) updateSaleStatus.mutate({ id: inv.id, status: "cancelled" }); }}
                          >
                            إلغاء
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!salesData || salesData.length === 0) && <p className="text-center text-gray-400 text-sm py-8">لا توجد فواتير مبيعات</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Purchases Tab ─── */}
          <TabsContent value="purchases">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">فواتير المشتريات</CardTitle>
                <Button size="sm" className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] text-xs h-8" onClick={() => setShowPurchaseDialog(true)}>
                  <Plus className="w-3 h-3 ml-1" />فاتورة جديدة
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {loadingPurchases && <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>}
                  {!loadingPurchases && purchasesData?.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div>
                        <p className="font-bold text-xs text-[#102a2b]">{inv.invoiceNumber}</p>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1"><Truck className="w-3 h-3" />{supplierNameOf(inv.supplierId)}</p>
                        <p className="text-[10px] text-gray-400">{new Date(inv.invoiceDate).toLocaleDateString("ar-EG")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`text-[10px] ${statusColors[inv.status] || ""}`}>{statusLabels[inv.status] || inv.status}</Badge>
                        <p className="font-bold text-xs text-red-600">{inv.total} ر.ي</p>
                        <p className="text-[9px] text-gray-400">المدفوع: {Number(inv.paidAmount || 0).toLocaleString("en-US")} · المتبقي: {Number(inv.total).toLocaleString("en-US")}</p>
                        {inv.status !== "cancelled" && Number(inv.total) - Number(inv.paidAmount || 0) > 0.01 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[9px] h-6 text-emerald-700 border-emerald-200"
                            onClick={() => openPayDialog(inv, "purchases")}
                          >
                            <Wallet className="w-3 h-3" /> دفعة
                          </Button>
                        )}
                        {inv.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[9px] h-6 text-red-600 border-red-200"
                            disabled={updatePurchaseStatus.isPending}
                            onClick={() => { if (confirm("إلغاء الفاتورة؟ سيتم عكس المخزون والرصيد.")) updatePurchaseStatus.mutate({ id: inv.id, status: "cancelled" }); }}
                          >
                            إلغاء
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!purchasesData || purchasesData.length === 0) && <p className="text-center text-gray-400 text-sm py-8">لا توجد فواتير مشتريات</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Orders Tab ─── */}
          <TabsContent value="orders">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">طلبات التوزيع
                  {pendingWebOrders > 0 && <Badge className="mr-2 text-[9px] bg-purple-100 text-purple-700">طلبات المتجر المعلقة: {pendingWebOrders}</Badge>}
                </CardTitle>
                <Button size="sm" className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] text-xs h-8" onClick={() => setShowOrderDialog(true)}>
                  <Plus className="w-3 h-3 ml-1" />طلب جديد
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {loadingOrders && <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>}
                  {!loadingOrders && ordersData?.map((o) => (
                    <div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div>
                        <p className="font-bold text-xs text-[#102a2b] flex items-center gap-2">
                          {o.orderNumber}
                          {isWebOrder(o) && <Badge className="text-[9px] bg-purple-100 text-purple-700">متجر إلكتروني</Badge>}
                        </p>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1"><User className="w-3 h-3" />{customerNameOf(o.customerId)} • {o.deliveryAddress || "بدون عنوان"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Select value={o.status} onValueChange={(v) => updateOrderStatus.mutate({ id: o.id, status: v as any })}>
                          <SelectTrigger className="w-24 h-7 text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">قيد الانتظار</SelectItem>
                            <SelectItem value="confirmed">مؤكد</SelectItem>
                            <SelectItem value="processing">قيد المعالجة</SelectItem>
                            <SelectItem value="shipped">تم الشحن</SelectItem>
                            <SelectItem value="delivered">تم التوصيل</SelectItem>
                            <SelectItem value="cancelled">ملغي</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="font-bold text-xs text-[#102a2b]">{o.total} ر.ي</p>
                        {isWebOrder(o) && o.status !== "cancelled" && o.status !== "delivered" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[9px] h-6 text-[#102a2b] border-[#b87945]/40 hover:bg-[#f5ece0]"
                            onClick={() => { setConvertForm({ paymentMethod: "cash", paidAmount: "0" }); setConvertOrder(o); }}
                          >
                            <ReceiptText className="w-3 h-3" /> فاتورة مبيعات
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!ordersData || ordersData.length === 0) && <p className="text-center text-gray-400 text-sm py-8">لا توجد طلبات</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ─── Product Dialog ─── */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle className="text-sm text-[#102a2b]">إضافة منتج جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px]">كود المنتج</Label><Input value={productForm.code} onChange={(e) => setProductForm({ ...productForm, code: e.target.value })} className="h-8 text-xs" /></div>
              <div><Label className="text-[10px]">اسم المنتج</Label><Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="h-8 text-xs" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px]">الفئة</Label><Input value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} className="h-8 text-xs" /></div>
              <div><Label className="text-[10px]">الوحدة</Label><Input value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} className="h-8 text-xs" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px]">سعر الشراء</Label><Input type="number" value={productForm.purchasePrice} onChange={(e) => setProductForm({ ...productForm, purchasePrice: e.target.value })} className="h-8 text-xs" /></div>
              <div><Label className="text-[10px]">سعر البيع</Label><Input type="number" value={productForm.salePrice} onChange={(e) => setProductForm({ ...productForm, salePrice: e.target.value })} className="h-8 text-xs" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px]">الحد الأدنى للمخزون</Label><Input type="number" value={productForm.minStock} onChange={(e) => setProductForm({ ...productForm, minStock: parseInt(e.target.value) || 0 })} className="h-8 text-xs" /></div>
              <div><Label className="text-[10px]">الباركود</Label><Input value={productForm.barcode} onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })} className="h-8 text-xs" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowProductDialog(false)} className="h-8 text-xs">إلغاء</Button>
            <Button size="sm" className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] h-8 text-xs" disabled={isCreatingProduct} onClick={() => createProduct.mutate(productForm)}>{isCreatingProduct ? "جاري الحفظ..." : "حفظ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Customer Dialog ─── */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle className="text-sm text-[#102a2b]">إضافة عميل جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px]">كود العميل</Label><Input value={customerForm.code} onChange={(e) => setCustomerForm({ ...customerForm, code: e.target.value })} className="h-8 text-xs" /></div>
              <div><Label className="text-[10px]">اسم العميل</Label><Input value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} className="h-8 text-xs" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px]">الهاتف</Label><Input value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} className="h-8 text-xs" /></div>
              <div><Label className="text-[10px]">المدينة</Label><Input value={customerForm.city} onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })} className="h-8 text-xs" /></div>
            </div>
            <div><Label className="text-[10px]">العنوان</Label><Input value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} className="h-8 text-xs" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCustomerDialog(false)} className="h-8 text-xs">إلغاء</Button>
            <Button size="sm" className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] h-8 text-xs" disabled={isCreatingCustomer} onClick={() => createCustomer.mutate(customerForm)}>{isCreatingCustomer ? "جاري الحفظ..." : "حفظ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Supplier Dialog ─── */}
      <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle className="text-sm text-[#102a2b]">إضافة مورد جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px]">كود المورد</Label><Input value={supplierForm.code} onChange={(e) => setSupplierForm({ ...supplierForm, code: e.target.value })} className="h-8 text-xs" /></div>
              <div><Label className="text-[10px]">اسم المورد</Label><Input value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} className="h-8 text-xs" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px]">الهاتف</Label><Input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} className="h-8 text-xs" /></div>
              <div><Label className="text-[10px]">المدينة</Label><Input value={supplierForm.city} onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })} className="h-8 text-xs" /></div>
            </div>
            <div><Label className="text-[10px]">العنوان</Label><Input value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} className="h-8 text-xs" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowSupplierDialog(false)} className="h-8 text-xs">إلغاء</Button>
            <Button size="sm" className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] h-8 text-xs" disabled={isCreatingSupplier} onClick={() => createSupplier.mutate(supplierForm)}>{isCreatingSupplier ? "جاري الحفظ..." : "حفظ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Sale Dialog ─── */}
      <Dialog open={showSaleDialog} onOpenChange={setShowSaleDialog}>
        <DialogContent className="bg-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-sm text-[#102a2b]">فاتورة مبيعات جديدة / نقطة بيع</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">العميل</Label>
                <Select value={saleCustomerId?.toString() || ""} onValueChange={(v) => setSaleCustomerId(parseInt(v))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر عميل" /></SelectTrigger>
                  <SelectContent>
                    {customersData?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">طريقة الدفع</Label>
                <Select value={salePayment} onValueChange={(v) => setSalePayment(v as any)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="card">بطاقة</SelectItem>
                    <SelectItem value="transfer">تحويل</SelectItem>
                    <SelectItem value="credit">آجل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border rounded-lg p-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[10px] font-bold">الأصناف</Label>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={addItemToSale}><Plus className="w-3 h-3" />إضافة صنف</Button>
              </div>
              {saleItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <Input value={item.productName} readOnly className="h-7 text-[10px] flex-1" />
                  <Input type="number" value={item.quantity} onChange={(e) => {
                    const newItems = [...saleItems];
                    newItems[idx].quantity = parseInt(e.target.value) || 1;
                    setSaleItems(newItems);
                  }} className="h-7 text-[10px] w-16" />
                  <Input type="number" value={item.unitPrice} onChange={(e) => {
                    const newItems = [...saleItems];
                    newItems[idx].unitPrice = e.target.value;
                    setSaleItems(newItems);
                  }} className="h-7 text-[10px] w-20" />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSaleItems(saleItems.filter((_, i) => i !== idx))}>
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-end pt-2 border-t">
                <p className="text-sm font-bold text-[#102a2b]">الإجمالي: {saleTotal.toLocaleString()} ر.ي</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowSaleDialog(false)} className="h-8 text-xs">إلغاء</Button>
            <Button size="sm" className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] h-8 text-xs"
              onClick={() => createSale.mutate({ customerId: saleCustomerId, items: saleItems, paymentMethod: salePayment, paidAmount: salePayment === "cash" ? saleTotal.toString() : "0" })}
              disabled={saleItems.length === 0 || isCreatingSale}>
              {isCreatingSale ? "جاري الإنشاء..." : "تأكيد الفاتورة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Purchase Dialog ─── */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="bg-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-sm text-[#102a2b]">فاتورة مشتريات جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[10px]">المورد</Label>
              <Select value={purchaseSupplierId?.toString() || ""} onValueChange={(v) => setPurchaseSupplierId(parseInt(v))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر مورد" /></SelectTrigger>
                <SelectContent>
                  {suppliersData?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="border rounded-lg p-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[10px] font-bold">الأصناف</Label>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={addItemToPurchase}><Plus className="w-3 h-3" />إضافة صنف</Button>
              </div>
              {purchaseItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <Input value={item.productName} readOnly className="h-7 text-[10px] flex-1" />
                  <Input type="number" value={item.quantity} onChange={(e) => {
                    const newItems = [...purchaseItems];
                    newItems[idx].quantity = parseInt(e.target.value) || 1;
                    setPurchaseItems(newItems);
                  }} className="h-7 text-[10px] w-16" />
                  <Input type="number" value={item.unitPrice} onChange={(e) => {
                    const newItems = [...purchaseItems];
                    newItems[idx].unitPrice = e.target.value;
                    setPurchaseItems(newItems);
                  }} className="h-7 text-[10px] w-20" />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setPurchaseItems(purchaseItems.filter((_, i) => i !== idx))}>
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-end pt-2 border-t">
                <p className="text-sm font-bold text-[#102a2b]">الإجمالي: {purchaseTotal.toLocaleString()} ر.ي</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowPurchaseDialog(false)} className="h-8 text-xs">إلغاء</Button>
            <Button size="sm" className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] h-8 text-xs"
              onClick={() => createPurchase.mutate({ supplierId: purchaseSupplierId, items: purchaseItems, paidAmount: "0" })}
              disabled={purchaseItems.length === 0 || isCreatingPurchase}>
              {isCreatingPurchase ? "جاري الإنشاء..." : "تأكيد الفاتورة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Order Dialog ─── */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="bg-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-sm text-[#102a2b]">طلب توزيع جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">العميل</Label>
                <Select value={orderCustomerId?.toString() || ""} onValueChange={(v) => setOrderCustomerId(parseInt(v))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر عميل" /></SelectTrigger>
                  <SelectContent>
                    {customersData?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">عنوان التوصيل</Label>
                <Input value={orderAddress} onChange={(e) => setOrderAddress(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div className="border rounded-lg p-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[10px] font-bold">الأصناف</Label>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={addItemToOrder}><Plus className="w-3 h-3" />إضافة صنف</Button>
              </div>
              {orderItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <Input value={item.productName} readOnly className="h-7 text-[10px] flex-1" />
                  <Input type="number" value={item.quantity} onChange={(e) => {
                    const newItems = [...orderItems];
                    newItems[idx].quantity = parseInt(e.target.value) || 1;
                    setOrderItems(newItems);
                  }} className="h-7 text-[10px] w-16" />
                  <Input type="number" value={item.unitPrice} onChange={(e) => {
                    const newItems = [...orderItems];
                    newItems[idx].unitPrice = e.target.value;
                    setOrderItems(newItems);
                  }} className="h-7 text-[10px] w-20" />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}>
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-end pt-2 border-t">
                <p className="text-sm font-bold text-[#102a2b]">الإجمالي: {orderTotal.toLocaleString()} ر.ي</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowOrderDialog(false)} className="h-8 text-xs">إلغاء</Button>
            <Button size="sm" className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] h-8 text-xs"
              onClick={() => createOrder.mutate({ customerId: orderCustomerId, items: orderItems, deliveryAddress: orderAddress })}
              disabled={orderItems.length === 0 || isCreatingOrder}>
              {isCreatingOrder ? "جاري الإنشاء..." : "إنشاء الطلب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog (Receipt / Settlement) */}
      <Dialog open={!!payTarget} onOpenChange={(o) => !o && setPayTarget(null)}>
        <DialogContent className="max-w-md font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#b87945]" /> تسجيل دفعة / سند قبض
            </DialogTitle>
          </DialogHeader>
          {payTarget && (
            <div className="space-y-3 pt-2">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs space-y-1">
                <p className="font-bold text-slate-800">{payTarget.invoice.invoiceNumber}</p>
                <p className="text-slate-600">
                  إجمالي الفاتورة: <b>{Number(payTarget.invoice.total).toLocaleString("en-US")}</b> · المدفوع: <b>{Number(payTarget.invoice.paidAmount || 0).toLocaleString("en-US")}</b>
                </p>
                <p className="text-emerald-700 font-bold">المتبقي: {Math.max(0, Number(payTarget.invoice.total) - Number(payTarget.invoice.paidAmount || 0)).toLocaleString("en-US")}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">مبلغ الدفعة</Label>
                  <Input type="number" min="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" className="h-8 text-xs font-mono bg-slate-50" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">طريقة الدفع</Label>
                  <Select value={payMethod} onValueChange={(v) => setPayMethod(v as any)}>
                    <SelectTrigger className="h-8 text-xs bg-slate-50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash" className="text-xs">نقدي</SelectItem>
                      <SelectItem value="transfer" className="text-xs">تحويل بنكي</SelectItem>
                      <SelectItem value="card" className="text-xs">بطاقة</SelectItem>
                      <SelectItem value="online" className="text-xs">إلكتروني</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">تاريخ الدفعة (اختياري)</Label>
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="h-8 text-xs bg-slate-50" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">ملاحظات (اختياري)</Label>
                <Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="مثال: دفعة أولى..." className="h-8 text-xs bg-slate-50" />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 pt-2">
            <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer select-none">
              <input type="checkbox" checked={printAfterSave} onChange={(e) => setPrintAfterSave(e.target.checked)} className="accent-[#b87945]" />
              اطبع سند {payTarget?.source === "purchases" ? "صرف" : "قبض"} بعد الحفظ
            </label>
            <Button variant="outline" size="sm" onClick={() => setPayTarget(null)} className="text-xs h-8">إلغاء</Button>
            <Button size="sm" onClick={handlePay} disabled={createPayment.isPending} className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              {createPayment.isPending ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <Wallet className="w-3 h-3 ml-1" />}
              تسجيل الدفعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={!!editProduct} onOpenChange={(o) => !o && setEditProduct(null)}>
        <DialogContent className="max-w-md font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Edit className="w-4 h-4 text-[#b87945]" /> تعديل منتج: {editProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">اسم المنتج</Label>
              <Input value={editProductForm.name} onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })} className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">سعر البيع</Label>
                <Input value={editProductForm.salePrice} onChange={(e) => setEditProductForm({ ...editProductForm, salePrice: e.target.value })} className="h-8 text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">سعر الشراء</Label>
                <Input value={editProductForm.purchasePrice} onChange={(e) => setEditProductForm({ ...editProductForm, purchasePrice: e.target.value })} className="h-8 text-xs font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">حد الإنذار (minStock)</Label>
                <Input type="number" min="0" value={editProductForm.minStock} onChange={(e) => setEditProductForm({ ...editProductForm, minStock: Number(e.target.value) })} className="h-8 text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">الباركود</Label>
                <Input value={editProductForm.barcode} onChange={(e) => setEditProductForm({ ...editProductForm, barcode: e.target.value })} className="h-8 text-xs font-mono" dir="ltr" />
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditProduct(null)} className="text-xs h-8">إلغاء</Button>
            <Button size="sm" onClick={() => updateProduct.mutate({ id: editProductForm.id, name: editProductForm.name, salePrice: editProductForm.salePrice, purchasePrice: editProductForm.purchasePrice, minStock: editProductForm.minStock, barcode: editProductForm.barcode || undefined })} disabled={updateProduct.isPending} className="text-xs h-8 bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] font-bold">
              {updateProduct.isPending ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <CheckCircle className="w-3 h-3 ml-1" />}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={!!adjustProduct} onOpenChange={(o) => !o && setAdjustProduct(null)}>
        <DialogContent className="max-w-md font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <PackagePlus className="w-4 h-4 text-[#b87945]" /> تعديل المخزون: {adjustProduct?.name}
            </DialogTitle>
          </DialogHeader>
          {adjustProduct && (
            <div className="space-y-3 pt-2">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs">
                <p className="text-slate-600">المخزون الحالي: <b className={adjustProduct.currentStock <= adjustProduct.minStock ? "text-red-600" : "text-slate-800"}>{adjustProduct.currentStock}</b> {adjustProduct.unit}</p>
                <p className="text-slate-500 text-[10px]">حد الإنذار: {adjustProduct.minStock} {adjustProduct.unit}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">نوع العملية</Label>
                <Select value={adjustForm.type} onValueChange={(v) => setAdjustForm({ ...adjustForm, type: v as any })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in" className="text-xs">تزويد المخزون (+)</SelectItem>
                    <SelectItem value="out" className="text-xs">صرف من المخزون (−)</SelectItem>
                    <SelectItem value="adjustment" className="text-xs">تسوية / جرد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">الكمية</Label>
                <Input type="number" min="1" value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Math.max(1, Number(e.target.value)) })} className="h-8 text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">سبب العملية (اختياري)</Label>
                <Input value={adjustForm.notes} onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })} placeholder="مثال: جرد شهري، تالف..." className="h-8 text-xs" />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setAdjustProduct(null)} className="text-xs h-8">إلغاء</Button>
            <Button size="sm" onClick={() => adjustStock.mutate({ productId: adjustProduct.id, quantity: adjustForm.quantity, type: adjustForm.type, notes: adjustForm.notes || undefined })} disabled={adjustStock.isPending} className="text-xs h-8 bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] font-bold">
              {adjustStock.isPending ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <CheckCircle className="w-3 h-3 ml-1" />}
              تنفيذ العملية
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Order to Invoice Dialog */}
      <Dialog open={!!convertOrder} onOpenChange={(o) => !o && setConvertOrder(null)}>
        <DialogContent className="max-w-md font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-[#b87945]" /> تحويل الطلب إلى فاتورة مبيعات
            </DialogTitle>
          </DialogHeader>
          {convertOrder && (
            <div className="space-y-3 pt-2">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-2">
                  {convertOrder.orderNumber}
                  {isWebOrder(convertOrder) && <Badge className="text-[9px] bg-purple-100 text-purple-700">متجر إلكتروني</Badge>}
                </p>
                <p className="text-slate-500">الإجمالي: <b className="text-slate-800 font-mono">{Number(convertOrder.total).toLocaleString("en-US")} ر.ي</b></p>
                <p className="text-[10px] text-slate-400">المخزون محجوز منذ وقت الطلب — لن يُخصم مرة أخرى عند إنشاء الفاتورة</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">طريقة الدفع</Label>
                  <Select value={convertForm.paymentMethod} onValueChange={(v) => setConvertForm({ ...convertForm, paymentMethod: v })}>
                    <SelectTrigger className="h-8 text-xs bg-slate-50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash" className="text-xs">نقدي عند التوصيل</SelectItem>
                      <SelectItem value="card" className="text-xs">بطاقة</SelectItem>
                      <SelectItem value="transfer" className="text-xs">تحويل بنكي</SelectItem>
                      <SelectItem value="online" className="text-xs">إلكتروني</SelectItem>
                      <SelectItem value="credit" className="text-xs">آجل (أجل)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">المبلغ المدفوع الآن</Label>
                  <Input type="number" min="0" max={Number(convertOrder.total)} value={convertForm.paidAmount}
                    onChange={(e) => setConvertForm({ ...convertForm, paidAmount: e.target.value })} className="h-8 text-xs font-mono bg-slate-50" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                المدفوع = الإجمالي → فاتورة «مدفوعة» • أقل من الإجمالي → «مدفوعة جزئياً» والرصيد يتراكم على العميل • صفر → «مؤكدة» (آجل)
              </p>
            </div>
          )}
          <DialogFooter className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setConvertOrder(null)} className="text-xs h-8">إلغاء</Button>
            <Button size="sm" disabled={convertToInvoice.isPending} onClick={() => convertToInvoice.mutate({ orderId: convertOrder.id, paymentMethod: convertForm.paymentMethod as any, paidAmount: convertForm.paidAmount || "0" })} className="text-xs h-8 bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] font-bold">
              {convertToInvoice.isPending ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <ReceiptText className="w-3 h-3 ml-1" />}
              إنشاء الفاتورة والقيود
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(o) => { setShowImportDialog(o); if (!o) { setImportRows(null); setImportFileName(""); } }}>
        <DialogContent className="max-w-md font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#b87945]" /> استيراد الأصناف والخدمات (CSV)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              الأعمدة: <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded" dir="ltr">code,name,type,category,unit,purchasePrice,salePrice,wholesalePrice,minStock,currentStock,barcode</code>
              <br />تُقبل أيضاً رؤوس عربية (الرمز، الاسم، النوع: صنف/خدمة...). الأصناف الموجودة تُحدَّث، والجديدة تُضاف، والمخزون يعدَّل بفارق الرصيد مع تسجيل حركة جرد.
            </p>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-[#e8c9a0] rounded-lg p-5 cursor-pointer bg-[#faf5ed] hover:bg-[#f5ece0] transition-colors">
              <Upload className="w-5 h-5 text-[#b87945]" />
              <span className="text-xs font-bold text-[#5c3d1e]">{importFileName || "اختر ملف CSV"}</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onImportFile(e.target.files?.[0] ?? null)} />
            </label>
            <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={downloadProductTemplate}>
              <Download className="w-3 h-3 ml-1" /> تنزيل نموذج جاهز (Template)
            </Button>
            {importRows && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs space-y-1">
                <p className="font-bold text-slate-700">جاهز للاستيراد: {importRows.length} صفاً</p>
                <p className="text-slate-500 text-[10px]">سيتم التحديث حسب الرمز (code) — الأسعار والرصيد وحد الإنذار ستُحدَّث للقائم منها</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(false)} className="text-xs h-8">إلغاء</Button>
            <Button size="sm" onClick={() => importRows && importCsv.mutate({ rows: importRows })} disabled={!importRows || importRows.length === 0 || importCsv.isPending} className="text-xs h-8 bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] font-bold">
              {importCsv.isPending ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <Upload className="w-3 h-3 ml-1" />}
              تنفيذ الاستيراد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
