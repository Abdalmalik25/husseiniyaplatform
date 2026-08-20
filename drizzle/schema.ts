import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  decimal,
  boolean,
  integer,
  pgEnum,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("role", [
  "admin",
  "auditor",
  "accountant",
  "owner",
  "user",
]);
export const accountTypeEnum = pgEnum("account_type", [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
]);
export const transactionTypeEnum = pgEnum("transaction_type", [
  "debit",
  "credit",
]);
export const lifecycleStatusEnum = pgEnum("lifecycle_status", [
  "saved",
  "approved",
  "sent",
  "posted",
  "completed",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trial",
  "active",
  "expired",
]);

// ─── Users table for multi-tenant SaaS ────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 255 }).notNull().unique(),
  tenantId: integer("tenantId"),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 50 }),
  role: userRoleEnum("role").default("user").notNull(),
  themePreference: varchar("themePreference", { length: 20 })
    .default("dark")
    .notNull(),
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
  whatsappNotifications: boolean("whatsappNotifications")
    .default(true)
    .notNull(),
  compactMode: boolean("compactMode").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Tenants (Institutions) ───────────────────────────────────────

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  ownerUserId: integer("ownerUserId").notNull(),
  currency: varchar("currency", { length: 20 }).default("YER").notNull(),
  country: varchar("country", { length: 100 }).default("اليمن").notNull(),
  subscriptionPlan: varchar("subscriptionPlan", { length: 50 })
    .default("standard")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ─── Branches ─────────────────────────────────────────────────────

export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  city: varchar("city", { length: 100 }),
  isMain: boolean("isMain").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = typeof branches.$inferInsert;

// ─── User branch permissions & custom roles ───────────────────────

export const userBranchPermissions = pgTable("user_branch_permissions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  userId: integer("userId").notNull(),
  branchId: integer("branchId").notNull(),
  canView: boolean("canView").default(true).notNull(),
  canInsert: boolean("canInsert").default(true).notNull(),
  canApprove: boolean("canApprove").default(false).notNull(),
  canPost: boolean("canPost").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserBranchPermission = typeof userBranchPermissions.$inferSelect;
export type InsertUserBranchPermission =
  typeof userBranchPermissions.$inferInsert;

// ─── Chart of Accounts ────────────────────────────────────────────

export const accounts = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    type: accountTypeEnum("type").notNull(),
    parentAccountId: integer("parentAccountId"),
    category: varchar("category", { length: 100 }),
    description: text("description"),
    isActive: boolean("isActive").default(true).notNull(),
    isCustom: boolean("isCustom").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_accounts_tenant").on(t.tenantId),
  ]
);

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

// ─── Financial Transactions ───────────────────────────────────────

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    accountId: integer("accountId").notNull(),
    branchId: integer("branchId"),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    type: transactionTypeEnum("type").default("debit").notNull(),
    transactionDate: timestamp("transactionDate").notNull(),
    narration: varchar("narration", { length: 500 }),
    notes: text("notes"),
    lifecycleStatus: lifecycleStatusEnum("lifecycleStatus")
      .default("saved")
      .notNull(),
    isReversed: boolean("isReversed").default(false).notNull(),
    reversalReason: varchar("reversalReason", { length: 255 }),
    referenceType: varchar("referenceType", { length: 50 }),
    referenceId: integer("referenceId"),
    userId: integer("userId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_transactions_tenant").on(t.tenantId),
    index("idx_transactions_account").on(t.accountId),
    index("idx_transactions_date").on(t.transactionDate),
    index("idx_transactions_branch").on(t.branchId),
    index("idx_transactions_reference").on(t.referenceType, t.referenceId),
  ]
);

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ─── Opening Balances ─────────────────────────────────────────────

export const openingBalances = pgTable("opening_balances", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  accountId: integer("accountId").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").default("debit").notNull(),
  notes: text("notes"),
  periodName: varchar("periodName", { length: 50 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, t => [
  index("idx_openingBalances_tenant").on(t.tenantId),
]);

export type OpeningBalance = typeof openingBalances.$inferSelect;
export type InsertOpeningBalance = typeof openingBalances.$inferInsert;

// ─── Budgets ──────────────────────────────────────────────────────

export const budgets = pgTable(
  "budgets",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    periodName: varchar("periodName", { length: 50 }).notNull(),
    targetRevenue: decimal("targetRevenue", {
      precision: 15,
      scale: 2,
    }).notNull(),
    targetExpense: decimal("targetExpense", {
      precision: 15,
      scale: 2,
    }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_budgets_tenant").on(t.tenantId),
  ]
);

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

// ─── Settings ─────────────────────────────────────────────────────

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull().unique(),
  institutionName: varchar("institutionName", { length: 255 })
    .default("مؤسسة الحسينية لخدمات الأعمال")
    .notNull(),
  currency: varchar("currency", { length: 50 })
    .default("ريال يمني (YER)")
    .notNull(),
  accountingPeriod: varchar("accountingPeriod", { length: 50 })
    .default("2026")
    .notNull(),
  managerName: varchar("managerName", { length: 255 })
    .default("إدارة المؤسسة")
    .notNull(),
  notes: text("notes"),
  subscriptionStatus: subscriptionStatusEnum("subscriptionStatus")
    .default("trial")
    .notNull(),
  trialEndsAt: timestamp("trialEndsAt"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

// ─── Activity Logs / Audit Trail ──────────────────────────────────

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId"),
    userId: serial("userId"),
    userName: varchar("userName", { length: 255 }),
    action: varchar("action", { length: 255 }).notNull(),
    details: text("details"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_activityLogs_tenant").on(t.tenantId),
    index("idx_activityLogs_user").on(t.userId),
    index("idx_activityLogs_created").on(t.createdAt),
  ]
);

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

// ─── Products & Inventory ─────────────────────────────────────────

export const productTypeEnum = pgEnum("product_type", ["goods", "service"]);
export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", [
  "in",
  "out",
  "transfer",
  "adjustment",
]);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    nameAr: varchar("nameAr", { length: 255 }),
    type: productTypeEnum("type").default("goods").notNull(),
    category: varchar("category", { length: 100 }),
    unit: varchar("unit", { length: 50 }).default("قطعة").notNull(),
    purchasePrice: decimal("purchasePrice", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    salePrice: decimal("salePrice", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    wholesalePrice: decimal("wholesalePrice", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    minStock: integer("minStock").default(0).notNull(),
    currentStock: integer("currentStock").default(0).notNull(),
    barcode: varchar("barcode", { length: 100 }),
    supplierId: integer("supplierId"),
    description: text("description"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_products_tenant").on(t.tenantId),
    index("idx_products_category").on(t.category),
    index("idx_products_supplier").on(t.supplierId),
  ]
);

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export const warehouses = pgTable(
  "warehouses",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    location: varchar("location", { length: 255 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_warehouses_tenant").on(t.tenantId),
  ]
);

export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = typeof warehouses.$inferInsert;

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    productId: integer("productId").notNull(),
    warehouseId: integer("warehouseId"),
    type: inventoryMovementTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull(),
    referenceId: integer("referenceId"),
    referenceType: varchar("referenceType", { length: 50 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_inventoryMovements_tenant").on(t.tenantId),
  ]
);

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = typeof inventoryMovements.$inferInsert;

// ─── Customers & Suppliers ────────────────────────────────────────

export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    taxNumber: varchar("taxNumber", { length: 100 }),
    balance: decimal("balance", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    creditLimit: decimal("creditLimit", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    notes: text("notes"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_customers_tenant").on(t.tenantId),
  ]
);

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

export const suppliers = pgTable(
  "suppliers",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    taxNumber: varchar("taxNumber", { length: 100 }),
    balance: decimal("balance", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    notes: text("notes"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_suppliers_tenant").on(t.tenantId),
  ]
);

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// ─── Sales & POS ──────────────────────────────────────────────────

export const salesInvoiceStatusEnum = pgEnum("sales_invoice_status", [
  "draft",
  "confirmed",
  "paid",
  "partial",
  "cancelled",
]);
export const purchaseInvoiceStatusEnum = pgEnum("purchase_invoice_status", [
  "draft",
  "confirmed",
  "paid",
  "partial",
  "cancelled",
]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "card",
  "transfer",
  "credit",
  "online",
]);

export const salesInvoices = pgTable(
  "sales_invoices",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
    customerId: integer("customerId"),
    branchId: integer("branchId"),
    status: salesInvoiceStatusEnum("status").default("draft").notNull(),
    subtotal: decimal("subtotal", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    taxRate: decimal("taxRate", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),
    taxAmount: decimal("taxAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    discount: decimal("discount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).default("0").notNull(),
    paidAmount: decimal("paidAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    paymentMethod: paymentMethodEnum("paymentMethod").default("cash"),
    notes: text("notes"),
    invoiceDate: timestamp("invoiceDate").defaultNow().notNull(),
    dueDate: timestamp("dueDate"),
    userId: integer("userId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_salesInvoices_tenant").on(t.tenantId),
    index("idx_salesInvoices_customer").on(t.customerId),
    index("idx_salesInvoices_status").on(t.status),
  ]
);

export type SalesInvoice = typeof salesInvoices.$inferSelect;
export type InsertSalesInvoice = typeof salesInvoices.$inferInsert;

export const salesInvoiceItems = pgTable(
  "sales_invoice_items",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoiceId").notNull(),
    productId: integer("productId").notNull(),
    productName: varchar("productName", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
    discount: decimal("discount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [index("idx_sales_items_invoice").on(t.invoiceId)]
);

export type SalesInvoiceItem = typeof salesInvoiceItems.$inferSelect;
export type InsertSalesInvoiceItem = typeof salesInvoiceItems.$inferInsert;

// ─── Purchases ────────────────────────────────────────────────────

export const purchaseInvoices = pgTable(
  "purchase_invoices",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
    supplierId: integer("supplierId"),
    branchId: integer("branchId"),
    status: purchaseInvoiceStatusEnum("status").default("draft").notNull(),
    subtotal: decimal("subtotal", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    taxRate: decimal("taxRate", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),
    taxAmount: decimal("taxAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    discount: decimal("discount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).default("0").notNull(),
    paidAmount: decimal("paidAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    paymentMethod: paymentMethodEnum("paymentMethod").default("cash"),
    notes: text("notes"),
    invoiceDate: timestamp("invoiceDate").defaultNow().notNull(),
    dueDate: timestamp("dueDate"),
    userId: integer("userId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_purchaseInvoices_tenant").on(t.tenantId),
    index("idx_purchaseInvoices_supplier").on(t.supplierId),
    index("idx_purchaseInvoices_status").on(t.status),
  ]
);

export type PurchaseInvoice = typeof purchaseInvoices.$inferSelect;
export type InsertPurchaseInvoice = typeof purchaseInvoices.$inferInsert;

export const purchaseInvoiceItems = pgTable(
  "purchase_invoice_items",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoiceId").notNull(),
    productId: integer("productId").notNull(),
    productName: varchar("productName", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
    discount: decimal("discount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [index("idx_purchase_items_invoice").on(t.invoiceId)]
);

export type PurchaseInvoiceItem = typeof purchaseInvoiceItems.$inferSelect;
export type InsertPurchaseInvoiceItem =
  typeof purchaseInvoiceItems.$inferInsert;

// ─── Orders & Distribution ────────────────────────────────────────

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
    customerId: integer("customerId"),
    status: orderStatusEnum("status").default("pending").notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).default("0").notNull(),
    deliveryAddress: text("deliveryAddress"),
    deliveryDate: timestamp("deliveryDate"),
    deliveryNotes: text("deliveryNotes"),
    assignedTo: varchar("assignedTo", { length: 255 }),
    userId: integer("userId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_orders_tenant").on(t.tenantId),
    index("idx_orders_customer").on(t.customerId),
    index("idx_orders_status").on(t.status),
  ]
);

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("orderId").notNull(),
    productId: integer("productId").notNull(),
    productName: varchar("productName", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [index("idx_order_items_order").on(t.orderId)]
);

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ─── Payments (Installments & Settlements) ────────────────────────

export const paymentSourceEnum = pgEnum("payment_source", [
  "sales",
  "purchases",
]);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    source: paymentSourceEnum("source").notNull(),
    invoiceId: integer("invoiceId").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum("paymentMethod").default("cash"),
    paymentDate: timestamp("paymentDate").defaultNow().notNull(),
    notes: text("notes"),
    userId: integer("userId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_payments_tenant").on(t.tenantId),
    index("idx_payments_invoice").on(t.source, t.invoiceId),
  ]
);

// ─── Subscription Plans ──────────────────────────────────────────
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  priceMonthly: decimal("priceMonthly", { precision: 10, scale: 2 }).notNull(),
  priceYearly: decimal("priceYearly", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  maxUsers: integer("maxUsers").default(5).notNull(),
  maxBranches: integer("maxBranches").default(1).notNull(),
  maxTransactions: integer("maxTransactions").default(1000).notNull(),
  features: jsonb("features"),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

// ─── Tenant Subscriptions ────────────────────────────────────────
export const tenantSubscriptions = pgTable(
  "tenant_subscriptions",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    planId: integer("planId").notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    billingCycle: varchar("billingCycle", { length: 10 }).default("monthly").notNull(),
    trialStartsAt: timestamp("trialStartsAt"),
    trialEndsAt: timestamp("trialEndsAt"),
    currentPeriodStart: timestamp("currentPeriodStart"),
    currentPeriodEnd: timestamp("currentPeriodEnd"),
    cancelAt: timestamp("cancelAt"),
    cancelledAt: timestamp("cancelledAt"),
    paymentProvider: varchar("paymentProvider", { length: 50 }),
    externalSubscriptionId: varchar("externalSubscriptionId", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_tenant_sub_tenant").on(t.tenantId),
    index("idx_tenant_sub_status").on(t.status),
  ]
);

export type TenantSubscription = typeof tenantSubscriptions.$inferSelect;
export type InsertTenantSubscription = typeof tenantSubscriptions.$inferInsert;

// ─── Billing Invoices ────────────────────────────────────────────
export const billingInvoices = pgTable(
  "billing_invoices",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    subscriptionId: integer("subscriptionId"),
    invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
    status: varchar("status", { length: 20 }).notNull(),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    taxAmount: decimal("taxAmount", { precision: 10, scale: 2 }).default("0").notNull(),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("USD").notNull(),
    dueDate: timestamp("dueDate").notNull(),
    paidAt: timestamp("paidAt"),
    paymentMethod: varchar("paymentMethod", { length: 50 }),
    externalPaymentId: varchar("externalPaymentId", { length: 255 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_billing_invoice_tenant").on(t.tenantId),
    index("idx_billing_invoice_status").on(t.status),
  ]
);

export type BillingInvoice = typeof billingInvoices.$inferSelect;
export type InsertBillingInvoice = typeof billingInvoices.$inferInsert;

// ─── Payment History ─────────────────────────────────────────────
export const paymentHistory = pgTable(
  "payment_history",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    invoiceId: integer("invoiceId"),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("USD").notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    paymentMethod: varchar("paymentMethod", { length: 50 }),
    transactionId: varchar("transactionId", { length: 255 }),
    refundedAmount: decimal("refundedAmount", { precision: 10, scale: 2 }).default("0"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_payment_history_tenant").on(t.tenantId),
    index("idx_payment_history_invoice").on(t.invoiceId),
  ]
);

export type PaymentHistoryRecord = typeof paymentHistory.$inferSelect;
export type InsertPaymentHistory = typeof paymentHistory.$inferInsert;

// ─── Audit Logs (Structured) ─────────────────────────────────────
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    userId: integer("userId"),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entityType", { length: 100 }).notNull(),
    entityId: integer("entityId").notNull(),
    oldValues: jsonb("oldValues"),
    newValues: jsonb("newValues"),
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: varchar("userAgent", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_audit_logs_tenant").on(t.tenantId),
    index("idx_audit_logs_user").on(t.userId),
    index("idx_audit_logs_entity").on(t.entityType, t.entityId),
    index("idx_audit_logs_created").on(t.createdAt),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ─── Notifications ───────────────────────────────────────────────
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId"),
    userId: integer("userId"),
    type: varchar("type", { length: 50 }).notNull(),
    channel: varchar("channel", { length: 50 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    body: text("body").notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    sentAt: timestamp("sentAt"),
    readAt: timestamp("readAt"),
    metadata: jsonb("metadata"),
    errorMessage: text("errorMessage"),
    retryCount: integer("retryCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_notifications_tenant").on(t.tenantId),
    index("idx_notifications_user").on(t.userId),
    index("idx_notifications_status").on(t.status),
  ]
);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Team Invitations ────────────────────────────────────────────
export const teamInvitations = pgTable(
  "team_invitations",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    role: userRoleEnum("role").default("user").notNull(),
    invitedBy: integer("invitedBy").notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    acceptedAt: timestamp("acceptedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_team_inv_tenant").on(t.tenantId),
    index("idx_team_inv_email").on(t.email),
  ]
);

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = typeof teamInvitations.$inferInsert;

// ─── Currencies ──────────────────────────────────────────────────
export const currencies = pgTable("currencies", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  decimalPlaces: integer("decimalPlaces").default(2).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Currency = typeof currencies.$inferSelect;
export type InsertCurrency = typeof currencies.$inferInsert;

// ─── Exchange Rates ──────────────────────────────────────────────
export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: serial("id").primaryKey(),
    baseCurrency: varchar("baseCurrency", { length: 10 }).notNull(),
    quoteCurrency: varchar("quoteCurrency", { length: 10 }).notNull(),
    rate: decimal("rate", { precision: 18, scale: 8 }).notNull(),
    source: varchar("source", { length: 50 }),
    effectiveFrom: timestamp("effectiveFrom").notNull(),
    effectiveTo: timestamp("effectiveTo"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_exchange_rates_pair").on(t.baseCurrency, t.quoteCurrency),
    index("idx_exchange_rates_effective").on(t.effectiveFrom),
  ]
);

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type InsertExchangeRate = typeof exchangeRates.$inferInsert;

// ─── File Uploads ────────────────────────────────────────────────
export const fileUploads = pgTable(
  "file_uploads",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId"),
    userId: integer("userId"),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 100 }).notNull(),
    fileSize: integer("fileSize").notNull(),
    storageKey: varchar("storageKey", { length: 500 }).notNull(),
    storageProvider: varchar("storageProvider", { length: 50 }).default("s3").notNull(),
    url: varchar("url", { length: 500 }).notNull(),
    entityType: varchar("entityType", { length: 50 }),
    entityId: integer("entityId"),
    folder: varchar("folder", { length: 200 }),
    isPublic: boolean("isPublic").default(false).notNull(),
    metadata: jsonb("metadata"),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_file_uploads_tenant").on(t.tenantId),
    index("idx_file_uploads_entity").on(t.entityType, t.entityId),
  ]
);

export type FileUpload = typeof fileUploads.$inferSelect;
export type InsertFileUpload = typeof fileUploads.$inferInsert;

// ─── API Keys ────────────────────────────────────────────────────
export const apiKeys = pgTable(
  "api_keys",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    userId: integer("userId").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    keyHash: varchar("keyHash", { length: 255 }).notNull().unique(),
    keyPrefix: varchar("keyPrefix", { length: 20 }).notNull(),
    scopes: jsonb("scopes"),
    rateLimit: integer("rateLimit").default(1000).notNull(),
    expiresAt: timestamp("expiresAt"),
    lastUsedAt: timestamp("lastUsedAt"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [index("idx_api_keys_tenant").on(t.tenantId)]
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// ─── Webhooks ────────────────────────────────────────────────────
export const webhooks = pgTable(
  "webhooks",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    url: varchar("url", { length: 500 }).notNull(),
    secret: varchar("secret", { length: 255 }).notNull(),
    events: jsonb("events").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    lastTriggeredAt: timestamp("lastTriggeredAt"),
    failureCount: integer("failureCount").default(0).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [index("idx_webhooks_tenant").on(t.tenantId)]
);

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

// ─── Webhook Deliveries ──────────────────────────────────────────
export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: serial("id").primaryKey(),
    webhookId: integer("webhookId").notNull(),
    event: varchar("event", { length: 100 }).notNull(),
    payload: jsonb("payload").notNull(),
    responseStatus: integer("responseStatus"),
    responseBody: text("responseBody"),
    deliveredAt: timestamp("deliveredAt"),
    success: boolean("success").default(false).notNull(),
    attemptCount: integer("attemptCount").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [index("idx_webhook_deliveries_webhook").on(t.webhookId)]
);

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type InsertWebhookDelivery = typeof webhookDeliveries.$inferInsert;

// ─── Feature Flags ───────────────────────────────────────────────
export const featureFlags = pgTable(
  "feature_flags",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId"),
    key: varchar("key", { length: 100 }).notNull(),
    value: varchar("value", { length: 255 }).notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [index("idx_feature_flags_tenant_key").on(t.tenantId, t.key)]
);

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = typeof featureFlags.$inferInsert;

// ────────────────────────────────────────────────────────────────
// ERP التشغيلي — وحدات عرضية لكل الأدوار (HR، المشاريع، المشتريات،
// خدمة العملاء، الجودة، الرواتب، الحضور)
// ────────────────────────────────────────────────────────────────

export const employeeStatusEnum = pgEnum("employee_status", [
  "active",
  "on_leave",
  "terminated",
]);
export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "review",
  "done",
]);
export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);
export const requisitionStatusEnum = pgEnum("requisition_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "ordered",
  "received",
]);
export const approvalDecisionEnum = pgEnum("approval_decision", [
  "pending",
  "approved",
  "rejected",
]);
export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);
export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);
export const inspectionResultEnum = pgEnum("inspection_result", [
  "pass",
  "fail",
  "conditional",
]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "leave",
]);
export const payrollStatusEnum = pgEnum("payroll_status", [
  "draft",
  "processed",
  "paid",
]);

// ─── الأقسام ───────────────────────────────────────────────────
export const departments = pgTable(
  "departments",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 30 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    managerId: integer("managerId"),
    parentDepartmentId: integer("parentDepartmentId"),
    costCenter: varchar("costCenter", { length: 50 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_departments_tenant").on(t.tenantId),
    uniqueIndex("uq_departments_tenant_code").on(t.tenantId, t.code),
  ]
);

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

// ─── الموظفون ──────────────────────────────────────────────────
export const employees = pgTable(
  "employees",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 30 }).notNull(),
    userId: integer("userId"),
    departmentId: integer("departmentId"),
    fullName: varchar("fullName", { length: 150 }).notNull(),
    jobTitle: varchar("jobTitle", { length: 120 }).notNull(),
    nationalId: varchar("nationalId", { length: 40 }),
    phone: varchar("phone", { length: 30 }),
    email: varchar("email", { length: 150 }),
    hireDate: timestamp("hireDate"),
    salary: decimal("salary", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    currency: varchar("currency", { length: 10 }).default("YER"),
    status: employeeStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_employees_tenant").on(t.tenantId),
    uniqueIndex("uq_employees_tenant_code").on(t.tenantId, t.code),
  ]
);

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// ─── الحضور والانصراف ─────────────────────────────────────────
export const attendance = pgTable(
  "attendance",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    employeeId: integer("employeeId").notNull(),
    date: timestamp("date").notNull(),
    checkIn: timestamp("checkIn"),
    checkOut: timestamp("checkOut"),
    status: attendanceStatusEnum("status").default("present").notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_attendance_tenant").on(t.tenantId),
    index("idx_attendance_employee").on(t.employeeId),
  ]
);

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;

// ─── دورات الرواتب ─────────────────────────────────────────────
export const payrollRuns = pgTable(
  "payroll_runs",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    periodName: varchar("periodName", { length: 40 }).notNull(),
    fromDate: timestamp("fromDate").notNull(),
    toDate: timestamp("toDate").notNull(),
    totalNet: decimal("totalNet", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    status: payrollStatusEnum("status").default("draft").notNull(),
    createdById: integer("createdById"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [index("idx_payroll_runs_tenant").on(t.tenantId)]
);

export type PayrollRun = typeof payrollRuns.$inferSelect;
export type InsertPayrollRun = typeof payrollRuns.$inferInsert;

// ─── بنود الرواتب ──────────────────────────────────────────────
export const payrollItems = pgTable(
  "payroll_items",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    payrollRunId: integer("payrollRunId").notNull(),
    employeeId: integer("employeeId").notNull(),
    basicSalary: decimal("basicSalary", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    deductions: decimal("deductions", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    net: decimal("net", { precision: 15, scale: 2 }).default("0").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_payroll_items_tenant").on(t.tenantId),
    index("idx_payroll_items_run").on(t.payrollRunId),
  ]
);

export type PayrollItem = typeof payrollItems.$inferSelect;
export type InsertPayrollItem = typeof payrollItems.$inferInsert;

// ─── المشاريع ─────────────────────────────────────────────────
export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 30 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    status: projectStatusEnum("status").default("planning").notNull(),
    startDate: timestamp("startDate"),
    endDate: timestamp("endDate"),
    budget: decimal("budget", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    managerId: integer("managerId"),
    customerId: integer("customerId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_projects_tenant").on(t.tenantId),
    uniqueIndex("uq_projects_tenant_code").on(t.tenantId, t.code),
  ]
);

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ─── مهام المشاريع ────────────────────────────────────────────
export const projectTasks = pgTable(
  "project_tasks",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    projectId: integer("projectId").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    status: taskStatusEnum("status").default("todo").notNull(),
    priority: taskPriorityEnum("priority").default("medium").notNull(),
    assigneeId: integer("assigneeId"),
    dueDate: timestamp("dueDate"),
    estimatedHours: decimal("estimatedHours", { precision: 8, scale: 2 }),
    actualHours: decimal("actualHours", { precision: 8, scale: 2 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_project_tasks_tenant").on(t.tenantId),
    index("idx_project_tasks_project").on(t.projectId),
  ]
);

export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertProjectTask = typeof projectTasks.$inferInsert;

// ─── أعضاء المشاريع ───────────────────────────────────────────
export const projectMembers = pgTable(
  "project_members",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    projectId: integer("projectId").notNull(),
    employeeId: integer("employeeId").notNull(),
    roleInProject: varchar("roleInProject", { length: 80 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_project_members_tenant").on(t.tenantId),
    index("idx_project_members_project").on(t.projectId),
  ]
);

export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = typeof projectMembers.$inferInsert;

// ─── المشتريات / أوامر التوريد ────────────────────────────────
export const procurements = pgTable(
  "procurements",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    requisitionNumber: varchar("requisitionNumber", { length: 40 }).notNull(),
    requestedById: integer("requestedById"),
    departmentId: integer("departmentId"),
    itemName: varchar("itemName", { length: 200 }).notNull(),
    description: text("description"),
    quantity: decimal("quantity", { precision: 12, scale: 2 })
      .default("1")
      .notNull(),
    unit: varchar("unit", { length: 20 }).default("قطعة"),
    estimatedCost: decimal("estimatedCost", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    currency: varchar("currency", { length: 10 }).default("YER"),
    supplierId: integer("supplierId"),
    status: requisitionStatusEnum("status").default("draft").notNull(),
    approvedById: integer("approvedById"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_procurements_tenant").on(t.tenantId),
    uniqueIndex("uq_procurements_tenant_req").on(
      t.tenantId,
      t.requisitionNumber
    ),
  ]
);

export type Procurement = typeof procurements.$inferSelect;
export type InsertProcurement = typeof procurements.$inferInsert;

// ─── اعتمادات المشتريات ───────────────────────────────────────
export const procurementApprovals = pgTable(
  "procurement_approvals",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    procurementId: integer("procurementId").notNull(),
    approverId: integer("approverId"),
    level: integer("level").default(1).notNull(),
    decision: approvalDecisionEnum("decision").default("pending").notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_procurement_approvals_tenant").on(t.tenantId),
    index("idx_procurement_approvals_proc").on(t.procurementId),
  ]
);

export type ProcurementApproval = typeof procurementApprovals.$inferSelect;
export type InsertProcurementApproval =
  typeof procurementApprovals.$inferInsert;

// ─── تذاكر خدمة العملاء ───────────────────────────────────────
export const tickets = pgTable(
  "tickets",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    ticketNumber: varchar("ticketNumber", { length: 40 }).notNull(),
    subject: varchar("subject", { length: 200 }).notNull(),
    description: text("description"),
    customerName: varchar("customerName", { length: 150 }),
    customerPhone: varchar("customerPhone", { length: 30 }),
    status: ticketStatusEnum("status").default("open").notNull(),
    priority: ticketPriorityEnum("priority").default("medium").notNull(),
    assignedToId: integer("assignedToId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_tickets_tenant").on(t.tenantId),
    uniqueIndex("uq_tickets_tenant_num").on(t.tenantId, t.ticketNumber),
  ]
);

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

// ─── الجودة والفحص ────────────────────────────────────────────
export const qualityInspections = pgTable(
  "quality_inspections",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 40 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    type: varchar("type", { length: 80 }),
    result: inspectionResultEnum("result").default("pass").notNull(),
    inspectedById: integer("inspectedById"),
    relatedEntity: varchar("relatedEntity", { length: 120 }),
    score: decimal("score", { precision: 6, scale: 2 }),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_quality_inspections_tenant").on(t.tenantId),
    uniqueIndex("uq_quality_tenant_code").on(t.tenantId, t.code),
  ]
);

export type QualityInspection = typeof qualityInspections.$inferSelect;
export type InsertQualityInspection = typeof qualityInspections.$inferInsert;
