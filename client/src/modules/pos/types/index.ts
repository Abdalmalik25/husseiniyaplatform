export type PaymentMethodKey =
  | "cash"
  | "card"
  | "transfer"
  | "credit"
  | "online"
  | "cash_yer"
  | "cash_sar"
  | "hawala"
  | "shabab"
  | "mobile_money"
  | "bank_transfer";

export type ScanMode = "camera" | "hid" | "manual" | "continuous";

export type BarcodeFormat =
  | "ean13"
  | "ean8"
  | "upc"
  | "code128"
  | "code39"
  | "qr"
  | "datamatrix"
  | "pdf417"
  | "aztec";

export interface POSConfig {
  template: "standard" | "compact" | "minimal" | "restaurant" | "retail";
  columns: number;
  showStock: boolean;
  showCategories: boolean;
  barcodeFocus: boolean;
  allowServices: boolean;
  quickAdd: boolean;
  showCustomer: boolean;
  autoPrint: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  scanMode: ScanMode;
  supportedFormats: BarcodeFormat[];
  theme: "light" | "dark" | "auto";
  language: "ar" | "en";
  currency: string;
  decimals: number;
  taxInclusive: boolean;
  defaultWarehouseId: number | null;
  enableOffline: boolean;
  syncInterval: number;
  holdTimeout: number;
  maxHolds: number;
  requireCustomerForCredit: boolean;
  allowSplitPayment: boolean;
  allowPartialPayment: boolean;
  roundingMethod: "none" | "round" | "floor" | "ceil";
  roundingPrecision: number;
}

export interface SalesPolicy {
  allowMixedGoodsServices: boolean;
  requireCustomer: boolean;
  allowCredit: boolean;
  defaultPayment: PaymentMethodKey;
  allowNegativeStock: boolean;
  defaultWarehouseId: number | null;
  roundTotal: boolean;
  maxDiscountPercent: number;
  maxLineDiscountPercent: number;
  requireManagerApprovalAbove: number;
  allowPriceOverride: boolean;
  allowQuantityOverride: boolean;
  enableLoyalty: boolean;
  loyaltyPointsPerCurrency: number;
  loyaltyRedemptionRate: number;
}

export interface PaymentMethodConfig {
  key: PaymentMethodKey;
  label: string;
  labelAr: string;
  icon: string;
  enabled: boolean;
  accountCode: string;
  requiresReference: boolean;
  referenceLabel: string;
  referenceLabelAr: string;
  minAmount: number;
  maxAmount: number | null;
  feePercent: number;
  feeFixed: number;
  sortOrder: number;
}

export interface CartLine {
  id: string;
  productId: number;
  productCode: string;
  name: string;
  nameAr?: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  discountPercent: number;
  taxRate: number;
  taxAmount: number;
  stock: number;
  type: "goods" | "service";
  category?: string;
  unitId?: number;
  unitName?: string;
  conversionFactor: number;
  baseQuantity: number;
  imageUrl?: string;
  barcode?: string;
  metadata?: Record<string, any>;
  appliedOffers: AppliedOffer[];
  originalUnitPrice: number;
  priceOverride: boolean;
  quantityOverride: boolean;
  lineTotal: number;
  lineNetTotal: number;
  loyaltyPoints: number;
}

export interface AppliedOffer {
  offerId: number;
  offerName: string;
  discountType: "percent" | "fixed" | "bogo" | "bundle";
  discountValue: number;
  appliedQuantity: number;
}

export interface CartSummary {
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  itemCount: number;
  totalQuantity: number;
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;
}

export interface Customer {
  id: number;
  code: string;
  name: string;
  nameAr?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  balance: number;
  creditLimit: number;
  loyaltyPoints: number;
  loyaltyTier: string;
  taxNumber?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface POSSession {
  id: number;
  code: string;
  userId: number;
  userName: string;
  branchId: number;
  branchName: string;
  deviceId?: number;
  deviceName?: string;
  openingFloat: number;
  closingFloat?: number;
  expectedFloat: number;
  status: "open" | "closed" | "suspended";
  openedAt: string;
  closedAt?: string;
  totalSales: number;
  totalRefunds: number;
  totalDiscounts: number;
  totalTax: number;
  invoiceCount: number;
  paymentBreakdown: Record<PaymentMethodKey, number>;
  discrepancies: SessionDiscrepancy[];
  notes?: string;
}

export interface SessionDiscrepancy {
  paymentMethod: PaymentMethodKey;
  expected: number;
  actual: number;
  difference: number;
  notes?: string;
}

export interface SaleInvoice {
  id: number;
  invoiceNumber: string;
  customerId?: number;
  customerName?: string;
  branchId: number;
  branchName: string;
  userId: number;
  userName: string;
  sessionId?: number;
  status: "draft" | "confirmed" | "paid" | "partial" | "cancelled" | "returned";
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  paymentMethod: PaymentMethodKey;
  paymentReference?: string;
  changeAmount: number;
  items: SaleInvoiceItem[];
  payments: SalePayment[];
  notes?: string;
  holdId?: string;
  isOnHold: boolean;
  invoiceDate: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  currency: string;
  currencyRate: number;
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;
}

export interface SaleInvoiceItem {
  id: number;
  invoiceId: number;
  productId: number;
  productCode: string;
  productName: string;
  productNameAr?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountPercent: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  unitId?: number;
  unitName?: string;
  conversionFactor: number;
  costPrice?: number;
  appliedOffers: AppliedOffer[];
}

export interface SalePayment {
  id: number;
  invoiceId: number;
  paymentMethod: PaymentMethodKey;
  amount: number;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type:
    | "success"
    | "error"
    | "warning"
    | "info"
    | "sale"
    | "payment"
    | "stock"
    | "session";
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  actionLabelAr?: string;
  metadata?: Record<string, any>;
}

export interface ScheduledTask {
  id: string;
  name: string;
  nameAr: string;
  type:
    | "daily_report"
    | "session_reminder"
    | "stock_alert"
    | "backup"
    | "sync"
    | "custom";
  schedule: {
    frequency: "once" | "daily" | "weekly" | "monthly" | "cron";
    time?: string;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    cronExpression?: string;
    timezone: string;
  };
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  action: {
    type: "notification" | "api_call" | "webhook" | "email" | "print";
    config: Record<string, any>;
  };
  conditions?: Record<string, any>;
}

export interface ProductSearchResult {
  id: number;
  code: string;
  name: string;
  nameAr?: string;
  type: "goods" | "service";
  category?: string;
  salePrice: number;
  wholesalePrice: number;
  currentStock: number;
  minStock: number;
  barcode?: string;
  unitId?: number;
  unitName?: string;
  conversionFactor: number;
  imageUrl?: string;
  isActive: boolean;
  taxRate: number;
  loyaltyPoints: number;
}

export interface POSDevice {
  id: number;
  code: string;
  name: string;
  type:
    | "pos"
    | "scanner"
    | "scale"
    | "printer"
    | "cash_drawer"
    | "customer_display"
    | "pin_pad";
  workSiteId?: number;
  workSiteName?: string;
  location?: string;
  isActive: boolean;
  lastSeenAt?: string;
  fingerprint?: string;
  os?: string;
  appVersion?: string;
  settings?: Record<string, any>;
}

export interface POSReturn {
  id: number;
  originalInvoiceId: number;
  originalInvoiceNumber: string;
  returnNumber: string;
  customerId?: number;
  customerName?: string;
  branchId: number;
  userId: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "completed";
  items: POSReturnItem[];
  refundAmount: number;
  refundMethod: PaymentMethodKey;
  refundReference?: string;
  notes?: string;
  createdAt: string;
  processedAt?: string;
  processedById?: number;
}

export interface POSReturnItem {
  id: number;
  returnId: number;
  invoiceItemId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxAmount: number;
  total: number;
  restock: boolean;
  condition: "new" | "used" | "damaged";
}

export interface StockAlert {
  productId: number;
  productCode: string;
  productName: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  reorderQty: number;
  warehouseId?: number;
  warehouseName?: string;
  severity: "low" | "critical" | "out_of_stock";
}

export interface POSSettings {
  config: POSConfig;
  salesPolicy: SalesPolicy;
  paymentMethods: PaymentMethodConfig[];
  devices: POSDevice[];
  notifications: Notification[];
  scheduledTasks: ScheduledTask[];
}

export interface ScanResult {
  value: string;
  format: BarcodeFormat;
  timestamp: number;
  confidence?: number;
}

export interface HIDScannerEvent {
  type: "hid_scan";
  value: string;
  timestamp: number;
  deviceId?: string;
}

export interface KeyboardWedgeConfig {
  enabled: boolean;
  prefix: string;
  suffix: string;
  minLength: number;
  maxLength: number;
  allowedChars: string;
  debounceMs: number;
}

export interface OfflineQueueItem {
  id: string;
  type: "sale" | "return" | "payment" | "stock_adjustment";
  payload: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export interface POSAnalytics {
  period: { start: string; end: string };
  summary: {
    totalSales: number;
    totalTransactions: number;
    avgTransactionValue: number;
    totalItemsSold: number;
    totalDiscounts: number;
    totalTax: number;
    totalReturns: number;
    netSales: number;
  };
  byPaymentMethod: Record<PaymentMethodKey, { count: number; amount: number }>;
  byCategory: Array<{
    category: string;
    sales: number;
    quantity: number;
    margin: number;
  }>;
  byProduct: Array<{
    productId: number;
    name: string;
    quantity: number;
    revenue: number;
    margin: number;
  }>;
  byHour: Array<{ hour: number; sales: number; transactions: number }>;
  byDay: Array<{ date: string; sales: number; transactions: number }>;
  topCustomers: Array<{
    customerId: number;
    name: string;
    purchases: number;
    spent: number;
  }>;
  stockAlerts: StockAlert[];
}

export interface LoyaltyProgram {
  enabled: boolean;
  pointsPerCurrency: number;
  redemptionRate: number;
  minRedemptionPoints: number;
  maxRedemptionPercent: number;
  tiers: LoyaltyTier[];
}

export interface LoyaltyTier {
  name: string;
  nameAr: string;
  minPoints: number;
  multiplier: number;
  benefits: string[];
  color: string;
}

export interface POSTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  spacing: number;
  borderRadius: number;
  fontSize: number;
}
