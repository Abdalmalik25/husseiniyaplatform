import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  numeric,
  boolean,
  jsonb,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["admin", "auditor", "accountant", "owner", "user"]);
export const serviceCategoryEnum = pgEnum("service_category", ["engineering", "realEstate", "consulting"]);
export const requestStatusEnum = pgEnum("request_status", ["new", "contacted", "closed"]);
export const appointmentStatusEnum = pgEnum("appointment_status", ["new", "confirmed", "completed", "cancelled"]);
export const creditTypeEnum = pgEnum("credit_type", ["grant", "consume", "purchase"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "cancelled", "expired", "trial"]);
export const syncOperationEnum = pgEnum("sync_operation", ["create", "update", "delete"]);
export const syncStatusEnum = pgEnum("sync_status", ["pending", "synced", "failed"]);
export const customerTypeEnum = pgEnum("customer_type", ["individual", "company", "government", "student"]);
export const invoiceTypeEnum = pgEnum("invoice_type", ["sales", "purchase"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "issued", "paid", "partial", "overdue", "cancelled"]);
export const orderStatusEnum = pgEnum("order_status", ["new", "processing", "shipped", "delivered", "cancelled"]);
export const distributionChannelTypeEnum = pgEnum("distribution_channel_type", ["retail", "wholesale", "online", "agent", "other"]);
export const distributionStatusEnum = pgEnum("distribution_status", ["pending", "shipped", "delivered", "cancelled"]);
export const paymentTypeEnum = pgEnum("payment_type", ["receive", "pay"]);
export const inventoryTypeEnum = pgEnum("inventory_type", ["in", "out", "adjustment"]);
export const accountTypeEnum = pgEnum("account_type", ["asset", "liability", "equity", "revenue", "expense"]);
export const accountCategoryEnum = pgEnum("account_category", ["current", "fixed", "current_liability", "long_term_liability", "capital", "retained_earnings", "sales", "other_income", "operating", "administrative", "financial", "other"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["voucher", "invoice", "request", "order", "receipt", "payment", "transfer", "adjustment", "other"]);
export const journalStatusEnum = pgEnum("journal_status", ["draft", "posted", "void"]);
export const dailyTxStatusEnum = pgEnum("daily_tx_status", ["draft", "posted", "approved", "void"]);
export const lifecycleStatusEnum = pgEnum("lifecycle_status", ["saved", "approved", "sent", "posted", "completed"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["trial", "standard", "premium", "enterprise"]);

// ─── Users & Auth ─────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  themePreference: varchar("themePreference", { length: 20 }).default("dark").notNull(),
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
  whatsappNotifications: boolean("whatsappNotifications").default(true).notNull(),
  compactMode: boolean("compactMode").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// ─── Multi-Tenant (from AppHusseniya) ────────────────────────────
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  ownerUserId: integer("ownerUserId").notNull(),
  currency: varchar("currency", { length: 20 }).default("YER").notNull(),
  country: varchar("country", { length: 100 }).default("اليمن").notNull(),
  subscriptionPlan: subscriptionPlanEnum("subscriptionPlan").default("standard").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userBranchPermissions = pgTable("user_branch_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  branchId: integer("branchId").notNull(),
  canView: boolean("canView").default(true).notNull(),
  canInsert: boolean("canInsert").default(true).notNull(),
  canApprove: boolean("canApprove").default(false).notNull(),
  canPost: boolean("canPost").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Services (Public-facing) ─────────────────────────────────────
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  category: serviceCategoryEnum("category").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 40 }).default("sparkles").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  location: varchar("location", { length: 160 }),
  description: text("description").notNull(),
  imageUrl: text("imageUrl"),
  year: integer("year"),
  clientName: varchar("clientName", { length: 160 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  location: varchar("location", { length: 160 }).notNull(),
  size: varchar("size", { length: 120 }),
  price: numeric("price", { precision: 15, scale: 2 }),
  note: text("note").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const teamMembers = pgTable("teamMembers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  specialty: varchar("specialty", { length: 180 }).notNull(),
  experienceYears: integer("experienceYears").default(0).notNull(),
  bio: text("bio").notNull(),
  imageUrl: text("imageUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Public Interactions ──────────────────────────────────────────
export const serviceRequests = pgTable("serviceRequests", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  email: varchar("email", { length: 320 }),
  serviceType: varchar("serviceType", { length: 180 }).notNull(),
  details: text("details").notNull(),
  status: requestStatusEnum("status").default("new").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  email: varchar("email", { length: 320 }),
  specialty: varchar("specialty", { length: 180 }).notNull(),
  appointmentDate: varchar("appointmentDate", { length: 40 }).notNull(),
  appointmentTime: varchar("appointmentTime", { length: 20 }).notNull(),
  notes: text("notes"),
  status: appointmentStatusEnum("status").default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const contactMessages = pgTable("contactMessages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  email: varchar("email", { length: 320 }),
  subject: varchar("subject", { length: 200 }),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Credits & Subscriptions ──────────────────────────────────────
export const creditWallets = pgTable("creditWallets", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  freeCredits: integer("freeCredits").default(3).notNull(),
  paidCredits: integer("paidCredits").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const creditTransactions = pgTable("creditTransactions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  amount: integer("amount").notNull(),
  type: creditTypeEnum("type").notNull(),
  reference: varchar("reference", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  planId: varchar("planId", { length: 40 }).notNull(),
  status: subscriptionStatusEnum("status").default("trial").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
  autoRenew: boolean("autoRenew").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ─── Devices & Sync ──────────────────────────────────────────────
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  deviceId: varchar("deviceId", { length: 100 }).notNull(),
  platform: varchar("platform", { length: 40 }).notNull(),
  name: varchar("name", { length: 160 }),
  lastSyncAt: timestamp("lastSyncAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [unique().on(t.userId, t.deviceId)]);

export const syncQueue = pgTable("syncQueue", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  deviceId: varchar("deviceId", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 40 }).notNull(),
  entityId: varchar("entityId", { length: 100 }),
  operation: syncOperationEnum("operation").notNull(),
  payload: jsonb("payload"),
  status: syncStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  syncedAt: timestamp("syncedAt"),
});

// ─── Commerce: Customers & Suppliers ──────────────────────────────
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  type: customerTypeEnum("type").default("individual").notNull(),
  balance: numeric("balance", { precision: 15, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  balance: numeric("balance", { precision: 15, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ─── Commerce: Products & Inventory ───────────────────────────────
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  sku: varchar("sku", { length: 60 }),
  category: varchar("category", { length: 80 }),
  unit: varchar("unit", { length: 40 }).default("وحدة").notNull(),
  costPrice: numeric("costPrice", { precision: 15, scale: 2 }).default("0").notNull(),
  sellingPrice: numeric("sellingPrice", { precision: 15, scale: 2 }).default("0").notNull(),
  stockQuantity: integer("stockQuantity").default(0).notNull(),
  minStock: integer("minStock").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const inventoryTransactions = pgTable("inventoryTransactions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  productId: integer("productId").notNull(),
  quantity: integer("quantity").notNull(),
  type: inventoryTypeEnum("type").notNull(),
  reference: varchar("reference", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Commerce: Invoices & Orders ──────────────────────────────────
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  invoiceNumber: varchar("invoiceNumber", { length: 40 }).notNull(),
  customerId: integer("customerId"),
  supplierId: integer("supplierId"),
  type: invoiceTypeEnum("type").notNull(),
  status: invoiceStatusEnum("status").default("draft").notNull(),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).default("0").notNull(),
  discount: numeric("discount", { precision: 15, scale: 2 }).default("0").notNull(),
  tax: numeric("tax", { precision: 15, scale: 2 }).default("0").notNull(),
  total: numeric("total", { precision: 15, scale: 2 }).default("0").notNull(),
  paidAmount: numeric("paidAmount", { precision: 15, scale: 2 }).default("0").notNull(),
  dueDate: timestamp("dueDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const invoiceItems = pgTable("invoiceItems", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoiceId").notNull(),
  productId: integer("productId"),
  description: varchar("description", { length: 200 }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: numeric("unitPrice", { precision: 15, scale: 2 }).default("0").notNull(),
  total: numeric("total", { precision: 15, scale: 2 }).default("0").notNull(),
});

export const customerOrders = pgTable("customerOrders", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  orderNumber: varchar("orderNumber", { length: 40 }).notNull(),
  customerId: integer("customerId"),
  status: orderStatusEnum("status").default("new").notNull(),
  total: numeric("total", { precision: 15, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const orderItems = pgTable("orderItems", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  productId: integer("productId"),
  description: varchar("description", { length: 200 }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: numeric("unitPrice", { precision: 15, scale: 2 }).default("0").notNull(),
  total: numeric("total", { precision: 15, scale: 2 }).default("0").notNull(),
});

// ─── Commerce: Distribution ───────────────────────────────────────
export const distributionChannels = pgTable("distributionChannels", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  type: distributionChannelTypeEnum("type").default("other").notNull(),
  location: varchar("location", { length: 160 }),
  balance: numeric("balance", { precision: 15, scale: 2 }).default("0").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const distributions = pgTable("distributions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  channelId: integer("channelId").notNull(),
  productId: integer("productId").notNull(),
  quantity: integer("quantity").notNull(),
  status: distributionStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deliveredAt: timestamp("deliveredAt"),
});

// ─── Commerce: Payments & Expenses ────────────────────────────────
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  type: paymentTypeEnum("type").notNull(),
  method: varchar("method", { length: 60 }).default("نقدي").notNull(),
  reference: varchar("reference", { length: 160 }),
  invoiceId: integer("invoiceId"),
  customerId: integer("customerId"),
  supplierId: integer("supplierId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  description: varchar("description", { length: 200 }),
  accountId: integer("accountId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Accounting: Organization & Branches ──────────────────────────
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  commercialName: varchar("commercialName", { length: 180 }),
  legalName: varchar("legalName", { length: 180 }),
  taxNumber: varchar("taxNumber", { length: 60 }),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  currencyCode: varchar("currencyCode", { length: 10 }).default("YER").notNull(),
  fiscalYearStart: varchar("fiscalYearStart", { length: 10 }).default("01-01"),
  logo: text("logo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  tenantId: integer("tenantId"),
  organizationId: integer("organizationId"),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 40 }),
  city: varchar("city", { length: 100 }),
  address: text("address"),
  phone: varchar("phone", { length: 40 }),
  isMain: boolean("isMain").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Accounting: Chart of Accounts ────────────────────────────────
export const chartOfAccounts = pgTable("chartOfAccounts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  organizationId: integer("organizationId").notNull(),
  code: varchar("code", { length: 40 }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  nameEn: varchar("nameEn", { length: 180 }),
  type: accountTypeEnum("type").notNull(),
  category: accountCategoryEnum("category").default("other").notNull(),
  parentId: integer("parentId"),
  isActive: boolean("isActive").default(true).notNull(),
  isCustom: boolean("isCustom").default(false).notNull(),
  openingBalance: numeric("openingBalance", { precision: 15, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ─── Accounting: Currencies & Units ───────────────────────────────
export const currencies = pgTable("currencies", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  symbol: varchar("symbol", { length: 10 }),
  exchangeRate: numeric("exchangeRate", { precision: 15, scale: 6 }).default("1").notNull(),
  isBase: boolean("isBase").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const unitsOfMeasure = pgTable("unitsOfMeasure", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  abbreviation: varchar("abbreviation", { length: 20 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Accounting: Employees ────────────────────────────────────────
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  organizationId: integer("organizationId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  role: varchar("role", { length: 80 }).default("employee").notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  salary: numeric("salary", { precision: 15, scale: 2 }).default("0").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Accounting: Journal Entries ──────────────────────────────────
export const journalEntries = pgTable("journalEntries", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  organizationId: integer("organizationId").notNull(),
  branchId: integer("branchId"),
  entryNumber: varchar("entryNumber", { length: 40 }).notNull(),
  entryDate: timestamp("entryDate").defaultNow().notNull(),
  description: varchar("description", { length: 200 }),
  debitTotal: numeric("debitTotal", { precision: 15, scale: 2 }).default("0").notNull(),
  creditTotal: numeric("creditTotal", { precision: 15, scale: 2 }).default("0").notNull(),
  currencyCode: varchar("currencyCode", { length: 10 }).default("YER").notNull(),
  exchangeRate: numeric("exchangeRate", { precision: 15, scale: 6 }).default("1").notNull(),
  status: journalStatusEnum("status").default("draft").notNull(),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const journalEntryLines = pgTable("journalEntryLines", {
  id: serial("id").primaryKey(),
  entryId: integer("entryId").notNull(),
  accountId: integer("accountId").notNull(),
  debit: numeric("debit", { precision: 15, scale: 2 }).default("0").notNull(),
  credit: numeric("credit", { precision: 15, scale: 2 }).default("0").notNull(),
  description: varchar("description", { length: 200 }),
  entityType: varchar("entityType", { length: 40 }),
  entityId: integer("entityId"),
});

// ─── Accounting: Daily Transactions ───────────────────────────────
export const dailyTransactions = pgTable("dailyTransactions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  organizationId: integer("organizationId").notNull(),
  branchId: integer("branchId"),
  transactionNumber: varchar("transactionNumber", { length: 40 }).notNull(),
  transactionType: transactionTypeEnum("transactionType").notNull(),
  transactionDate: timestamp("transactionDate").defaultNow().notNull(),
  accountId: integer("accountId"),
  customerId: integer("customerId"),
  supplierId: integer("supplierId"),
  employeeId: integer("employeeId"),
  agentId: integer("agentId"),
  distributorId: integer("distributorId"),
  productId: integer("productId"),
  amount: numeric("amount", { precision: 15, scale: 2 }).default("0").notNull(),
  currencyCode: varchar("currencyCode", { length: 10 }).default("YER").notNull(),
  exchangeRate: numeric("exchangeRate", { precision: 15, scale: 6 }).default("1").notNull(),
  quantity: integer("quantity").default(0).notNull(),
  unitId: integer("unitId"),
  description: varchar("description", { length: 200 }),
  status: dailyTxStatusEnum("status").default("draft").notNull(),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── From AppHusseniya: Financial Transactions ────────────────────
export const financialTransactions = pgTable("financial_transactions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  branchId: integer("branchId"),
  accountId: integer("accountId").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  type: varchar("type", { length: 10 }).notNull(), // debit/credit
  transactionDate: timestamp("transactionDate").notNull(),
  narration: varchar("narration", { length: 500 }),
  notes: text("notes"),
  lifecycleStatus: lifecycleStatusEnum("lifecycleStatus").default("saved").notNull(),
  isReversed: boolean("isReversed").default(false).notNull(),
  reversalReason: varchar("reversalReason", { length: 255 }),
  userId: integer("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const openingBalances = pgTable("opening_balances", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  accountId: integer("accountId").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  type: varchar("type", { length: 10 }).notNull(),
  notes: text("notes"),
  periodName: varchar("periodName", { length: 50 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  periodName: varchar("periodName", { length: 50 }).notNull(),
  targetRevenue: numeric("targetRevenue", { precision: 15, scale: 2 }).notNull(),
  targetExpense: numeric("targetExpense", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  institutionName: varchar("institutionName", { length: 255 }).default("مؤسسة الحسينية لخدمات الأعمال").notNull(),
  currency: varchar("currency", { length: 50 }).default("ريال يمني (YER)").notNull(),
  accountingPeriod: varchar("accountingPeriod", { length: 50 }).default("2026").notNull(),
  managerName: varchar("managerName", { length: 255 }).default("إدارة المؤسسة").notNull(),
  notes: text("notes"),
  subscriptionStatus: subscriptionStatusEnum("subscriptionStatus").default("active").notNull(),
  trialEndsAt: timestamp("trialEndsAt"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  userId: integer("userId"),
  userName: varchar("userName", { length: 255 }),
  action: varchar("action", { length: 255 }).notNull(),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── NEW: Analytics & Intelligence ────────────────────────────────
export const analyticsSnapshots = pgTable("analytics_snapshots", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  snapshotDate: timestamp("snapshotDate").notNull(),
  metricType: varchar("metricType", { length: 60 }).notNull(), // revenue, expense, profit, customers, invoices, etc.
  value: numeric("value", { precision: 18, scale: 4 }).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const kpiMetrics = pgTable("kpi_metrics", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  periodName: varchar("periodName", { length: 50 }).notNull(),
  revenueGrowth: numeric("revenueGrowth", { precision: 8, scale: 4 }),
  expenseGrowth: numeric("expenseGrowth", { precision: 8, scale: 4 }),
  profitMargin: numeric("profitMargin", { precision: 8, scale: 4 }),
  customerRetention: numeric("customerRetention", { precision: 8, scale: 4 }),
  avgInvoiceValue: numeric("avgInvoiceValue", { precision: 15, scale: 2 }),
  overdueRate: numeric("overdueRate", { precision: 8, scale: 4 }),
  inventoryTurnover: numeric("inventoryTurnover", { precision: 8, scale: 4 }),
  cashFlowRatio: numeric("cashFlowRatio", { precision: 8, scale: 4 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── NEW: Visitor & Interaction Tracking ──────────────────────────
export const visitorSessions = pgTable("visitor_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("sessionId", { length: 100 }).notNull().unique(),
  visitorId: varchar("visitorId", { length: 100 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  referrer: text("referrer"),
  firstPage: varchar("firstPage", { length: 300 }),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  device: varchar("device", { length: 40 }),
  browser: varchar("browser", { length: 40 }),
  os: varchar("os", { length: 40 }),
  isBot: boolean("isBot").default(false).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
  duration: integer("duration"), // seconds
  pagesViewed: integer("pagesViewed").default(1).notNull(),
});

export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  sessionId: varchar("sessionId", { length: 100 }).notNull(),
  visitorId: varchar("visitorId", { length: 100 }),
  page: varchar("page", { length: 300 }).notNull(),
  title: varchar("title", { length: 200 }),
  timeSpent: integer("timeSpent"), // seconds
  scrollDepth: integer("scrollDepth"), // percentage
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const clientInteractions = pgTable("client_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  visitorId: varchar("visitorId", { length: 100 }),
  interactionType: varchar("interactionType", { length: 60 }).notNull(), // form_submit, button_click, download, call, whatsapp, email
  page: varchar("page", { length: 300 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── NEW: AI Insights ─────────────────────────────────────────────
export const aiInsights = pgTable("ai_insights", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  insightType: varchar("insightType", { length: 60 }).notNull(), // revenue_forecast, anomaly, recommendation, alert
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  severity: varchar("severity", { length: 20 }).default("info"), // info, warning, critical
  data: jsonb("data"),
  isRead: boolean("isRead").default(false).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── NEW: Alerts & Notifications ──────────────────────────────────
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  userId: integer("userId"),
  alertType: varchar("alertType", { length: 60 }).notNull(), // overdue_invoice, low_stock, appointment_reminder, payment_due
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  severity: varchar("severity", { length: 20 }).default("info"),
  isRead: boolean("isRead").default(false).notNull(),
  actionUrl: varchar("actionUrl", { length: 300 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── NEW: Testimonials (dynamic) ──────────────────────────────────
export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  clientName: varchar("clientName", { length: 160 }).notNull(),
  clientTitle: varchar("clientTitle", { length: 160 }),
  clientCompany: varchar("clientCompany", { length: 160 }),
  content: text("content").notNull(),
  rating: integer("rating").default(5),
  serviceType: varchar("serviceType", { length: 80 }),
  imageUrl: text("imageUrl"),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── NEW: Library Articles ────────────────────────────────────────
export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  category: varchar("category", { length: 80 }),
  authorName: varchar("authorName", { length: 160 }),
  imageUrl: text("imageUrl"),
  readTime: integer("readTime"), // minutes
  isPublished: boolean("isPublished").default(false).notNull(),
  viewCount: integer("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ─── NEW: Student Services ────────────────────────────────────────
export const studentServices = pgTable("student_services", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 40 }).default("graduationCap").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }),
  originalPrice: numeric("originalPrice", { precision: 10, scale: 2 }),
  discountPercent: integer("discountPercent"),
  category: varchar("category", { length: 80 }),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Type Exports ─────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type CreditWallet = typeof creditWallets.$inferSelect;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type SyncQueueEntry = typeof syncQueue.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type CustomerOrder = typeof customerOrders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type DistributionChannel = typeof distributionChannels.$inferSelect;
export type Distribution = typeof distributions.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Branch = typeof branches.$inferSelect;
export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type Currency = typeof currencies.$inferSelect;
export type UnitOfMeasure = typeof unitsOfMeasure.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type DailyTransaction = typeof dailyTransactions.$inferSelect;
export type FinancialTransaction = typeof financialTransactions.$inferSelect;
export type OpeningBalance = typeof openingBalances.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type AnalyticsSnapshot = typeof analyticsSnapshots.$inferSelect;
export type KpiMetric = typeof kpiMetrics.$inferSelect;
export type VisitorSession = typeof visitorSessions.$inferSelect;
export type PageView = typeof pageViews.$inferSelect;
export type ClientInteraction = typeof clientInteractions.$inferSelect;
export type AiInsight = typeof aiInsights.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type Testimonial = typeof testimonials.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type StudentService = typeof studentServices.$inferSelect;
export type UserBranchPermission = typeof userBranchPermissions.$inferSelect;
export type Account = typeof chartOfAccounts.$inferSelect;
export type Transaction = typeof financialTransactions.$inferSelect;
