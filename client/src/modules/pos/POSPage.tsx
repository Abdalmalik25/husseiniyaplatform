"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AppSidebar } from "@/components/AppSidebar";
import { ShoppingCart, Receipt, Banknote, CreditCard, Send, Smartphone, CheckCircle2, X, AlertTriangle, Package, Barcode, Camera, RotateCcw, Zap, Bell, Calendar, Settings, Download, Printer, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Cart } from "@/modules/pos/components/Cart";
import { ProductCatalog } from "@/modules/pos/components/ProductCatalog";
import { usePOSCart } from "@/modules/pos/hooks/usePOSCart";
import { usePOSSession } from "@/modules/pos/hooks/usePOSSession";
import { usePOSNotifications } from "@/modules/pos/hooks/usePOSNotifications";
import { usePOSProductSearch } from "@/modules/pos/hooks/usePOSProductSearch";
import { useOfflineQueue } from "@/modules/pos/hooks/useOfflineQueue";
import { createBarcodeScanner, parseBarcodeValue, validateBarcode } from "@/modules/pos/utils/barcodeScanner";
import { formatCurrency } from "@/modules/pos/utils/currency";
import type { POSConfig, SalesPolicy, PaymentMethodConfig, ProductSearchResult, PaymentMethodKey, POSSession } from "@/modules/pos/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function POSModule() {
  const utils = trpc.useUtils();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showDaily, setShowDaily] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHolds, setShowHolds] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<string | null>(null);
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(false);

  const { data: settingsData } = trpc.accounting.getSettings.useQuery(undefined, { staleTime: 60_000 });
  const updateSettingsMutation = trpc.accounting.updateSettings.useMutation({
    onSuccess: () => utils.accounting.getSettings.invalidate(),
    onError: () => toast.error("تعذر حفظ الإعدادات"),
  });
  const config = settingsData?.posConfig as POSConfig || {
    template: "standard",
    columns: 4,
    showStock: true,
    showCategories: true,
    barcodeFocus: false,
    allowServices: true,
    quickAdd: true,
    showCustomer: true,
    autoPrint: false,
    soundEnabled: true,
    vibrationEnabled: true,
    scanMode: "camera",
    supportedFormats: ["ean13", "ean8", "upc", "code128", "code39", "qr", "datamatrix", "pdf417", "aztec"],
    theme: "light",
    language: "ar",
    currency: "YER",
    decimals: 0,
    taxInclusive: false,
    defaultWarehouseId: null,
    enableOffline: true,
    syncInterval: 30000,
    holdTimeout: 3600000,
    maxHolds: 10,
    requireCustomerForCredit: true,
    allowSplitPayment: true,
    allowPartialPayment: true,
    roundingMethod: "none",
    roundingPrecision: 2,
  };

  const salesPolicy = settingsData?.salesPolicy as SalesPolicy || {
    allowMixedGoodsServices: true,
    requireCustomer: false,
    allowCredit: true,
    defaultPayment: "cash",
    allowNegativeStock: false,
    defaultWarehouseId: null,
    roundTotal: false,
    maxDiscountPercent: 100,
    maxLineDiscountPercent: 100,
    requireManagerApprovalAbove: 100000,
    allowPriceOverride: false,
    allowQuantityOverride: true,
    enableLoyalty: true,
    loyaltyPointsPerCurrency: 1,
    loyaltyRedemptionRate: 1,
  };

  const paymentMethods = settingsData?.paymentMethods as PaymentMethodConfig[] || [
    { key: "cash", label: "نقدي", labelAr: "نقدي", icon: "Banknote", enabled: true, accountCode: "1010", requiresReference: false, referenceLabel: "", referenceLabelAr: "", minAmount: 0, maxAmount: null, feePercent: 0, feeFixed: 0, sortOrder: 1 },
    { key: "card", label: "بطاقة", labelAr: "بطاقة", icon: "CreditCard", enabled: true, accountCode: "1021", requiresReference: true, referenceLabel: "رقم المرجع", referenceLabelAr: "رقم المرجع", minAmount: 0, maxAmount: null, feePercent: 0, feeFixed: 0, sortOrder: 2 },
    { key: "transfer", label: "تحويل", labelAr: "تحويل", icon: "Send", enabled: true, accountCode: "1022", requiresReference: true, referenceLabel: "رقم التحويل", referenceLabelAr: "رقم التحويل", minAmount: 0, maxAmount: null, feePercent: 0, feeFixed: 0, sortOrder: 3 },
    { key: "credit", label: "آجل", labelAr: "آجل", icon: "Receipt", enabled: true, accountCode: "1030", requiresReference: false, referenceLabel: "", referenceLabelAr: "", minAmount: 0, maxAmount: null, feePercent: 0, feeFixed: 0, sortOrder: 4 },
    { key: "online", label: "أونلاين", labelAr: "أونلاين", icon: "Smartphone", enabled: true, accountCode: "1023", requiresReference: true, referenceLabel: "معرف الدفع", referenceLabelAr: "معرف الدفع", minAmount: 0, maxAmount: null, feePercent: 0, feeFixed: 0, sortOrder: 5 },
  ];

  const enabledPaymentMethods = paymentMethods.filter(p => p.enabled).sort((a, b) => a.sortOrder - b.sortOrder);

  const session = usePOSSession({
    autoOpen: false,
    openingFloat: 0,
    branchId: undefined,
    deviceId: undefined,
  });

  const cart = usePOSCart({
    salesPolicy,
    config,
    onError: (msg) => toast.error(msg),
    getApplicableOffers: async (productId, quantity) => {
      try {
        const data = await utils.modules.offers.applicable.fetch({ productId, qty: quantity });
        return (data as any) || [];
      } catch {
        return [];
      }
    },
    getProductUnits: async (productId) => {
      try {
        const data = await utils.modules.productUnits.list.fetch({ productId });
        return (data as any) || [];
      } catch {
        return [];
      }
    },
  });

  const notifications = usePOSNotifications({
    autoFetch: true,
    fetchInterval: 30000,
    onNotification: (n) => {
      if (config.soundEnabled) {
        new Audio("/sounds/notification.mp3").play().catch(() => {});
      }
      if (config.vibrationEnabled && "vibrate" in navigator) {
        navigator.vibrate(200);
      }
    },
  });

  const productSearch = usePOSProductSearch({
    limit: 100,
    debounceMs: 300,
    warehouseId: config.defaultWarehouseId || undefined,
  });

  const offlineQueue = useOfflineQueue();

  const createSaleMutation = trpc.sales.create.useMutation({
    onSuccess: (res: any) => {
      toast.success("تمت عملية البيع بنجاح");
      setLastInvoice(res?.invoiceNumber ?? null);
      cart.clearCart();
      utils.sales.dailySummary.invalidate();
      utils.sales.list.invalidate();
      utils.modules.pos.listSessions.invalidate();

      if (config.autoPrint && res?.invoiceNumber) {
        printInvoice(res.invoiceNumber);
      }
    },
    onError: (e: any) => {
      toast.error(e?.message || "تعذر إتمام البيع");
      if (config.enableOffline) {
        const submission = cart.getCartForSubmission();
        offlineQueue.addToQueue({
          type: "sale",
          payload: submission,
          maxRetries: 5,
        } as any);
        toast.info("تم حفظ الفاتورة محلياً، ستتم المزامنة عند استعادة الاتصال");
      }
    },
  });

  // Use sessions query as a proxy for "holds" (basic implementation)
  const holdsMutation = trpc.modules.pos.listSessions.useQuery(undefined, { staleTime: 30_000 });

  // Adapt holdsMutation to expected interface
  const holdsData = useMemo(() => ({
    items: (holdsMutation.data ?? []).filter((s: any) => s.status === "suspended").map((s: any) => ({
      id: s.id,
      holdId: s.code,
      itemCount: 0,
      total: Number(s.totalSales || 0),
    })),
  }), [holdsMutation.data]);

  const daily = trpc.sales.dailySummary.useQuery(undefined, {
    staleTime: 30_000,
    placeholderData: (p) => p,
  });

  const handleBarcodeScan = useCallback(async (value: string) => {
    const parsed = parseBarcodeValue(value);

    if (parsed.type !== "custom" && !validateBarcode(value, parsed.type as any)) {
      toast.warning("باركود غير صالح");
      return;
    }

    let product = await productSearch.searchByBarcode(value);
    if (!product) {
      product = await productSearch.searchByCode(value);
    }
    if (!product) {
      const products = productSearch.products;
      product = products.find(p => p.barcode === value || p.code === value) || null;
    }

    if (product) {
      cart.addToCart(product);
      if (config.soundEnabled) {
        new Audio("/sounds/scan-success.mp3").play().catch(() => {});
      }
    } else {
      toast.error("لم يتم العثور على منتج بهذا الباركود");
      if (config.soundEnabled) {
        new Audio("/sounds/scan-error.mp3").play().catch(() => {});
      }
    }
  }, [productSearch, cart, config.soundEnabled]);

  const handleScannerResult = useCallback((result: any) => {
    handleBarcodeScan(result.value);
    if (config.scanMode !== "continuous") {
      setShowScanner(false);
    }
  }, [handleBarcodeScan, config.scanMode]);

  useEffect(() => {
    if (showScanner && videoRef.current) {
      scannerRef.current = createBarcodeScanner({
        onScan: handleScannerResult,
        onError: setScannerError,
        mode: config.scanMode,
        formats: config.supportedFormats,
        cameraFacing: "environment",
        hideAfterScan: config.scanMode !== "continuous",
      });
      scannerRef.current.startCameraScanner(videoRef.current);
    } else if (scannerRef.current) {
      scannerRef.current.stopCameraScanner();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stopCameraScanner();
        scannerRef.current.destroy();
      }
    };
  }, [showScanner, handleScannerResult, config.scanMode, config.supportedFormats]);

  const handleHold = useCallback(() => {
    const holdId = `HOLD-${Date.now().toString(36).toUpperCase()}`;
    cart.setHoldId(holdId);
    toast.success(`تم تعليق الفاتورة: ${holdId}`);
  }, [cart]);

  const handleClear = useCallback(() => {
    if (window.confirm("هل تريد مسح السلة بالكامل؟")) {
      cart.clearCart();
    }
  }, [cart]);

  const loadHold = useCallback((holdId: string) => {
    toast.success(`تم استعادة الفاتورة المعلقة: ${holdId}`);
  }, []);

  const handleCompleteSale = useCallback(() => {
    const submission = cart.getCartForSubmission();
    const validPaymentMethods = ["cash", "card", "transfer", "credit", "online"] as const;
    const paymentMethod = (validPaymentMethods as readonly string[]).includes(submission.paymentMethod)
      ? (submission.paymentMethod as "cash" | "card" | "transfer" | "credit" | "online")
      : "cash";

    createSaleMutation.mutate({
      customerId: submission.customerId,
      items: submission.items.map(i => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
      })),
      paymentMethod,
      paidAmount: String(submission.paidAmount || 0),
      discount: String(submission.discount || 0),
      notes: submission.notes,
    });
  }, [cart, createSaleMutation]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case "F1":
          e.preventDefault();
          cart.clearCart();
          break;
        case "F2":
          e.preventDefault();
          handleHold();
          break;
        case "F3":
          e.preventDefault();
          setShowHolds(true);
          break;
        case "F4":
          e.preventDefault();
          setShowScanner(!showScanner);
          break;
        case "F5":
          e.preventDefault();
          setShowNotifications(!showNotifications);
          break;
        case "F6":
          e.preventDefault();
          setShowDaily(!showDaily);
          break;
        case "F7":
          e.preventDefault();
          setViewMode(v => v === "grid" ? "list" : "grid");
          break;
        case "F8":
          e.preventDefault();
          setShowSettings(!showSettings);
          break;
        case "F9":
          e.preventDefault();
          if (cart.canCompleteSale) handleCompleteSale();
          break;
        case "F10":
          e.preventDefault();
          setKeyboardShortcuts(true);
          break;
        case "Escape":
          setShowScanner(false);
          setShowHolds(false);
          setShowNotifications(false);
          setShowDaily(false);
          setShowSettings(false);
          setKeyboardShortcuts(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, showScanner, showHolds, showNotifications, showDaily, showSettings, handleHold, handleCompleteSale]);

  const printInvoice = async (_invoiceNumber: string) => {
    try {
      window.print();
    } catch (err) {
      toast.error("فشل طباعة الفاتورة");
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-6 space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0e2a2b] text-[#b87945]">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">نقاط البيع المتقدم</h1>
              <p className="text-[11px] text-muted-foreground">
                نظام كاشير احترافي مع دعم الباركود، طرق دفع متعددة، وإدارة ورديات
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
            <Button variant="outline" size="sm" onClick={() => setShowDaily(!showDaily)}>
              <Calendar className="h-3.5 w-3.5 mr-1" /> تقرير اليوم
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowNotifications(!showNotifications)}>
              <Bell className="h-3.5 w-3.5 mr-1" />
              تنبيهات {notifications.unreadCount > 0 && <span className="ml-1 h-4 w-4 rounded-full bg-destructive text-[10px] flex items-center justify-center">{notifications.unreadCount}</span>}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowHolds(true)}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              فواتير معلقة {holdsData.items.length}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setKeyboardShortcuts(true)}>
              <Zap className="h-3.5 w-3.5 mr-1" />
              اختصارات
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="h-3.5 w-3.5 mr-1" />
              إعدادات
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between rounded-xl border border-border bg-card px-4 py-2">
          <div className="flex items-center gap-2 text-[12px]">
            <span className={`h-2.5 w-2.5 rounded-full ${session.isSessionOpen ? "bg-emerald-500" : session.isSessionSuspended ? "bg-amber-500" : "bg-rose-400"}`} />
            {session.isSessionOpen && session.session && (
              <span className="text-foreground">
                وردية مفتوحة: <span className="font-mono font-bold">{session.session.code}</span>
                <span className="mx-2">|</span>
                <span className="font-mono">{formatCurrency(session.session.totalSales, config.currency, config.decimals)}</span>
                <span className="mx-2">|</span>
                <span>{session.session.invoiceCount} فاتورة</span>
              </span>
            )}
            {!session.isSessionOpen && !session.isSessionSuspended && (
              <span className="text-muted-foreground">لا توجد وردية كاشير مفتوحة</span>
            )}
            {session.isSessionSuspended && session.session && (
              <span className="text-amber-600">وردية معلقة: <span className="font-mono font-bold">{session.session.code}</span></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {session.isSessionOpen ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => session.closeSession()}
                disabled={session.isLoading}
              >
                إغلاق الوردية
              </Button>
            ) : session.isSessionSuspended ? (
              <Button size="sm" onClick={() => session.resumeSession()} disabled={session.isLoading}>
                استئناف الوردية
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-[#b87945] text-[#102a2b] hover:bg-[#a06838]"
                onClick={() => session.openSession()}
                disabled={session.isLoading}
              >
                فتح وردية
              </Button>
            )}
          </div>
        </div>

        {showDaily && daily.data && (
          <div className="rounded-2xl border border-border bg-card p-4 animate-in slide-in-from-top-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">ملخص المبيعات — {(daily.data as any).date}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowDaily(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {Object.entries(((daily.data as any).byMethod ?? {})).map(([k, v]) => {
                const method = enabledPaymentMethods.find(m => m.key === k);
                return (
                  <div key={k} className="rounded-xl bg-muted/40 p-3 text-center">
                    <div className="text-[10px] text-muted-foreground">{method?.labelAr || k}</div>
                    <div className="text-sm font-bold text-foreground">{formatCurrency(Number(v) || 0, config.currency, config.decimals)}</div>
                  </div>
                );
              })}
            </div>
            {((daily.data as any).topProducts?.length ?? 0) > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-xs font-bold text-muted-foreground">الأكثر مبيعاً</h3>
                <ul className="space-y-1">
                  {(daily.data as any).topProducts.slice(0, 5).map((p: any) => (
                    <li key={p.productId} className="flex items-center justify-between text-[12px]">
                      <span className="text-foreground">{p.productName}</span>
                      <span className="text-muted-foreground">{p.qty} × {formatCurrency(p.revenue, config.currency, config.decimals)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {showNotifications && (
          <div className="rounded-2xl border border-border bg-card p-4 animate-in slide-in-from-top-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">التنبيهات</h2>
              <div className="flex items-center gap-2">
                {notifications.unreadCount > 0 && (
                  <Button variant="outline" size="sm" onClick={() => notifications.markAllAsRead()}>
                    قراءة الكل
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setShowNotifications(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {notifications.notifications.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">لا توجد تنبيهات</p>
              ) : (
                notifications.notifications.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-2 p-2 rounded-lg border ${n.read ? "bg-muted/30" : "bg-blue-50 border-blue-200"}`}
                    onClick={() => notifications.markAsRead(n.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{n.titleAr || n.title}</div>
                      <div className="text-xs text-muted-foreground">{n.messageAr || n.message}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.timestamp).toLocaleString("ar-YE")}</div>
                    </div>
                    {!n.read && <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {showSettings && (
          <div className="rounded-2xl border border-border bg-card p-4 animate-in slide-in-from-top-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">إعدادات نقاط البيع</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">قالب العرض</label>
                <Select value={config.template} onValueChange={v => updateSettingsMutation.mutate({ posConfig: { ...config, template: v as any } } as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">قياسي</SelectItem>
                    <SelectItem value="compact">مضغوط</SelectItem>
                    <SelectItem value="minimal">بسيط</SelectItem>
                    <SelectItem value="restaurant">مطعم</SelectItem>
                    <SelectItem value="retail">تجزئة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">الأعمدة</label>
                <Select value={config.columns.toString()} onValueChange={v => updateSettingsMutation.mutate({ posConfig: { ...config, columns: parseInt(v) } } as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="showStock" checked={config.showStock} onChange={e => updateSettingsMutation.mutate({ posConfig: { ...config, showStock: e.target.checked } } as any)} className="h-4 w-4" />
                <label htmlFor="showStock" className="text-sm">إظهار المخزون</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="showCategories" checked={config.showCategories} onChange={e => updateSettingsMutation.mutate({ posConfig: { ...config, showCategories: e.target.checked } } as any)} className="h-4 w-4" />
                <label htmlFor="showCategories" className="text-sm">إظهار التصنيفات</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="soundEnabled" checked={config.soundEnabled} onChange={e => updateSettingsMutation.mutate({ posConfig: { ...config, soundEnabled: e.target.checked } } as any)} className="h-4 w-4" />
                <label htmlFor="soundEnabled" className="text-sm">أصوات التنبيهات</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="vibrationEnabled" checked={config.vibrationEnabled} onChange={e => updateSettingsMutation.mutate({ posConfig: { ...config, vibrationEnabled: e.target.checked } } as any)} className="h-4 w-4" />
                <label htmlFor="vibrationEnabled" className="text-sm">اهتزاز عند المسح</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="autoPrint" checked={config.autoPrint} onChange={e => updateSettingsMutation.mutate({ posConfig: { ...config, autoPrint: e.target.checked } } as any)} className="h-4 w-4" />
                <label htmlFor="autoPrint" className="text-sm">طباعة تلقائية</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="allowPriceOverride" checked={salesPolicy.allowPriceOverride} onChange={e => updateSettingsMutation.mutate({ salesPolicy: { ...salesPolicy, allowPriceOverride: e.target.checked } } as any)} className="h-4 w-4" />
                <label htmlFor="allowPriceOverride" className="text-sm">السماح بتعديل السعر</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="allowNegativeStock" checked={salesPolicy.allowNegativeStock} onChange={e => updateSettingsMutation.mutate({ salesPolicy: { ...salesPolicy, allowNegativeStock: e.target.checked } } as any)} className="h-4 w-4" />
                <label htmlFor="allowNegativeStock" className="text-sm">السماح بمخزون سالب</label>
              </div>
            </div>
          </div>
        )}

        {showHolds && holdsData.items && (
          <div className="rounded-2xl border border-border bg-card p-4 animate-in slide-in-from-top-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">الفواتير المعلقة</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowHolds(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {holdsData.items.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">لا توجد فواتير معلقة</p>
              ) : (
                holdsData.items.map((hold: any) => (
                  <div key={hold.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/30">
                    <div>
                      <div className="font-medium">{hold.holdId}</div>
                      <div className="text-xs text-muted-foreground">{hold.itemCount} أصناف • {formatCurrency(hold.total, config.currency, config.decimals)}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => loadHold(hold.holdId)}>استعادة</Button>
                      <Button size="sm" variant="destructive" onClick={() => toast.info("حذف الفواتير المعلقة قريباً")}>حذف</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {keyboardShortcuts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card rounded-2xl p-6 w-full max-w-md animate-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">اختصارات لوحة المفاتيح</h3>
                <Button variant="ghost" size="icon" onClick={() => setKeyboardShortcuts(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  ["F1", "مسح السلة"],
                  ["F2", "تعليق الفاتورة"],
                  ["F3", "عرض الفواتير المعلقة"],
                  ["F4", "فتح/إغلاق الماسح"],
                  ["F5", "فتح/إغلاق التنبيهات"],
                  ["F6", "عرض تقرير اليوم"],
                  ["F7", "تبديل عرض المنتجات"],
                  ["F8", "فتح الإعدادات"],
                  ["F9", "إتمام البيع"],
                  ["F10", "عرض الاختصارات"],
                  ["Esc", "إغلاق النوافذ"],
                ].map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between py-1 border-b border-border/50">
                    <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-xs">{key}</kbd>
                    <span>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showScanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card rounded-2xl p-6 w-full max-w-md animate-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">مسح الباركود بالكاميرا</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowScanner(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="relative aspect-video rounded-lg bg-black overflow-hidden mb-3">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                {scannerError && (
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-red-500/90 text-white text-sm">
                    {scannerError}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowScanner(false)}>إيقاف</Button>
                <Button variant="outline" className="flex-1" onClick={() => scannerRef.current?.toggleTorch(true)}>تشغيل الفلاش</Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-4 lg:flex-row-reverse">
          <Cart
            lines={cart.cart}
            onQuantityChange={cart.updateQuantity}
            onDiscountChange={cart.setLineDiscount}
            onPriceChange={cart.setLinePrice}
            onRemove={cart.removeLine}
            onUnitChange={cart.setUnit as any}
            getProductUnits={cart.fetchProductUnits as any}
            allowPriceOverride={salesPolicy.allowPriceOverride}
            allowQuantityOverride={salesPolicy.allowQuantityOverride}
            maxDiscountPercent={salesPolicy.maxDiscountPercent}
            maxLineDiscountPercent={salesPolicy.maxLineDiscountPercent}
            currency={config.currency}
            decimals={config.decimals}
            selectedCustomer={cart.selectedCustomer as any}
            loyaltyPointsRedeemed={cart.loyaltyPointsRedeemed}
            onLoyaltyPointsChange={cart.setLoyaltyPointsRedeemed}
            globalDiscount={cart.globalDiscount}
            globalDiscountPercent={cart.globalDiscountPercent}
            onGlobalDiscountChange={(v, isPercent) => isPercent ? cart.setGlobalDiscountPercent(v) : cart.setGlobalDiscount(v)}
            notes={cart.notes}
            onNotesChange={cart.setNotes}
            holdId={cart.holdId}
            onHoldIdChange={cart.setHoldId}
            summary={cart.summary}
            due={cart.due}
            change={cart.change}
            paymentMethod={cart.paymentMethod}
            onPaymentMethodChange={cart.setPaymentMethod as any}
            payments={cart.payments}
            onAddPayment={cart.addPayment as any}
            onRemovePayment={cart.removePayment}
            canCompleteSale={cart.canCompleteSale}
            onCompleteSale={handleCompleteSale}
            onHold={handleHold}
            onClear={handleClear}
            isProcessing={createSaleMutation.isPending}
          />

          <ProductCatalog
            products={productSearch.products}
            isLoading={productSearch.isLoading}
            error={productSearch.error}
            hasMore={productSearch.hasMore}
            onLoadMore={productSearch.loadMore}
            onSearch={productSearch.setQuery}
            onBarcodeScan={handleBarcodeScan}
            onCategoryChange={productSearch.setQuery as any}
            onAddToCart={cart.addToCart}
            categories={productSearch.categories.map((c, i) => ({ id: i, name: c.name, productCount: c.count }))}
            selectedCategory={null}
            searchQuery={productSearch.query}
            currency={config.currency}
            decimals={config.decimals}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showStock={config.showStock}
            showCategories={config.showCategories}
            columns={config.columns}
          />
        </div>
      </main>
    </div>
  );
}