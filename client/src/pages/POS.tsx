import { useMemo, useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AppSidebar } from "@/components/AppSidebar";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  Banknote,
  CreditCard,
  Send,
  Receipt,
  Smartphone,
  CheckCircle2,
  X,
} from "lucide-react";

interface CartLine {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  stock: number;
  type: string;
}

const PAYMENT_METHODS: {
  value: "cash" | "card" | "transfer" | "credit" | "online";
  label: string;
  icon: typeof Banknote;
}[] = [
  { value: "cash", label: "نقدي", icon: Banknote },
  { value: "card", label: "بطاقة", icon: CreditCard },
  { value: "transfer", label: "تحويل", icon: Send },
  { value: "credit", label: "آجل", icon: Receipt },
  { value: "online", label: "إلكتروني", icon: Smartphone },
];

function fmt(n: number): string {
  return `${(Number.isFinite(n) ? n : 0).toLocaleString("en-US")} ر.ي`;
}

export default function POS() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "transfer" | "credit" | "online"
  >("cash");
  const [globalDiscount, setGlobalDiscount] = useState("0");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [lastInvoice, setLastInvoice] = useState<string | null>(null);
  const [showDaily, setShowDaily] = useState(false);

  const { data: productsRes, isPending: loadingProducts } =
    trpc.products.list.useQuery(
      { search: search || undefined, limit: 100 },
      { staleTime: 30_000, refetchOnWindowFocus: false }
    );
  const products = (productsRes?.items ?? []) as any[];

  const { data: customersRes } = trpc.customers.list.useQuery(
    { search: customerSearch || undefined, limit: 50 },
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );
  const customers = (customersRes?.items ?? []) as any[];

  const { data: daily } = trpc.sales.dailySummary.useQuery(undefined, {
    staleTime: 30_000,
    placeholderData: (p) => p,
  });

  // ── Currency selector + conversion (Module 3) ──
  const { data: currenciesData } = trpc.modules.currencies.list.useQuery(
    undefined,
    { staleTime: 60_000 }
  );
  const [curId, setCurId] = useState<number | "">("");
  const selectedCurrency = useMemo(() => {
    const list = (currenciesData ?? []) as any[];
    if (!list.length) return null;
    return (
      list.find((c) => c.id === curId) ??
      list.find((c) => c.isDefault) ??
      list[0]
    );
  }, [currenciesData, curId]);

  // ── Automatic offer discount per cart line (Module 3) ──
  const [offerDiscounts, setOfferDiscounts] = useState<Record<number, number>>(
    {}
  );
  const setOfferDiscount = useCallback(
    (pid: number, amt: number) =>
      setOfferDiscounts((prev) => ({ ...prev, [pid]: amt })),
    []
  );

  const createSale = trpc.sales.create.useMutation({
    onSuccess: (res: any) => {
      toast.success("تمت عملية البيع بنجاح");
      setLastInvoice(res?.invoiceNumber ?? null);
      setCart([]);
      setPaidAmount("");
      setGlobalDiscount("0");
      setCustomerId(null);
      utils.sales.dailySummary.invalidate();
      utils.sales.list.invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "تعذر إتمام البيع"),
  });

  // ── Cashier shift session (operational DB for POS) ──
  const { data: sessions } = trpc.modules.pos.listSessions.useQuery(undefined, {
    staleTime: 20_000,
    placeholderData: (p) => p,
  });
  const { data: branches } = trpc.modules.branches.list.useQuery(undefined, {
    staleTime: 60_000,
    placeholderData: (p: any) => p,
  });
  const [branchId, setBranchId] = useState<number | "">("");
  const openSession = trpc.modules.pos.openSession.useMutation({
    onSuccess: () => {
      toast.success("تم فتح وردية الكاشير");
      utils.modules.pos.listSessions.invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "تعذر فتح الوردية"),
  });
  const closeSession = trpc.modules.pos.closeSession.useMutation({
    onSuccess: () => {
      toast.success("تم إغلاق وردية الكاشير");
      utils.modules.pos.listSessions.invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "تعذر إغلاق الوردية"),
  });
  const activeSession = useMemo(
    () => (sessions ?? []).find((s: any) => s.status === "open"),
    [sessions]
  );

  const addToCart = (p: any) => {
    const stock = Number(p.currentStock || 0);
    if (p.type === "goods" && stock <= 0) {
      toast.error(`المنتج "${p.name}" نفد من المخزون`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        if (p.type === "goods" && existing.quantity >= stock) {
          toast.error(`الكمية المتاحة من "${p.name}" هي ${stock}`);
          return prev;
        }
        return prev.map((l) =>
          l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          unitPrice: Number(p.salePrice || 0),
          quantity: 1,
          discount: 0,
          stock,
          type: p.type || "goods",
        },
      ];
    });
  };

  const changeQty = (productId: number, delta: number, maxStock: number) => {
    setCart((prev) =>
      prev.map((l) => {
        if (l.productId !== productId) return l;
        const next = l.quantity + delta;
        if (next < 1) return l;
        if (l.type === "goods" && next > maxStock) {
          toast.error(`الكمية المتاحة هي ${maxStock}`);
          return l;
        }
        return { ...l, quantity: next };
      })
    );
  };

  const removeLine = (productId: number) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
    setOfferDiscounts((prev) => {
      const n = { ...prev };
      delete n[productId];
      return n;
    });
  };

  const setLineDiscount = (productId: number, value: number) =>
    setCart((prev) =>
      prev.map((l) =>
        l.productId === productId ? { ...l, discount: Math.max(0, value) } : l
      )
    );

  const subtotal = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const lineDiscounts = cart.reduce((s, l) => s + l.discount, 0);
  const globalDisc = Number(globalDiscount) || 0;
  const total = Math.max(0, subtotal - lineDiscounts - globalDisc);
  const offerTotal = Object.values(offerDiscounts).reduce(
    (s, n) => s + (Number(n) || 0),
    0
  );
  const totalAfterOffers = Math.max(0, total - offerTotal);

  const effectivePaid = useMemo(() => {
    if (paidAmount !== "") return Number(paidAmount) || 0;
    return paymentMethod === "credit" ? 0 : totalAfterOffers;
  }, [paidAmount, paymentMethod, totalAfterOffers]);

  const due = Math.max(0, totalAfterOffers - effectivePaid);

  const submit = () => {
    if (cart.length === 0) {
      toast.error("السلة فارغة");
      return;
    }
    if (effectivePaid > totalAfterOffers + 0.01) {
      toast.error("المبلغ المدفوع يتجاوز إجمالي الفاتورة");
      return;
    }
    createSale.mutate({
      customerId: customerId || undefined,
      items: cart.map((l) => ({
        productId: l.productId,
        productName: l.name,
        quantity: l.quantity,
        unitPrice: String(l.unitPrice),
        discount: String(
          (Number(l.discount) || 0) + (offerDiscounts[l.productId] || 0)
        ),
      })),
      paymentMethod,
      paidAmount: String(effectivePaid),
      discount: String(globalDisc),
    });
  };

  const MethodIcon =
    PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.icon ?? Banknote;

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0e2a2b] text-[#b87945]">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">نقاط البيع</h1>
              <p className="text-[11px] text-muted-foreground">
                محطة كاشير لإنشاء فواتير البيع المباشر
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {lastInvoice && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#0d9488]/10 px-3 py-1 text-[11px] font-bold text-[#0d9488]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {lastInvoice}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDaily((s) => !s)}
            >
              تقرير اليوم
            </Button>
          </div>
        </div>

        {/* Shift session bar */}
        <div className="flex flex-wrap items-center justify-between rounded-xl border border-border bg-card px-4 py-2">
          <div className="flex items-center gap-2 text-[12px]">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                activeSession ? "bg-emerald-500" : "bg-rose-400"
              }`}
            />
          <select
            value={branchId}
            onChange={(e) =>
              setBranchId(e.target.value ? Number(e.target.value) : "")
            }
            className="h-8 rounded-lg border border-border bg-background px-2 text-[12px]"
          >
            <option value="">بدون فرع</option>
            {(branches ?? []).map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {activeSession ? (
              <span className="text-foreground">
                وردية مفتوحة:{" "}
                <span className="font-mono font-bold">{activeSession.code}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">لا توجد وردية كاشير مفتوحة</span>
            )}
          </div>
          {activeSession ? (
            <Button
              size="sm"
              variant="outline"
              disabled={closeSession.isPending}
              onClick={() => {
                if (window.confirm("هل تريد إغلاق وردية الكاشير الحالية؟")) {
                  closeSession.mutate({ id: activeSession.id });
                }
              }}
            >
              إغلاق الوردية
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-[#b87945] text-[#102a2b] hover:bg-[#a06838]"
              disabled={openSession.isPending}
              onClick={() =>
                openSession.mutate({
                  openingFloat: "0",
                  branchId: branchId === "" ? undefined : branchId,
                })
              }
            >
              فتح وردية
            </Button>
          )}
        </div>

        {/* Daily summary */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="فواتير اليوم"
            value={(daily as any)?.invoiceCount ?? 0}
            tone="info"
            icon={Receipt}
          />
          <StatCard
            label="مبيعات اليوم"
            value={fmt((daily as any)?.totalSales ?? 0)}
            tone="positive"
            icon={ShoppingCart}
          />
          <StatCard
            label="مدفوع اليوم"
            value={fmt((daily as any)?.totalPaid ?? 0)}
            tone="neutral"
            icon={Banknote}
          />
          <StatCard
            label="أرصدة آجلة"
            value={fmt((daily as any)?.credit ?? 0)}
            tone="warning"
            icon={CreditCard}
          />
        </div>

        {showDaily && daily && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">
                ملخص المبيعات — {(daily as any).date}
              </h2>
              <button onClick={() => setShowDaily(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {Object.entries((daily as any).byMethod ?? {}).map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-xl bg-muted/40 p-3 text-center"
                >
                  <div className="text-[10px] text-muted-foreground">
                    {PAYMENT_METHODS.find((m) => m.value === k)?.label ?? k}
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {fmt(Number(v) || 0)}
                  </div>
                </div>
              ))}
            </div>
            {((daily as any).topProducts?.length ?? 0) > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-xs font-bold text-muted-foreground">
                  الأكثر مبيعاً
                </h3>
                <ul className="space-y-1">
                  {(daily as any).topProducts.slice(0, 5).map((p: any) => (
                    <li
                      key={p.productId}
                      className="flex items-center justify-between text-[12px]"
                    >
                      <span className="text-foreground">{p.productName}</span>
                      <span className="text-muted-foreground">
                        {p.qty} × {fmt(p.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Main: catalog + cart */}
        <div className="flex flex-col-reverse gap-4 lg:flex-row-reverse">
          {/* Cart */}
          <div className="lg:w-[380px] shrink-0">
            <div className="sticky top-4 rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">السلة</h2>
                <span className="text-[11px] text-muted-foreground">
                  {cart.length} صنف
                </span>
              </div>
              <select
                className="h-8 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground"
                value={curId}
                onChange={(e) =>
                  setCurId(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">العملة الافتراضية</option>
                {(currenciesData ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>

              <div>
                <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                  العميل (اختياري)
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground"
                  value={customerId ?? ""}
                  onChange={(e) =>
                    setCustomerId(e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">عميل نقدي</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <Input
                  className="mt-2 h-8 text-[12px]"
                  placeholder="بحث عن عميل..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>

              <div className="max-h-[260px] space-y-2 overflow-y-auto">
                {cart.length === 0 && (
                  <p className="py-8 text-center text-[12px] text-muted-foreground">
                    أضف الأصناف من الكتالوج
                  </p>
                )}
                {cart.map((l) => (
                  <CartLineRow
                    key={l.productId}
                    line={l}
                    stock={l.stock}
                    changeQty={changeQty}
                    removeLine={removeLine}
                    setLineDiscount={setLineDiscount}
                    onOfferDiscount={setOfferDiscount}
                  />
                ))}
              </div>

              <div className="space-y-1 border-t border-border pt-2 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <span className="font-bold">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">خصم الأصناف</span>
                  <span className="font-bold">{fmt(lineDiscounts)}</span>
                </div>
                {offerTotal > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>خصم العروض</span>
                    <span className="font-bold">-{fmt(offerTotal)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">خصم إضافي</span>
                  <Input
                    className="h-7 w-24 text-[11px]"
                    type="number"
                    value={globalDiscount}
                    onChange={(e) => setGlobalDiscount(e.target.value)}
                  />
                </div>
                <div className="flex justify-between border-t border-border pt-1">
                  <span className="font-bold text-foreground">الإجمالي</span>
                  <span className="font-bold text-[#0e2a2b]">
                    {fmt(totalAfterOffers)}
                  </span>
                </div>
                {selectedCurrency && (
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>المكافئ بـ {selectedCurrency.code}</span>
                    <span className="font-bold">
                      {fmt(
                        totalAfterOffers * Number(selectedCurrency.rate || 1)
                      )}{" "}
                      {selectedCurrency.symbol}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                  طريقة الدفع
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.value}
                        onClick={() => setPaymentMethod(m.value)}
                        className={`flex flex-col items-center gap-0.5 rounded-lg border py-1.5 text-[10px] font-bold transition-colors ${
                          paymentMethod === m.value
                            ? "border-[#b87945] bg-[#b87945]/10 text-[#b87945]"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  className="h-9 text-[12px]"
                  type="number"
                  placeholder="المبلغ المدفوع"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  المتبقي {fmt(due)}
                </span>
              </div>

              <Button
                className="h-11 w-full bg-[#b87945] text-[#102a2b] hover:bg-[#a06838]"
                onClick={submit}
                disabled={createSale.isPending || cart.length === 0}
              >
                <MethodIcon className="h-4 w-4" />
                {createSale.isPending ? "جاري البيع..." : "تأكيد البيع"}
              </Button>
            </div>
          </div>
          {/* Catalog */}
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                className="h-10 border-0 bg-transparent text-[13px] focus-visible:ring-0"
                placeholder="ابحث عن منتج بالاسم أو الكود..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loadingProducts ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                جاري تحميل الكتالوج...
              </div>
            ) : products.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                لا توجد منتجات مطابقة
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => {
                  const stock = Number(p.currentStock || 0);
                  const out = p.type === "goods" && stock <= 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      disabled={out}
                      className={`flex flex-col items-start gap-1 rounded-2xl border border-border bg-card p-3 text-right transition-colors ${
                        out
                          ? "cursor-not-allowed opacity-50"
                          : "hover:border-[#b87945] hover:bg-[#b87945]/5"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          {p.code}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            p.type === "service"
                              ? "bg-[#0d9488]/10 text-[#0d9488]"
                              : "bg-[#b87945]/10 text-[#b87945]"
                          }`}
                        >
                          {p.type === "service" ? "خدمة" : "سلعة"}
                        </span>
                      </div>
                      <span className="line-clamp-2 text-[12px] font-bold text-foreground">
                        {p.name}
                      </span>
                      <div className="flex w-full items-center justify-between">
                        <span className="text-[12px] font-bold text-[#0e2a2b]">
                          {fmt(Number(p.salePrice || 0))}
                        </span>
                        {p.type === "goods" && (
                          <span className="text-[10px] text-muted-foreground">
                            {out ? "نفد" : `متوفر ${stock}`}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function CartLineRow({
  line,
  stock,
  changeQty,
  removeLine,
  setLineDiscount,
  onOfferDiscount,
}: {
  line: CartLine;
  stock: number;
  changeQty: (id: number, delta: number, max: number) => void;
  removeLine: (id: number) => void;
  setLineDiscount: (id: number, v: number) => void;
  onOfferDiscount: (id: number, amt: number) => void;
}) {
  const baseTotal = line.unitPrice * line.quantity;
  const { data: pus } = trpc.modules.productUnits.list.useQuery(
    { productId: line.productId },
    { staleTime: 60_000 }
  );
  const { data: allUnits } = trpc.modules.masterData.listUnits.useQuery(
    undefined,
    { staleTime: 60_000 }
  );
  const units = (pus ?? []) as any[];
  const [unitId, setUnitId] = useState<number | null>(null);
  const selectedUnit = units.find((u) => u.id === unitId) ?? null;
  const factor = selectedUnit ? Number(selectedUnit.conversionFactor) || 1 : 1;
  const unitName = (id: number) =>
    (allUnits ?? []).find((u: any) => u.id === id)?.name || `#${id}`;

  const { data: offer } = trpc.modules.offers.applicable.useQuery({
    productId: line.productId,
    qty: line.quantity,
  });

  useEffect(() => {
    const pct = offer ? Number((offer as any).discountPercent) || 0 : 0;
    onOfferDiscount(line.productId, (baseTotal * pct) / 100);
  }, [offer, baseTotal, line.productId, onOfferDiscount]);

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-bold text-foreground">
          {line.name}
        </span>
        <button onClick={() => removeLine(line.productId)}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-background"
            onClick={() => changeQty(line.productId, -1, line.stock)}
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-6 text-center text-[12px] font-bold">
            {line.quantity}
          </span>
          <button
            className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-background"
            onClick={() => changeQty(line.productId, 1, line.stock)}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <span className="text-[12px] font-bold text-[#0e2a2b]">
          {fmt(line.unitPrice * line.quantity)}
        </span>
      </div>

      {units.length > 0 && (
        <select
          className="mt-1 h-7 w-full rounded-lg border border-border bg-background px-1 text-[11px]"
          value={unitId ?? ""}
          onChange={(e) =>
            setUnitId(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">الوحدة الأساسية</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {unitName(u.unitId)}{" "}
              {u.isBase ? "(أساسية)" : `×${u.conversionFactor}`}
            </option>
          ))}
        </select>
      )}
      {selectedUnit && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          معامل التحويل ×{factor} — {line.quantity} {unitName(selectedUnit.unitId)} ={" "}
          {line.quantity * factor} وحدة أساسية
        </p>
      )}
      {offer && (
        <span className="mt-1 inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
          عرض: خصم {(offer as any).discountPercent}%
        </span>
      )}

      <Input
        className="mt-1 h-7 text-[11px]"
        type="number"
        placeholder="خصم الصنف"
        value={line.discount || ""}
        onChange={(e) =>
          setLineDiscount(line.productId, Number(e.target.value) || 0)
        }
      />
    </div>
  );
}

