import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  category: mysqlEnum("category", ["engineering", "realEstate", "consulting"]).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 40 }).default("sparkles").notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  location: varchar("location", { length: 160 }),
  description: text("description").notNull(),
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  location: varchar("location", { length: 160 }).notNull(),
  size: varchar("size", { length: 120 }),
  note: text("note").notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const teamMembers = mysqlTable("teamMembers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  specialty: varchar("specialty", { length: 180 }).notNull(),
  experienceYears: int("experienceYears").default(0).notNull(),
  bio: text("bio").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const serviceRequests = mysqlTable("serviceRequests", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  email: varchar("email", { length: 320 }),
  serviceType: varchar("serviceType", { length: 180 }).notNull(),
  details: text("details").notNull(),
  status: mysqlEnum("status", ["new", "contacted", "closed"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  email: varchar("email", { length: 320 }),
  specialty: varchar("specialty", { length: 180 }).notNull(),
  appointmentDate: varchar("appointmentDate", { length: 40 }).notNull(),
  appointmentTime: varchar("appointmentTime", { length: 20 }).notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["new", "confirmed", "completed", "cancelled"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const contactMessages = mysqlTable("contactMessages", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  email: varchar("email", { length: 320 }),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export const creditWallets = mysqlTable("creditWallets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  freeCredits: int("freeCredits").default(3).notNull(),
  paidCredits: int("paidCredits").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const creditTransactions = mysqlTable("creditTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),
  type: mysqlEnum("type", ["grant", "consume", "purchase"]).notNull(),
  reference: varchar("reference", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Subscription management for the commercial system
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  planId: varchar("planId", { length: 40 }).notNull(),
  status: mysqlEnum("status", ["active", "cancelled", "expired", "trial"]).default("trial").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
  autoRenew: int("autoRenew").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Device registration for multi-platform sync
export const devices = mysqlTable("devices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  deviceId: varchar("deviceId", { length: 100 }).notNull(),
  platform: varchar("platform", { length: 40 }).notNull(), // web, desktop, mobile, cloud
  name: varchar("name", { length: 160 }),
  lastSyncAt: timestamp("lastSyncAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Sync queue for offline-first synchronization
export const syncQueue = mysqlTable("syncQueue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  deviceId: varchar("deviceId", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 40 }).notNull(),
  entityId: varchar("entityId", { length: 100 }),
  operation: mysqlEnum("operation", ["create", "update", "delete"]).notNull(),
  payload: json("payload"),
  status: mysqlEnum("status", ["pending", "synced", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  syncedAt: timestamp("syncedAt"),
});

// ==== النظام التجاري: العملاء والموردون ====
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  type: mysqlEnum("type", ["individual", "company", "government", "student"]).default("individual").notNull(),
  balance: int("balance").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  balance: int("balance").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ==== النظام التجاري: المنتجات والمخزون ====
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  sku: varchar("sku", { length: 60 }),
  category: varchar("category", { length: 80 }),
  unit: varchar("unit", { length: 40 }).default("وحدة").notNull(),
  costPrice: int("costPrice").default(0).notNull(),
  sellingPrice: int("sellingPrice").default(0).notNull(),
  stockQuantity: int("stockQuantity").default(0).notNull(),
  minStock: int("minStock").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const inventoryTransactions = mysqlTable("inventoryTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  type: mysqlEnum("type", ["in", "out", "adjustment"]).notNull(),
  reference: varchar("reference", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ==== النظام التجاري: الفواتير والمبيعات والمشتريات ====
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  invoiceNumber: varchar("invoiceNumber", { length: 40 }).notNull(),
  customerId: int("customerId"),
  supplierId: int("supplierId"),
  type: mysqlEnum("type", ["sales", "purchase"]).notNull(),
  status: mysqlEnum("status", ["draft", "issued", "paid", "partial", "overdue", "cancelled"]).default("draft").notNull(),
  subtotal: int("subtotal").default(0).notNull(),
  discount: int("discount").default(0).notNull(),
  tax: int("tax").default(0).notNull(),
  total: int("total").default(0).notNull(),
  paidAmount: int("paidAmount").default(0).notNull(),
  dueDate: timestamp("dueDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const invoiceItems = mysqlTable("invoiceItems", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  productId: int("productId"),
  description: varchar("description", { length: 200 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: int("unitPrice").default(0).notNull(),
  total: int("total").default(0).notNull(),
});

// ==== النظام التجاري: طلبات العملاء ====
export const customerOrders = mysqlTable("customerOrders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderNumber: varchar("orderNumber", { length: 40 }).notNull(),
  customerId: int("customerId"),
  status: mysqlEnum("status", ["new", "processing", "shipped", "delivered", "cancelled"]).default("new").notNull(),
  total: int("total").default(0).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId"),
  description: varchar("description", { length: 200 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: int("unitPrice").default(0).notNull(),
  total: int("total").default(0).notNull(),
});

// ==== النظام التجاري: التوزيع وقنوات البيع ====
export const distributionChannels = mysqlTable("distributionChannels", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  type: mysqlEnum("type", ["retail", "wholesale", "online", "agent", "other"]).default("other").notNull(),
  location: varchar("location", { length: 160 }),
  balance: int("balance").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const distributions = mysqlTable("distributions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  channelId: int("channelId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  status: mysqlEnum("status", ["pending", "shipped", "delivered", "cancelled"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deliveredAt: timestamp("deliveredAt"),
});

// ==== النظام التجاري: المدفوعات والمصروفات ====
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),
  type: mysqlEnum("type", ["receive", "pay"]).notNull(),
  method: varchar("method", { length: 60 }).default("نقدي").notNull(),
  reference: varchar("reference", { length: 160 }),
  invoiceId: int("invoiceId"),
  customerId: int("customerId"),
  supplierId: int("supplierId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  description: varchar("description", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ==== النظام المحاسبي: المؤسسة والفروع ====
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const branches = mysqlTable("branches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 40 }),
  address: text("address"),
  phone: varchar("phone", { length: 40 }),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ==== النظام المحاسبي: دليل الحسابات ====
export const chartOfAccounts = mysqlTable("chartOfAccounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId").notNull(),
  code: varchar("code", { length: 40 }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  nameEn: varchar("nameEn", { length: 180 }),
  type: mysqlEnum("type", ["asset", "liability", "equity", "revenue", "expense"]).notNull(),
  category: mysqlEnum("category", ["current", "fixed", "current_liability", "long_term_liability", "capital", "retained_earnings", "sales", "other_income", "operating", "administrative", "financial", "other"]).default("other").notNull(),
  parentId: int("parentId"),
  isActive: int("isActive").default(1).notNull(),
  openingBalance: int("openingBalance").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ==== النظام المحاسبي: العملات ووحدات القياس ====
export const currencies = mysqlTable("currencies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  symbol: varchar("symbol", { length: 10 }),
  exchangeRate: int("exchangeRate").default(1).notNull(),
  isBase: int("isBase").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const unitsOfMeasure = mysqlTable("unitsOfMeasure", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  abbreviation: varchar("abbreviation", { length: 20 }),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ==== النظام المحاسبي: الموظفون ====
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  role: varchar("role", { length: 80 }).default("employee").notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  salary: int("salary").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ==== النظام المحاسبي: القيود اليومية ====
export const journalEntries = mysqlTable("journalEntries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId").notNull(),
  branchId: int("branchId"),
  entryNumber: varchar("entryNumber", { length: 40 }).notNull(),
  entryDate: timestamp("entryDate").defaultNow().notNull(),
  description: varchar("description", { length: 200 }),
  debitTotal: int("debitTotal").default(0).notNull(),
  creditTotal: int("creditTotal").default(0).notNull(),
  currencyCode: varchar("currencyCode", { length: 10 }).default("YER").notNull(),
  exchangeRate: int("exchangeRate").default(1).notNull(),
  status: mysqlEnum("status", ["draft", "posted", "void"]).default("draft").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const journalEntryLines = mysqlTable("journalEntryLines", {
  id: int("id").autoincrement().primaryKey(),
  entryId: int("entryId").notNull(),
  accountId: int("accountId").notNull(),
  debit: int("debit").default(0).notNull(),
  credit: int("credit").default(0).notNull(),
  description: varchar("description", { length: 200 }),
  entityType: varchar("entityType", { length: 40 }),
  entityId: int("entityId"),
});

// ==== النظام المحاسبي: المعاملات اليومية العامة (سندات/فواتير/طلبات/أوامر) ====
export const dailyTransactions = mysqlTable("dailyTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId").notNull(),
  branchId: int("branchId"),
  transactionNumber: varchar("transactionNumber", { length: 40 }).notNull(),
  transactionType: mysqlEnum("transactionType", ["voucher", "invoice", "request", "order", "receipt", "payment", "transfer", "adjustment", "other"]).notNull(),
  transactionDate: timestamp("transactionDate").defaultNow().notNull(),
  accountId: int("accountId"),
  customerId: int("customerId"),
  supplierId: int("supplierId"),
  employeeId: int("employeeId"),
  agentId: int("agentId"),
  distributorId: int("distributorId"),
  productId: int("productId"),
  amount: int("amount").default(0).notNull(),
  currencyCode: varchar("currencyCode", { length: 10 }).default("YER").notNull(),
  exchangeRate: int("exchangeRate").default(1).notNull(),
  quantity: int("quantity").default(0).notNull(),
  unitId: int("unitId"),
  description: varchar("description", { length: 200 }),
  status: mysqlEnum("status", ["draft", "posted", "approved", "void"]).default("draft").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

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
