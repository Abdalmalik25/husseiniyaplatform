// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { pathToFileURL } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  category: mysqlEnum("category", ["engineering", "realEstate", "consulting"]).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 40 }).default("sparkles").notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  location: varchar("location", { length: 160 }),
  description: text("description").notNull(),
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  location: varchar("location", { length: 160 }).notNull(),
  size: varchar("size", { length: 120 }),
  note: text("note").notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var teamMembers = mysqlTable("teamMembers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  specialty: varchar("specialty", { length: 180 }).notNull(),
  experienceYears: int("experienceYears").default(0).notNull(),
  bio: text("bio").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var serviceRequests = mysqlTable("serviceRequests", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  email: varchar("email", { length: 320 }),
  serviceType: varchar("serviceType", { length: 180 }).notNull(),
  details: text("details").notNull(),
  status: mysqlEnum("status", ["new", "contacted", "closed"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  email: varchar("email", { length: 320 }),
  specialty: varchar("specialty", { length: 180 }).notNull(),
  appointmentDate: varchar("appointmentDate", { length: 40 }).notNull(),
  appointmentTime: varchar("appointmentTime", { length: 20 }).notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["new", "confirmed", "completed", "cancelled"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var contactMessages = mysqlTable("contactMessages", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  email: varchar("email", { length: 320 }),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var creditWallets = mysqlTable("creditWallets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  freeCredits: int("freeCredits").default(3).notNull(),
  paidCredits: int("paidCredits").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var creditTransactions = mysqlTable("creditTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),
  type: mysqlEnum("type", ["grant", "consume", "purchase"]).notNull(),
  reference: varchar("reference", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  planId: varchar("planId", { length: 40 }).notNull(),
  status: mysqlEnum("status", ["active", "cancelled", "expired", "trial"]).default("trial").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
  autoRenew: int("autoRenew").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var devices = mysqlTable("devices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  deviceId: varchar("deviceId", { length: 100 }).notNull(),
  platform: varchar("platform", { length: 40 }).notNull(),
  // web, desktop, mobile, cloud
  name: varchar("name", { length: 160 }),
  lastSyncAt: timestamp("lastSyncAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var syncQueue = mysqlTable("syncQueue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  deviceId: varchar("deviceId", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 40 }).notNull(),
  entityId: varchar("entityId", { length: 100 }),
  operation: mysqlEnum("operation", ["create", "update", "delete"]).notNull(),
  payload: json("payload"),
  status: mysqlEnum("status", ["pending", "synced", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  syncedAt: timestamp("syncedAt")
});
var customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  type: mysqlEnum("type", ["individual", "company", "government", "student"]).default("individual").notNull(),
  balance: int("balance").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  balance: int("balance").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  sku: varchar("sku", { length: 60 }),
  category: varchar("category", { length: 80 }),
  unit: varchar("unit", { length: 40 }).default("\u0648\u062D\u062F\u0629").notNull(),
  costPrice: int("costPrice").default(0).notNull(),
  sellingPrice: int("sellingPrice").default(0).notNull(),
  stockQuantity: int("stockQuantity").default(0).notNull(),
  minStock: int("minStock").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var inventoryTransactions = mysqlTable("inventoryTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  type: mysqlEnum("type", ["in", "out", "adjustment"]).notNull(),
  reference: varchar("reference", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var invoices = mysqlTable("invoices", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var invoiceItems = mysqlTable("invoiceItems", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  productId: int("productId"),
  description: varchar("description", { length: 200 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: int("unitPrice").default(0).notNull(),
  total: int("total").default(0).notNull()
});
var customerOrders = mysqlTable("customerOrders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderNumber: varchar("orderNumber", { length: 40 }).notNull(),
  customerId: int("customerId"),
  status: mysqlEnum("status", ["new", "processing", "shipped", "delivered", "cancelled"]).default("new").notNull(),
  total: int("total").default(0).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId"),
  description: varchar("description", { length: 200 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: int("unitPrice").default(0).notNull(),
  total: int("total").default(0).notNull()
});
var distributionChannels = mysqlTable("distributionChannels", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  type: mysqlEnum("type", ["retail", "wholesale", "online", "agent", "other"]).default("other").notNull(),
  location: varchar("location", { length: 160 }),
  balance: int("balance").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var distributions = mysqlTable("distributions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  channelId: int("channelId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  status: mysqlEnum("status", ["pending", "shipped", "delivered", "cancelled"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deliveredAt: timestamp("deliveredAt")
});
var payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),
  type: mysqlEnum("type", ["receive", "pay"]).notNull(),
  method: varchar("method", { length: 60 }).default("\u0646\u0642\u062F\u064A").notNull(),
  reference: varchar("reference", { length: 160 }),
  invoiceId: int("invoiceId"),
  customerId: int("customerId"),
  supplierId: int("supplierId"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  description: varchar("description", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var organizations = mysqlTable("organizations", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var branches = mysqlTable("branches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 40 }),
  address: text("address"),
  phone: varchar("phone", { length: 40 }),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var chartOfAccounts = mysqlTable("chartOfAccounts", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var currencies = mysqlTable("currencies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  symbol: varchar("symbol", { length: 10 }),
  exchangeRate: int("exchangeRate").default(1).notNull(),
  isBase: int("isBase").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var unitsOfMeasure = mysqlTable("unitsOfMeasure", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  abbreviation: varchar("abbreviation", { length: 20 }),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  role: varchar("role", { length: 80 }).default("employee").notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  salary: int("salary").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var journalEntries = mysqlTable("journalEntries", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var journalEntryLines = mysqlTable("journalEntryLines", {
  id: int("id").autoincrement().primaryKey(),
  entryId: int("entryId").notNull(),
  accountId: int("accountId").notNull(),
  debit: int("debit").default(0).notNull(),
  credit: int("credit").default(0).notNull(),
  description: varchar("description", { length: 200 }),
  entityType: varchar("entityType", { length: 40 }),
  entityId: int("entityId")
});
var dailyTransactions = mysqlTable("dailyTransactions", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// shared/config.ts
var DEFAULT_SITE_CONFIG = {
  brand: {
    arabicName: "\u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629",
    commercialName: "ALHUSAINIA",
    legalName: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644",
    englishName: "ALHUSAINIA Business Services Establishment",
    tagline: "\u0634\u0631\u064A\u0643\u0643 \u0627\u0644\u0645\u0647\u0646\u064A \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644 \u0627\u0644\u0645\u062A\u0643\u0627\u0645\u0644\u0629",
    supportEmail: "",
    phone: "",
    whatsapp: ""
  },
  credits: {
    trialAmount: 3,
    unitLabel: "\u0631\u0635\u064A\u062F",
    consumptionLabel: "\u0637\u0644\u0628 \u062E\u062F\u0645\u0629 \u0623\u0648 \u062E\u0637\u0648\u0629 \u0627\u0633\u062A\u0634\u0627\u0631\u064A\u0629",
    consumptionPriority: "free-first",
    costPerAction: 1
  },
  payment: {
    mode: "disabled",
    providerLabel: "Stripe",
    checkoutEnabled: false,
    successUrl: "/credits?payment=success",
    cancelUrl: "/credits?payment=cancelled"
  },
  plans: [
    { id: "trial", name: "\u062A\u062C\u0631\u0628\u0629 \u0627\u0644\u0628\u062F\u0627\u064A\u0629", priceLabel: "\u0645\u062C\u0627\u0646\u064A", creditsLabel: "3 \u0623\u0631\u0635\u062F\u0629", description: "\u0644\u062A\u062C\u0631\u0628\u0629 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0642\u062A\u0629 \u0648\u0627\u0644\u062A\u0639\u0631\u0651\u0641 \u0625\u0644\u0649 \u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u0639\u0645\u0644.", features: ["\u0631\u0635\u064A\u062F \u0645\u062C\u0627\u0646\u064A \u0639\u0646\u062F \u0627\u0644\u062A\u0633\u062C\u064A\u0644", "\u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u062E\u062F\u0645\u0627\u062A", "\u0628\u062F\u0648\u0646 \u0628\u0637\u0627\u0642\u0629 \u062F\u0641\u0639"], tone: "sand" },
    { id: "business", name: "\u0628\u0627\u0642\u0629 \u0627\u0644\u0623\u0639\u0645\u0627\u0644", priceLabel: "\u0642\u0631\u064A\u0628\u0627\u064B", creditsLabel: "10 \u0623\u0631\u0635\u062F\u0629", description: "\u0644\u0623\u0635\u062D\u0627\u0628 \u0627\u0644\u0623\u0639\u0645\u0627\u0644 \u0648\u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0627\u0644\u0630\u064A\u0646 \u064A\u062D\u062A\u0627\u062C\u0648\u0646 \u0625\u0644\u0649 \u0645\u062A\u0627\u0628\u0639\u0629 \u0645\u062A\u0643\u0631\u0631\u0629.", features: ["10 \u0623\u0631\u0635\u062F\u0629 \u0644\u0644\u062E\u062F\u0645\u0627\u062A", "\u0623\u0648\u0644\u0648\u064A\u0629 \u0641\u064A \u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0637\u0644\u0628", "\u0633\u062C\u0644 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0648\u0627\u0636\u062D"], tone: "ink" },
    { id: "enterprise", name: "\u0627\u0644\u0634\u0631\u064A\u0643 \u0627\u0644\u0645\u0624\u0633\u0633\u064A", priceLabel: "\u062D\u0633\u0628 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u062C", creditsLabel: "\u0645\u0631\u0646", description: "\u062D\u0644 \u0645\u062E\u0635\u0635 \u0644\u0644\u0634\u0631\u0643\u0627\u062A \u0648\u0627\u0644\u0645\u0624\u0633\u0633\u0627\u062A \u0648\u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0645\u062A\u0639\u062F\u062F\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u062C\u0627\u062A.", features: ["\u0631\u0635\u064A\u062F \u0645\u062E\u0635\u0635 \u0644\u0644\u0641\u0631\u064A\u0642", "\u062A\u0646\u0633\u064A\u0642 \u062E\u062F\u0645\u0627\u062A \u0645\u062A\u0639\u062F\u062F", "\u062F\u0639\u0645 \u0627\u0633\u062A\u0634\u0627\u0631\u064A \u0645\u0624\u0633\u0633\u064A"], tone: "white" }
  ]
};

// server/db.ts
var _db = null;
function resolveTrialCredits(value = process.env.TRIAL_CREDITS) {
  const configured = Number(value ?? DEFAULT_SITE_CONFIG.credits.trialAmount);
  return Number.isFinite(configured) && configured >= 0 ? Math.floor(configured) : DEFAULT_SITE_CONFIG.credits.trialAmount;
}
var trialCredits = resolveTrialCredits();
function resolveCreditPriority(value = process.env.CREDIT_CONSUMPTION_PRIORITY) {
  return value === "paid-first" ? "paid-first" : DEFAULT_SITE_CONFIG.credits.consumptionPriority;
}
function resolveCreditCost(value = process.env.CREDIT_COST_PER_ACTION) {
  const configured = Number(value ?? DEFAULT_SITE_CONFIG.credits.costPerAction);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_SITE_CONFIG.credits.costPerAction;
}
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values = { openId: user.openId };
  const updateSet = {};
  for (const field of ["name", "email", "loginMethod"]) {
    if (user[field] !== void 0) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? /* @__PURE__ */ new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== void 0 || user.openId === ENV.ownerOpenId) {
    values.role = user.role ?? "admin";
    updateSet.role = values.role;
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return rows[0];
}
async function getProperties() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(properties).where(eq(properties.isActive, 1)).orderBy(desc(properties.createdAt));
}
async function getPublicContent() {
  const db = await getDb();
  if (!db) return { services: [], projects: [], team: [] };
  const [serviceRows, projectRows, teamRows] = await Promise.all([
    db.select().from(services).where(eq(services.isActive, 1)).orderBy(desc(services.createdAt)),
    db.select().from(projects).orderBy(desc(projects.createdAt)),
    db.select().from(teamMembers).orderBy(desc(teamMembers.createdAt))
  ]);
  return { services: serviceRows, projects: projectRows, team: teamRows };
}
async function createServiceRequest(input) {
  const db = await getDb();
  if (!db) return null;
  const r = await db.insert(serviceRequests).values(input);
  return r;
}
async function createAppointment(input) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(appointments).values(input);
}
async function createContactMessage(input) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(contactMessages).values(input);
}
async function createService(input) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(services).values(input);
}
async function createProject(input) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(projects).values(input);
}
async function updateServiceRequestStatus(id, status) {
  const db = await getDb();
  if (!db) return null;
  return db.update(serviceRequests).set({ status }).where(eq(serviceRequests.id, id));
}
async function updateAppointmentStatus(id, status) {
  const db = await getDb();
  if (!db) return null;
  return db.update(appointments).set({ status }).where(eq(appointments.id, id));
}
async function getAdminContent() {
  const db = await getDb();
  if (!db) return { services: [], projects: [], properties: [] };
  const [serviceRows, projectRows, propertyRows] = await Promise.all([db.select().from(services).orderBy(desc(services.createdAt)), db.select().from(projects).orderBy(desc(projects.createdAt)), db.select().from(properties).orderBy(desc(properties.createdAt))]);
  return { services: serviceRows, projects: projectRows, properties: propertyRows };
}
async function getAdminInbox() {
  const db = await getDb();
  if (!db) return { requests: [], appointments: [], messages: [] };
  const [requests, appointmentRows, messages] = await Promise.all([
    db.select().from(serviceRequests).orderBy(desc(serviceRequests.createdAt)),
    db.select().from(appointments).orderBy(desc(appointments.createdAt)),
    db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt))
  ]);
  return { requests, appointments: appointmentRows, messages };
}
async function getOrCreateCreditWallet(userId) {
  const db = await getDb();
  if (!db) return { freeCredits: 0, paidCredits: 0 };
  const insertResult = await db.insert(creditWallets).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
  if (insertResult[0]?.affectedRows === 1) {
    await db.insert(creditTransactions).values({ userId, amount: trialCredits, type: "grant", reference: "free-trial" });
  }
  const rows = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
  return rows[0] ?? { freeCredits: 0, paidCredits: 0 };
}
async function getCreditTransactions(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditTransactions).where(eq(creditTransactions.userId, userId)).orderBy(desc(creditTransactions.createdAt));
}
function calculateCreditUsage(wallet, policy = {}) {
  const priority = policy.priority ?? resolveCreditPriority();
  const cost = policy.cost ?? resolveCreditCost();
  const buckets = priority === "paid-first" ? ["paidCredits", "freeCredits"] : ["freeCredits", "paidCredits"];
  const bucket = buckets.find((candidate) => wallet[candidate] >= cost);
  return bucket ? { success: true, bucket, cost } : { success: false, reason: "insufficient-credits" };
}
async function consumeCredit(userId, reference = "service-request") {
  const db = await getDb();
  if (!db) return { success: false, reason: "database-unavailable" };
  return db.transaction(async (tx) => {
    await tx.insert(creditWallets).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
    const wallet = (await tx.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1))[0];
    if (!wallet) return { success: false, reason: "insufficient-credits" };
    const usage = calculateCreditUsage(wallet);
    if (!usage.success) return usage;
    const field = usage.bucket === "freeCredits" ? creditWallets.freeCredits : creditWallets.paidCredits;
    const updated = await tx.update(creditWallets).set({ [usage.bucket]: sql`${field} - ${usage.cost}` }).where(and(eq(creditWallets.userId, userId), sql`${field} >= ${usage.cost}`));
    if (!updated[0]?.affectedRows) return { success: false, reason: "insufficient-credits" };
    await tx.insert(creditTransactions).values({ userId, amount: -usage.cost, type: "consume", reference });
    return { success: true, remainingFree: wallet.freeCredits - (usage.bucket === "freeCredits" ? usage.cost : 0), remainingPaid: wallet.paidCredits - (usage.bucket === "paidCredits" ? usage.cost : 0) };
  });
}
async function getOrCreateSubscription(userId) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  const result = await db.insert(subscriptions).values({ userId, planId: "trial", status: "trial" });
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return rows[0] ?? null;
}
async function updateSubscription(userId, planId, status) {
  const db = await getDb();
  if (!db) return null;
  return db.update(subscriptions).set({ planId, status, updatedAt: /* @__PURE__ */ new Date() }).where(eq(subscriptions.userId, userId));
}
async function registerDevice(userId, deviceId, platform, name) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(devices).values({ userId, deviceId, platform, name }).onDuplicateKeyUpdate({ set: { lastSyncAt: /* @__PURE__ */ new Date(), name } });
  return db.select().from(devices).where(and(eq(devices.userId, userId), eq(devices.deviceId, deviceId))).limit(1);
}
async function getDevices(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(devices).where(eq(devices.userId, userId)).orderBy(desc(devices.lastSyncAt));
}
async function enqueueSync(userId, deviceId, entityType, entityId, operation, payload) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(syncQueue).values({ userId, deviceId, entityType, entityId, operation, payload });
}
async function getPendingSyncs(userId, deviceId) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(syncQueue.userId, userId), eq(syncQueue.status, "pending")];
  if (deviceId) conditions.push(eq(syncQueue.deviceId, deviceId));
  return db.select().from(syncQueue).where(and(...conditions)).orderBy(desc(syncQueue.createdAt));
}
async function markSyncComplete(id) {
  const db = await getDb();
  if (!db) return null;
  return db.update(syncQueue).set({ status: "synced", syncedAt: /* @__PURE__ */ new Date() }).where(eq(syncQueue.id, id));
}
async function getCustomers(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customers).where(eq(customers.userId, userId)).orderBy(desc(customers.createdAt));
}
async function createCustomer(userId, input) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(customers).values({ userId, ...input, type: input.type ?? "individual" });
}
async function getSuppliers(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(suppliers).where(eq(suppliers.userId, userId)).orderBy(desc(suppliers.createdAt));
}
async function createSupplier(userId, input) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(suppliers).values({ userId, ...input });
}
async function getProducts(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(and(eq(products.userId, userId), eq(products.isActive, 1))).orderBy(desc(products.createdAt));
}
async function createProduct(userId, input) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(products).values({ userId, ...input });
}
async function adjustStock(userId, productId, quantity, type, reference) {
  const db = await getDb();
  if (!db) return null;
  return db.transaction(async (tx) => {
    const product = (await tx.select().from(products).where(and(eq(products.id, productId), eq(products.userId, userId))).limit(1))[0];
    if (!product) return null;
    const newQty = type === "out" ? product.stockQuantity - quantity : product.stockQuantity + quantity;
    await tx.update(products).set({ stockQuantity: Math.max(0, newQty) }).where(eq(products.id, productId));
    await tx.insert(inventoryTransactions).values({ userId, productId, quantity: type === "out" ? -quantity : quantity, type, reference });
    return { success: true, stockQuantity: Math.max(0, newQty) };
  });
}
async function getInventoryTransactions(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventoryTransactions).where(eq(inventoryTransactions.userId, userId)).orderBy(desc(inventoryTransactions.createdAt));
}
async function getInvoices(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.createdAt));
}
async function createInvoice(userId, input) {
  const db = await getDb();
  if (!db) return null;
  return db.transaction(async (tx) => {
    const subtotal = input.subtotal ?? 0;
    const discount = input.discount ?? 0;
    const tax = input.tax ?? 0;
    const total = input.total ?? subtotal - discount + tax;
    const result = await tx.insert(invoices).values({
      userId,
      invoiceNumber: input.invoiceNumber,
      type: input.type,
      customerId: input.customerId ?? null,
      supplierId: input.supplierId ?? null,
      status: input.status ?? "draft",
      subtotal,
      discount,
      tax,
      total,
      paidAmount: input.paidAmount ?? 0,
      notes: input.notes ?? null
    });
    const invoiceId = Number(result[0].insertId);
    if (input.items?.length) {
      for (const item of input.items) {
        await tx.insert(invoiceItems).values({ invoiceId, description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, total: item.quantity * item.unitPrice });
      }
    }
    return { id: invoiceId };
  });
}
async function getCustomerOrders(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customerOrders).where(eq(customerOrders.userId, userId)).orderBy(desc(customerOrders.createdAt));
}
async function createCustomerOrder(userId, input) {
  const db = await getDb();
  if (!db) return null;
  return db.transaction(async (tx) => {
    const total = input.total ?? (input.items?.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) ?? 0);
    const result = await tx.insert(customerOrders).values({
      userId,
      orderNumber: input.orderNumber,
      customerId: input.customerId ?? null,
      status: input.status ?? "new",
      total,
      notes: input.notes ?? null
    });
    const orderId = Number(result[0].insertId);
    if (input.items?.length) {
      for (const item of input.items) {
        await tx.insert(orderItems).values({ orderId, description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, total: item.quantity * item.unitPrice });
      }
    }
    return { id: orderId };
  });
}
async function getDistributionChannels(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(distributionChannels).where(and(eq(distributionChannels.userId, userId), eq(distributionChannels.isActive, 1))).orderBy(desc(distributionChannels.createdAt));
}
async function createDistributionChannel(userId, input) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(distributionChannels).values({ userId, ...input, type: input.type ?? "other" });
}
async function getDistributions(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(distributions).where(eq(distributions.userId, userId)).orderBy(desc(distributions.createdAt));
}
async function createDistribution(userId, input) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(distributions).values({ userId, ...input, status: "pending" });
}
async function getPayments(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt));
}
async function createPayment(userId, input) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(payments).values({ userId, ...input, method: input.method ?? "\u0646\u0642\u062F\u064A" });
}
async function getExpenses(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(expenses).where(eq(expenses.userId, userId)).orderBy(desc(expenses.createdAt));
}
async function createExpense(userId, input) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(expenses).values({ userId, ...input });
}
async function getCommerceDashboard(userId) {
  const db = await getDb();
  if (!db) return { customers: 0, suppliers: 0, products: 0, lowStock: 0, invoices: 0, orders: 0, revenue: 0, expenses: 0 };
  const [customerRows, supplierRows, productRows, invoiceRows, orderRows, paymentRows, expenseRows] = await Promise.all([
    db.select().from(customers).where(eq(customers.userId, userId)),
    db.select().from(suppliers).where(eq(suppliers.userId, userId)),
    db.select().from(products).where(eq(products.userId, userId)),
    db.select().from(invoices).where(eq(invoices.userId, userId)),
    db.select().from(customerOrders).where(eq(customerOrders.userId, userId)),
    db.select().from(payments).where(eq(payments.userId, userId)),
    db.select().from(expenses).where(eq(expenses.userId, userId))
  ]);
  return {
    customers: customerRows.length,
    suppliers: supplierRows.length,
    products: productRows.length,
    lowStock: productRows.filter((p) => p.stockQuantity <= p.minStock).length,
    invoices: invoiceRows.length,
    orders: orderRows.length,
    revenue: paymentRows.filter((p) => p.type === "receive").reduce((sum, p) => sum + p.amount, 0),
    totalExpenses: expenseRows.reduce((sum, e) => sum + e.amount, 0)
  };
}
async function getOrCreateOrganization(userId) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(organizations).where(eq(organizations.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  const result = await db.insert(organizations).values({ userId, name: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644", commercialName: "ALHUSAINIA", legalName: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644" });
  const orgId = Number(result[0].insertId);
  await seedDefaultChartOfAccounts(userId, orgId);
  return (await db.select().from(organizations).where(eq(organizations.userId, userId)).limit(1))[0] ?? null;
}
var DEFAULT_CHART = [
  { code: "1000", name: "\u0627\u0644\u0623\u0635\u0648\u0644", type: "asset", category: "other", parentId: null },
  { code: "1100", name: "\u0627\u0644\u0646\u0642\u062F\u064A\u0629 \u0648\u0627\u0644\u0628\u0646\u0648\u0643", type: "asset", category: "current", parentId: null },
  { code: "1101", name: "\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0631\u0626\u064A\u0633\u064A", type: "asset", category: "current", parentId: null },
  { code: "1102", name: "\u0627\u0644\u0628\u0646\u0648\u0643 - \u062D\u0633\u0627\u0628\u0627\u062A \u062C\u0627\u0631\u064A\u0629", type: "asset", category: "current", parentId: null },
  { code: "1200", name: "\u0627\u0644\u0645\u062F\u064A\u0646\u0648\u0646", type: "asset", category: "current", parentId: null },
  { code: "1201", name: "\u0639\u0645\u0644\u0627\u0621", type: "asset", category: "current", parentId: null },
  { code: "1202", name: "\u0623\u0648\u0631\u0627\u0642 \u0642\u0628\u0636", type: "asset", category: "current", parentId: null },
  { code: "1300", name: "\u0627\u0644\u0645\u062E\u0632\u0648\u0646", type: "asset", category: "current", parentId: null },
  { code: "1301", name: "\u0645\u062E\u0632\u0648\u0646 \u0628\u0636\u0627\u0639\u0629", type: "asset", category: "current", parentId: null },
  { code: "1400", name: "\u0627\u0644\u0623\u0635\u0648\u0644 \u0627\u0644\u062B\u0627\u0628\u062A\u0629", type: "asset", category: "fixed", parentId: null },
  { code: "1401", name: "\u0623\u0631\u0627\u0636\u064D \u0648\u0645\u0628\u0627\u0646\u064D", type: "asset", category: "fixed", parentId: null },
  { code: "1402", name: "\u0645\u0639\u062F\u0627\u062A \u0648\u0622\u0644\u0627\u062A", type: "asset", category: "fixed", parentId: null },
  { code: "1403", name: "\u0645\u0631\u0643\u0628\u0627\u062A", type: "asset", category: "fixed", parentId: null },
  { code: "1404", name: "\u0645\u062C\u0645\u0639 \u0625\u0647\u0644\u0627\u0643 \u0627\u0644\u0623\u0635\u0648\u0644 \u0627\u0644\u062B\u0627\u0628\u062A\u0629", type: "asset", category: "fixed", parentId: null },
  { code: "2000", name: "\u0627\u0644\u062E\u0635\u0648\u0645", type: "liability", category: "other", parentId: null },
  { code: "2100", name: "\u0627\u0644\u062F\u0627\u0626\u0646\u0648\u0646", type: "liability", category: "current_liability", parentId: null },
  { code: "2101", name: "\u0645\u0648\u0631\u062F\u0648\u0646", type: "liability", category: "current_liability", parentId: null },
  { code: "2102", name: "\u0623\u0648\u0631\u0627\u0642 \u062F\u0641\u0639", type: "liability", category: "current_liability", parentId: null },
  { code: "2200", name: "\u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A \u0645\u062A\u062F\u0627\u0648\u0644\u0629 \u0623\u062E\u0631\u0649", type: "liability", category: "current_liability", parentId: null },
  { code: "2201", name: "\u0631\u0648\u0627\u062A\u0628 \u0645\u0633\u062A\u062D\u0642\u0629", type: "liability", category: "current_liability", parentId: null },
  { code: "2202", name: "\u0636\u0631\u064A\u0628\u0629 \u0645\u0633\u062A\u062D\u0642\u0629", type: "liability", category: "current_liability", parentId: null },
  { code: "2300", name: "\u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A \u0637\u0648\u064A\u0644\u0629 \u0627\u0644\u0623\u062C\u0644", type: "liability", category: "long_term_liability", parentId: null },
  { code: "2301", name: "\u0642\u0631\u0648\u0636 \u0637\u0648\u064A\u0644\u0629 \u0627\u0644\u0623\u062C\u0644", type: "liability", category: "long_term_liability", parentId: null },
  { code: "3000", name: "\u062D\u0642\u0648\u0642 \u0627\u0644\u0645\u0644\u0643\u064A\u0629", type: "equity", category: "other", parentId: null },
  { code: "3100", name: "\u0631\u0623\u0633 \u0627\u0644\u0645\u0627\u0644", type: "equity", category: "capital", parentId: null },
  { code: "3101", name: "\u0631\u0623\u0633 \u0627\u0644\u0645\u0627\u0644 \u0627\u0644\u0645\u062F\u0641\u0648\u0639", type: "equity", category: "capital", parentId: null },
  { code: "3200", name: "\u0627\u0644\u0623\u0631\u0628\u0627\u062D \u0627\u0644\u0645\u062D\u062A\u062C\u0632\u0629", type: "equity", category: "retained_earnings", parentId: null },
  { code: "3201", name: "\u0623\u0631\u0628\u0627\u062D/\u062E\u0633\u0627\u0626\u0631 \u0645\u062A\u0631\u0627\u0643\u0645\u0629", type: "equity", category: "retained_earnings", parentId: null },
  { code: "4000", name: "\u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A", type: "revenue", category: "other", parentId: null },
  { code: "4100", name: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A", type: "revenue", category: "sales", parentId: null },
  { code: "4101", name: "\u0645\u0628\u064A\u0639\u0627\u062A \u0628\u0636\u0627\u0639\u0629", type: "revenue", category: "sales", parentId: null },
  { code: "4102", name: "\u0645\u0628\u064A\u0639\u0627\u062A \u062E\u062F\u0645\u0627\u062A", type: "revenue", category: "sales", parentId: null },
  { code: "4103", name: "\u0645\u0631\u062F\u0648\u062F\u0627\u062A \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A", type: "revenue", category: "sales", parentId: null },
  { code: "4200", name: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0623\u062E\u0631\u0649", type: "revenue", category: "other_income", parentId: null },
  { code: "4201", name: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0625\u064A\u062C\u0627\u0631", type: "revenue", category: "other_income", parentId: null },
  { code: "5000", name: "\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A", type: "expense", category: "other", parentId: null },
  { code: "5100", name: "\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A", type: "expense", category: "operating", parentId: null },
  { code: "5200", name: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u062A\u0634\u063A\u064A\u0644\u064A\u0629", type: "expense", category: "operating", parentId: null },
  { code: "5201", name: "\u0631\u0648\u0627\u062A\u0628 \u0648\u0623\u062C\u0648\u0631", type: "expense", category: "operating", parentId: null },
  { code: "5202", name: "\u0625\u064A\u062C\u0627\u0631", type: "expense", category: "operating", parentId: null },
  { code: "5203", name: "\u0645\u0631\u0627\u0641\u0642 (\u0643\u0647\u0631\u0628\u0627\u0621/\u0645\u0627\u0621)", type: "expense", category: "operating", parentId: null },
  { code: "5300", name: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0625\u062F\u0627\u0631\u064A\u0629 \u0648\u0639\u0627\u0645\u0629", type: "expense", category: "administrative", parentId: null },
  { code: "5301", name: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0645\u0643\u062A\u0628\u064A\u0629", type: "expense", category: "administrative", parentId: null },
  { code: "5302", name: "\u0627\u062A\u0635\u0627\u0644\u0627\u062A \u0648\u0625\u0646\u062A\u0631\u0646\u062A", type: "expense", category: "administrative", parentId: null },
  { code: "5303", name: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u062A\u0633\u0648\u064A\u0642 \u0648\u0625\u0639\u0644\u0627\u0646", type: "expense", category: "administrative", parentId: null },
  { code: "5400", name: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0645\u0627\u0644\u064A\u0629", type: "expense", category: "financial", parentId: null },
  { code: "5401", name: "\u0631\u0633\u0648\u0645 \u0628\u0646\u0643\u064A\u0629", type: "expense", category: "financial", parentId: null },
  { code: "5500", name: "\u0625\u0647\u0644\u0627\u0643 \u0627\u0644\u0623\u0635\u0648\u0644", type: "expense", category: "other", parentId: null }
];
async function seedDefaultChartOfAccounts(userId, organizationId) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.userId, userId), eq(chartOfAccounts.organizationId, organizationId))).limit(1);
  if (existing[0]) return;
  for (const account of DEFAULT_CHART) {
    await db.insert(chartOfAccounts).values({
      userId,
      organizationId,
      code: account.code,
      name: account.name,
      type: account.type,
      category: account.category,
      parentId: null
    });
  }
}
async function getChartOfAccounts(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chartOfAccounts).where(eq(chartOfAccounts.userId, userId)).orderBy(chartOfAccounts.code);
}
async function createAccount(userId, input) {
  const db = await getDb();
  if (!db) return null;
  const org = await getOrCreateOrganization(userId);
  return db.insert(chartOfAccounts).values({
    userId,
    organizationId: org?.id ?? 0,
    code: input.code,
    name: input.name,
    type: input.type,
    category: input.category ?? "other",
    parentId: input.parentId ?? null,
    openingBalance: input.openingBalance ?? 0
  });
}
async function getBranches(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(branches).where(eq(branches.userId, userId)).orderBy(desc(branches.createdAt));
}
async function createBranch(userId, input) {
  const db = await getDb();
  if (!db) return null;
  const org = await getOrCreateOrganization(userId);
  return db.insert(branches).values({ userId, organizationId: org?.id ?? 0, ...input });
}
async function getCurrencies(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(currencies).where(eq(currencies.userId, userId)).orderBy(currencies.code);
}
async function seedDefaultCurrencies(userId) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(currencies).where(eq(currencies.userId, userId)).limit(1);
  if (existing[0]) return;
  const defaults = [
    { code: "YER", name: "\u0631\u064A\u0627\u0644 \u064A\u0645\u0646\u064A", symbol: "\u0631.\u064A", exchangeRate: 1, isBase: 1 },
    { code: "SAR", name: "\u0631\u064A\u0627\u0644 \u0633\u0639\u0648\u062F\u064A", symbol: "\u0631.\u0633", exchangeRate: 130, isBase: 0 },
    { code: "USD", name: "\u062F\u0648\u0644\u0627\u0631 \u0623\u0645\u0631\u064A\u0643\u064A", symbol: "$", exchangeRate: 490, isBase: 0 }
  ];
  for (const c of defaults) await db.insert(currencies).values({ userId, ...c });
}
async function createCurrency(userId, input) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(currencies).values({ userId, ...input });
}
async function getUnitsOfMeasure(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(unitsOfMeasure).where(eq(unitsOfMeasure.userId, userId)).orderBy(desc(unitsOfMeasure.createdAt));
}
async function seedDefaultUnits(userId) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(unitsOfMeasure).where(eq(unitsOfMeasure.userId, userId)).limit(1);
  if (existing[0]) return;
  const defaults = ["\u0648\u062D\u062F\u0629", "\u0642\u0637\u0639\u0629", "\u0643\u062C\u0645", "\u0644\u062A\u0631", "\u0645\u062A\u0631", "\u0645\u062A\u0631 \u0645\u0631\u0628\u0639", "\u0645\u062A\u0631 \u0645\u0643\u0639\u0628", "\u0643\u0631\u062A\u0648\u0646\u0629", "\u0637\u0631\u062F", "\u0633\u0627\u0639\u0629", "\u062E\u062F\u0645\u0629"];
  for (const u of defaults) await db.insert(unitsOfMeasure).values({ userId, name: u, abbreviation: u });
}
async function createUnitOfMeasure(userId, input) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(unitsOfMeasure).values({ userId, ...input });
}
async function getEmployees(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(employees).where(eq(employees.userId, userId)).orderBy(desc(employees.createdAt));
}
async function createEmployee(userId, input) {
  const db = await getDb();
  if (!db) return null;
  const org = await getOrCreateOrganization(userId);
  return db.insert(employees).values({ userId, organizationId: org?.id ?? 0, ...input });
}
async function getJournalEntries(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(journalEntries).where(eq(journalEntries.userId, userId)).orderBy(desc(journalEntries.entryDate));
}
async function createJournalEntry(userId, input) {
  const db = await getDb();
  if (!db) return null;
  const debitTotal = input.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const creditTotal = input.lines.reduce((s, l) => s + (l.credit || 0), 0);
  if (debitTotal !== creditTotal) {
    throw new Error("\u0627\u0644\u0642\u064A\u0640\u062F \u063A\u064A\u0631 \u0645\u062A\u0648\u0627\u0632\u0646: \u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0645\u062F\u064A\u0646 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0633\u0627\u0648\u064A \u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u062F\u0627\u0626\u0646");
  }
  return db.transaction(async (tx) => {
    const org = await getOrCreateOrganization(userId);
    const result = await tx.insert(journalEntries).values({
      userId,
      organizationId: org?.id ?? 0,
      entryNumber: input.entryNumber,
      description: input.description ?? null,
      entryDate: input.entryDate ?? /* @__PURE__ */ new Date(),
      debitTotal,
      creditTotal,
      currencyCode: input.currencyCode ?? "YER",
      exchangeRate: input.exchangeRate ?? 1,
      status: "posted"
    });
    const entryId = Number(result[0].insertId);
    for (const line of input.lines) {
      await tx.insert(journalEntryLines).values({ entryId, accountId: line.accountId, debit: line.debit || 0, credit: line.credit || 0, description: line.description ?? null });
    }
    return { id: entryId, debitTotal, creditTotal };
  });
}
async function getDailyTransactions(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dailyTransactions).where(eq(dailyTransactions.userId, userId)).orderBy(desc(dailyTransactions.transactionDate));
}
async function createDailyTransaction(userId, input) {
  const db = await getDb();
  if (!db) return null;
  const org = await getOrCreateOrganization(userId);
  return db.insert(dailyTransactions).values({
    userId,
    organizationId: org?.id ?? 0,
    transactionNumber: input.transactionNumber,
    transactionType: input.transactionType,
    transactionDate: input.transactionDate ?? /* @__PURE__ */ new Date(),
    accountId: input.accountId ?? null,
    customerId: input.customerId ?? null,
    supplierId: input.supplierId ?? null,
    employeeId: input.employeeId ?? null,
    agentId: input.agentId ?? null,
    distributorId: input.distributorId ?? null,
    productId: input.productId ?? null,
    amount: input.amount ?? 0,
    currencyCode: input.currencyCode ?? "YER",
    exchangeRate: input.exchangeRate ?? 1,
    quantity: input.quantity ?? 0,
    unitId: input.unitId ?? null,
    description: input.description ?? null,
    status: input.status ?? "draft"
  });
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/routers.ts
import { z as z2 } from "zod";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/payments.ts
function resolveMode(value = process.env.PAYMENT_MODE) {
  return value === "stripe" || value === "manual" ? value : DEFAULT_SITE_CONFIG.payment.mode;
}
function createCheckoutRequest(planId) {
  const mode = resolveMode();
  const provider = process.env.PAYMENT_PROVIDER_LABEL || DEFAULT_SITE_CONFIG.payment.providerLabel;
  const successUrl = process.env.PAYMENT_SUCCESS_URL || DEFAULT_SITE_CONFIG.payment.successUrl;
  const cancelUrl = process.env.PAYMENT_CANCEL_URL || DEFAULT_SITE_CONFIG.payment.cancelUrl;
  if (mode === "disabled") return { status: "disabled", message: "\u0627\u0644\u062F\u0641\u0639 \u063A\u064A\u0631 \u0645\u0641\u0639\u0651\u0644 \u062D\u0627\u0644\u064A\u0627\u064B." };
  if (mode === "manual") return { status: "manual", provider, message: `\u0633\u064A\u062A\u0645 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0644\u0625\u062A\u0645\u0627\u0645 \u0627\u0644\u062F\u0641\u0639 \u0639\u0628\u0631 ${provider}.` };
  if (!process.env.STRIPE_SECRET_KEY) return { status: "unavailable", provider, message: "\u0645\u0641\u062A\u0627\u062D \u0645\u0632\u0648\u0651\u062F \u0627\u0644\u062F\u0641\u0639 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D \u0628\u0639\u062F." };
  return { status: "ready", provider, successUrl, cancelUrl, planId, message: "\u062A\u0645 \u062A\u062C\u0647\u064A\u0632 \u0637\u0644\u0628 \u0627\u0644\u062A\u0631\u0642\u064A\u0629\u060C \u0648\u0633\u064A\u064F\u0641\u062A\u062D \u0627\u0644\u062F\u0641\u0639 \u0639\u0646\u062F \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0645\u0648\u0635\u0644." };
}

// server/routers.ts
var personFields = { name: z2.string().min(2), phone: z2.string().min(7), email: z2.string().email().optional().or(z2.literal("")) };
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true };
    })
  }),
  content: publicProcedure.query(async () => {
    const content = await getPublicContent();
    return { ...content, properties: await getProperties() };
  }),
  credits: router({
    me: protectedProcedure.query(({ ctx }) => getOrCreateCreditWallet(ctx.user.id)),
    history: protectedProcedure.query(({ ctx }) => getCreditTransactions(ctx.user.id)),
    consume: protectedProcedure.input(z2.object({ reference: z2.string().max(160).optional() })).mutation(({ ctx, input }) => consumeCredit(ctx.user.id, input.reference)),
    checkout: protectedProcedure.input(z2.object({ planId: z2.string().min(1) })).mutation(({ input }) => createCheckoutRequest(input.planId))
  }),
  subscription: router({
    me: protectedProcedure.query(({ ctx }) => getOrCreateSubscription(ctx.user.id)),
    update: protectedProcedure.input(z2.object({ planId: z2.string().min(1), status: z2.enum(["active", "cancelled", "expired", "trial"]) })).mutation(({ ctx, input }) => updateSubscription(ctx.user.id, input.planId, input.status))
  }),
  sync: router({
    registerDevice: protectedProcedure.input(z2.object({ deviceId: z2.string().min(1), platform: z2.string().min(1), name: z2.string().optional() })).mutation(({ ctx, input }) => registerDevice(ctx.user.id, input.deviceId, input.platform, input.name)),
    devices: protectedProcedure.query(({ ctx }) => getDevices(ctx.user.id)),
    pending: protectedProcedure.input(z2.object({ deviceId: z2.string().optional() })).query(({ ctx, input }) => getPendingSyncs(ctx.user.id, input.deviceId)),
    enqueue: protectedProcedure.input(z2.object({ deviceId: z2.string().min(1), entityType: z2.string().min(1), entityId: z2.string().min(1), operation: z2.enum(["create", "update", "delete"]), payload: z2.any().optional() })).mutation(({ ctx, input }) => enqueueSync(ctx.user.id, input.deviceId, input.entityType, input.entityId, input.operation, input.payload)),
    complete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(({ input }) => markSyncComplete(input.id))
  }),
  commerce: router({
    dashboard: protectedProcedure.query(({ ctx }) => getCommerceDashboard(ctx.user.id)),
    customers: router({
      list: protectedProcedure.query(({ ctx }) => getCustomers(ctx.user.id)),
      create: protectedProcedure.input(z2.object({ name: z2.string().min(2), phone: z2.string().optional(), email: z2.string().email().optional().or(z2.literal("")), address: z2.string().optional(), type: z2.enum(["individual", "company", "government", "student"]).optional() })).mutation(({ ctx, input }) => createCustomer(ctx.user.id, input))
    }),
    suppliers: router({
      list: protectedProcedure.query(({ ctx }) => getSuppliers(ctx.user.id)),
      create: protectedProcedure.input(z2.object({ name: z2.string().min(2), phone: z2.string().optional(), email: z2.string().email().optional().or(z2.literal("")), address: z2.string().optional() })).mutation(({ ctx, input }) => createSupplier(ctx.user.id, input))
    }),
    products: router({
      list: protectedProcedure.query(({ ctx }) => getProducts(ctx.user.id)),
      create: protectedProcedure.input(z2.object({ name: z2.string().min(2), sku: z2.string().optional(), category: z2.string().optional(), unit: z2.string().optional(), costPrice: z2.number().optional(), sellingPrice: z2.number().optional(), stockQuantity: z2.number().optional(), minStock: z2.number().optional() })).mutation(({ ctx, input }) => createProduct(ctx.user.id, input)),
      adjustStock: protectedProcedure.input(z2.object({ productId: z2.number(), quantity: z2.number().int().positive(), type: z2.enum(["in", "out", "adjustment"]), reference: z2.string().optional() })).mutation(({ ctx, input }) => adjustStock(ctx.user.id, input.productId, input.quantity, input.type, input.reference)),
      transactions: protectedProcedure.query(({ ctx }) => getInventoryTransactions(ctx.user.id))
    }),
    invoices: router({
      list: protectedProcedure.query(({ ctx }) => getInvoices(ctx.user.id)),
      create: protectedProcedure.input(z2.object({ invoiceNumber: z2.string().min(1), type: z2.enum(["sales", "purchase"]), customerId: z2.number().optional(), supplierId: z2.number().optional(), status: z2.enum(["draft", "issued", "paid", "partial", "overdue", "cancelled"]).optional(), subtotal: z2.number().optional(), discount: z2.number().optional(), tax: z2.number().optional(), total: z2.number().optional(), paidAmount: z2.number().optional(), notes: z2.string().optional(), items: z2.array(z2.object({ description: z2.string().min(1), quantity: z2.number(), unitPrice: z2.number() })).optional() })).mutation(({ ctx, input }) => createInvoice(ctx.user.id, input))
    }),
    orders: router({
      list: protectedProcedure.query(({ ctx }) => getCustomerOrders(ctx.user.id)),
      create: protectedProcedure.input(z2.object({ orderNumber: z2.string().min(1), customerId: z2.number().optional(), status: z2.enum(["new", "processing", "shipped", "delivered", "cancelled"]).optional(), total: z2.number().optional(), notes: z2.string().optional(), items: z2.array(z2.object({ description: z2.string().min(1), quantity: z2.number(), unitPrice: z2.number() })).optional() })).mutation(({ ctx, input }) => createCustomerOrder(ctx.user.id, input))
    }),
    distribution: router({
      channels: protectedProcedure.query(({ ctx }) => getDistributionChannels(ctx.user.id)),
      createChannel: protectedProcedure.input(z2.object({ name: z2.string().min(2), type: z2.enum(["retail", "wholesale", "online", "agent", "other"]).optional(), location: z2.string().optional() })).mutation(({ ctx, input }) => createDistributionChannel(ctx.user.id, input)),
      list: protectedProcedure.query(({ ctx }) => getDistributions(ctx.user.id)),
      create: protectedProcedure.input(z2.object({ channelId: z2.number(), productId: z2.number(), quantity: z2.number().int().positive() })).mutation(({ ctx, input }) => createDistribution(ctx.user.id, input))
    }),
    payments: router({
      list: protectedProcedure.query(({ ctx }) => getPayments(ctx.user.id)),
      create: protectedProcedure.input(z2.object({ amount: z2.number().positive(), type: z2.enum(["receive", "pay"]), method: z2.string().optional(), reference: z2.string().optional(), invoiceId: z2.number().optional(), customerId: z2.number().optional(), supplierId: z2.number().optional() })).mutation(({ ctx, input }) => createPayment(ctx.user.id, input))
    }),
    expenses: router({
      list: protectedProcedure.query(({ ctx }) => getExpenses(ctx.user.id)),
      create: protectedProcedure.input(z2.object({ amount: z2.number().positive(), category: z2.string().min(2), description: z2.string().optional() })).mutation(({ ctx, input }) => createExpense(ctx.user.id, input))
    })
  }),
  accounting: router({
    organization: protectedProcedure.query(({ ctx }) => getOrCreateOrganization(ctx.user.id)),
    accounts: router({
      list: protectedProcedure.query(({ ctx }) => getChartOfAccounts(ctx.user.id)),
      create: protectedProcedure.input(z2.object({ code: z2.string().min(1), name: z2.string().min(2), type: z2.enum(["asset", "liability", "equity", "revenue", "expense"]), category: z2.string().optional(), parentId: z2.number().optional(), openingBalance: z2.number().optional() })).mutation(({ ctx, input }) => createAccount(ctx.user.id, input))
    }),
    branches: router({
      list: protectedProcedure.query(({ ctx }) => getBranches(ctx.user.id)),
      create: protectedProcedure.input(z2.object({ name: z2.string().min(2), code: z2.string().optional(), address: z2.string().optional(), phone: z2.string().optional() })).mutation(({ ctx, input }) => createBranch(ctx.user.id, input))
    }),
    currencies: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        await seedDefaultCurrencies(ctx.user.id);
        return getCurrencies(ctx.user.id);
      }),
      create: protectedProcedure.input(z2.object({ code: z2.string().min(1), name: z2.string().min(2), symbol: z2.string().optional(), exchangeRate: z2.number().optional(), isBase: z2.number().optional() })).mutation(({ ctx, input }) => createCurrency(ctx.user.id, input))
    }),
    units: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        await seedDefaultUnits(ctx.user.id);
        return getUnitsOfMeasure(ctx.user.id);
      }),
      create: protectedProcedure.input(z2.object({ name: z2.string().min(1), abbreviation: z2.string().optional() })).mutation(({ ctx, input }) => createUnitOfMeasure(ctx.user.id, input))
    }),
    employees: router({
      list: protectedProcedure.query(({ ctx }) => getEmployees(ctx.user.id)),
      create: protectedProcedure.input(z2.object({ name: z2.string().min(2), role: z2.string().optional(), phone: z2.string().optional(), email: z2.string().email().optional().or(z2.literal("")), salary: z2.number().optional() })).mutation(({ ctx, input }) => createEmployee(ctx.user.id, input))
    }),
    journal: router({
      list: protectedProcedure.query(({ ctx }) => getJournalEntries(ctx.user.id)),
      create: protectedProcedure.input(z2.object({ entryNumber: z2.string().min(1), description: z2.string().optional(), entryDate: z2.date().optional(), currencyCode: z2.string().optional(), exchangeRate: z2.number().optional(), lines: z2.array(z2.object({ accountId: z2.number(), debit: z2.number().default(0), credit: z2.number().default(0), description: z2.string().optional() })).min(2) })).mutation(({ ctx, input }) => createJournalEntry(ctx.user.id, input))
    }),
    transactions: router({
      list: protectedProcedure.query(({ ctx }) => getDailyTransactions(ctx.user.id)),
      create: protectedProcedure.input(z2.object({ transactionNumber: z2.string().min(1), transactionType: z2.enum(["voucher", "invoice", "request", "order", "receipt", "payment", "transfer", "adjustment", "other"]), transactionDate: z2.date().optional(), accountId: z2.number().optional(), customerId: z2.number().optional(), supplierId: z2.number().optional(), employeeId: z2.number().optional(), agentId: z2.number().optional(), distributorId: z2.number().optional(), productId: z2.number().optional(), amount: z2.number().optional(), currencyCode: z2.string().optional(), exchangeRate: z2.number().optional(), quantity: z2.number().optional(), unitId: z2.number().optional(), description: z2.string().optional(), status: z2.string().optional() })).mutation(({ ctx, input }) => createDailyTransaction(ctx.user.id, input))
    })
  }),
  requests: router({
    service: publicProcedure.input(z2.object({ ...personFields, serviceType: z2.string().min(2), details: z2.string().min(5) })).mutation(({ input }) => createServiceRequest(input)),
    appointment: publicProcedure.input(z2.object({ ...personFields, specialty: z2.string().min(2), appointmentDate: z2.string().min(4), appointmentTime: z2.string().min(2), notes: z2.string().optional() })).mutation(({ input }) => createAppointment(input)),
    contact: publicProcedure.input(z2.object({ ...personFields, message: z2.string().min(5) })).mutation(({ input }) => createContactMessage(input))
  }),
  admin: router({
    inbox: adminProcedure.query(() => getAdminInbox()),
    content: adminProcedure.query(() => getAdminContent()),
    updateRequestStatus: adminProcedure.input(z2.object({ id: z2.number(), status: z2.enum(["new", "contacted", "closed"]) })).mutation(({ input }) => updateServiceRequestStatus(input.id, input.status)),
    updateAppointmentStatus: adminProcedure.input(z2.object({ id: z2.number(), status: z2.enum(["new", "confirmed", "completed", "cancelled"]) })).mutation(({ input }) => updateAppointmentStatus(input.id, input.status)),
    dashboard: protectedProcedure.query(({ ctx }) => ({ isAdmin: ctx.user.role === "admin" })),
    createService: adminProcedure.input(z2.object({ category: z2.enum(["engineering", "realEstate", "consulting"]), title: z2.string().min(2), description: z2.string().min(5), icon: z2.string().default("sparkles") })).mutation(({ input }) => createService(input)),
    createProject: adminProcedure.input(z2.object({ title: z2.string().min(2), category: z2.string().min(2), location: z2.string().optional(), description: z2.string().min(5), imageUrl: z2.string().optional() })).mutation(({ input }) => createProject(input))
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid } from "nanoid";
import path from "path";
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    configFile: path.resolve(import.meta.dirname, "../../vite.config.ts"),
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const candidates = [
    process.env.PUBLIC_DIR,
    process.env.NODE_ENV === "development" ? path.resolve(import.meta.dirname, "../..", "dist", "public") : path.resolve(import.meta.dirname, "public"),
    path.resolve(process.cwd(), "dist", "public")
  ].filter(Boolean);
  const distPath = candidates.find((p) => fs.existsSync(p));
  if (!distPath) {
    console.error(
      `Could not find the build directory, tried: ${candidates.join(", ")} \u2014 make sure to build the client first`
    );
  } else {
    app2.use(express.static(distPath));
    app2.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
function createApp() {
  const app2 = express2();
  app2.use(express2.json({ limit: "50mb" }));
  app2.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app2);
  registerOAuthRoutes(app2);
  app2.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  return app2;
}
async function startServer() {
  const app2 = createApp();
  const server = createServer(app2);
  if (process.env.NODE_ENV === "development") {
    await setupVite(app2, server);
  } else {
    serveStatic(app2);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
var isEntrypoint = (() => {
  try {
    return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();
if (isEntrypoint) {
  startServer().catch(console.error);
}

// api/index.ts
var app = createApp();
serveStatic(app);
var index_default = app;
export {
  index_default as default
};
