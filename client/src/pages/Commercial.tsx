import { useState, useMemo, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import { ProductPicker } from "@/components/ProductPicker";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { CustomFields } from "@/components/CustomFields";
import { EntityDocuments } from "@/components/EntityDocuments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Users,
  Truck,
  ShoppingCart,
  ShoppingBag,
  ClipboardList,
  Plus,
  Search,
  Edit,
  Barcode,
  MapPin,
  Phone,
  User,
  Trash2,
  PackagePlus,
  CheckCircle,
  Printer,
  Wallet,
  Loader2,
  Upload,
  Download,
  ReceiptText,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { HeaderNavbar } from "@/components/HeaderNavbar";
import { statusColors, statusLabels } from "./commercial/lib/status-maps";
import {
  exportProductsCsv,
  downloadProductTemplate,
  parseProductCsv,
} from "./commercial/lib/csv-helpers";
import {
  printPaymentReceipt,
  printSaleInvoice,
} from "./commercial/lib/print-helpers";

type Tab =
  | "products"
  | "customers"
  | "suppliers"
  | "sales"
  | "purchases"
  | "orders"
  | "offers";

export default function Commercial() {
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Products
  const {
    data: productsResponse,
    refetch: refetchProducts,
    isLoading: loadingProducts,
  } = trpc.products.list.useQuery(
    { search: debouncedSearch || undefined },
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );
  const productsData = productsResponse?.items ?? [];
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [productForm, setProductForm] = useState<any>({
    code: "",
    name: "",
    category: "",
    unit: "قطعة",
    productType: "goods",
    purchasePrice: "0",
    salePrice: "0",
    minStock: 0,
    barcode: "",
    unitOfMeasure: "",
    secondaryUnit: "",
    conversionFactor: "1",
    isComposite: false,
    bom: "[]",
    alternativeIds: "[]",
    attachmentUrl: "",
    costMethod: "fixed",
    directCost: "0",
    indirectCost: "0",
    productionMinutes: "0",
    priceMode: "margin",
    marginPct: "20",
    salesAccountId: undefined as number | undefined,
    cogsAccountId: undefined as number | undefined,
    inventoryAccountId: undefined as number | undefined,
  });
  const createProduct = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة المنتج");
      refetchProducts();
      setShowProductDialog(false);
      setProductForm({
        code: "",
        name: "",
        category: "",
        unit: "قطعة",
        productType: "goods",
        purchasePrice: "0",
        salePrice: "0",
        minStock: 0,
        barcode: "",
        unitOfMeasure: "",
        secondaryUnit: "",
        conversionFactor: "1",
        isComposite: false,
        bom: "[]",
        alternativeIds: "[]",
        attachmentUrl: "",
        costMethod: "fixed",
        directCost: "0",
        indirectCost: "0",
        productionMinutes: "0",
        priceMode: "margin",
        marginPct: "20",
        salesAccountId: undefined,
        cogsAccountId: undefined,
        inventoryAccountId: undefined,
      });
    },
    onError: e => toast.error(e.message),
  });
  const isCreatingProduct = createProduct.isPending;

  const [editProduct, setEditProduct] = useState<any>(null);
  const [editProductForm, setEditProductForm] = useState<any>({
    id: 0,
    name: "",
    salePrice: "",
    purchasePrice: "",
    minStock: 0,
    barcode: "",
    productType: "goods",
    unitOfMeasure: "",
    secondaryUnit: "",
    conversionFactor: "1",
    isComposite: false,
    bom: "[]",
    alternativeIds: "[]",
    attachmentUrl: "",
    costMethod: "fixed",
    directCost: "0",
    indirectCost: "0",
    productionMinutes: "0",
    priceMode: "margin",
    marginPct: "20",
    salesAccountId: undefined as number | undefined,
    cogsAccountId: undefined as number | undefined,
    inventoryAccountId: undefined as number | undefined,
  });
  const accountsQuery = trpc.accounting.getAccounts.useQuery();
  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث المنتج");
      setEditProduct(null);
      refetchProducts();
    },
    onError: e => toast.error(e.message),
  });

  const [adjustProduct, setAdjustProduct] = useState<any>(null);
  const [adjustForm, setAdjustForm] = useState({
    quantity: 1,
    type: "in" as "in" | "out" | "adjustment",
    notes: "",
  });
  const adjustStock = trpc.products.adjustStock.useMutation({
    onSuccess: () => {
      toast.success("تم تعديل المخزون");
      setAdjustProduct(null);
      refetchProducts();
    },
    onError: e => toast.error(e.message),
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
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importRows, setImportRows] = useState<any[] | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const onImportFile = (file: File | null) => {
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const { rows } = parseProductCsv(String(reader.result || ""));
      setImportRows(rows.length > 0 ? rows : null);
    };
    reader.readAsText(file, "utf-8");
  };

  // Order → Sales Invoice conversion (web orders)
  const [convertOrder, setConvertOrder] = useState<any>(null);
  const [convertForm, setConvertForm] = useState({
    paymentMethod: "cash",
    paidAmount: "0",
  });
  const convertToInvoice = trpc.orders.createSaleInvoice.useMutation({
    onSuccess: r => {
      toast.success(`تم إنشاء فاتورة المبيعات ${r.invoiceNumber}`);
      setConvertOrder(null);
      refetchSales();
      refetchOrders();
    },
    onError: e =>
      toast.error(String(e.message || "فشل تحويل الطلب إلى فاتورة")),
  });

  // Customers
  const {
    data: customersResponse,
    refetch: refetchCustomers,
    isLoading: loadingCustomers,
  } = trpc.customers.list.useQuery(
    { search: debouncedSearch || undefined },
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );
  const customersData = customersResponse?.items ?? [];
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    code: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
  });
  const createCustomer = trpc.customers.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة العميل");
      refetchCustomers();
      setShowCustomerDialog(false);
      setCustomerForm({
        code: "",
        name: "",
        phone: "",
        email: "",
        address: "",
        city: "",
      });
    },
    onError: e => toast.error(e.message),
  });
  const isCreatingCustomer = createCustomer.isPending;

  // Customer detail dialog (carries custom fields)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerDetailOpen, setCustomerDetailOpen] = useState(false);
  const openCustomerDetail = (c: any) => {
    setSelectedCustomer(c);
    setCustomerDetailOpen(true);
  };

  // Suppliers
  const {
    data: suppliersResponse,
    refetch: refetchSuppliers,
    isLoading: loadingSuppliers,
  } = trpc.suppliers.list.useQuery(
    { search: debouncedSearch || undefined },
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );
  const suppliersData = suppliersResponse?.items ?? [];
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    code: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
  });
  const createSupplier = trpc.suppliers.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة المورد");
      refetchSuppliers();
      setShowSupplierDialog(false);
      setSupplierForm({
        code: "",
        name: "",
        phone: "",
        email: "",
        address: "",
        city: "",
      });
    },
    onError: e => toast.error(e.message),
  });
  const isCreatingSupplier = createSupplier.isPending;

  // Supplier detail dialog (carries custom fields)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [supplierDetailOpen, setSupplierDetailOpen] = useState(false);
  const openSupplierDetail = (s: any) => {
    setSelectedSupplier(s);
    setSupplierDetailOpen(true);
  };

  // Sales
  const {
    data: salesResponse,
    refetch: refetchSales,
    isLoading: loadingSales,
  } = trpc.sales.list.useQuery(
    {},
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );
  const salesData = salesResponse?.items ?? [];
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [saleItems, setSaleItems] = useState<
    {
      productId: number;
      productName: string;
      quantity: number;
      unitPrice: string;
      discount: string;
    }[]
  >([]);
  const [saleCustomerId, setSaleCustomerId] = useState<number | undefined>();
  const [salePayment, setSalePayment] = useState<
    "cash" | "card" | "transfer" | "credit"
  >("cash");
  const createSale = trpc.sales.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("تم إنشاء فاتورة المبيعات");
      refetchSales();
      refetchProducts();
      setSaleItems([]);
      setSaleCoords({});
      setSaleWorkSiteId(undefined);
      setSaleDeviceId(undefined);
      if (data?.zatcaView) {
        setZatcaView(data.zatcaView);
        setShowSaleDialog(false);
      } else {
        setShowSaleDialog(false);
      }
    },
    onError: e => toast.error(e.message),
  });
  const isCreatingSale = createSale.isPending;

  // ─── Multi-currency + offers (Module B) ───────────────────────────
  const currenciesQ = trpc.modules.currencies.list.useQuery();
  const [saleCurrency, setSaleCurrency] = useState("YER");
  const [saleCurrencyRate, setSaleCurrencyRate] = useState("1");
  const applyOffersToSale = () => {
    if (!offersData) return;
    const now = new Date();
    const next = saleItems.map((it) => {
      const prod: any = (productsData as any[]).find((p) => p.id === it.productId);
      const catId = prod?.categoryId;
      const candidates = (offersData as any[]).filter(
        (o) =>
          o.isActive &&
          (!o.startDate || new Date(o.startDate) <= now) &&
          (!o.endDate || new Date(o.endDate) >= now) &&
          (o.minQty == null || it.quantity >= Number(o.minQty)) &&
          (o.productId == null || o.productId === it.productId) &&
          (o.categoryId == null || o.categoryId === catId)
      );
      if (candidates.length === 0) return it;
      candidates.sort(
        (a, b) => Number(b.discountPercent) - Number(a.discountPercent)
      );
      const best = candidates[0];
      const lineSub = parseFloat(it.unitPrice) * it.quantity;
      const disc = (lineSub * (Number(best.discountPercent) || 0)) / 100;
      return { ...it, discount: disc.toFixed(2) };
    });
    setSaleItems(next);
    toast.success("تم تطبيق العروض المتاحة على الأصناف");
  };

  // ─── Governance / audit / traceability (work site, device, coords) ───
  const settingsQ = trpc.accounting.getSettings.useQuery();
  const workSitesQ = trpc.workSites.list.useQuery();
  const devicesQ = trpc.devices.list.useQuery();
  const [saleWorkSiteId, setSaleWorkSiteId] = useState<number | undefined>();
  const [saleDeviceId, setSaleDeviceId] = useState<number | undefined>();
  const [saleCoords, setSaleCoords] = useState<{ lat?: string; lng?: string }>({});
  const [zatcaView, setZatcaView] = useState<any>(null);
  const pickLocation = () => {
    if (!navigator.geolocation) {
      toast.error("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => setSaleCoords({ lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() }),
      () => toast.error("تعذر تحديد الموقع")
    );
  };

  // Purchases
  const {
    data: purchasesResponse,
    refetch: refetchPurchases,
    isLoading: loadingPurchases,
  } = trpc.purchases.list.useQuery(
    {},
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );
  const purchasesData = purchasesResponse?.items ?? [];
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState<
    {
      productId: number;
      productName: string;
      quantity: number;
      unitPrice: string;
      discount: string;
    }[]
  >([]);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState<
    number | undefined
  >();
  const createPurchase = trpc.purchases.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء فاتورة المشتريات");
      refetchPurchases();
      refetchProducts();
      setShowPurchaseDialog(false);
      setPurchaseItems([]);
    },
    onError: e => toast.error(e.message),
  });
  const isCreatingPurchase = createPurchase.isPending;

  // Orders
  const {
    data: ordersResponse,
    refetch: refetchOrders,
    isLoading: loadingOrders,
  } = trpc.orders.list.useQuery({});
  const ordersData = ordersResponse?.items ?? [];
  const pendingWebOrders = ordersData.filter(
    o => isWebOrder(o) && o.status === "pending"
  ).length;
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderItems, setOrderItems] = useState<
    {
      productId: number;
      productName: string;
      quantity: number;
      unitPrice: string;
      discount: string;
    }[]
  >([]);
  const [orderCustomerId, setOrderCustomerId] = useState<number | undefined>();
  const [orderAddress, setOrderAddress] = useState("");
  const createOrder = trpc.orders.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الطلب");
      refetchOrders();
      setShowOrderDialog(false);
      setOrderItems([]);
    },
    onError: e => toast.error(e.message),
  });
  const isCreatingOrder = createOrder.isPending;

  // ─── Offers / Discounts (Module B) ───
  const { data: offersData, isPending: loadingOffers } =
    trpc.modules.offers.list.useQuery(undefined, { staleTime: 60_000 });
  const productsForOffer = trpc.products.list.useQuery(
    { limit: 300 },
    { staleTime: 60_000 }
  );
  const catsForOffer = trpc.modules.masterData.listCategories.useQuery(undefined, {
    staleTime: 60_000,
  });
  const createOffer = trpc.modules.offers.create.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة العرض");
      setShowOfferDialog(false);
      setOfferForm({
        name: "",
        kind: "financial",
        discountPercent: "0",
        minQty: "",
        productId: undefined,
        categoryId: undefined,
        startDate: "",
        endDate: "",
        isActive: true,
      });
      utils.modules.offers.list.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const updateOffer = trpc.modules.offers.update.useMutation({
    onSuccess: () => {
      toast.success("تم التحديث");
      setEditOffer(null);
      utils.modules.offers.list.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteOffer = trpc.modules.offers.delete.useMutation({
    onSuccess: () => {
      toast.success("تم الحذف");
      utils.modules.offers.list.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [offerForm, setOfferForm] = useState<any>({
    name: "",
    kind: "financial",
    discountPercent: "0",
    minQty: "",
    productId: undefined as number | undefined,
    categoryId: undefined as number | undefined,
    startDate: "",
    endDate: "",
    isActive: true,
  });
  const [editOffer, setEditOffer] = useState<any>(null);

  // ─── Product Picker (shared by Sale / Purchase / Order dialogs) ───
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<
    "sale" | "purchase" | "order" | null
  >(null);

  const openPicker = (mode: "sale" | "purchase" | "order") => {
    setPickerMode(mode);
    setPickerOpen(true);
  };

  const handlePick = (p: any) => {
    if (!p) return;
    if (pickerMode === "sale") {
      setSaleItems([
        ...saleItems,
        {
          productId: p.id,
          productName: p.name,
          quantity: 1,
          unitPrice: String(p.salePrice ?? "0"),
          discount: "0",
        },
      ]);
    } else if (pickerMode === "purchase") {
      setPurchaseItems([
        ...purchaseItems,
        {
          productId: p.id,
          productName: p.name,
          quantity: 1,
          unitPrice: String(p.purchasePrice ?? "0"),
          discount: "0",
        },
      ]);
    } else if (pickerMode === "order") {
      setOrderItems([
        ...orderItems,
        {
          productId: p.id,
          productName: p.name,
          quantity: 1,
          unitPrice: String(p.salePrice ?? "0"),
          discount: "0",
        },
      ]);
    }
  };
  const updateOrderStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الطلب");
      refetchOrders();
    },
    onError: e => toast.error(e.message),
  });
  const updateSaleStatus = trpc.sales.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الفاتورة");
      refetchSales();
      refetchProducts();
    },
    onError: e => toast.error(e.message),
  });
  const updatePurchaseStatus = trpc.purchases.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الفاتورة");
      refetchPurchases();
      refetchProducts();
    },
    onError: e => toast.error(e.message),
  });

  const utils = trpc.useUtils();

  // Payments (installments & settlements)
  const printAfterSaveRef = useRef(false);
  const pendingReceiptRef = useRef<{
    invoice: any;
    amount: string;
    method: string;
    date: string;
    source: "sales" | "purchases";
  } | null>(null);
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
        printPaymentReceipt({
          ...r,
          utils,
        });
      }
    },
    onError: e => toast.error(e.message),
  });
  const [payTarget, setPayTarget] = useState<{
    invoice: any;
    source: "sales" | "purchases";
  } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<
    "cash" | "card" | "transfer" | "credit" | "online"
  >("cash");
  const [payDate, setPayDate] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const openPayDialog = (invoice: any, source: "sales" | "purchases") => {
    const remaining =
      Number(invoice.total ?? 0) - Number(invoice.paidAmount ?? 0);
    if (remaining <= 0.01) {
      toast.info("الفاتورة مسددة بالكامل");
      return;
    }
    setPayTarget({ invoice, source });
    setPayAmount("");
    setPayMethod(
      invoice.paymentMethod === "credit"
        ? "cash"
        : invoice.paymentMethod || "cash"
    );
    setPayDate("");
    setPayNotes("");
  };

  const handlePay = useCallback(() => {
    if (!payTarget) return;
    const amt = parseFloat(payAmount);
    const remaining =
      Number(payTarget.invoice.total) -
      Number(payTarget.invoice.paidAmount ?? 0);
    if (!payAmount || isNaN(amt) || amt <= 0) {
      toast.error("أدخل مبلغاً موجباً");
      return;
    }
    if (amt > remaining + 0.01) {
      toast.error(
        `المبلغ يتجاوز المتبقي (${remaining.toLocaleString("en-US")})`
      );
      return;
    }
    printAfterSaveRef.current = printAfterSave;
    pendingReceiptRef.current = printAfterSave
      ? {
          invoice: payTarget.invoice,
          amount: payAmount,
          method: payMethod,
          date: payDate,
          source: payTarget.source,
        }
      : null;
    createPayment.mutate({
      source: payTarget.source,
      invoiceId: payTarget.invoice.id,
      amount: payAmount,
      paymentMethod: payMethod,
      paymentDate: payDate || undefined,
      notes: payNotes.trim() || undefined,
    });
  }, [
    payTarget,
    payAmount,
    payMethod,
    payDate,
    payNotes,
    printAfterSave,
    createPayment,
  ]);

  const handlePrintSaleInvoice = (invId: number) => {
    printSaleInvoice(invId, utils);
  };

  const saleTotal = useMemo(
    () =>
      saleItems.reduce(
        (sum, item) => sum + parseFloat(item.unitPrice) * item.quantity,
        0
      ),
    [saleItems]
  );
  const saleDiscountTotal = useMemo(
    () =>
      saleItems.reduce(
        (sum, item) => sum + (parseFloat(item.discount) || 0),
        0
      ),
    [saleItems]
  );
  const saleGrandTotal = saleTotal - saleDiscountTotal;
  const purchaseTotal = useMemo(
    () =>
      purchaseItems.reduce(
        (sum, item) => sum + parseFloat(item.unitPrice) * item.quantity,
        0
      ),
    [purchaseItems]
  );
  const orderTotal = useMemo(
    () =>
      orderItems.reduce(
        (sum, item) => sum + parseFloat(item.unitPrice) * item.quantity,
        0
      ),
    [orderItems]
  );

  // NOTE: item selection now goes through the shared <ProductPicker/> via
  // openPicker(...) — the old "add first product" shortcut is intentionally
  // removed so the cashier always picks the exact item they are selling.
  const addItemToSale = () => openPicker("sale");
  const addItemToPurchase = () => openPicker("purchase");
  const addItemToOrder = () => openPicker("order");

  const statusColorsMap = statusColors;
  const statusLabelsMap = statusLabels;

  return (
    <div className="min-h-screen bg-[#fbf8f2]" dir="rtl">
      <HeaderNavbar />

      <main className="max-w-7xl mx-auto p-3">
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="بحث في المنتجات، العملاء، الموردين..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-white border-gray-200 pr-10 h-9 text-sm"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as Tab)}>
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-7 h-10 mb-3 bg-white border">
            <TabsTrigger value="products" className="text-[10px]">
              <Package className="w-3 h-3 ml-1" />
              المنتجات
            </TabsTrigger>
            <TabsTrigger value="customers" className="text-[10px]">
              <Users className="w-3 h-3 ml-1" />
              العملاء
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="text-[10px]">
              <Truck className="w-3 h-3 ml-1" />
              الموردين
            </TabsTrigger>
            <TabsTrigger value="sales" className="text-[10px]">
              <ShoppingCart className="w-3 h-3 ml-1" />
              المبيعات
            </TabsTrigger>
            <TabsTrigger value="purchases" className="text-[10px]">
              <ShoppingBag className="w-3 h-3 ml-1" />
              المشتريات
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-[10px]">
              <ClipboardList className="w-3 h-3 ml-1" />
              الطلبات
            </TabsTrigger>
            <TabsTrigger value="offers" className="text-[10px]">
              <Tag className="w-3 h-3 ml-1" />
              العروض
            </TabsTrigger>
          </TabsList>

          {/* ─── Products Tab ─── */}
          <TabsContent value="products">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">
                  المنتجات والمخازن
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 border-gray-200"
                    onClick={() => exportProductsCsv(productsData)}
                    title="تصدير الأصناف الحالية إلى CSV"
                  >
                    <Download className="w-3 h-3 ml-1" />
                    تصدير CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 border-gray-200"
                    onClick={() => setShowImportDialog(true)}
                    title="استيراد أصناف/خدمات من ملف CSV"
                  >
                    <Upload className="w-3 h-3 ml-1" />
                    استيراد CSV
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] text-xs h-8"
                    onClick={() => setShowProductDialog(true)}
                  >
                    <Plus className="w-3 h-3 ml-1" />
                    منتج جديد
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {loadingProducts && (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="h-16 bg-gray-100 rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  )}
                  {!loadingProducts &&
                    productsData.map(p => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-[#102a2b] text-[#b87945] w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs">
                            {p.code}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-[#102a2b]">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {p.category || "بدون فئة"} • {p.unit}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="text-center">
                            <p className="text-[10px] text-gray-500">المخزون</p>
                            <p
                              className={`font-bold ${p.currentStock <= p.minStock ? "text-red-600" : "text-green-600"}`}
                            >
                              {p.currentStock}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-gray-500">
                              سعر الشراء
                            </p>
                            <p className="font-bold text-[#102a2b]">
                              {p.purchasePrice}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-gray-500">
                              سعر البيع
                            </p>
                            <p className="font-bold text-green-600">
                              {p.salePrice}
                            </p>
                          </div>
                          {p.barcode && (
                            <Barcode className="w-4 h-4 text-gray-400" />
                          )}
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="w-6 h-6 text-[10px]"
                              title="تعديل المنتج"
                              onClick={() => {
                                setEditProductForm({
                                  id: p.id,
                                  name: p.name,
                                  salePrice: p.salePrice,
                                  purchasePrice: p.purchasePrice,
                                  minStock: p.minStock,
                                  barcode: p.barcode || "",
                                  productType: (p as any).type || "goods",
                                  unitOfMeasure: (p as any).unitOfMeasure || "",
                                  secondaryUnit: (p as any).secondaryUnit || "",
                                  conversionFactor: String((p as any).conversionFactor ?? "1"),
                                  isComposite: !!(p as any).isComposite,
                                  bom: (p as any).bom || "[]",
                                  alternativeIds: (p as any).alternativeIds || "[]",
                                  attachmentUrl: (p as any).attachmentUrl || "",
                                  costMethod: (p as any).costMethod || "fixed",
                                  directCost: String((p as any).directCost ?? "0"),
                                  indirectCost: String((p as any).indirectCost ?? "0"),
                                  productionMinutes: String((p as any).productionMinutes ?? "0"),
                                  priceMode: (p as any).priceMode || "margin",
                                  marginPct: String((p as any).marginPct ?? "20"),
                                  salesAccountId: (p as any).salesAccountId ?? undefined,
                                  cogsAccountId: (p as any).cogsAccountId ?? undefined,
                                  inventoryAccountId: (p as any).inventoryAccountId ?? undefined,
                                });
                                setEditProduct(p);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="w-6 h-6 text-[10px]"
                              title="تعديل المخزون"
                              onClick={() => {
                                setAdjustForm({
                                  quantity: 1,
                                  type: "in",
                                  notes: "",
                                });
                                setAdjustProduct(p);
                              }}
                            >
                              <PackagePlus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  {productsData.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-8">
                      لا توجد منتجات
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Customers Tab ─── */}
          <TabsContent value="customers">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">
                  العملاء
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] text-xs h-8"
                  onClick={() => setShowCustomerDialog(true)}
                >
                  <Plus className="w-3 h-3 ml-1" />
                  عميل جديد
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {loadingCustomers && (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="h-16 bg-gray-100 rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  )}
                  {!loadingCustomers &&
                    customersData.map(c => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-[#b87945] text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs">
                            {c.code}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-[#102a2b]">
                              {c.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                              {c.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {c.phone}
                                </span>
                              )}
                              {c.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {c.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-left flex flex-col items-end gap-1">
                          <p className="text-[10px] text-gray-500">الرصيد</p>
                          <p
                            className={`font-bold text-xs ${parseFloat(c.balance) > 0 ? "text-red-600" : "text-green-600"}`}
                          >
                            {c.balance}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-6"
                            onClick={() => openCustomerDetail(c)}
                          >
                            تفاصيل
                          </Button>
                        </div>
                      </div>
                    ))}
                  {customersData.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-8">
                      لا يوجد عملاء
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Suppliers Tab ─── */}
          <TabsContent value="suppliers">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">
                  الموردين
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] text-xs h-8"
                  onClick={() => setShowSupplierDialog(true)}
                >
                  <Plus className="w-3 h-3 ml-1" />
                  مورد جديد
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {loadingSuppliers && (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="h-16 bg-gray-100 rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  )}
                  {!loadingSuppliers &&
                    suppliersData.map(s => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-[#102a2b] text-[#b87945] w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs">
                            {s.code}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-[#102a2b]">
                              {s.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                              {s.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {s.phone}
                                </span>
                              )}
                              {s.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {s.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-left flex flex-col items-end gap-1">
                          <p className="text-[10px] text-gray-500">الرصيد</p>
                          <p className="font-bold text-xs text-red-600">
                            {s.balance}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-6"
                            onClick={() => openSupplierDetail(s)}
                          >
                            تفاصيل
                          </Button>
                        </div>
                      </div>
                    ))}
                  {suppliersData.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-8">
                      لا يوجد موردين
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Sales Tab ─── */}
          <TabsContent value="sales">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">
                  فواتير المبيعات / نقطة البيع
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] text-xs h-8"
                  onClick={() => setShowSaleDialog(true)}
                >
                  <Plus className="w-3 h-3 ml-1" />
                  فاتورة جديدة
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {loadingSales && (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="h-16 bg-gray-100 rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  )}
                  {!loadingSales &&
                    salesData?.map(inv => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div>
                          <p className="font-bold text-xs text-[#102a2b]">
                            {inv.invoiceNumber}
                          </p>
                          <p className="text-[10px] text-gray-500 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {customerNameOf(inv.customerId)}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(inv.invoiceDate).toLocaleDateString(
                              "ar-EG"
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={`text-[10px] ${statusColorsMap[inv.status] || ""}`}
                          >
                            {statusLabelsMap[inv.status] || inv.status}
                          </Badge>
                          <p className="font-bold text-xs text-green-600">
                            {inv.total} ر.ي
                          </p>
                          <p className="text-[9px] text-gray-400">
                            المدفوع:{" "}
                            {Number(inv.paidAmount || 0).toLocaleString(
                              "en-US"
                            )}{" "}
                            · المتبقي:{" "}
                            {Number(inv.total).toLocaleString("en-US")}
                          </p>
                          {inv.status !== "cancelled" &&
                            Number(inv.total) - Number(inv.paidAmount || 0) >
                              0.01 && (
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
                          <EntityDocuments
                            entityType="salesInvoice"
                            entityId={inv.id}
                          />
                          {inv.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[9px] h-6 text-red-600 border-red-200"
                              disabled={updateSaleStatus.isPending}
                              onClick={() => {
                                if (
                                  confirm(
                                    "إلغاء الفاتورة؟ سيتم عكس المخزون والرصيد."
                                  )
                                )
                                  updateSaleStatus.mutate({
                                    id: inv.id,
                                    status: "cancelled",
                                  });
                              }}
                            >
                              إلغاء
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  {(!salesData || salesData.length === 0) && (
                    <p className="text-center text-gray-400 text-sm py-8">
                      لا توجد فواتير مبيعات
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Purchases Tab ─── */}
          <TabsContent value="purchases">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">
                  فواتير المشتريات
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] text-xs h-8"
                  onClick={() => setShowPurchaseDialog(true)}
                >
                  <Plus className="w-3 h-3 ml-1" />
                  فاتورة جديدة
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {loadingPurchases && (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="h-16 bg-gray-100 rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  )}
                  {!loadingPurchases &&
                    purchasesData?.map(inv => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div>
                          <p className="font-bold text-xs text-[#102a2b]">
                            {inv.invoiceNumber}
                          </p>
                          <p className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            {supplierNameOf(inv.supplierId)}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(inv.invoiceDate).toLocaleDateString(
                              "ar-EG"
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={`text-[10px] ${statusColorsMap[inv.status] || ""}`}
                          >
                            {statusLabelsMap[inv.status] || inv.status}
                          </Badge>
                          <p className="font-bold text-xs text-red-600">
                            {inv.total} ر.ي
                          </p>
                          <p className="text-[9px] text-gray-400">
                            المدفوع:{" "}
                            {Number(inv.paidAmount || 0).toLocaleString(
                              "en-US"
                            )}{" "}
                            · المتبقي:{" "}
                            {Number(inv.total).toLocaleString("en-US")}
                          </p>
                          {inv.status !== "cancelled" &&
                            Number(inv.total) - Number(inv.paidAmount || 0) >
                              0.01 && (
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
                              onClick={() => {
                                if (
                                  confirm(
                                    "إلغاء الفاتورة؟ سيتم عكس المخزون والرصيد."
                                  )
                                )
                                  updatePurchaseStatus.mutate({
                                    id: inv.id,
                                    status: "cancelled",
                                  });
                              }}
                            >
                              إلغاء
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  {(!purchasesData || purchasesData.length === 0) && (
                    <p className="text-center text-gray-400 text-sm py-8">
                      لا توجد فواتير مشتريات
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Orders Tab ─── */}
          <TabsContent value="orders">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">
                  طلبات التوزيع
                  {pendingWebOrders > 0 && (
                    <Badge className="mr-2 text-[9px] bg-purple-100 text-purple-700">
                      طلبات المتجر المعلقة: {pendingWebOrders}
                    </Badge>
                  )}
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] text-xs h-8"
                  onClick={() => setShowOrderDialog(true)}
                >
                  <Plus className="w-3 h-3 ml-1" />
                  طلب جديد
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {loadingOrders && (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="h-16 bg-gray-100 rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  )}
                  {!loadingOrders &&
                    ordersData?.map(o => (
                      <div
                        key={o.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div>
                          <p className="font-bold text-xs text-[#102a2b] flex items-center gap-2">
                            {o.orderNumber}
                            {isWebOrder(o) && (
                              <Badge className="text-[9px] bg-purple-100 text-purple-700">
                                متجر إلكتروني
                              </Badge>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-500 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {customerNameOf(o.customerId)} •{" "}
                            {o.deliveryAddress || "بدون عنوان"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Select
                            value={o.status}
                            onValueChange={v =>
                              updateOrderStatus.mutate({
                                id: o.id,
                                status: v as any,
                              })
                            }
                          >
                            <SelectTrigger className="w-24 h-7 text-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">
                                قيد الانتظار
                              </SelectItem>
                              <SelectItem value="confirmed">مؤكد</SelectItem>
                              <SelectItem value="processing">
                                قيد المعالجة
                              </SelectItem>
                              <SelectItem value="shipped">تم الشحن</SelectItem>
                              <SelectItem value="delivered">
                                تم التوصيل
                              </SelectItem>
                              <SelectItem value="cancelled">ملغي</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="font-bold text-xs text-[#102a2b]">
                            {o.total} ر.ي
                          </p>
                          {isWebOrder(o) &&
                            o.status !== "cancelled" &&
                            o.status !== "delivered" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[9px] h-6 text-[#102a2b] border-[#b87945]/40 hover:bg-[#f5ece0]"
                                onClick={() => {
                                  setConvertForm({
                                    paymentMethod: "cash",
                                    paidAmount: "0",
                                  });
                                  setConvertOrder(o);
                                }}
                              >
                                <ReceiptText className="w-3 h-3" /> فاتورة
                                مبيعات
                              </Button>
                            )}
                        </div>
                      </div>
                    ))}
                  {(!ordersData || ordersData.length === 0) && (
                    <p className="text-center text-gray-400 text-sm py-8">
                      لا توجد طلبات
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Offers Tab (Module B) ─── */}
          <TabsContent value="offers">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">
                  العروض المالية والكمية
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] text-xs h-8"
                  onClick={() => setShowOfferDialog(true)}
                >
                  <Plus className="w-3 h-3 ml-1" />
                  عرض جديد
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {(offersData ?? []).map((o: any) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <div>
                        <p className="font-bold text-xs text-[#102a2b]">{o.name}</p>
                        <p className="text-[10px] text-gray-500">
                          {o.kind === "financial" ? "خصم مالي" : "عرض كمي"} •{" "}
                          {Number(o.discountPercent)}% خصم
                          {o.minQty ? ` • حد أدنى ${o.minQty}` : ""}
                          {!o.isActive && " • غير نشط"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-7"
                          onClick={() =>
                            setEditOffer({
                              id: o.id,
                              name: o.name,
                              kind: o.kind,
                              discountPercent: String(o.discountPercent),
                              minQty: o.minQty ?? "",
                              productId: o.productId ?? undefined,
                              categoryId: o.categoryId ?? undefined,
                              startDate: o.startDate ? o.startDate.slice(0, 10) : "",
                              endDate: o.endDate ? o.endDate.slice(0, 10) : "",
                              isActive: o.isActive,
                            })
                          }
                        >
                          تعديل
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-7 text-destructive"
                          onClick={() => {
                            if (confirm("حذف العرض؟")) deleteOffer.mutate({ id: o.id });
                          }}
                        >
                          حذف
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!offersData || offersData.length === 0) && (
                    <p className="text-center text-gray-400 text-sm py-8">
                      لا توجد عروض
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ─── Product Dialog ─── */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-[#102a2b]">
              إضافة منتج جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">كود المنتج</Label>
                <Input
                  value={productForm.code}
                  onChange={e =>
                    setProductForm({ ...productForm, code: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">اسم المنتج</Label>
                <Input
                  value={productForm.name}
                  onChange={e =>
                    setProductForm({ ...productForm, name: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">الفئة</Label>
                <Input
                  value={productForm.category}
                  onChange={e =>
                    setProductForm({ ...productForm, category: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">الوحدة</Label>
                <Input
                  value={productForm.unit}
                  onChange={e =>
                    setProductForm({ ...productForm, unit: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">سعر الشراء</Label>
                <Input
                  type="number"
                  value={productForm.purchasePrice}
                  onChange={e =>
                    setProductForm({
                      ...productForm,
                      purchasePrice: e.target.value,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">سعر البيع</Label>
                <Input
                  type="number"
                  value={productForm.salePrice}
                  onChange={e =>
                    setProductForm({
                      ...productForm,
                      salePrice: e.target.value,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">الحد الأدنى للمخزون</Label>
                <Input
                  type="number"
                  value={productForm.minStock}
                  onChange={e =>
                    setProductForm({
                      ...productForm,
                      minStock: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">الباركود (مسح/إدخال)</Label>
                <BarcodeScanner
                  value={productForm.barcode}
                  onChange={v => setProductForm({ ...productForm, barcode: v })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">نوع الصنف</Label>
                <select
                  className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white"
                  value={productForm.productType}
                  onChange={e => setProductForm({ ...productForm, productType: e.target.value })}
                >
                  <option value="goods">سلعة</option>
                  <option value="service">خدمة</option>
                </select>
              </div>
              <div>
                <Label className="text-[10px]">وحدة القياس</Label>
                <Input
                  value={productForm.unitOfMeasure}
                  onChange={e => setProductForm({ ...productForm, unitOfMeasure: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="مثل: كجم، لتر، علبة"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px]">الوحدة الفرعية</Label>
                <Input value={productForm.secondaryUnit} onChange={e => setProductForm({ ...productForm, secondaryUnit: e.target.value })} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">معامل التحويل</Label>
                <Input type="number" value={productForm.conversionFactor} onChange={e => setProductForm({ ...productForm, conversionFactor: e.target.value })} className="h-8 text-xs" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-1 text-[10px]">
                  <input type="checkbox" checked={productForm.isComposite} onChange={e => setProductForm({ ...productForm, isComposite: e.target.checked })} /> صنف مركب
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">مكونات (BOM) JSON</Label>
                <Input value={productForm.bom} onChange={e => setProductForm({ ...productForm, bom: e.target.value })} className="h-8 text-xs" placeholder='[{"productId":1,"qty":2}]' />
              </div>
              <div>
                <Label className="text-[10px]">أصناف بديلة (JSON)</Label>
                <Input value={productForm.alternativeIds} onChange={e => setProductForm({ ...productForm, alternativeIds: e.target.value })} className="h-8 text-xs" placeholder='[2,3]' />
              </div>
            </div>

            <div>
              <Label className="text-[10px]">رابط مرفق (صورة/ملف)</Label>
              <Input value={productForm.attachmentUrl} onChange={e => setProductForm({ ...productForm, attachmentUrl: e.target.value })} className="h-8 text-xs" placeholder="https://..." />
            </div>

            {productForm.productType === "service" && (
              <div className="border rounded-lg p-2 space-y-2 bg-amber-50/50">
                <p className="text-[10px] font-bold text-[#102a2b]">تسعير الخدمة (تكلفة دقيقة/مرنة)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px]">طريقة التكلفة</Label>
                    <select className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white" value={productForm.costMethod} onChange={e => setProductForm({ ...productForm, costMethod: e.target.value })}>
                      <option value="fixed">ثابتة</option>
                      <option value="calculated">محسوبة</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px]">تكلفة مباشرة</Label>
                    <Input type="number" value={productForm.directCost} onChange={e => setProductForm({ ...productForm, directCost: e.target.value })} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">تكلفة غير مباشرة</Label>
                    <Input type="number" value={productForm.indirectCost} onChange={e => setProductForm({ ...productForm, indirectCost: e.target.value })} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px]">دقائق إنتاج</Label>
                    <Input type="number" value={productForm.productionMinutes} onChange={e => setProductForm({ ...productForm, productionMinutes: e.target.value })} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">وضع السعر</Label>
                    <select className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white" value={productForm.priceMode} onChange={e => setProductForm({ ...productForm, priceMode: e.target.value })}>
                      <option value="margin">هامش</option>
                      <option value="direct">مباشر</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px]">نسبة الهامش %</Label>
                    <Input type="number" value={productForm.marginPct} onChange={e => setProductForm({ ...productForm, marginPct: e.target.value })} className="h-8 text-xs" />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px]">حساب الإيراد</Label>
                <AcctSelect value={productForm.salesAccountId} onChange={v => setProductForm({ ...productForm, salesAccountId: v })} accounts={accountsQuery.data} />
              </div>
              <div>
                <Label className="text-[10px]">حساب التكلفة</Label>
                <AcctSelect value={productForm.cogsAccountId} onChange={v => setProductForm({ ...productForm, cogsAccountId: v })} accounts={accountsQuery.data} />
              </div>
              <div>
                <Label className="text-[10px]">حساب المخزون</Label>
                <AcctSelect value={productForm.inventoryAccountId} onChange={v => setProductForm({ ...productForm, inventoryAccountId: v })} accounts={accountsQuery.data} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProductDialog(false)}
              className="h-8 text-xs"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] h-8 text-xs"
              disabled={isCreatingProduct}
              onClick={() => createProduct.mutate(productForm as any)}
            >
              {isCreatingProduct ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Customer Dialog ─── */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-[#102a2b]">
              إضافة عميل جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">كود العميل</Label>
                <Input
                  value={customerForm.code}
                  onChange={e =>
                    setCustomerForm({ ...customerForm, code: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">اسم العميل</Label>
                <Input
                  value={customerForm.name}
                  onChange={e =>
                    setCustomerForm({ ...customerForm, name: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">الهاتف</Label>
                <Input
                  value={customerForm.phone}
                  onChange={e =>
                    setCustomerForm({ ...customerForm, phone: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">المدينة</Label>
                <Input
                  value={customerForm.city}
                  onChange={e =>
                    setCustomerForm({ ...customerForm, city: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px]">العنوان</Label>
              <Input
                value={customerForm.address}
                onChange={e =>
                  setCustomerForm({ ...customerForm, address: e.target.value })
                }
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomerDialog(false)}
              className="h-8 text-xs"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] h-8 text-xs"
              disabled={isCreatingCustomer}
              onClick={() => createCustomer.mutate(customerForm)}
            >
              {isCreatingCustomer ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Supplier Dialog ─── */}
      <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-[#102a2b]">
              إضافة مورد جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">كود المورد</Label>
                <Input
                  value={supplierForm.code}
                  onChange={e =>
                    setSupplierForm({ ...supplierForm, code: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">اسم المورد</Label>
                <Input
                  value={supplierForm.name}
                  onChange={e =>
                    setSupplierForm({ ...supplierForm, name: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">الهاتف</Label>
                <Input
                  value={supplierForm.phone}
                  onChange={e =>
                    setSupplierForm({ ...supplierForm, phone: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">المدينة</Label>
                <Input
                  value={supplierForm.city}
                  onChange={e =>
                    setSupplierForm({ ...supplierForm, city: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px]">العنوان</Label>
              <Input
                value={supplierForm.address}
                onChange={e =>
                  setSupplierForm({ ...supplierForm, address: e.target.value })
                }
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSupplierDialog(false)}
              className="h-8 text-xs"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] h-8 text-xs"
              disabled={isCreatingSupplier}
              onClick={() => createSupplier.mutate(supplierForm)}
            >
              {isCreatingSupplier ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Customer Detail Dialog (custom fields) ─── */}
      <Dialog open={customerDetailOpen} onOpenChange={setCustomerDetailOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-[#102a2b]">
              تفاصيل العميل: {selectedCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="text-[11px] text-gray-500 space-y-1">
            <p>الكود: {selectedCustomer?.code}</p>
            <p>الهاتف: {selectedCustomer?.phone}</p>
            <p>المدينة: {selectedCustomer?.city}</p>
          </div>
          {selectedCustomer && (
            <CustomFields
              entityType="customer"
              entityId={selectedCustomer.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Supplier Detail Dialog (custom fields) ─── */}
      <Dialog open={supplierDetailOpen} onOpenChange={setSupplierDetailOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-[#102a2b]">
              تفاصيل المورد: {selectedSupplier?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="text-[11px] text-gray-500 space-y-1">
            <p>الكود: {selectedSupplier?.code}</p>
            <p>الهاتف: {selectedSupplier?.phone}</p>
            <p>المدينة: {selectedSupplier?.city}</p>
          </div>
           {selectedSupplier && (
             <CustomFields
               entityType="supplier"
               entityId={selectedSupplier.id}
             />
           )}
         </DialogContent>
       </Dialog>

       {/* ─── Offers Dialog (Module B) ─── */}
       <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
         <DialogContent className="bg-white max-w-md">
           <DialogHeader>
             <DialogTitle className="text-sm text-[#102a2b]">عرض جديد</DialogTitle>
           </DialogHeader>
           <div className="space-y-3">
             <div>
               <Label className="text-[10px]">الاسم</Label>
               <Input
                 value={offerForm.name}
                 onChange={e => setOfferForm({ ...offerForm, name: e.target.value })}
                 className="h-8 text-xs"
               />
             </div>
             <div className="grid grid-cols-2 gap-2">
               <div>
                 <Label className="text-[10px]">النوع</Label>
                 <select
                   className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white"
                   value={offerForm.kind}
                   onChange={e => setOfferForm({ ...offerForm, kind: e.target.value })}
                 >
                   <option value="financial">خصم مالي</option>
                   <option value="quantity">عرض كمي</option>
                 </select>
               </div>
               <div>
                 <Label className="text-[10px]">نسبة الخصم %</Label>
                 <Input
                   value={offerForm.discountPercent}
                   onChange={e => setOfferForm({ ...offerForm, discountPercent: e.target.value })}
                   className="h-8 text-xs"
                 />
               </div>
             </div>
             <div className="grid grid-cols-2 gap-2">
               <div>
                 <Label className="text-[10px]">الحد الأدنى للكمية</Label>
                 <Input
                   value={offerForm.minQty}
                   onChange={e => setOfferForm({ ...offerForm, minQty: e.target.value })}
                   className="h-8 text-xs"
                 />
               </div>
               <div>
                 <Label className="text-[10px]">منتج (اختياري)</Label>
                 <select
                   className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white"
                   value={offerForm.productId ?? ""}
                   onChange={e => setOfferForm({ ...offerForm, productId: e.target.value ? Number(e.target.value) : undefined })}
                 >
                   <option value="">كل المنتجات</option>
                   {(productsForOffer.data?.items ?? []).map((p: any) => (
                     <option key={p.id} value={p.id}>{p.name}</option>
                   ))}
                 </select>
               </div>
             </div>
             <div>
               <Label className="text-[10px]">تصنيف (اختياري)</Label>
               <select
                 className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white"
                 value={offerForm.categoryId ?? ""}
                 onChange={e => setOfferForm({ ...offerForm, categoryId: e.target.value ? Number(e.target.value) : undefined })}
               >
                 <option value="">كل التصنيفات</option>
                 {(catsForOffer.data ?? []).map((c: any) => (
                   <option key={c.id} value={c.id}>{c.name}</option>
                 ))}
               </select>
             </div>
             <div className="grid grid-cols-2 gap-2">
               <div>
                 <Label className="text-[10px]">تاريخ البداية</Label>
                 <Input
                   type="date"
                   value={offerForm.startDate}
                   onChange={e => setOfferForm({ ...offerForm, startDate: e.target.value })}
                   className="h-8 text-xs"
                 />
               </div>
               <div>
                 <Label className="text-[10px]">تاريخ النهاية</Label>
                 <Input
                   type="date"
                   value={offerForm.endDate}
                   onChange={e => setOfferForm({ ...offerForm, endDate: e.target.value })}
                   className="h-8 text-xs"
                 />
               </div>
             </div>
             <label className="flex items-center gap-2 text-[11px]">
               <input
                 type="checkbox"
                 checked={offerForm.isActive}
                 onChange={e => setOfferForm({ ...offerForm, isActive: e.target.checked })}
               />
               نشط
             </label>
             <DialogFooter>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setShowOfferDialog(false)}
                 className="h-8 text-xs"
               >
                 إلغاء
               </Button>
               <Button
                 size="sm"
                 className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] h-8 text-xs"
                 disabled={!offerForm.name || createOffer.isPending}
                 onClick={() =>
                   createOffer.mutate({
                     name: offerForm.name,
                     kind: offerForm.kind,
                     discountPercent: offerForm.discountPercent || "0",
                     minQty: offerForm.minQty || undefined,
                     productId: offerForm.productId,
                     categoryId: offerForm.categoryId,
                     startDate: offerForm.startDate || undefined,
                     endDate: offerForm.endDate || undefined,
                   })
                 }
               >
                 {createOffer.isPending ? "جاري الحفظ..." : "حفظ"}
               </Button>
             </DialogFooter>
           </div>
         </DialogContent>
       </Dialog>

       {/* ─── Offers Edit Dialog (Module B) ─── */}
       <Dialog open={!!editOffer} onOpenChange={(o) => !o && setEditOffer(null)}>
         <DialogContent className="bg-white max-w-md">
           <DialogHeader>
             <DialogTitle className="text-sm text-[#102a2b]">تعديل العرض</DialogTitle>
           </DialogHeader>
           {editOffer && (
             <div className="space-y-3">
               <div>
                 <Label className="text-[10px]">الاسم</Label>
                 <Input
                   value={editOffer.name}
                   onChange={e => setEditOffer({ ...editOffer, name: e.target.value })}
                   className="h-8 text-xs"
                 />
               </div>
               <div className="grid grid-cols-2 gap-2">
                 <div>
                   <Label className="text-[10px]">النوع</Label>
                   <select
                     className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white"
                     value={editOffer.kind}
                     onChange={e => setEditOffer({ ...editOffer, kind: e.target.value })}
                   >
                     <option value="financial">خصم مالي</option>
                     <option value="quantity">عرض كمي</option>
                   </select>
                 </div>
                 <div>
                   <Label className="text-[10px]">نسبة الخصم %</Label>
                   <Input
                     value={editOffer.discountPercent}
                     onChange={e => setEditOffer({ ...editOffer, discountPercent: e.target.value })}
                     className="h-8 text-xs"
                   />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-2">
                 <div>
                   <Label className="text-[10px]">الحد الأدنى للكمية</Label>
                   <Input
                     value={editOffer.minQty}
                     onChange={e => setEditOffer({ ...editOffer, minQty: e.target.value })}
                     className="h-8 text-xs"
                   />
                 </div>
                 <div>
                   <Label className="text-[10px]">منتج (اختياري)</Label>
                   <select
                     className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white"
                     value={editOffer.productId ?? ""}
                     onChange={e => setEditOffer({ ...editOffer, productId: e.target.value ? Number(e.target.value) : undefined })}
                   >
                     <option value="">كل المنتجات</option>
                     {(productsForOffer.data?.items ?? []).map((p: any) => (
                       <option key={p.id} value={p.id}>{p.name}</option>
                     ))}
                   </select>
                 </div>
               </div>
               <div>
                 <Label className="text-[10px]">تصنيف (اختياري)</Label>
                 <select
                   className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white"
                   value={editOffer.categoryId ?? ""}
                   onChange={e => setEditOffer({ ...editOffer, categoryId: e.target.value ? Number(e.target.value) : undefined })}
                 >
                   <option value="">كل التصنيفات</option>
                   {(catsForOffer.data ?? []).map((c: any) => (
                     <option key={c.id} value={c.id}>{c.name}</option>
                   ))}
                 </select>
               </div>
               <div className="grid grid-cols-2 gap-2">
                 <div>
                   <Label className="text-[10px]">تاريخ البداية</Label>
                   <Input
                     type="date"
                     value={editOffer.startDate}
                     onChange={e => setEditOffer({ ...editOffer, startDate: e.target.value })}
                     className="h-8 text-xs"
                   />
                 </div>
                 <div>
                   <Label className="text-[10px]">تاريخ النهاية</Label>
                   <Input
                     type="date"
                     value={editOffer.endDate}
                     onChange={e => setEditOffer({ ...editOffer, endDate: e.target.value })}
                     className="h-8 text-xs"
                   />
                 </div>
               </div>
               <label className="flex items-center gap-2 text-[11px]">
                 <input
                   type="checkbox"
                   checked={editOffer.isActive}
                   onChange={e => setEditOffer({ ...editOffer, isActive: e.target.checked })}
                 />
                 نشط
               </label>
               <DialogFooter>
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => setEditOffer(null)}
                   className="h-8 text-xs"
                 >
                   إلغاء
                 </Button>
                 <Button
                   size="sm"
                   className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] h-8 text-xs"
                   disabled={!editOffer.name || updateOffer.isPending}
                   onClick={() =>
                     updateOffer.mutate({
                       id: editOffer.id,
                       name: editOffer.name,
                       kind: editOffer.kind,
                       discountPercent: editOffer.discountPercent || "0",
                       minQty: editOffer.minQty || undefined,
                       productId: editOffer.productId,
                       categoryId: editOffer.categoryId,
                       isActive: editOffer.isActive,
                     })
                   }
                 >
                   {updateOffer.isPending ? "جاري الحفظ..." : "حفظ"}
                 </Button>
               </DialogFooter>
             </div>
           )}
         </DialogContent>
       </Dialog>

       {/* ─── Sale Dialog ─── */}
      <Dialog open={showSaleDialog} onOpenChange={setShowSaleDialog}>
        <DialogContent className="bg-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm text-[#102a2b]">
              فاتورة مبيعات جديدة / نقطة بيع
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">العميل</Label>
                <Select
                  value={saleCustomerId?.toString() || ""}
                  onValueChange={v => setSaleCustomerId(parseInt(v))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="اختر عميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {customersData?.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">طريقة الدفع</Label>
                <Select
                  value={salePayment}
                  onValueChange={v => setSalePayment(v as any)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="card">بطاقة</SelectItem>
                    <SelectItem value="transfer">تحويل</SelectItem>
                    <SelectItem value="credit">آجل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">العملة</Label>
                <Select
                  value={saleCurrency}
                  onValueChange={(v) => {
                    setSaleCurrency(v);
                    const c = (currenciesQ.data || []).find(
                      (x: any) => x.code === v
                    );
                    setSaleCurrencyRate(c ? String(c.rate) : "1");
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="العملة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YER">ريال يمني (YER)</SelectItem>
                    {(currenciesQ.data || []).map((c: any) => (
                      <SelectItem key={c.id} value={c.code}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">سعر الصرف</Label>
                <Input
                  value={saleCurrencyRate}
                  onChange={(e) => setSaleCurrencyRate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px]">موقع العمل</Label>
                <select
                  className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white"
                  value={saleWorkSiteId ?? ""}
                  onChange={e => setSaleWorkSiteId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">—</option>
                  {(workSitesQ.data || []).map(w => (
                    <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[10px]">الجهاز</Label>
                <select
                  className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white"
                  value={saleDeviceId ?? ""}
                  onChange={e => setSaleDeviceId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">—</option>
                  {(devicesQ.data || []).map(d => (
                    <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[10px]">الإحداثيات</Label>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[10px] w-full"
                  onClick={pickLocation}
                >
                  {saleCoords.lat ? `✓ ${saleCoords.lat.slice(0, 6)}` : "تحديد الموقع"}
                </Button>
              </div>
            </div>
            <div className="border rounded-lg p-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[10px] font-bold">الأصناف</Label>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px]"
                  onClick={addItemToSale}
                >
                  <Plus className="w-3 h-3" />
                  إضافة صنف
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] text-[#b87945] border-[#b87945]/40"
                  onClick={applyOffersToSale}
                  disabled={saleItems.length === 0}
                >
                  <Tag className="w-3 h-3" />
                  تطبيق العروض
                </Button>
              </div>
              {saleItems.map((item, idx) => {
                const lineTotal =
                  parseFloat(item.unitPrice) * item.quantity -
                  (parseFloat(item.discount) || 0);
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 mb-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-[#102a2b] truncate">
                        {item.productName}
                      </p>
                      <p className="text-[9px] text-gray-400">
                        {(parseFloat(item.unitPrice) * item.quantity).toLocaleString()} −{" "}
                        خصم {item.discount || "0"} ={" "}
                        <span className="font-bold text-[#b87945]">
                          {lineTotal.toLocaleString()} ر.ي
                        </span>
                      </p>
                    </div>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={e => {
                        const newItems = [...saleItems];
                        newItems[idx].quantity =
                          parseInt(e.target.value) || 1;
                        setSaleItems(newItems);
                      }}
                      className="h-7 text-[10px] w-14"
                    />
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={e => {
                        const newItems = [...saleItems];
                        newItems[idx].unitPrice = e.target.value;
                        setSaleItems(newItems);
                      }}
                      className="h-7 text-[10px] w-20"
                    />
                    <Input
                      type="number"
                      value={item.discount}
                      placeholder="خصم"
                      onChange={e => {
                        const newItems = [...saleItems];
                        newItems[idx].discount = e.target.value;
                        setSaleItems(newItems);
                      }}
                      className="h-7 text-[10px] w-16"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() =>
                        setSaleItems(saleItems.filter((_, i) => i !== idx))
                      }
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                );
              })}
              <div className="flex flex-col gap-1 pt-2 border-t text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">المجموع الفرعي</span>
                  <span className="font-bold">
                    {saleTotal.toLocaleString()} ر.ي
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">إجمالي الخصم</span>
                  <span className="font-bold text-red-500">
                    {saleDiscountTotal.toLocaleString()} ر.ي
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="font-bold text-[#102a2b]">الإجمالي النهائي</span>
                  <span className="font-bold text-[#102a2b]">
                    {saleGrandTotal.toLocaleString()} ر.ي
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaleDialog(false)}
              className="h-8 text-xs"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] h-8 text-xs"
              onClick={() =>
                createSale.mutate({
                  customerId: saleCustomerId,
                  items: saleItems,
                  paymentMethod: salePayment,
                  paidAmount:
                    salePayment === "cash"
                      ? saleGrandTotal.toString()
                      : "0",
                  discount: saleDiscountTotal.toString(),
                  country: (settingsQ.data as any)?.country,
                  workSiteId: saleWorkSiteId,
                  deviceId: saleDeviceId,
                  lat: saleCoords.lat,
                  lng: saleCoords.lng,
                  currency: saleCurrency,
                  currencyRate: saleCurrencyRate,
                })
              }
              disabled={saleItems.length === 0 || isCreatingSale}
            >
              {isCreatingSale ? "جاري الإنشاء..." : "تأكيد الفاتورة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ZATCA e-invoice QR (Saudi) ─── */}
      <Dialog open={!!zatcaView} onOpenChange={o => !o && setZatcaView(null)}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm text-[#102a2b]">
              الفاتورة الإلكترونية (ZATCA)
            </DialogTitle>
          </DialogHeader>
          {zatcaView && (
            <div className="space-y-2 text-center">
              <p className="text-[11px] text-gray-500">
                رمز الاستجابة السريعة (TLV Base64) — الصقه في مولّد QR لعرضه
                للعميل أو خزّنه مع الفاتورة.
              </p>
              <textarea
                readOnly
                rows={4}
                className="w-full p-2 rounded border border-gray-200 text-[10px] font-mono bg-gray-50"
                value={zatcaView.qrBase64 || ""}
              />
              <p className="text-[10px] text-gray-400 break-all">
                UUID: {zatcaView.uuid}
              </p>
              <p className="text-[10px] text-gray-400 break-all">
                Hash: {zatcaView.hash?.slice(0, 32)}…
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Shared Product Picker ─── */}
      <ProductPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handlePick}
        title={
          pickerMode === "purchase"
            ? "اختر منتجاً للمشتريات"
            : pickerMode === "order"
              ? "اختر منتجاً للطلب"
              : "اختر صنفاً للبيع (نقطة بيع)"
        }
        priceField={pickerMode === "purchase" ? "purchasePrice" : "salePrice"}
      />

      {/* ─── Purchase Dialog ─── */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="bg-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm text-[#102a2b]">
              فاتورة مشتريات جديدة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[10px]">المورد</Label>
              <Select
                value={purchaseSupplierId?.toString() || ""}
                onValueChange={v => setPurchaseSupplierId(parseInt(v))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="اختر مورد" />
                </SelectTrigger>
                <SelectContent>
                  {suppliersData?.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border rounded-lg p-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[10px] font-bold">الأصناف</Label>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px]"
                  onClick={addItemToPurchase}
                >
                  <Plus className="w-3 h-3" />
                  إضافة صنف
                </Button>
              </div>
              {purchaseItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <Input
                    value={item.productName}
                    readOnly
                    className="h-7 text-[10px] flex-1"
                  />
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={e => {
                      const newItems = [...purchaseItems];
                      newItems[idx].quantity = parseInt(e.target.value) || 1;
                      setPurchaseItems(newItems);
                    }}
                    className="h-7 text-[10px] w-16"
                  />
                  <Input
                    type="number"
                    value={item.unitPrice}
                    onChange={e => {
                      const newItems = [...purchaseItems];
                      newItems[idx].unitPrice = e.target.value;
                      setPurchaseItems(newItems);
                    }}
                    className="h-7 text-[10px] w-20"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() =>
                      setPurchaseItems(
                        purchaseItems.filter((_, i) => i !== idx)
                      )
                    }
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-end pt-2 border-t">
                <p className="text-sm font-bold text-[#102a2b]">
                  الإجمالي: {purchaseTotal.toLocaleString()} ر.ي
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPurchaseDialog(false)}
              className="h-8 text-xs"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] h-8 text-xs"
              onClick={() =>
                createPurchase.mutate({
                  supplierId: purchaseSupplierId,
                  items: purchaseItems,
                  paidAmount: "0",
                  discount: purchaseItems
                    .reduce((s, i) => s + (parseFloat(i.discount) || 0), 0)
                    .toString(),
                })
              }
              disabled={purchaseItems.length === 0 || isCreatingPurchase}
            >
              {isCreatingPurchase ? "جاري الإنشاء..." : "تأكيد الفاتورة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Order Dialog ─── */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="bg-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm text-[#102a2b]">
              طلب توزيع جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">العميل</Label>
                <Select
                  value={orderCustomerId?.toString() || ""}
                  onValueChange={v => setOrderCustomerId(parseInt(v))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="اختر عميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {customersData?.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">عنوان التوصيل</Label>
                <Input
                  value={orderAddress}
                  onChange={e => setOrderAddress(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="border rounded-lg p-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[10px] font-bold">الأصناف</Label>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px]"
                  onClick={addItemToOrder}
                >
                  <Plus className="w-3 h-3" />
                  إضافة صنف
                </Button>
              </div>
              {orderItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <Input
                    value={item.productName}
                    readOnly
                    className="h-7 text-[10px] flex-1"
                  />
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={e => {
                      const newItems = [...orderItems];
                      newItems[idx].quantity = parseInt(e.target.value) || 1;
                      setOrderItems(newItems);
                    }}
                    className="h-7 text-[10px] w-16"
                  />
                  <Input
                    type="number"
                    value={item.unitPrice}
                    onChange={e => {
                      const newItems = [...orderItems];
                      newItems[idx].unitPrice = e.target.value;
                      setOrderItems(newItems);
                    }}
                    className="h-7 text-[10px] w-20"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() =>
                      setOrderItems(orderItems.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-end pt-2 border-t">
                <p className="text-sm font-bold text-[#102a2b]">
                  الإجمالي: {orderTotal.toLocaleString()} ر.ي
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOrderDialog(false)}
              className="h-8 text-xs"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] h-8 text-xs"
              onClick={() =>
                createOrder.mutate({
                  customerId: orderCustomerId,
                  items: orderItems,
                  deliveryAddress: orderAddress,
                })
              }
              disabled={orderItems.length === 0 || isCreatingOrder}
            >
              {isCreatingOrder ? "جاري الإنشاء..." : "إنشاء الطلب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog (Receipt / Settlement) */}
      <Dialog open={!!payTarget} onOpenChange={o => !o && setPayTarget(null)}>
        <DialogContent className="max-w-md font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#b87945]" /> تسجيل دفعة / سند قبض
            </DialogTitle>
          </DialogHeader>
          {payTarget && (
            <div className="space-y-3 pt-2">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs space-y-1">
                <p className="font-bold text-slate-800">
                  {payTarget.invoice.invoiceNumber}
                </p>
                <p className="text-slate-600">
                  إجمالي الفاتورة:{" "}
                  <b>
                    {Number(payTarget.invoice.total).toLocaleString("en-US")}
                  </b>{" "}
                  · المدفوع:{" "}
                  <b>
                    {Number(payTarget.invoice.paidAmount || 0).toLocaleString(
                      "en-US"
                    )}
                  </b>
                </p>
                <p className="text-emerald-700 font-bold">
                  المتبقي:{" "}
                  {Math.max(
                    0,
                    Number(payTarget.invoice.total) -
                      Number(payTarget.invoice.paidAmount || 0)
                  ).toLocaleString("en-US")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">
                    مبلغ الدفعة
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs font-mono bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">
                    طريقة الدفع
                  </Label>
                  <Select
                    value={payMethod}
                    onValueChange={v => setPayMethod(v as any)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash" className="text-xs">
                        نقدي
                      </SelectItem>
                      <SelectItem value="transfer" className="text-xs">
                        تحويل بنكي
                      </SelectItem>
                      <SelectItem value="card" className="text-xs">
                        بطاقة
                      </SelectItem>
                      <SelectItem value="online" className="text-xs">
                        إلكتروني
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">
                  تاريخ الدفعة (اختياري)
                </Label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="h-8 text-xs bg-slate-50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">
                  ملاحظات (اختياري)
                </Label>
                <Input
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="مثال: دفعة أولى..."
                  className="h-8 text-xs bg-slate-50"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 pt-2">
            <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={printAfterSave}
                onChange={e => setPrintAfterSave(e.target.checked)}
                className="accent-[#b87945]"
              />
              اطبع سند {payTarget?.source === "purchases" ? "صرف" : "قبض"} بعد
              الحفظ
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPayTarget(null)}
              className="text-xs h-8"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={handlePay}
              disabled={createPayment.isPending}
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {createPayment.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              ) : (
                <Wallet className="w-3 h-3 ml-1" />
              )}
              تسجيل الدفعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog
        open={!!editProduct}
        onOpenChange={o => !o && setEditProduct(null)}
      >
        <DialogContent className="max-w-md font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Edit className="w-4 h-4 text-[#b87945]" /> تعديل منتج:{" "}
              {editProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">
                اسم المنتج
              </Label>
              <Input
                value={editProductForm.name}
                onChange={e =>
                  setEditProductForm({
                    ...editProductForm,
                    name: e.target.value,
                  })
                }
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">
                  سعر البيع
                </Label>
                <Input
                  value={editProductForm.salePrice}
                  onChange={e =>
                    setEditProductForm({
                      ...editProductForm,
                      salePrice: e.target.value,
                    })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">
                  سعر الشراء
                </Label>
                <Input
                  value={editProductForm.purchasePrice}
                  onChange={e =>
                    setEditProductForm({
                      ...editProductForm,
                      purchasePrice: e.target.value,
                    })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">
                  حد الإنذار (minStock)
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={editProductForm.minStock}
                  onChange={e =>
                    setEditProductForm({
                      ...editProductForm,
                      minStock: Number(e.target.value),
                    })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">
                  الباركود
                </Label>
                <BarcodeScanner
                  value={editProductForm.barcode}
                  onChange={v =>
                    setEditProductForm({ ...editProductForm, barcode: v })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">نوع الصنف</Label>
                  <select className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white" value={editProductForm.productType} onChange={e => setEditProductForm({ ...editProductForm, productType: e.target.value })}>
                    <option value="goods">سلعة</option>
                    <option value="service">خدمة</option>
                  </select>
                </div>
                <div>
                  <Label className="text-[10px]">وحدة القياس</Label>
                  <Input value={editProductForm.unitOfMeasure} onChange={e => setEditProductForm({ ...editProductForm, unitOfMeasure: e.target.value })} className="h-8 text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-[10px]">وحدة فرعية</Label><Input value={editProductForm.secondaryUnit} onChange={e => setEditProductForm({ ...editProductForm, secondaryUnit: e.target.value })} className="h-8 text-xs" /></div>
                <div><Label className="text-[10px]">معامل التحويل</Label><Input type="number" value={editProductForm.conversionFactor} onChange={e => setEditProductForm({ ...editProductForm, conversionFactor: e.target.value })} className="h-8 text-xs" /></div>
                <div className="flex items-end"><label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={editProductForm.isComposite} onChange={e => setEditProductForm({ ...editProductForm, isComposite: e.target.checked })} /> مركب</label></div>
              </div>

              {editProductForm.productType === "service" && (
                <div className="border rounded-lg p-2 space-y-2 bg-amber-50/50">
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label className="text-[10px]">طريقة التكلفة</Label><select className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white" value={editProductForm.costMethod} onChange={e => setEditProductForm({ ...editProductForm, costMethod: e.target.value })}><option value="fixed">ثابتة</option><option value="calculated">محسوبة</option></select></div>
                    <div><Label className="text-[10px]">تكلفة مباشرة</Label><Input type="number" value={editProductForm.directCost} onChange={e => setEditProductForm({ ...editProductForm, directCost: e.target.value })} className="h-8 text-xs" /></div>
                    <div><Label className="text-[10px]">غير مباشرة</Label><Input type="number" value={editProductForm.indirectCost} onChange={e => setEditProductForm({ ...editProductForm, indirectCost: e.target.value })} className="h-8 text-xs" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label className="text-[10px]">دقائق إنتاج</Label><Input type="number" value={editProductForm.productionMinutes} onChange={e => setEditProductForm({ ...editProductForm, productionMinutes: e.target.value })} className="h-8 text-xs" /></div>
                    <div><Label className="text-[10px]">وضع السعر</Label><select className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white" value={editProductForm.priceMode} onChange={e => setEditProductForm({ ...editProductForm, priceMode: e.target.value })}><option value="margin">هامش</option><option value="direct">مباشر</option></select></div>
                    <div><Label className="text-[10px]">هامش %</Label><Input type="number" value={editProductForm.marginPct} onChange={e => setEditProductForm({ ...editProductForm, marginPct: e.target.value })} className="h-8 text-xs" /></div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-[10px]">حساب الإيراد</Label><AcctSelect value={editProductForm.salesAccountId} onChange={v => setEditProductForm({ ...editProductForm, salesAccountId: v })} accounts={accountsQuery.data} /></div>
                <div><Label className="text-[10px]">حساب التكلفة</Label><AcctSelect value={editProductForm.cogsAccountId} onChange={v => setEditProductForm({ ...editProductForm, cogsAccountId: v })} accounts={accountsQuery.data} /></div>
                <div><Label className="text-[10px]">حساب المخزون</Label><AcctSelect value={editProductForm.inventoryAccountId} onChange={v => setEditProductForm({ ...editProductForm, inventoryAccountId: v })} accounts={accountsQuery.data} /></div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditProduct(null)}
              className="text-xs h-8"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={() =>
                updateProduct.mutate({
                  id: editProductForm.id,
                  name: editProductForm.name,
                  salePrice: editProductForm.salePrice,
                  purchasePrice: editProductForm.purchasePrice,
                  minStock: editProductForm.minStock,
                  barcode: editProductForm.barcode || undefined,
                  productType: editProductForm.productType,
                  unitOfMeasure: editProductForm.unitOfMeasure || undefined,
                  secondaryUnit: editProductForm.secondaryUnit || undefined,
                  conversionFactor: Number(editProductForm.conversionFactor) || 1,
                  isComposite: editProductForm.isComposite,
                  bom: editProductForm.bom,
                  alternativeIds: editProductForm.alternativeIds,
                  attachmentUrl: editProductForm.attachmentUrl || undefined,
                  costMethod: editProductForm.costMethod,
                  directCost: Number(editProductForm.directCost) || 0,
                  indirectCost: Number(editProductForm.indirectCost) || 0,
                  productionMinutes: Number(editProductForm.productionMinutes) || 0,
                  priceMode: editProductForm.priceMode,
                  marginPct: Number(editProductForm.marginPct) || 0,
                  salesAccountId: editProductForm.salesAccountId || undefined,
                  cogsAccountId: editProductForm.cogsAccountId || undefined,
                  inventoryAccountId: editProductForm.inventoryAccountId || undefined,
                } as any)
              }
              disabled={updateProduct.isPending}
              className="text-xs h-8 bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] font-bold"
            >
              {updateProduct.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              ) : (
                <CheckCircle className="w-3 h-3 ml-1" />
              )}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog
        open={!!adjustProduct}
        onOpenChange={o => !o && setAdjustProduct(null)}
      >
        <DialogContent className="max-w-md font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <PackagePlus className="w-4 h-4 text-[#b87945]" /> تعديل المخزون:{" "}
              {adjustProduct?.name}
            </DialogTitle>
          </DialogHeader>
          {adjustProduct && (
            <div className="space-y-3 pt-2">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs">
                <p className="text-slate-600">
                  المخزون الحالي:{" "}
                  <b
                    className={
                      adjustProduct.currentStock <= adjustProduct.minStock
                        ? "text-red-600"
                        : "text-slate-800"
                    }
                  >
                    {adjustProduct.currentStock}
                  </b>{" "}
                  {adjustProduct.unit}
                </p>
                <p className="text-slate-500 text-[10px]">
                  حد الإنذار: {adjustProduct.minStock} {adjustProduct.unit}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">
                  نوع العملية
                </Label>
                <Select
                  value={adjustForm.type}
                  onValueChange={v =>
                    setAdjustForm({ ...adjustForm, type: v as any })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in" className="text-xs">
                      تزويد المخزون (+)
                    </SelectItem>
                    <SelectItem value="out" className="text-xs">
                      صرف من المخزون (−)
                    </SelectItem>
                    <SelectItem value="adjustment" className="text-xs">
                      تسوية / جرد
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">
                  الكمية
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={adjustForm.quantity}
                  onChange={e =>
                    setAdjustForm({
                      ...adjustForm,
                      quantity: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">
                  سبب العملية (اختياري)
                </Label>
                <Input
                  value={adjustForm.notes}
                  onChange={e =>
                    setAdjustForm({ ...adjustForm, notes: e.target.value })
                  }
                  placeholder="مثال: جرد شهري، تالف..."
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdjustProduct(null)}
              className="text-xs h-8"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={() =>
                adjustStock.mutate({
                  productId: adjustProduct.id,
                  quantity: adjustForm.quantity,
                  type: adjustForm.type,
                  notes: adjustForm.notes || undefined,
                })
              }
              disabled={adjustStock.isPending}
              className="text-xs h-8 bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] font-bold"
            >
              {adjustStock.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              ) : (
                <CheckCircle className="w-3 h-3 ml-1" />
              )}
              تنفيذ العملية
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Order to Invoice Dialog */}
      <Dialog
        open={!!convertOrder}
        onOpenChange={o => !o && setConvertOrder(null)}
      >
        <DialogContent className="max-w-md font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-[#b87945]" /> تحويل الطلب إلى
              فاتورة مبيعات
            </DialogTitle>
          </DialogHeader>
          {convertOrder && (
            <div className="space-y-3 pt-2">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-2">
                  {convertOrder.orderNumber}
                  {isWebOrder(convertOrder) && (
                    <Badge className="text-[9px] bg-purple-100 text-purple-700">
                      متجر إلكتروني
                    </Badge>
                  )}
                </p>
                <p className="text-slate-500">
                  الإجمالي:{" "}
                  <b className="text-slate-800 font-mono">
                    {Number(convertOrder.total).toLocaleString("en-US")} ر.ي
                  </b>
                </p>
                <p className="text-[10px] text-slate-400">
                  المخزون محجوز منذ وقت الطلب — لن يُخصم مرة أخرى عند إنشاء
                  الفاتورة
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">
                    طريقة الدفع
                  </Label>
                  <Select
                    value={convertForm.paymentMethod}
                    onValueChange={v =>
                      setConvertForm({ ...convertForm, paymentMethod: v })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash" className="text-xs">
                        نقدي عند التوصيل
                      </SelectItem>
                      <SelectItem value="card" className="text-xs">
                        بطاقة
                      </SelectItem>
                      <SelectItem value="transfer" className="text-xs">
                        تحويل بنكي
                      </SelectItem>
                      <SelectItem value="online" className="text-xs">
                        إلكتروني
                      </SelectItem>
                      <SelectItem value="credit" className="text-xs">
                        آجل (أجل)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">
                    المبلغ المدفوع الآن
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max={Number(convertOrder.total)}
                    value={convertForm.paidAmount}
                    onChange={e =>
                      setConvertForm({
                        ...convertForm,
                        paidAmount: e.target.value,
                      })
                    }
                    className="h-8 text-xs font-mono bg-slate-50"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                المدفوع = الإجمالي → فاتورة «مدفوعة» • أقل من الإجمالي → «مدفوعة
                جزئياً» والرصيد يتراكم على العميل • صفر → «مؤكدة» (آجل)
              </p>
            </div>
          )}
          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConvertOrder(null)}
              className="text-xs h-8"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              disabled={convertToInvoice.isPending}
              onClick={() =>
                convertToInvoice.mutate({
                  orderId: convertOrder.id,
                  paymentMethod: convertForm.paymentMethod as any,
                  paidAmount: convertForm.paidAmount || "0",
                })
              }
              className="text-xs h-8 bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] font-bold"
            >
              {convertToInvoice.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              ) : (
                <ReceiptText className="w-3 h-3 ml-1" />
              )}
              إنشاء الفاتورة والقيود
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog
        open={showImportDialog}
        onOpenChange={o => {
          setShowImportDialog(o);
          if (!o) {
            setImportRows(null);
            setImportFileName("");
          }
        }}
      >
        <DialogContent className="max-w-md font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#b87945]" /> استيراد الأصناف
              والخدمات (CSV)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              الأعمدة:{" "}
              <code
                className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded"
                dir="ltr"
              >
                code,name,type,category,unit,purchasePrice,salePrice,wholesalePrice,minStock,currentStock,barcode
              </code>
              <br />
              تُقبل أيضاً رؤوس عربية (الرمز، الاسم، النوع: صنف/خدمة...). الأصناف
              الموجودة تُحدَّث، والجديدة تُضاف، والمخزون يعدَّل بفارق الرصيد مع
              تسجيل حركة جرد.
            </p>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-[#e8c9a0] rounded-lg p-5 cursor-pointer bg-[#faf5ed] hover:bg-[#f5ece0] transition-colors">
              <Upload className="w-5 h-5 text-[#b87945]" />
              <span className="text-xs font-bold text-[#5c3d1e]">
                {importFileName || "اختر ملف CSV"}
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={e => onImportFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={downloadProductTemplate}
            >
              <Download className="w-3 h-3 ml-1" /> تنزيل نموذج جاهز (Template)
            </Button>
            {importRows && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs space-y-1">
                <p className="font-bold text-slate-700">
                  جاهز للاستيراد: {importRows.length} صفاً
                </p>
                <p className="text-slate-500 text-[10px]">
                  سيتم التحديث حسب الرمز (code) — الأسعار والرصيد وحد الإنذار
                  ستُحدَّث للقائم منها
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportDialog(false)}
              className="text-xs h-8"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AcctSelect({
  value,
  onChange,
  accounts,
}: {
  value?: number;
  onChange: (v?: number) => void;
  accounts?: { id: number; code: string; name: string }[];
}) {
  return (
    <select
      className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white"
      value={value ?? ""}
      onChange={e => onChange(e.target.value ? Number(e.target.value) : undefined)}
    >
      <option value="">افتراضي</option>
      {(accounts || []).map(a => (
        <option key={a.id} value={a.id}>
          {a.code} - {a.name}
        </option>
      ))}
    </select>
  );
}
