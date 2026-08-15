import { useState, useMemo } from "react";
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
  Plus, Search, Edit, Trash2, Barcode, MapPin, Phone, Mail,
  Wifi, WifiOff, CheckCircle, XCircle, Clock, AlertTriangle
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
  const { data: productsResponse, refetch: refetchProducts, isLoading: loadingProducts } = trpc.products.list.useQuery({ search: debouncedSearch || undefined });
  const productsData = productsResponse?.items ?? [];
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [productForm, setProductForm] = useState({ code: "", name: "", category: "", unit: "قطعة", purchasePrice: "0", salePrice: "0", minStock: 0, barcode: "" });
  const createProduct = trpc.products.create.useMutation({
    onSuccess: () => { toast.success("تم إضافة المنتج"); refetchProducts(); setShowProductDialog(false); setProductForm({ code: "", name: "", category: "", unit: "قطعة", purchasePrice: "0", salePrice: "0", minStock: 0, barcode: "" }); },
    onError: (e) => toast.error(e.message)
  });
  const isCreatingProduct = createProduct.isPending;

  // Customers
  const { data: customersResponse, refetch: refetchCustomers, isLoading: loadingCustomers } = trpc.customers.list.useQuery({ search: debouncedSearch || undefined });
  const customersData = customersResponse?.items ?? [];
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [customerForm, setCustomerForm] = useState({ code: "", name: "", phone: "", email: "", address: "", city: "" });
  const createCustomer = trpc.customers.create.useMutation({
    onSuccess: () => { toast.success("تم إضافة العميل"); refetchCustomers(); setShowCustomerDialog(false); setCustomerForm({ code: "", name: "", phone: "", email: "", address: "", city: "" }); },
    onError: (e) => toast.error(e.message)
  });
  const isCreatingCustomer = createCustomer.isPending;

  // Suppliers
  const { data: suppliersResponse, refetch: refetchSuppliers, isLoading: loadingSuppliers } = trpc.suppliers.list.useQuery({ search: debouncedSearch || undefined });
  const suppliersData = suppliersResponse?.items ?? [];
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ code: "", name: "", phone: "", email: "", address: "", city: "" });
  const createSupplier = trpc.suppliers.create.useMutation({
    onSuccess: () => { toast.success("تم إضافة المورد"); refetchSuppliers(); setShowSupplierDialog(false); setSupplierForm({ code: "", name: "", phone: "", email: "", address: "", city: "" }); },
    onError: (e) => toast.error(e.message)
  });
  const isCreatingSupplier = createSupplier.isPending;

  // Sales
  const { data: salesResponse, refetch: refetchSales, isLoading: loadingSales } = trpc.sales.list.useQuery({});
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
  const { data: purchasesResponse, refetch: refetchPurchases, isLoading: loadingPurchases } = trpc.purchases.list.useQuery({});
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
                <Button size="sm" className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] text-xs h-8" onClick={() => setShowProductDialog(true)}>
                  <Plus className="w-3 h-3 ml-1" />منتج جديد
                </Button>
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
                        <p className="text-[10px] text-gray-500">{new Date(inv.invoiceDate).toLocaleDateString("ar-EG")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`text-[10px] ${statusColors[inv.status] || ""}`}>{statusLabels[inv.status] || inv.status}</Badge>
                        <p className="font-bold text-xs text-green-600">{inv.total} ر.ي</p>
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
                        <p className="text-[10px] text-gray-500">{new Date(inv.invoiceDate).toLocaleDateString("ar-EG")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`text-[10px] ${statusColors[inv.status] || ""}`}>{statusLabels[inv.status] || inv.status}</Badge>
                        <p className="font-bold text-xs text-red-600">{inv.total} ر.ي</p>
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
                <CardTitle className="text-sm font-bold text-[#102a2b]">طلبات التوزيع</CardTitle>
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
                        <p className="font-bold text-xs text-[#102a2b]">{o.orderNumber}</p>
                        <p className="text-[10px] text-gray-500">{o.deliveryAddress || "بدون عنوان"} • {o.assignedTo || "غير مُعيّن"}</p>
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
    </div>
  );
}
