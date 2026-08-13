import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BarChart3, Boxes, Building2, CreditCard, FileText, Layers, Package, Plus, ShoppingCart, Truck, Users, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { siteConfig } from "@/lib/siteConfig";
import { useAuth } from "@/_core/hooks/useAuth";

type Tab = "dashboard" | "customers" | "suppliers" | "products" | "sales" | "purchases" | "orders" | "distribution" | "payments" | "expenses" | "requests" | "messages";

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: "dashboard", label: "لوحة التحكم", icon: BarChart3 },
  { id: "customers", label: "العملاء", icon: Users },
  { id: "suppliers", label: "الموردون", icon: Truck },
  { id: "products", label: "المخزون والمنتجات", icon: Boxes },
  { id: "sales", label: "المبيعات", icon: ShoppingCart },
  { id: "purchases", label: "المشتريات", icon: FileText },
  { id: "orders", label: "طلبات العملاء", icon: Package },
  { id: "distribution", label: "التوزيع", icon: Layers },
  { id: "payments", label: "المدفوعات", icon: CreditCard },
  { id: "expenses", label: "المصروفات", icon: Wallet },
  { id: "requests", label: "طلبات الخدمات", icon: FileText },
  { id: "messages", label: "الرسائل", icon: Building2 },
];

function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">{text}</div>; }

export default function Commerce() {
  const { user } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/commerce" });
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const dashboard = trpc.commerce.dashboard.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const customers = trpc.commerce.customers.list.useQuery(undefined, { enabled: Boolean(user) && activeTab === "customers", retry: false });
  const suppliers = trpc.commerce.suppliers.list.useQuery(undefined, { enabled: Boolean(user) && activeTab === "suppliers", retry: false });
  const products = trpc.commerce.products.list.useQuery(undefined, { enabled: Boolean(user) && (activeTab === "products" || activeTab === "sales" || activeTab === "purchases"), retry: false });
  const invoices = trpc.commerce.invoices.list.useQuery(undefined, { enabled: Boolean(user) && (activeTab === "sales" || activeTab === "purchases"), retry: false });
  const orders = trpc.commerce.orders.list.useQuery(undefined, { enabled: Boolean(user) && activeTab === "orders", retry: false });
  const channels = trpc.commerce.distribution.channels.useQuery(undefined, { enabled: Boolean(user) && activeTab === "distribution", retry: false });
  const distributions = trpc.commerce.distribution.list.useQuery(undefined, { enabled: Boolean(user) && activeTab === "distribution", retry: false });
  const payments = trpc.commerce.payments.list.useQuery(undefined, { enabled: Boolean(user) && activeTab === "payments", retry: false });
  const expenses = trpc.commerce.expenses.list.useQuery(undefined, { enabled: Boolean(user) && activeTab === "expenses", retry: false });
  const adminInbox = trpc.admin.inbox.useQuery(undefined, { enabled: Boolean(user) && (activeTab === "requests" || activeTab === "messages"), retry: false });

  const utils = trpc.useUtils();
  const refetchAll = () => { dashboard.refetch(); customers.refetch(); suppliers.refetch(); products.refetch(); invoices.refetch(); orders.refetch(); channels.refetch(); distributions.refetch(); payments.refetch(); expenses.refetch(); };

  const createCustomer = trpc.commerce.customers.create.useMutation({ onSuccess: () => { toast.success("تمت إضافة العميل"); refetchAll(); }, onError: () => toast.error("تعذر إضافة العميل") });
  const createSupplier = trpc.commerce.suppliers.create.useMutation({ onSuccess: () => { toast.success("تمت إضافة المورد"); refetchAll(); }, onError: () => toast.error("تعذر إضافة المورد") });
  const createProduct = trpc.commerce.products.create.useMutation({ onSuccess: () => { toast.success("تمت إضافة المنتج"); refetchAll(); }, onError: () => toast.error("تعذر إضافة المنتج") });
  const adjustStock = trpc.commerce.products.adjustStock.useMutation({ onSuccess: () => { toast.success("تم تحديث المخزون"); refetchAll(); }, onError: () => toast.error("تعذر تحديث المخزون") });
  const createInvoice = trpc.commerce.invoices.create.useMutation({ onSuccess: () => { toast.success("تم إنشاء الفاتورة"); refetchAll(); }, onError: () => toast.error("تعذر إنشاء الفاتورة") });
  const createOrder = trpc.commerce.orders.create.useMutation({ onSuccess: () => { toast.success("تم إنشاء الطلب"); refetchAll(); }, onError: () => toast.error("تعذر إنشاء الطلب") });
  const createChannel = trpc.commerce.distribution.createChannel.useMutation({ onSuccess: () => { toast.success("تمت إضافة قناة التوزيع"); refetchAll(); }, onError: () => toast.error("تعذر إضافة القناة") });
  const createDistribution = trpc.commerce.distribution.create.useMutation({ onSuccess: () => { toast.success("تمت إضافة التوزيع"); refetchAll(); }, onError: () => toast.error("تعذر إضافة التوزيع") });
  const createPayment = trpc.commerce.payments.create.useMutation({ onSuccess: () => { toast.success("تم تسجيل الدفعة"); refetchAll(); }, onError: () => toast.error("تعذر تسجيل الدفعة") });
  const createExpense = trpc.commerce.expenses.create.useMutation({ onSuccess: () => { toast.success("تم تسجيل المصروف"); refetchAll(); }, onError: () => toast.error("تعذر تسجيل المصروف") });

  // Forms state
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", email: "", type: "individual" as "individual" | "company" | "government" | "student" });
  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "", email: "" });
  const [productForm, setProductForm] = useState({ name: "", sku: "", category: "", unit: "وحدة", costPrice: 0, sellingPrice: 0, stockQuantity: 0, minStock: 0 });
  const [stockForm, setStockForm] = useState({ productId: 0, quantity: 1, type: "in" as "in" | "out" | "adjustment" });
  const [invoiceForm, setInvoiceForm] = useState({ invoiceNumber: "", type: "sales" as "sales" | "purchase", customerId: 0, supplierId: 0, total: 0, items: [{ description: "", quantity: 1, unitPrice: 0 }] });
  const [orderForm, setOrderForm] = useState({ orderNumber: "", customerId: 0, total: 0, items: [{ description: "", quantity: 1, unitPrice: 0 }] });
  const [channelForm, setChannelForm] = useState({ name: "", type: "retail" as "retail" | "wholesale" | "online" | "agent" | "other", location: "" });
  const [distForm, setDistForm] = useState({ channelId: 0, productId: 0, quantity: 1 });
  const [paymentForm, setPaymentForm] = useState({ amount: 0, type: "receive" as "receive" | "pay", method: "نقدي" });
  const [expenseForm, setExpenseForm] = useState({ amount: 0, category: "", description: "" });

  if (!user) return <div className="grid min-h-screen place-items-center bg-cream">جارٍ التحميل...</div>;

  const statCards = [
    { label: "العملاء", value: dashboard.data?.customers ?? 0, icon: Users },
    { label: "الموردون", value: dashboard.data?.suppliers ?? 0, icon: Truck },
    { label: "المنتجات", value: dashboard.data?.products ?? 0, icon: Boxes },
    { label: "تنبيه مخزون", value: dashboard.data?.lowStock ?? 0, icon: Package },
    { label: "الفواتير", value: dashboard.data?.invoices ?? 0, icon: FileText },
    { label: "الطلبات", value: dashboard.data?.orders ?? 0, icon: ShoppingCart },
    { label: "الإيرادات", value: `${(dashboard.data?.revenue ?? 0).toLocaleString("ar")} ر.ي`, icon: Wallet },
    { label: "المصروفات", value: `${(dashboard.data?.totalExpenses ?? 0).toLocaleString("ar")} ر.ي`, icon: Building2 },
  ];

  return <div dir="rtl" className="min-h-screen bg-cream text-ink">
    <header className="border-b border-slate-200 bg-cream/90 backdrop-blur"><div className="container flex h-20 items-center justify-between"><Link href="/" className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-copper"><span className="font-display text-xl font-bold">ح</span></div><div><div className="font-display text-lg font-bold">النظام التجاري</div><div className="text-[10px] tracking-[0.14em] text-slate-500">{siteConfig.brand.englishName}</div></div></Link><div className="flex items-center gap-3"><Link href="/account"><Button variant="ghost" className="rounded-full">حسابي</Button></Link><Link href="/"><Button variant="outline" className="rounded-full">الموقع <ArrowRight className="mr-2 h-4 w-4" /></Button></Link></div></div></header>
    <div className="container flex flex-col gap-6 py-8 lg:flex-row">
      <aside className="lg:w-64 lg:shrink-0">
        <nav className="flex gap-2 overflow-x-auto rounded-3xl border border-slate-200 bg-white p-2 lg:flex-col lg:overflow-visible">
          {tabs.map((tab) => { const Icon = tab.icon; return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${activeTab === tab.id ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-50"}`}><Icon className="h-4 w-4" />{tab.label}</button>; })}
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        {activeTab === "dashboard" && <div className="space-y-6">
          <div className="rounded-[2rem] bg-ink p-8 text-white"><h1 className="font-display text-3xl font-bold">لوحة النظام التجاري</h1><p className="mt-2 text-white/65">إدارة كاملة للعملاء والموردين والمخزون والمبيعات والمشتريات والتوزيع والمدفوعات.</p></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{statCards.map(({ label, value, icon: Icon }) => <Card key={label} className="border-0 shadow-soft"><CardContent className="flex items-center gap-4 p-6"><div className="rounded-2xl bg-sand p-3 text-copper"><Icon className="h-5 w-5" /></div><div><p className="text-sm text-slate-500">{label}</p><b className="font-display text-2xl">{value}</b></div></CardContent></Card>)}</div>
        </div>}

        {activeTab === "customers" && <div className="space-y-4">
          <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">إضافة عميل</CardTitle></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-4" onSubmit={(e) => { e.preventDefault(); createCustomer.mutate(customerForm); }}>
            <Input required placeholder="اسم العميل" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} />
            <Input placeholder="رقم الجوال" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
            <Input type="email" placeholder="البريد" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={customerForm.type} onChange={(e) => setCustomerForm({ ...customerForm, type: e.target.value as "individual" | "company" | "government" | "student" })}><option value="individual">فرد</option><option value="company">شركة</option><option value="government">جهة حكومية</option><option value="student">طالب</option></select>
            <Button className="md:col-span-4 bg-ink text-white">إضافة العميل <Plus className="mr-2 h-4 w-4" /></Button>
          </form></CardContent></Card>
          <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">العملاء ({customers.data?.length ?? 0})</CardTitle></CardHeader><CardContent>{customers.data?.length ? <div className="space-y-2">{customers.data.map((c) => <div key={c.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div><b>{c.name}</b><p className="text-xs text-slate-500">{c.phone || "—"} · {c.type}</p></div><Badge variant="outline" className="text-xs">الرصيد: {c.balance}</Badge></div>)}</div> : <Empty text="لا يوجد عملاء بعد. أضف أول عميل." />}</CardContent></Card>
        </div>}

        {activeTab === "suppliers" && <div className="space-y-4">
          <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">إضافة مورد</CardTitle></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); createSupplier.mutate(supplierForm); }}>
            <Input required placeholder="اسم المورد" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
            <Input placeholder="رقم الجوال" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
            <Input type="email" placeholder="البريد" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
            <Button className="md:col-span-3 bg-ink text-white">إضافة المورد <Plus className="mr-2 h-4 w-4" /></Button>
          </form></CardContent></Card>
          <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">الموردون ({suppliers.data?.length ?? 0})</CardTitle></CardHeader><CardContent>{suppliers.data?.length ? <div className="space-y-2">{suppliers.data.map((s) => <div key={s.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><b>{s.name}</b><span className="text-xs text-slate-500">{s.phone || "—"}</span></div>)}</div> : <Empty text="لا يوجد موردون بعد." />}</CardContent></Card>
        </div>}

        {activeTab === "products" && <div className="space-y-4">
          <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">إضافة منتج</CardTitle></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-4" onSubmit={(e) => { e.preventDefault(); createProduct.mutate(productForm); }}>
            <Input required placeholder="اسم المنتج" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
            <Input placeholder="كود المنتج SKU" value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} />
            <Input placeholder="التصنيف" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} />
            <Input placeholder="الوحدة" value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} />
            <Input type="number" placeholder="سعر التكلفة" value={productForm.costPrice} onChange={(e) => setProductForm({ ...productForm, costPrice: Number(e.target.value) })} />
            <Input type="number" placeholder="سعر البيع" value={productForm.sellingPrice} onChange={(e) => setProductForm({ ...productForm, sellingPrice: Number(e.target.value) })} />
            <Input type="number" placeholder="الكمية الابتدائية" value={productForm.stockQuantity} onChange={(e) => setProductForm({ ...productForm, stockQuantity: Number(e.target.value) })} />
            <Input type="number" placeholder="حد التنبيه" value={productForm.minStock} onChange={(e) => setProductForm({ ...productForm, minStock: Number(e.target.value) })} />
            <Button className="md:col-span-4 bg-ink text-white">إضافة المنتج <Plus className="mr-2 h-4 w-4" /></Button>
          </form></CardContent></Card>
          <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">تعديل المخزون</CardTitle></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-4" onSubmit={(e) => { e.preventDefault(); if (stockForm.productId) adjustStock.mutate(stockForm); }}>
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={stockForm.productId} onChange={(e) => setStockForm({ ...stockForm, productId: Number(e.target.value) })}><option value={0}>اختر المنتج</option>{products.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <Input type="number" min={1} placeholder="الكمية" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: Number(e.target.value) })} />
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={stockForm.type} onChange={(e) => setStockForm({ ...stockForm, type: e.target.value as any })}><option value="in">إدخال</option><option value="out">إخراج</option><option value="adjustment">تسوية</option></select>
            <Button className="bg-copper text-white">تحديث المخزون</Button>
          </form></CardContent></Card>
          <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">المخزون ({products.data?.length ?? 0})</CardTitle></CardHeader><CardContent>{products.data?.length ? <div className="space-y-2">{products.data.map((p) => <div key={p.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div><b>{p.name}</b><p className="text-xs text-slate-500">{p.sku || "—"} · {p.category || "عام"}</p></div><div className="flex items-center gap-3"><span className="text-sm">شراء: {p.costPrice} · بيع: {p.sellingPrice}</span><Badge className={p.stockQuantity <= p.minStock ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"}>{p.stockQuantity} {p.unit}</Badge></div></div>)}</div> : <Empty text="لا توجد منتجات بعد." />}</CardContent></Card>
        </div>}

        {(activeTab === "sales" || activeTab === "purchases") && <div className="space-y-4">
          <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">{activeTab === "sales" ? "إنشاء فاتورة مبيعات" : "إنشاء فاتورة مشتريات"}</CardTitle></CardHeader><CardContent>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); createInvoice.mutate({ ...invoiceForm, type: activeTab === "sales" ? "sales" : "purchase", total: invoiceForm.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) }); }}>
              <div className="grid gap-3 md:grid-cols-2"><Input required placeholder="رقم الفاتورة" value={invoiceForm.invoiceNumber} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} /><span className="text-sm text-slate-500">النوع: {activeTab === "sales" ? "مبيعات" : "مشتريات"}</span></div>
              {invoiceForm.items.map((item, i) => <div key={i} className="grid gap-2 md:grid-cols-3"><Input required placeholder="الوصف" value={item.description} onChange={(e) => { const items = [...invoiceForm.items]; items[i].description = e.target.value; setInvoiceForm({ ...invoiceForm, items }); }} /><Input type="number" min={1} placeholder="الكمية" value={item.quantity} onChange={(e) => { const items = [...invoiceForm.items]; items[i].quantity = Number(e.target.value); setInvoiceForm({ ...invoiceForm, items }); }} /><Input type="number" min={0} placeholder="سعر الوحدة" value={item.unitPrice} onChange={(e) => { const items = [...invoiceForm.items]; items[i].unitPrice = Number(e.target.value); setInvoiceForm({ ...invoiceForm, items }); }} /></div>)}
              <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setInvoiceForm({ ...invoiceForm, items: [...invoiceForm.items, { description: "", quantity: 1, unitPrice: 0 }] })}>إضافة بند</Button><Button disabled={createInvoice.isPending} className="bg-ink text-white">{createInvoice.isPending ? "جارٍ..." : "إنشاء الفاتورة"}</Button></div>
            </form>
          </CardContent></Card>
          <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">الفواتير ({invoices.data?.length ?? 0})</CardTitle></CardHeader><CardContent>{invoices.data?.length ? <div className="space-y-2">{invoices.data.map((inv) => <div key={inv.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div><b className="text-sm">{inv.invoiceNumber}</b><p className="text-xs text-slate-500">{inv.type === "sales" ? "مبيعات" : "مشتريات"} · {new Date(inv.createdAt).toLocaleDateString("ar")}</p></div><div className="flex items-center gap-3"><span className="font-bold">{inv.total.toLocaleString("ar")}</span><Badge variant={inv.status === "paid" ? "default" : "outline"}>{inv.status === "paid" ? "مدفوعة" : inv.status === "issued" ? "صادرة" : inv.status}</Badge></div></div>)}</div> : <Empty text="لا توجد فواتير بعد." />}</CardContent></Card>
        </div>}

        {activeTab === "orders" && <div className="space-y-4">
          <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">إنشاء طلب عميل</CardTitle></CardHeader><CardContent>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); createOrder.mutate({ ...orderForm, total: orderForm.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) }); }}>
              <div className="grid gap-3 md:grid-cols-2"><Input required placeholder="رقم الطلب" value={orderForm.orderNumber} onChange={(e) => setOrderForm({ ...orderForm, orderNumber: e.target.value })} /><Input type="number" placeholder="معرف العميل (اختياري)" value={orderForm.customerId || ""} onChange={(e) => setOrderForm({ ...orderForm, customerId: Number(e.target.value) })} /></div>
              {orderForm.items.map((item, i) => <div key={i} className="grid gap-2 md:grid-cols-3"><Input required placeholder="الوصف" value={item.description} onChange={(e) => { const items = [...orderForm.items]; items[i].description = e.target.value; setOrderForm({ ...orderForm, items }); }} /><Input type="number" min={1} placeholder="الكمية" value={item.quantity} onChange={(e) => { const items = [...orderForm.items]; items[i].quantity = Number(e.target.value); setOrderForm({ ...orderForm, items }); }} /><Input type="number" min={0} placeholder="سعر الوحدة" value={item.unitPrice} onChange={(e) => { const items = [...orderForm.items]; items[i].unitPrice = Number(e.target.value); setOrderForm({ ...orderForm, items }); }} /></div>)}
              <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setOrderForm({ ...orderForm, items: [...orderForm.items, { description: "", quantity: 1, unitPrice: 0 }] })}>إضافة بند</Button><Button className="bg-copper text-white">إنشاء الطلب</Button></div>
            </form>
          </CardContent></Card>
          <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">الطلبات ({orders.data?.length ?? 0})</CardTitle></CardHeader><CardContent>{orders.data?.length ? <div className="space-y-2">{orders.data.map((o) => <div key={o.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div><b className="text-sm">{o.orderNumber}</b><p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleDateString("ar")}</p></div><div className="flex items-center gap-3"><span className="font-bold">{o.total.toLocaleString("ar")}</span><Badge variant={o.status === "delivered" ? "default" : "outline"}>{o.status}</Badge></div></div>)}</div> : <Empty text="لا توجد طلبات بعد." />}</CardContent></Card>
        </div>}

        {activeTab === "distribution" && <div className="space-y-4">
          <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">إضافة قناة توزيع</CardTitle></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); createChannel.mutate(channelForm); }}>
            <Input required placeholder="اسم القناة" value={channelForm.name} onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })} />
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={channelForm.type} onChange={(e) => setChannelForm({ ...channelForm, type: e.target.value as "retail" | "wholesale" | "online" | "agent" | "other" })}><option value="retail">تجزئة</option><option value="wholesale">جملة</option><option value="online">أونلاين</option><option value="agent">وكيل</option><option value="other">أخرى</option></select>
            <Input placeholder="الموقع" value={channelForm.location} onChange={(e) => setChannelForm({ ...channelForm, location: e.target.value })} />
            <Button className="md:col-span-3 bg-ink text-white">إضافة القناة</Button>
          </form></CardContent></Card>
          <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">توزيع جديد</CardTitle></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); if (distForm.channelId && distForm.productId) createDistribution.mutate(distForm); }}>
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={distForm.channelId} onChange={(e) => setDistForm({ ...distForm, channelId: Number(e.target.value) })}><option value={0}>القناة</option>{channels.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={distForm.productId} onChange={(e) => setDistForm({ ...distForm, productId: Number(e.target.value) })}><option value={0}>المنتج</option>{products.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <Input type="number" min={1} placeholder="الكمية" value={distForm.quantity} onChange={(e) => setDistForm({ ...distForm, quantity: Number(e.target.value) })} />
            <Button className="md:col-span-3 bg-copper text-white">توزيع</Button>
          </form></CardContent></Card>
          <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">عمليات التوزيع ({distributions.data?.length ?? 0})</CardTitle></CardHeader><CardContent>{distributions.data?.length ? <div className="space-y-2">{distributions.data.map((d) => <div key={d.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div><b className="text-sm">توزيع #{d.id}</b><p className="text-xs text-slate-500">القناة: {d.channelId} · المنتج: {d.productId} · الكمية: {d.quantity}</p></div><Badge variant="outline">{d.status}</Badge></div>)}</div> : <Empty text="لا توجد عمليات توزيع بعد." />}</CardContent></Card>
        </div>}

        {activeTab === "payments" && <div className="space-y-4">
          <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">تسجيل دفعة</CardTitle></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); createPayment.mutate(paymentForm); }}>
            <Input type="number" min={1} required placeholder="المبلغ" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} />
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={paymentForm.type} onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value as any })}><option value="receive">قبض</option><option value="pay">دفع</option></select>
            <Input placeholder="طريقة الدفع" value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })} />
            <Button className="md:col-span-3 bg-ink text-white">تسجيل</Button>
          </form></CardContent></Card>
          <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">المدفوعات ({payments.data?.length ?? 0})</CardTitle></CardHeader><CardContent>{payments.data?.length ? <div className="space-y-2">{payments.data.map((p) => <div key={p.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div><b>{p.type === "receive" ? "قبض" : "دفع"}</b><p className="text-xs text-slate-500">{p.method} · {new Date(p.createdAt).toLocaleDateString("ar")}</p></div><b className={p.type === "receive" ? "text-emerald-700" : "text-copper"}>{p.amount.toLocaleString("ar")}</b></div>)}</div> : <Empty text="لا توجد مدفوعات بعد." />}</CardContent></Card>
        </div>}

        {activeTab === "expenses" && <div className="space-y-4">
          <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">تسجيل مصروف</CardTitle></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); createExpense.mutate(expenseForm); }}>
            <Input type="number" min={1} required placeholder="المبلغ" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })} />
            <Input required placeholder="التصنيف" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} />
            <Input placeholder="الوصف" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
            <Button className="md:col-span-3 bg-ink text-white">تسجيل المصروف</Button>
          </form></CardContent></Card>
          <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">المصروفات ({expenses.data?.length ?? 0})</CardTitle></CardHeader><CardContent>{expenses.data?.length ? <div className="space-y-2">{expenses.data.map((e) => <div key={e.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div><b>{e.category}</b><p className="text-xs text-slate-500">{e.description || "—"} · {new Date(e.createdAt).toLocaleDateString("ar")}</p></div><b className="text-copper">{e.amount.toLocaleString("ar")}</b></div>)}</div> : <Empty text="لا توجد مصروفات بعد." />}</CardContent></Card>
        </div>}

        {activeTab === "requests" && <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">طلبات الخدمات ({adminInbox.data?.requests.length ?? 0})</CardTitle></CardHeader><CardContent>{adminInbox.data?.requests.length ? <div className="space-y-2">{adminInbox.data.requests.map((r) => <div key={r.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between"><b className="text-sm">{r.serviceType}</b><Badge variant="outline">{r.status}</Badge></div><p className="mt-1 text-xs text-slate-500">{r.name} — {r.phone}</p><p className="mt-1 text-xs text-slate-400">{r.details}</p></div>)}</div> : <Empty text="لا توجد طلبات خدمات بعد." />}</CardContent></Card>}

        {activeTab === "messages" && <Card className="border-0 shadow-soft"><CardHeader><CardTitle className="font-display">رسائل التواصل ({adminInbox.data?.messages.length ?? 0})</CardTitle></CardHeader><CardContent>{adminInbox.data?.messages.length ? <div className="space-y-2">{adminInbox.data.messages.map((m) => <div key={m.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between"><b className="text-sm">{m.name}</b><span className="text-xs text-slate-400">{m.phone}</span></div><p className="mt-1 text-xs text-slate-500">{m.message}</p></div>)}</div> : <Empty text="لا توجد رسائل بعد." />}</CardContent></Card>}
      </main>
    </div>
  </div>;
}