import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search, ShoppingCart, Plus, Minus, Trash2, X, Store as StoreIcon, Phone, MapPin,
  User, PackageCheck, ArrowRight, ChefHat,
} from "lucide-react";

interface CartItem {
  productId: number;
  productName: string;
  quantity: number;
  salePrice: string;
  currentStock: number;
}

export default function Store() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [category, setCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placed, setPlaced] = useState<{ orderNumber: string } | null>(null);

  const catalog = trpc.store.catalog.useQuery(
    { search: debouncedSearch || undefined, category: category === "all" ? undefined : category },
    { placeholderData: (prev: any) => prev, staleTime: 60_000, refetchOnWindowFocus: false }
  );
  const placeOrder = trpc.store.placeOrder.useMutation({
    onSuccess: (res) => { setPlaced(res); setCart([]); setCartOpen(false); setCheckoutOpen(false); },
    onError: (e: any) => toast.error(String(e?.message || "تعذر إرسال الطلب")),
  });

  const items = catalog.data?.items ?? [];
  const categories = catalog.data?.categories ?? [];
  const cartCount = cart.reduce((s, it) => s + it.quantity, 0);
  const cartTotal = cart.reduce((s, it) => s + parseFloat(it.salePrice) * it.quantity, 0);

  const fmt = (v: any) => Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const filtered = useMemo(() => items, [items]);

  const addToCart = (p: any) => {
    const stock = p.currentStock ?? 0;
    if (stock <= 0) { toast.error("هذا الصنف غير متوفر حالياً"); return; }
    setCart(prev => {
      const found = prev.find(it => it.productId === p.id);
      if (found) {
        if (found.quantity >= stock) { toast.error("الكمية المتوفرة محدودة"); return prev; }
        return prev.map(it => it.productId === p.id ? { ...it, quantity: it.quantity + 1 } : it);
      }
      return [...prev, { productId: p.id, productName: p.name, quantity: 1, salePrice: p.salePrice || "0", currentStock: stock }];
    });
    toast.success("تمت الإضافة إلى السلة");
  };

  const changeQty = (productId: number, delta: number) => {
    setCart(prev => prev.map(it => {
      if (it.productId !== productId) return it;
      const next = it.quantity + delta;
      if (next <= 0) return it;
      if (next > it.currentStock) { toast.error("الكمية المتوفرة محدودة"); return it; }
      return { ...it, quantity: next };
    }));
  };

  const removeFromCart = (productId: number) => setCart(prev => prev.filter(it => it.productId !== productId));

  const submitOrder = () => {
    const name = (document.getElementById("cust-name") as HTMLInputElement)?.value?.trim();
    if (!name) { toast.error("يرجى إدخال الاسم"); return; }
    const phone = (document.getElementById("cust-phone") as HTMLInputElement)?.value;
    const address = (document.getElementById("cust-address") as HTMLInputElement)?.value;
    const notes = (document.getElementById("cust-notes") as HTMLInputElement)?.value;
    placeOrder.mutate({
      customerName: name,
      customerPhone: phone || undefined,
      deliveryAddress: address || undefined,
      notes: notes || undefined,
      items: cart.map(it => ({ productId: it.productId, quantity: it.quantity })),
    });
  };

  const cartList = (
    <div className="space-y-3">
      {cart.length === 0 && <p className="text-center text-gray-400 text-sm py-6">السلة فارغة</p>}
      {cart.map((it) => (
        <div key={it.productId} className="flex items-center justify-between p-2 bg-white rounded-lg border">
          <div className="min-w-0">
            <p className="font-bold text-xs text-[#102a2b] truncate">{it.productName}</p>
            <p className="text-[10px] text-gray-500">{fmt(it.salePrice)} ج.م × {it.quantity}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="icon" variant="outline" className="w-6 h-6" onClick={() => changeQty(it.productId, -1)}><Minus className="w-3 h-3" /></Button>
            <span className="text-xs font-bold w-6 text-center">{it.quantity}</span>
            <Button size="icon" variant="outline" className="w-6 h-6" onClick={() => changeQty(it.productId, 1)}><Plus className="w-3 h-3" /></Button>
            <Button size="icon" variant="ghost" className="w-6 h-6 text-red-500" onClick={() => removeFromCart(it.productId)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        </div>
      ))}
      {cart.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm font-bold text-[#102a2b]">الإجمالي</span>
          <span className="text-sm font-bold text-[#b87945]">{fmt(cartTotal)} ج.م</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fbf8f2]" dir="rtl">
      <header className="bg-[#102a2b] text-white sticky top-0 z-30 shadow-lg">
        <div className="max-w-6xl mx-auto p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-[#b87945] w-9 h-9 rounded-lg flex items-center justify-center font-bold shrink-0">ح</div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm truncate">متجر الحسينية الإلكتروني</h1>
              <p className="text-[10px] text-white/50 truncate">اطلب وتوصلك الطلبات حتى باب المنزل</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" className="text-white border-white/30 h-8 text-xs" onClick={() => (window.location.href = "/commercial")}>
              لوحة الإدارة <ArrowRight className="w-3 h-3 mr-1" />
            </Button>
            <Button size="sm" className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] relative h-8" onClick={() => setCartOpen(true)}>
              <ShoppingCart className="w-4 h-4 ml-1" />
              <span className="hidden sm:inline">السلة</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -left-1.5 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cartCount}</span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-3">
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="ابحث عن منتج..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border-gray-200 pr-10 h-10 text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
          <button
            onClick={() => setCategory("all")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${category === "all" ? "bg-[#102a2b] text-white border-[#102a2b]" : "bg-white text-gray-600 border-gray-200"}`}
          >
            الكل
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${category === c ? "bg-[#102a2b] text-white border-[#102a2b]" : "bg-white text-gray-600 border-gray-200"}`}
            >
              {c}
            </button>
          ))}
        </div>

        {catalog.isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-44 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        )}

        {!catalog.isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <StoreIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">لا توجد منتجات متاحة حالياً — تابعنا قريباً</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p: any) => {
            const stock = p.currentStock ?? 0;
            const out = stock <= 0;
            const low = !out && stock <= (p.minStock ?? 0);
            return (
              <div key={p.id} className={`bg-white rounded-xl border shadow-sm p-3 flex flex-col ${out ? "opacity-70" : ""}`}>
                <div className="w-full h-16 bg-[#102a2b]/5 rounded-lg flex items-center justify-center mb-2">
                  <ChefHat className="w-7 h-7 text-[#b87945]" />
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <Badge variant="outline" className="text-[9px] text-gray-400 px-1.5 py-0">{p.code}</Badge>
                  {out ? (
                    <Badge className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0">نفد المخزون</Badge>
                  ) : low ? (
                    <Badge className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0">كمية محدودة</Badge>
                  ) : (
                    <Badge className="text-[9px] bg-green-100 text-green-600 px-1.5 py-0">متوفر</Badge>
                  )}
                </div>
                <p className="font-bold text-sm text-[#102a2b] leading-snug">{p.name}</p>
                <p className="text-[10px] text-gray-500 mb-2">{p.category || "عام"} • {p.unit}</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div>
                    <span className="font-extrabold text-[#b87945] text-sm">{fmt(p.salePrice)}</span>
                    <span className="text-[9px] text-gray-400 mr-1">ج.م / {p.unit}</span>
                  </div>
                  <Button size="sm" className="bg-[#102a2b] hover:bg-[#1d3f40] h-7 px-2 text-[11px]" disabled={out} onClick={() => addToCart(p)}>
                    <Plus className="w-3 h-3 ml-1" />أضف
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setCartOpen(false)}>
          <div
            className="absolute left-0 top-0 h-full w-full max-w-sm bg-[#fbf8f2] shadow-2xl p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm text-[#102a2b] flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-[#b87945]" />سلة التسوق</h2>
              <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setCartOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto">{cartList}</div>
            <Button
              className="w-full bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] font-bold mt-3"
              disabled={cart.length === 0}
              onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}
            >
              إتمام الطلب
            </Button>
          </div>
        </div>
      )}

      {/* Checkout dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#102a2b]">بيانات التوصيل</DialogTitle>
            <DialogDescription className="text-xs">سنتواصل معك لتأكيد الطلب قبل التوصيل</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs"><User className="w-3 h-3 inline ml-1" />الاسم الكامل *</Label>
              <Input id="cust-name" placeholder="مثال: أحمد محمد" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs"><Phone className="w-3 h-3 inline ml-1" />رقم الهاتف</Label>
              <Input id="cust-phone" placeholder="01xxxxxxxxx" dir="ltr" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs"><MapPin className="w-3 h-3 inline ml-1" />عنوان التوصيل</Label>
              <Input id="cust-address" placeholder="الحي، الشارع، رقم المنزل" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ملاحظات</Label>
              <Input id="cust-notes" placeholder="أي تفاصيل إضافية" className="h-9 text-sm" />
            </div>
            <div className="bg-white rounded-lg border p-3">
              <p className="text-xs font-bold text-[#102a2b] mb-2">ملخص الطلب ({cartCount} صنف)</p>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">الإجمالي</span>
                <span className="font-bold text-[#b87945]">{fmt(cartTotal)} ج.م</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] font-bold" disabled={placeOrder.isPending} onClick={submitOrder}>
              {placeOrder.isPending ? "جارٍ إرسال الطلب..." : "تأكيد الطلب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success dialog */}
      <Dialog open={!!placed} onOpenChange={(v) => { if (!v) setPlaced(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#102a2b] flex items-center gap-2"><PackageCheck className="w-5 h-5 text-green-600" />تم استلام طلبك بنجاح!</DialogTitle>
            <DialogDescription className="text-xs">رقم الطلب: <b dir="ltr" className="text-[#102a2b]">{placed?.orderNumber}</b></DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-xs text-gray-600">
            <p>سنتصل بك قريباً لتأكيد الطلب وتحديد موعد التوصيل.</p>
            <p>للمتابعة عبر واتساب اضغط الزر أدناه.</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="w-full" onClick={() => setPlaced(null)}>متابعة التسوق</Button>
            <a
              className="w-full inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white text-sm font-bold h-9 rounded-md"
              href={`https://wa.me/?text=${encodeURIComponent(`طلب جديد ${placed?.orderNumber} من متجر الحسينية — بانتظار التأكيد`)}`}
              target="_blank" rel="noreferrer"
            >
              متابعة عبر واتساب
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}