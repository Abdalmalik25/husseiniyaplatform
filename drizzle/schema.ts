import { pgTable, serial, varchar, text, timestamp, decimal, boolean, integer, pgEnum, index } from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("role", ["admin", "auditor", "accountant", "owner", "user"]);
export const accountTypeEnum = pgEnum("account_type", ["asset", "liability", "equity", "revenue", "expense"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["debit", "credit"]);
export const lifecycleStatusEnum = pgEnum("lifecycle_status", ["saved", "approved", "sent", "posted", "completed"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["trial", "active", "expired"]);

// ─── Users table for multi-tenant SaaS ────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 50 }),
  role: userRoleEnum("role").default("user").notNull(),
  themePreference: varchar("themePreference", { length: 20 }).default("dark").notNull(),
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
  whatsappNotifications: boolean("whatsappNotifications").default(true).notNull(),
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
  ownerUserId: serial("ownerUserId").notNull(),
  currency: varchar("currency", { length: 20 }).default("YER").notNull(),
  country: varchar("country", { length: 100 }).default("اليمن").notNull(),
  subscriptionPlan: varchar("subscriptionPlan", { length: 50 }).default("standard").notNull(),
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
  userId: serial("userId").notNull(),
  branchId: serial("branchId").notNull(),
  canView: boolean("canView").default(true).notNull(),
  canInsert: boolean("canInsert").default(true).notNull(),
  canApprove: boolean("canApprove").default(false).notNull(),
  canPost: boolean("canPost").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserBranchPermission = typeof userBranchPermissions.$inferSelect;
export type InsertUserBranchPermission = typeof userBranchPermissions.$inferInsert;

// ─── Chart of Accounts ────────────────────────────────────────────

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
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
});

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

// ─── Financial Transactions ───────────────────────────────────────

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  accountId: serial("accountId").notNull(),
  branchId: serial("branchId"),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").default("debit").notNull(),
  transactionDate: timestamp("transactionDate").notNull(),
  narration: varchar("narration", { length: 500 }),
  notes: text("notes"),
  lifecycleStatus: lifecycleStatusEnum("lifecycleStatus").default("saved").notNull(),
  isReversed: boolean("isReversed").default(false).notNull(),
  reversalReason: varchar("reversalReason", { length: 255 }),
  referenceType: varchar("referenceType", { length: 50 }),
  referenceId: serial("referenceId"),
  userId: serial("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (t) => [
  index("idx_transactions_account").on(t.accountId),
  index("idx_transactions_date").on(t.transactionDate),
  index("idx_transactions_branch").on(t.branchId),
  index("idx_transactions_reference").on(t.referenceType, t.referenceId),
]);

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ─── Opening Balances ─────────────────────────────────────────────

export const openingBalances = pgTable("opening_balances", {
  id: serial("id").primaryKey(),
  accountId: serial("accountId").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").default("debit").notNull(),
  notes: text("notes"),
  periodName: varchar("periodName", { length: 50 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OpeningBalance = typeof openingBalances.$inferSelect;
export type InsertOpeningBalance = typeof openingBalances.$inferInsert;

// ─── Budgets ──────────────────────────────────────────────────────

export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  periodName: varchar("periodName", { length: 50 }).notNull(),
  targetRevenue: decimal("targetRevenue", { precision: 15, scale: 2 }).notNull(),
  targetExpense: decimal("targetExpense", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

// ─── Settings ─────────────────────────────────────────────────────

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  institutionName: varchar("institutionName", { length: 255 }).default("مؤسسة الحسينية لخدمات الأعمال").notNull(),
  currency: varchar("currency", { length: 50 }).default("ريال يمني (YER)").notNull(),
  accountingPeriod: varchar("accountingPeriod", { length: 50 }).default("2026").notNull(),
  managerName: varchar("managerName", { length: 255 }).default("إدارة المؤسسة").notNull(),
  notes: text("notes"),
  subscriptionStatus: subscriptionStatusEnum("subscriptionStatus").default("active").notNull(),
  trialEndsAt: timestamp("trialEndsAt"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

// ─── Activity Logs / Audit Trail ──────────────────────────────────

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: serial("userId"),
  userName: varchar("userName", { length: 255 }),
  action: varchar("action", { length: 255 }).notNull(),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

// ─── Products & Inventory ─────────────────────────────────────────

export const productTypeEnum = pgEnum("product_type", ["goods", "service"]);
export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", ["in", "out", "transfer", "adjustment"]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  nameAr: varchar("nameAr", { length: 255 }),
  type: productTypeEnum("type").default("goods").notNull(),
  category: varchar("category", { length: 100 }),
  unit: varchar("unit", { length: 50 }).default("قطعة").notNull(),
  purchasePrice: decimal("purchasePrice", { precision: 15, scale: 2 }).default("0").notNull(),
  salePrice: decimal("salePrice", { precision: 15, scale: 2 }).default("0").notNull(),
  wholesalePrice: decimal("wholesalePrice", { precision: 15, scale: 2 }).default("0").notNull(),
  minStock: integer("minStock").default(0).notNull(),
  currentStock: integer("currentStock").default(0).notNull(),
  barcode: varchar("barcode", { length: 100 }),
  supplierId: serial("supplierId"),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (t) => [
  index("idx_products_category").on(t.category),
  index("idx_products_supplier").on(t.supplierId),
]);

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = typeof warehouses.$inferInsert;

export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  productId: serial("productId").notNull(),
  warehouseId: serial("warehouseId"),
  type: inventoryMovementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  referenceId: serial("referenceId"),
  referenceType: varchar("referenceType", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = typeof inventoryMovements.$inferInsert;

// ─── Customers & Suppliers ────────────────────────────────────────

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  taxNumber: varchar("taxNumber", { length: 100 }),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0").notNull(),
  creditLimit: decimal("creditLimit", { precision: 15, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  taxNumber: varchar("taxNumber", { length: 100 }),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// ─── Sales & POS ──────────────────────────────────────────────────

export const salesInvoiceStatusEnum = pgEnum("sales_invoice_status", ["draft", "confirmed", "paid", "partial", "cancelled"]);
export const purchaseInvoiceStatusEnum = pgEnum("purchase_invoice_status", ["draft", "confirmed", "paid", "partial", "cancelled"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "card", "transfer", "credit", "online"]);

export const salesInvoices = pgTable("sales_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
  customerId: serial("customerId"),
  branchId: serial("branchId"),
  status: salesInvoiceStatusEnum("status").default("draft").notNull(),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).default("0").notNull(),
  taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("0").notNull(),
  taxAmount: decimal("taxAmount", { precision: 15, scale: 2 }).default("0").notNull(),
  discount: decimal("discount", { precision: 15, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).default("0").notNull(),
  paidAmount: decimal("paidAmount", { precision: 15, scale: 2 }).default("0").notNull(),
  paymentMethod: paymentMethodEnum("paymentMethod").default("cash"),
  notes: text("notes"),
  invoiceDate: timestamp("invoiceDate").defaultNow().notNull(),
  dueDate: timestamp("dueDate"),
  userId: serial("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SalesInvoice = typeof salesInvoices.$inferSelect;
export type InsertSalesInvoice = typeof salesInvoices.$inferInsert;

export const salesInvoiceItems = pgTable("sales_invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: serial("invoiceId").notNull(),
  productId: serial("productId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 15, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("idx_sales_items_invoice").on(t.invoiceId),
]);

export type SalesInvoiceItem = typeof salesInvoiceItems.$inferSelect;
export type InsertSalesInvoiceItem = typeof salesInvoiceItems.$inferInsert;

// ─── Purchases ────────────────────────────────────────────────────

export const purchaseInvoices = pgTable("purchase_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
  supplierId: serial("supplierId"),
  branchId: serial("branchId"),
  status: purchaseInvoiceStatusEnum("status").default("draft").notNull(),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).default("0").notNull(),
  taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("0").notNull(),
  taxAmount: decimal("taxAmount", { precision: 15, scale: 2 }).default("0").notNull(),
  discount: decimal("discount", { precision: 15, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).default("0").notNull(),
  paidAmount: decimal("paidAmount", { precision: 15, scale: 2 }).default("0").notNull(),
  paymentMethod: paymentMethodEnum("paymentMethod").default("cash"),
  notes: text("notes"),
  invoiceDate: timestamp("invoiceDate").defaultNow().notNull(),
  dueDate: timestamp("dueDate"),
  userId: serial("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PurchaseInvoice = typeof purchaseInvoices.$inferSelect;
export type InsertPurchaseInvoice = typeof purchaseInvoices.$inferInsert;

export const purchaseInvoiceItems = pgTable("purchase_invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: serial("invoiceId").notNull(),
  productId: serial("productId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 15, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("idx_purchase_items_invoice").on(t.invoiceId),
]);

export type PurchaseInvoiceItem = typeof purchaseInvoiceItems.$inferSelect;
export type InsertPurchaseInvoiceItem = typeof purchaseInvoiceItems.$inferInsert;

// ─── Orders & Distribution ────────────────────────────────────────

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  customerId: serial("customerId"),
  status: orderStatusEnum("status").default("pending").notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).default("0").notNull(),
  deliveryAddress: text("deliveryAddress"),
  deliveryDate: timestamp("deliveryDate"),
  deliveryNotes: text("deliveryNotes"),
  assignedTo: varchar("assignedTo", { length: 255 }),
  userId: serial("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: serial("orderId").notNull(),
  productId: serial("productId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("idx_order_items_order").on(t.orderId),
]);

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ─── Payments (Installments & Settlements) ────────────────────────

export const paymentSourceEnum = pgEnum("payment_source", ["sales", "purchases"]);

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  source: paymentSourceEnum("source").notNull(),
  invoiceId: serial("invoiceId").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("paymentMethod").default("cash"),
  paymentDate: timestamp("paymentDate").defaultNow().notNull(),
  notes: text("notes"),
  userId: serial("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("idx_payments_invoice").on(t.source, t.invoiceId),
]);
