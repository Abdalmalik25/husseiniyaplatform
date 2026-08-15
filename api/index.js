// server/_core/index.ts
import "dotenv/config";
import { createServer } from "http";
import net from "net";

// server/_core/app.ts
import "dotenv/config";
import express from "express";
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
import { eq } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

// drizzle/schema.ts
import { pgTable, serial, varchar, text, timestamp, decimal, boolean, integer, pgEnum, index } from "drizzle-orm/pg-core";
var userRoleEnum = pgEnum("role", ["admin", "auditor", "accountant", "owner", "user"]);
var accountTypeEnum = pgEnum("account_type", ["asset", "liability", "equity", "revenue", "expense"]);
var transactionTypeEnum = pgEnum("transaction_type", ["debit", "credit"]);
var lifecycleStatusEnum = pgEnum("lifecycle_status", ["saved", "approved", "sent", "posted", "completed"]);
var subscriptionStatusEnum = pgEnum("subscription_status", ["trial", "active", "expired"]);
var users = pgTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  ownerUserId: serial("ownerUserId").notNull(),
  currency: varchar("currency", { length: 20 }).default("YER").notNull(),
  country: varchar("country", { length: 100 }).default("\u0627\u0644\u064A\u0645\u0646").notNull(),
  subscriptionPlan: varchar("subscriptionPlan", { length: 50 }).default("standard").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  city: varchar("city", { length: 100 }),
  isMain: boolean("isMain").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var userBranchPermissions = pgTable("user_branch_permissions", {
  id: serial("id").primaryKey(),
  userId: serial("userId").notNull(),
  branchId: serial("branchId").notNull(),
  canView: boolean("canView").default(true).notNull(),
  canInsert: boolean("canInsert").default(true).notNull(),
  canApprove: boolean("canApprove").default(false).notNull(),
  canPost: boolean("canPost").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var accounts = pgTable("accounts", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var transactions = pgTable("transactions", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (t2) => [
  index("idx_transactions_account").on(t2.accountId),
  index("idx_transactions_date").on(t2.transactionDate),
  index("idx_transactions_branch").on(t2.branchId),
  index("idx_transactions_reference").on(t2.referenceType, t2.referenceId)
]);
var openingBalances = pgTable("opening_balances", {
  id: serial("id").primaryKey(),
  accountId: serial("accountId").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").default("debit").notNull(),
  notes: text("notes"),
  periodName: varchar("periodName", { length: 50 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  periodName: varchar("periodName", { length: 50 }).notNull(),
  targetRevenue: decimal("targetRevenue", { precision: 15, scale: 2 }).notNull(),
  targetExpense: decimal("targetExpense", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  institutionName: varchar("institutionName", { length: 255 }).default("\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644").notNull(),
  currency: varchar("currency", { length: 50 }).default("\u0631\u064A\u0627\u0644 \u064A\u0645\u0646\u064A (YER)").notNull(),
  accountingPeriod: varchar("accountingPeriod", { length: 50 }).default("2026").notNull(),
  managerName: varchar("managerName", { length: 255 }).default("\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u0629").notNull(),
  notes: text("notes"),
  subscriptionStatus: subscriptionStatusEnum("subscriptionStatus").default("active").notNull(),
  trialEndsAt: timestamp("trialEndsAt"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: serial("userId"),
  userName: varchar("userName", { length: 255 }),
  action: varchar("action", { length: 255 }).notNull(),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var productTypeEnum = pgEnum("product_type", ["goods", "service"]);
var inventoryMovementTypeEnum = pgEnum("inventory_movement_type", ["in", "out", "transfer", "adjustment"]);
var products = pgTable("products", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  nameAr: varchar("nameAr", { length: 255 }),
  type: productTypeEnum("type").default("goods").notNull(),
  category: varchar("category", { length: 100 }),
  unit: varchar("unit", { length: 50 }).default("\u0642\u0637\u0639\u0629").notNull(),
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (t2) => [
  index("idx_products_category").on(t2.category),
  index("idx_products_supplier").on(t2.supplierId)
]);
var warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  productId: serial("productId").notNull(),
  warehouseId: serial("warehouseId"),
  type: inventoryMovementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  referenceId: serial("referenceId"),
  referenceType: varchar("referenceType", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var customers = pgTable("customers", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var suppliers = pgTable("suppliers", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var salesInvoiceStatusEnum = pgEnum("sales_invoice_status", ["draft", "confirmed", "paid", "partial", "cancelled"]);
var purchaseInvoiceStatusEnum = pgEnum("purchase_invoice_status", ["draft", "confirmed", "paid", "partial", "cancelled"]);
var orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]);
var paymentMethodEnum = pgEnum("payment_method", ["cash", "card", "transfer", "credit", "online"]);
var salesInvoices = pgTable("sales_invoices", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var salesInvoiceItems = pgTable("sales_invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: serial("invoiceId").notNull(),
  productId: serial("productId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 15, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (t2) => [
  index("idx_sales_items_invoice").on(t2.invoiceId)
]);
var purchaseInvoices = pgTable("purchase_invoices", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var purchaseInvoiceItems = pgTable("purchase_invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: serial("invoiceId").notNull(),
  productId: serial("productId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 15, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (t2) => [
  index("idx_purchase_items_invoice").on(t2.invoiceId)
]);
var orders = pgTable("orders", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: serial("orderId").notNull(),
  productId: serial("productId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (t2) => [
  index("idx_order_items_order").on(t2.orderId)
]);
var paymentSourceEnum = pgEnum("payment_source", ["sales", "purchases"]);
var payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  source: paymentSourceEnum("source").notNull(),
  invoiceId: serial("invoiceId").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("paymentMethod").default("cash"),
  paymentDate: timestamp("paymentDate").defaultNow().notNull(),
  notes: text("notes"),
  userId: serial("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (t2) => [
  index("idx_payments_invoice").on(t2.source, t2.invoiceId)
]);

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

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
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
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
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
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
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

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
var RETRY_MAX_RETRIES = 4;
var RETRY_BASE_DELAY_MS = 500;
var RETRY_MAX_DELAY_MS = 3e4;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var parseRetryAfter = (value) => {
  if (!value) return void 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(value);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - Date.now());
};
var computeBackoffDelay = (attempt, retryAfterMs) => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};
var fetchWithBackoff = async (url, init) => {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }
      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM request failed after exhausting retries");
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens
  } = params;
  const payload = {
    messages: messages.map(normalizeMessage)
  };
  if (model) {
    payload.model = model;
  }
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }
  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetchWithBackoff(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

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

// server/routers.ts
import { eq as eq2, desc, sql, asc, and, or, gte, lte, ilike, inArray, ne } from "drizzle-orm";
import { z as z2 } from "zod";
var _seeded = false;
async function seedDefaultAccountsIfNeeded() {
  if (_seeded) return;
  const db = await getDb();
  if (!db) return;
  try {
    const defaultAccounts = [
      { code: "1010", name: "\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0631\u0626\u064A\u0633\u064A (\u0627\u0644\u062E\u0632\u064A\u0646\u0629)", type: "asset", category: "\u0627\u0644\u0623\u0635\u0648\u0644 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629", description: "\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0646\u0642\u062F\u064A\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A \u0644\u0644\u0645\u0624\u0633\u0633\u0629" },
      { code: "1020", name: "\u0627\u0644\u0628\u0646\u0643 \u0627\u0644\u062A\u062C\u0627\u0631\u064A / \u0627\u0644\u0625\u0633\u0644\u0627\u0645\u064A", type: "asset", category: "\u0627\u0644\u0623\u0635\u0648\u0644 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629", description: "\u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0628\u0646\u0643\u064A \u0627\u0644\u062C\u0627\u0631\u064A \u0644\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629" },
      { code: "1030", name: "\u062D\u0633\u0627\u0628 \u0627\u0644\u0639\u064F\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0645\u062F\u064A\u0646\u0648\u0646", type: "asset", category: "\u0627\u0644\u0623\u0635\u0648\u0644 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629", description: "\u0645\u0633\u062A\u062D\u0642\u0627\u062A \u0627\u0644\u0645\u0624\u0633\u0633\u0629 \u0644\u062F\u0649 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0645\u0642\u0627\u0628\u0644 \u0627\u0644\u062E\u062F\u0645\u0627\u062A" },
      { code: "2010", name: "\u0627\u0644\u062F\u0627\u0626\u0646\u0648\u0646 \u0648\u0627\u0644\u0645\u0648\u0631\u062F\u0648\u0646", type: "liability", category: "\u0627\u0644\u062E\u0635\u0648\u0645 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629", description: "\u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0633\u0633\u0629 \u062A\u062C\u0627\u0647 \u0645\u0632\u0648\u062F\u064A \u0627\u0644\u062E\u062F\u0645\u0629 \u0648\u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646" },
      { code: "3010", name: "\u0631\u0623\u0633 \u0627\u0644\u0645\u0627\u0644", type: "equity", category: "\u062D\u0642\u0648\u0642 \u0627\u0644\u0645\u0644\u0643\u064A\u0629", description: "\u0631\u0623\u0633 \u0645\u0627\u0644 \u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644" },
      { code: "4010", name: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644 \u0648\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A", type: "revenue", category: "\u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A\u0629", description: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u062A\u062E\u0644\u064A\u0635 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0648\u0627\u0644\u0627\u0633\u062A\u0634\u0627\u0631\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0627\u0644\u064A\u0629" },
      { code: "4020", name: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0645\u062A\u0646\u0648\u0639\u0629", type: "revenue", category: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0623\u062E\u0631\u0649", description: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u062A\u0634\u063A\u064A\u0644\u064A\u0629 \u0623\u062E\u0631\u0649" },
      { code: "5010", name: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u0631\u0648\u0627\u062A\u0628 \u0648\u0627\u0644\u0623\u062C\u0648\u0631", type: "expense", category: "\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A\u0629", description: "\u0631\u0648\u0627\u062A\u0628 \u0648\u0645\u0633\u062A\u062D\u0642\u0627\u062A \u0645\u0648\u0638\u0641\u064A \u0627\u0644\u0645\u0624\u0633\u0633\u0629" },
      { code: "5020", name: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u0625\u064A\u062C\u0627\u0631 \u0648\u0627\u0644\u062E\u062F\u0645\u0627\u062A (\u0643\u0647\u0631\u0628\u0627\u0621\u060C \u0645\u0627\u0621\u060C \u0625\u0646\u062A\u0631\u0646\u062A)", type: "expense", category: "\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A\u0629", description: "\u0625\u064A\u062C\u0627\u0631 \u0627\u0644\u0645\u0642\u0631 \u0648\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629" },
      { code: "5030", name: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u062D\u0643\u0648\u0645\u064A\u0629 \u0648\u0631\u0633\u0648\u0645 \u062A\u062E\u0644\u064A\u0635", type: "expense", category: "\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A\u0629", description: "\u0627\u0644\u0631\u0633\u0648\u0645 \u0627\u0644\u062D\u0643\u0648\u0645\u064A\u0629 \u0627\u0644\u0645\u062A\u0639\u0644\u0642\u0629 \u0628\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A" },
      { code: "5040", name: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0645\u062A\u0646\u0648\u0639\u0629 \u0648\u0639\u0645\u0648\u0645\u064A\u0629", type: "expense", category: "\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629", description: "\u0636\u064A\u0627\u0641\u0629\u060C \u0623\u062F\u0648\u0627\u062A \u0645\u0643\u062A\u0628\u064A\u0629\u060C \u0648\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0646\u062B\u0631\u064A\u0629" },
      { code: "5050", name: "\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0628\u0636\u0627\u0639\u0629 \u0627\u0644\u0645\u0634\u062A\u0631\u0627\u0629 (\u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629)", type: "expense", category: "\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A", description: "\u062A\u0643\u0644\u0641\u0629 \u0634\u0631\u0627\u0621 \u0627\u0644\u0628\u0636\u0627\u0626\u0639 \u0648\u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0627\u0644\u0645\u0628\u0627\u0639" }
    ];
    for (const acc of defaultAccounts) {
      await db.insert(accounts).values(acc).onConflictDoUpdate({ target: accounts.code, set: { name: acc.name, type: acc.type, category: acc.category, description: acc.description } });
    }
    const existingSettings = await db.select().from(settings).limit(1);
    if (existingSettings.length === 0) {
      await db.insert(settings).values({
        institutionName: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644",
        currency: "\u0631\u064A\u0627\u0644 \u064A\u0645\u0646\u064A (YER)",
        accountingPeriod: "\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 2026",
        managerName: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u0629",
        notes: "\u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A \u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0644\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644 - \u0645\u0631\u0646 \u0648\u062F\u0642\u064A\u0642."
      });
    }
    _seeded = true;
  } catch {
  }
}
async function postInvoiceGlEntries(tx, opts) {
  const findAccount = async (code) => {
    const rows = await tx.select().from(accounts).where(eq2(accounts.code, code)).limit(1);
    return rows[0];
  };
  const entry = (accountId, type, amount, narration) => tx.insert(transactions).values({
    accountId,
    branchId: opts.branchId || null,
    amount: amount.toFixed(2),
    type,
    transactionDate: /* @__PURE__ */ new Date(),
    narration,
    lifecycleStatus: "posted",
    referenceType: opts.kind === "sale" ? "sale" : "purchase",
    referenceId: opts.invoiceId,
    userId: opts.userId || null
  });
  const unpaid = Math.max(0, opts.total - opts.paidAmount);
  const paid = Math.min(opts.paidAmount, opts.total);
  if (opts.kind === "sale") {
    const revenueAcc = await findAccount("4010");
    if (!revenueAcc) return;
    if (paid > 0) {
      const cashAcc = await findAccount("1010");
      if (cashAcc) await entry(cashAcc.id, "debit", paid, `\u062A\u062D\u0635\u064A\u0644 \u0646\u0642\u062F\u064A \u2014 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0628\u064A\u0639\u0627\u062A ${opts.invoiceNumber}`);
    }
    if (unpaid > 0) {
      const receivablesAcc = await findAccount("1030");
      if (receivablesAcc) await entry(receivablesAcc.id, "debit", unpaid, `\u0630\u0645\u0645 \u0639\u0645\u0644\u0627\u0621 \u2014 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0628\u064A\u0639\u0627\u062A ${opts.invoiceNumber}`);
    }
    await entry(revenueAcc.id, "credit", opts.total, `\u0625\u064A\u0631\u0627\u062F \u0645\u0628\u064A\u0639\u0627\u062A \u2014 \u0641\u0627\u062A\u0648\u0631\u0629 ${opts.invoiceNumber}`);
  } else {
    const costAcc = await findAccount("5050");
    if (!costAcc) return;
    await entry(costAcc.id, "debit", opts.total, `\u062A\u0643\u0644\u0641\u0629 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u2014 \u0641\u0627\u062A\u0648\u0631\u0629 ${opts.invoiceNumber}`);
    if (paid > 0) {
      const cashAcc = await findAccount("1010");
      if (cashAcc) await entry(cashAcc.id, "credit", paid, `\u062F\u0641\u0639 \u0646\u0642\u062F\u064A \u2014 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0634\u062A\u0631\u064A\u0627\u062A ${opts.invoiceNumber}`);
    }
    if (unpaid > 0) {
      const payablesAcc = await findAccount("2010");
      if (payablesAcc) await entry(payablesAcc.id, "credit", unpaid, `\u0630\u0645\u0645 \u0645\u0648\u0631\u062F\u064A\u0646 \u2014 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0634\u062A\u0631\u064A\u0627\u062A ${opts.invoiceNumber}`);
    }
  }
}
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
    updateProfile: protectedProcedure.input(z2.object({
      name: z2.string().min(1),
      email: z2.string().email().optional().or(z2.literal("")),
      themePreference: z2.string(),
      emailNotifications: z2.boolean(),
      whatsappNotifications: z2.boolean(),
      compactMode: z2.boolean()
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(users).set({
        name: input.name,
        email: input.email ? input.email : null,
        themePreference: input.themePreference,
        emailNotifications: input.emailNotifications,
        whatsappNotifications: input.whatsappNotifications,
        compactMode: input.compactMode
      }).where(eq2(users.id, ctx.user.id));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        userName: input.name,
        action: "\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A",
        details: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062A\u0641\u0636\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0631\u0636 \u0648\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A \u0628\u0648\u0627\u0633\u0637\u0629 ${input.name}`
      });
      return { success: true };
    }),
    getActivityLogs: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const logs = await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(25);
      return logs;
    })
  }),
  // Accounting & Settings Router
  accounting: router({
    // Get settings & subscription status
    getSettings: publicProcedure.query(async () => {
      await seedDefaultAccountsIfNeeded();
      const db = await getDb();
      if (!db) return { institutionName: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644", currency: "\u0631\u064A\u0627\u0644 \u064A\u0645\u0646\u064A (YER)", accountingPeriod: "\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 2026", managerName: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u0629", subscriptionStatus: "active" };
      const res = await db.select().from(settings).limit(1);
      return res[0] || { institutionName: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644", currency: "\u0631\u064A\u0627\u0644 \u064A\u0645\u0646\u064A (YER)", accountingPeriod: "\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 2026", managerName: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u0629", subscriptionStatus: "active" };
    }),
    // Upgrade or manage subscription (simulate payment & unlock advanced features)
    updateSubscription: protectedProcedure.input(z2.object({
      status: z2.enum(["trial", "active", "expired"])
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(settings).limit(1);
      if (existing.length > 0) {
        await db.update(settings).set({ subscriptionStatus: input.status }).where(eq2(settings.id, existing[0].id));
      }
      return { success: true };
    }),
    // Update settings (Permanent save)
    updateSettings: protectedProcedure.input(z2.object({
      institutionName: z2.string().min(1),
      currency: z2.string().min(1),
      accountingPeriod: z2.string().min(1),
      managerName: z2.string().optional(),
      taxNumber: z2.string().optional(),
      notes: z2.string().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(settings).limit(1);
      if (existing.length > 0) {
        await db.update(settings).set(input).where(eq2(settings.id, existing[0].id));
      } else {
        await db.insert(settings).values(input);
      }
      return { success: true };
    }),
    // Get Chart of Accounts
    getAccounts: publicProcedure.query(async () => {
      await seedDefaultAccountsIfNeeded();
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(accounts).orderBy(asc(accounts.code));
    }),
    // Add custom account
    addAccount: protectedProcedure.input(z2.object({
      code: z2.string().min(1),
      name: z2.string().min(1),
      type: z2.enum(["asset", "liability", "equity", "revenue", "expense"]),
      category: z2.string().optional(),
      description: z2.string().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(accounts).values({
        ...input,
        isCustom: true
      });
      return { success: true };
    }),
    // Update account (Name, Code, Type, Status)
    updateAccount: protectedProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().min(1),
      code: z2.string().min(1),
      type: z2.enum(["asset", "liability", "equity", "revenue", "expense"]),
      isActive: z2.boolean(),
      parentAccountId: z2.number().nullable().optional()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(accounts).set({
        name: input.name,
        code: input.code,
        type: input.type,
        isActive: input.isActive,
        ...input.parentAccountId !== void 0 ? { parentAccountId: input.parentAccountId } : {}
      }).where(eq2(accounts.id, input.id));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: `\u062A\u0639\u062F\u064A\u0644 \u0623\u0648 \u0625\u0639\u0627\u062F\u0629 \u062A\u0631\u062A\u064A\u0628 \u0627\u0644\u062D\u0633\u0627\u0628: ${input.name} (${input.code})`,
        details: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062D\u0633\u0627\u0628 \u0648\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u062A\u0628\u0639\u064A\u0629 \u0627\u0644\u0634\u062C\u0631\u064A\u0629 \u0628\u0646\u062C\u0627\u062D`
      });
      return { success: true };
    }),
    // Move account in Tree (Drag and Drop / Reparenting)
    moveAccount: protectedProcedure.input(z2.object({
      accountId: z2.number(),
      newParentAccountId: z2.number().nullable()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.accountId === input.newParentAccountId) {
        throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062C\u0639\u0644 \u0627\u0644\u062D\u0633\u0627\u0628 \u062A\u0627\u0628\u0639\u0627\u064B \u0644\u0646\u0641\u0633\u0647");
      }
      await db.update(accounts).set({
        parentAccountId: input.newParentAccountId
      }).where(eq2(accounts.id, input.accountId));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: `\u0625\u0639\u0627\u062F\u0629 \u062A\u0631\u062A\u064A\u0628 \u0627\u0644\u062F\u0644\u064A\u0644 (\u0633\u062D\u0628 \u0648\u0625\u0641\u0644\u0627\u062A)`,
        details: `\u062A\u0645 \u0646\u0642\u0644 \u0627\u0644\u062D\u0633\u0627\u0628 \u0631\u0642\u0645 ${input.accountId} \u0644\u064A\u0643\u0648\u0646 \u062A\u062D\u062A \u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0631\u0626\u064A\u0633\u064A \u0631\u0642\u0645 ${input.newParentAccountId || "\u062C\u0630\u0631 \u0631\u0626\u064A\u0633\u064A"}`
      });
      return { success: true };
    }),
    // Get Transactions with pagination / filters
    getTransactions: publicProcedure.input(z2.object({
      search: z2.string().optional(),
      accountId: z2.number().optional(),
      startDate: z2.string().optional(),
      endDate: z2.string().optional(),
      limit: z2.number().min(1).max(500).default(100),
      offset: z2.number().min(0).default(0),
      includeReversed: z2.boolean().optional()
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [];
      if (input?.search) {
        conditions.push(or(
          ilike(transactions.narration, `%${input.search}%`),
          ilike(transactions.notes, `%${input.search}%`),
          ilike(accounts.name, `%${input.search}%`),
          ilike(accounts.code, `%${input.search}%`)
        ));
      }
      if (input?.accountId) {
        conditions.push(eq2(transactions.accountId, input.accountId));
      }
      if (!input?.includeReversed) {
        conditions.push(eq2(transactions.isReversed, false));
      }
      if (input?.startDate) {
        conditions.push(gte(transactions.transactionDate, new Date(input.startDate)));
      }
      if (input?.endDate) {
        conditions.push(lte(transactions.transactionDate, new Date(input.endDate)));
      }
      const whereClause = conditions.length > 0 ? and(...conditions) : void 0;
      const list = await db.select({
        id: transactions.id,
        accountId: transactions.accountId,
        accountName: accounts.name,
        accountCode: accounts.code,
        accountType: accounts.type,
        amount: transactions.amount,
        type: transactions.type,
        transactionDate: transactions.transactionDate,
        narration: transactions.narration,
        notes: transactions.notes,
        lifecycleStatus: transactions.lifecycleStatus,
        isReversed: transactions.isReversed,
        reversalReason: transactions.reversalReason,
        referenceType: transactions.referenceType,
        referenceId: transactions.referenceId,
        branchId: transactions.branchId,
        createdAt: transactions.createdAt
      }).from(transactions).leftJoin(accounts, eq2(transactions.accountId, accounts.id)).where(whereClause).orderBy(desc(transactions.transactionDate), desc(transactions.id)).limit(input?.limit ?? 100).offset(input?.offset ?? 0);
      return list;
    }),
    // Add Transaction
    addTransaction: protectedProcedure.input(z2.object({
      accountId: z2.number(),
      amount: z2.string().refine((v) => {
        const n = parseFloat(v);
        return !isNaN(n) && n > 0 && n < 1e9;
      }, "\u0627\u0644\u0645\u0628\u0644\u063A \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064B \u0645\u0648\u062C\u0628\u0627\u064B \u0648\u0623\u0642\u0644 \u0645\u0646 \u0645\u0644\u064A\u0627\u0631"),
      type: z2.enum(["debit", "credit"]),
      transactionDate: z2.string().refine((v) => !isNaN(Date.parse(v)), "\u062A\u0627\u0631\u064A\u062E \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"),
      narration: z2.string().max(500).optional(),
      notes: z2.string().optional(),
      lifecycleStatus: z2.enum(["saved", "approved", "sent"]).default("saved")
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const account = await db.select().from(accounts).where(eq2(accounts.id, input.accountId)).limit(1);
      if (account.length === 0) throw new Error("\u0627\u0644\u062D\u0633\u0627\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
      await db.insert(transactions).values({
        accountId: input.accountId,
        amount: input.amount,
        type: input.type,
        transactionDate: new Date(input.transactionDate),
        narration: input.narration || null,
        notes: input.notes || null,
        lifecycleStatus: input.lifecycleStatus,
        isReversed: false,
        userId: ctx.user.id
      });
      return { success: true };
    }),
    // Batch Add Transactions with Lifecycle Status (saved, approved, sent)
    addBatchTransactions: protectedProcedure.input(z2.object({
      lifecycleStatus: z2.enum(["saved", "approved", "sent"]).default("saved"),
      rows: z2.array(z2.object({
        accountId: z2.number(),
        amount: z2.string(),
        type: z2.enum(["debit", "credit"]).default("debit"),
        transactionDate: z2.string(),
        narration: z2.string().optional(),
        notes: z2.string().optional()
      }))
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      let count = 0;
      for (const item of input.rows) {
        if (!item.amount || parseFloat(item.amount) <= 0) continue;
        await db.insert(transactions).values({
          accountId: item.accountId,
          amount: item.amount,
          type: item.type || "debit",
          transactionDate: new Date(item.transactionDate),
          narration: item.narration || null,
          notes: item.notes || null,
          lifecycleStatus: input.lifecycleStatus,
          isReversed: false,
          userId: ctx.user.id
        });
        count++;
      }
      return { success: true, count };
    }),
    // Update Transaction Lifecycle (Approve, Send, Post/Migrate, Reverse)
    updateTransactionLifecycle: protectedProcedure.input(z2.object({
      id: z2.number(),
      lifecycleStatus: z2.enum(["saved", "approved", "sent", "posted", "completed"]),
      reversalReason: z2.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(transactions).where(eq2(transactions.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("\u0627\u0644\u062D\u0631\u0643\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
      if (existing[0]?.lifecycleStatus === "posted" && input.lifecycleStatus !== "posted") {
        throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0639\u062F\u064A\u0644 \u0623\u0648 \u0625\u0644\u063A\u0627\u0621 \u062D\u0631\u0643\u0629 \u0645\u0631\u062D\u0644\u0629 \u0646\u0647\u0627\u0626\u064A\u0627\u064B. \u0627\u0644\u062A\u0639\u062F\u064A\u0644 \u064A\u062A\u0645 \u0639\u0628\u0631 \u062D\u0631\u0643\u0629 \u0639\u0643\u0633\u064A\u0629 \u0645\u0633\u062A\u0642\u0644\u0629.");
      }
      await db.update(transactions).set({
        lifecycleStatus: input.lifecycleStatus,
        ...input.reversalReason ? { reversalReason: input.reversalReason, isReversed: true } : {}
      }).where(eq2(transactions.id, input.id));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `\u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u062D\u0631\u0643\u0629 #${input.id} \u0625\u0644\u0649: ${input.lifecycleStatus}`,
        details: input.reversalReason ? `\u0633\u0628\u0628 \u0627\u0644\u0639\u0643\u0633: ${input.reversalReason}` : "\u062A\u063A\u064A\u064A\u0631 \u062D\u0627\u0644\u0629 \u062F\u0648\u0631\u0629 \u0627\u0644\u062D\u0631\u0643\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629"
      });
      return { success: true };
    }),
    // Update Transaction (Only allowed if lifecycleStatus === 'saved')
    updateTransaction: protectedProcedure.input(z2.object({
      id: z2.number(),
      amount: z2.string(),
      narration: z2.string().optional(),
      notes: z2.string().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(transactions).where(eq2(transactions.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("\u0627\u0644\u062D\u0631\u0643\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
      if (existing[0]?.lifecycleStatus !== "saved") {
        throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u062D\u0631\u0643\u0629 \u0644\u0623\u0646\u0647\u0627 \u0645\u0639\u062A\u0645\u062F\u0629 \u0623\u0648 \u0645\u0631\u0633\u0644\u0629 \u0648\u0645\u0624\u0645\u0646\u0629 \u062A\u0645\u0627\u0645\u0627\u064B");
      }
      await db.update(transactions).set({
        amount: input.amount,
        narration: input.narration || null,
        notes: input.notes || null
      }).where(eq2(transactions.id, input.id));
      return { success: true };
    }),
    // Delete Transaction (only if status is 'saved')
    deleteTransaction: protectedProcedure.input(z2.object({
      id: z2.number()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(transactions).where(eq2(transactions.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("\u0627\u0644\u062D\u0631\u0643\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
      if (existing[0].lifecycleStatus !== "saved") {
        throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u062D\u0631\u0643\u0629 \u0645\u0639\u062A\u0645\u062F\u0629 \u0623\u0648 \u0645\u0631\u0633\u0644\u0629 \u2014 \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0639\u0643\u0633\u064A");
      }
      await db.delete(transactions).where(eq2(transactions.id, input.id));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `\u062D\u0630\u0641 \u062D\u0631\u0643\u0629 \u0645\u0627\u0644\u064A\u0629 #${input.id}`,
        details: `\u0627\u0644\u062D\u0633\u0627\u0628: ${existing[0].accountId} \u2014 \u0627\u0644\u0645\u0628\u0644\u063A: ${existing[0].amount}`
      });
      return { success: true };
    }),
    // Smart Suggestions Engine: recommends accounts & standard amounts based on history & operation type
    getSmartSuggestions: publicProcedure.input(z2.object({
      query: z2.string().optional(),
      operationType: z2.string().optional()
      // e.g. "إيراد", "مصروف", "سداد", "عميل"
    })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { suggestedAccounts: [], recentNarrations: [], insights: [] };
      const allAccounts = await db.select().from(accounts);
      const recentTx = await db.select({
        narration: transactions.narration,
        accountId: transactions.accountId,
        amount: transactions.amount,
        accountName: accounts.name
      }).from(transactions).leftJoin(accounts, eq2(transactions.accountId, accounts.id)).orderBy(desc(transactions.id)).limit(20);
      let matchedAccounts = allAccounts;
      if (input.operationType) {
        const typeKeyword = input.operationType.toLowerCase();
        if (typeKeyword.includes("\u0625\u064A\u0631\u0627\u062F") || typeKeyword.includes("\u062A\u062D\u0635\u064A\u0644")) {
          matchedAccounts = allAccounts.filter((a) => a.type === "revenue" || a.type === "asset");
        } else if (typeKeyword.includes("\u0645\u0635\u0631\u0648\u0641") || typeKeyword.includes("\u062F\u0641\u0639") || typeKeyword.includes("\u0633\u062F\u0627\u062F")) {
          matchedAccounts = allAccounts.filter((a) => a.type === "expense" || a.type === "liability");
        }
      }
      const recentNarrations = Array.from(new Set(recentTx.map((t2) => t2.narration).filter(Boolean)));
      const insights = [
        "\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A: \u064A\u0648\u0635\u0649 \u0628\u0645\u0631\u0627\u062C\u0639\u0629 \u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0628\u0627\u0646\u062A\u0638\u0627\u0645 \u0644\u0636\u0645\u0627\u0646 \u062A\u062D\u0635\u064A\u0644 \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0641\u064A \u0645\u0648\u0627\u0642\u064A\u062A\u0647\u0627 \u0628\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629.",
        "\u0627\u0644\u0631\u0642\u0627\u0628\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629: \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0630\u0627\u062A \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E \u0627\u0644\u0633\u0627\u0628\u0642\u0629 \u062A\u062A\u0637\u0644\u0628 \u062A\u062F\u0648\u064A\u0646 \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0645\u0628\u0631\u0631\u0629 \u0641\u064A \u0639\u0645\u0648\u062F \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A.",
        "\u0627\u0644\u0643\u0641\u0627\u0621\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A\u0629: \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u062F\u0648\u0631\u064A\u0629 (\u0645\u062B\u0644 \u0627\u0644\u0625\u064A\u062C\u0627\u0631 \u0648\u0627\u0644\u0631\u0648\u0627\u062A\u0628) \u064A\u0633\u0627\u0639\u062F \u0641\u064A \u0627\u0633\u062A\u0642\u0631\u0627\u0631 \u0627\u0644\u062A\u062F\u0641\u0642\u0627\u062A \u0627\u0644\u0646\u0642\u062F\u064A\u0629."
      ];
      return {
        suggestedAccounts: matchedAccounts.slice(0, 8),
        recentNarrations: recentNarrations.slice(0, 5),
        insights
      };
    }),
    // Budgets & Targets
    getBudgets: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(budgets).orderBy(desc(budgets.id));
    }),
    saveBudget: protectedProcedure.input(z2.object({
      periodName: z2.string(),
      targetRevenue: z2.string(),
      targetExpense: z2.string(),
      notes: z2.string().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(budgets).values(input);
      return { success: true };
    }),
    // Financial Summary & Dashboard Stats
    getDashboardSummary: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { totalRevenue: 0, totalExpense: 0, totalAssets: 0, netIncome: 0, recentTransactions: [] };
      const txList = await db.select({
        id: transactions.id,
        amount: transactions.amount,
        type: transactions.type,
        accountType: accounts.type,
        accountName: accounts.name,
        transactionDate: transactions.transactionDate,
        narration: transactions.narration,
        lifecycleStatus: transactions.lifecycleStatus,
        isReversed: transactions.isReversed
      }).from(transactions).leftJoin(accounts, eq2(transactions.accountId, accounts.id)).where(eq2(transactions.isReversed, false)).orderBy(desc(transactions.transactionDate), desc(transactions.id));
      let totalRevenue = 0;
      let totalExpense = 0;
      let totalAssets = 0;
      for (const tx of txList) {
        const amt = parseFloat(tx.amount || "0");
        if (tx.accountType === "revenue") totalRevenue += amt;
        if (tx.accountType === "expense") totalExpense += amt;
        if (tx.accountType === "asset") {
          if (tx.type === "debit") totalAssets += amt;
          else totalAssets -= amt;
        }
      }
      const netIncome = totalRevenue - totalExpense;
      return {
        totalRevenue,
        totalExpense,
        totalAssets,
        netIncome,
        recentTransactions: txList.slice(0, 10)
      };
    }),
    getMonthlyAnalytics: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { dailyData: [], summary: { currentMonthRevenues: 0, currentMonthExpenses: 0, peakDay: "-" } };
      const now = /* @__PURE__ */ new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const startOfMonth = new Date(currentYear, currentMonth, 1).getTime();
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).getTime();
      const allTx = await db.select({
        amount: transactions.amount,
        transactionDate: transactions.transactionDate,
        accountType: accounts.type,
        lifecycleStatus: transactions.lifecycleStatus
      }).from(transactions).leftJoin(accounts, eq2(transactions.accountId, accounts.id)).where(eq2(transactions.isReversed, false));
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const dailyMap = {};
      for (let d = 1; d <= daysInMonth; d++) {
        const dObj = new Date(currentYear, currentMonth, d);
        dailyMap[d] = {
          day: d,
          dateStr: dObj.toLocaleDateString("en-GB"),
          revenues: 0,
          expenses: 0
        };
      }
      let currentMonthRevenues = 0;
      let currentMonthExpenses = 0;
      let maxDayVal = -1;
      let peakDay = "-";
      for (const tx of allTx) {
        if (tx.lifecycleStatus !== "approved" && tx.lifecycleStatus !== "sent") continue;
        if (!tx.transactionDate) continue;
        const txTime = new Date(tx.transactionDate).getTime();
        if (txTime >= startOfMonth && txTime <= endOfMonth) {
          const dNum = new Date(tx.transactionDate).getDate();
          const val = parseFloat(tx.amount || "0");
          if (dailyMap[dNum]) {
            if (tx.accountType === "revenue") {
              dailyMap[dNum].revenues += val;
              currentMonthRevenues += val;
            } else if (tx.accountType === "expense") {
              dailyMap[dNum].expenses += val;
              currentMonthExpenses += val;
            }
          }
        }
      }
      const dailyData = Object.values(dailyMap);
      for (const item of dailyData) {
        const net2 = item.revenues - item.expenses;
        if (net2 > maxDayVal) {
          maxDayVal = net2;
          peakDay = item.dateStr;
        }
      }
      return {
        dailyData,
        summary: {
          currentMonthRevenues,
          currentMonthExpenses,
          netIncome: currentMonthRevenues - currentMonthExpenses,
          peakDay
        }
      };
    }),
    // Opening Balances management for new periods
    getOpeningBalances: protectedProcedure.input(z2.object({
      periodName: z2.string().optional()
    })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const period = input.periodName || "\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 2026";
      return await db.select().from(openingBalances).where(eq2(openingBalances.periodName, period));
    }),
    saveOpeningBalances: protectedProcedure.input(z2.object({
      periodName: z2.string(),
      balances: z2.array(z2.object({
        accountId: z2.number(),
        amount: z2.string(),
        type: z2.enum(["debit", "credit"]),
        notes: z2.string().optional()
      }))
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      for (const item of input.balances) {
        const existing = await db.select().from(openingBalances).where(
          and(eq2(openingBalances.accountId, item.accountId), eq2(openingBalances.periodName, input.periodName))
        ).limit(1);
        if (existing.length > 0) {
          await db.update(openingBalances).set({
            amount: item.amount,
            type: item.type,
            notes: item.notes || null
          }).where(eq2(openingBalances.id, existing[0].id));
        } else {
          await db.insert(openingBalances).values({
            accountId: item.accountId,
            periodName: input.periodName,
            amount: item.amount,
            type: item.type,
            notes: item.notes || null
          });
        }
      }
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0627\u0641\u062A\u062A\u0627\u062D\u064A\u0629 \u0644\u0644\u0641\u062A\u0631\u0629: ${input.periodName}`,
        details: `\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0627\u0641\u062A\u062A\u0627\u062D\u064A\u0629 \u0644\u0639\u062F\u062F ${input.balances.length} \u062D\u0633\u0627\u0628`
      });
      return { success: true };
    }),
    // Chartered Auditor & Financial Analyst Review
    runAuditorReview: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { status: "OK", score: 100, warnings: [], recommendations: [] };
      const allAccounts = await db.select().from(accounts);
      const allTransactions = await db.select().from(transactions).where(eq2(transactions.lifecycleStatus, "approved"));
      let totalDebits = 0;
      let totalCredits = 0;
      let assetTotal = 0;
      let liabilityTotal = 0;
      let equityTotal = 0;
      const acctMap = new Map(allAccounts.map((a) => [a.id, a]));
      for (const tx of allTransactions) {
        const val = parseFloat(tx.amount || "0");
        const acc = acctMap.get(tx.accountId);
        if (!acc) continue;
        if (tx.type === "debit") totalDebits += val;
        else totalCredits += val;
        if (acc.type === "asset") assetTotal += tx.type === "debit" ? val : -val;
        if (acc.type === "liability") liabilityTotal += tx.type === "credit" ? val : -val;
        if (acc.type === "equity") equityTotal += tx.type === "credit" ? val : -val;
      }
      const warnings = [];
      const recommendations = [];
      let score = 95;
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        warnings.push("\u062A\u062D\u0630\u064A\u0631 \u0645\u062D\u0627\u0633\u0628\u064A: \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0623\u0637\u0631\u0627\u0641 \u0627\u0644\u0645\u062F\u064A\u0646 \u0648\u0627\u0644\u062F\u0627\u0626\u0646 \u0641\u064A \u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \u063A\u064A\u0631 \u0645\u062A\u0637\u0627\u0628\u0642 \u062A\u0645\u0627\u0645\u0627\u064B.");
        score -= 20;
      } else {
        recommendations.push("\u062A\u0648\u0627\u0632\u0646 \u0627\u0644\u0642\u064A\u0648\u062F \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A\u0629 \u0633\u0644\u064A\u0645 \u0648\u0645\u0639\u062A\u0645\u062F \u0648\u0641\u0642 \u0627\u0644\u0645\u0639\u0627\u064A\u064A\u0631 \u0627\u0644\u0645\u0632\u062F\u0648\u062C\u0629.");
      }
      if (assetTotal < liabilityTotal) {
        warnings.push("\u062A\u0646\u0628\u064A\u0647 \u0627\u0644\u0645\u0631\u0627\u062C\u0639 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A: \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062E\u0635\u0648\u0645 \u064A\u062A\u062C\u0627\u0648\u0632 \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0623\u0635\u0648\u0644\u060C \u0645\u0645\u0627 \u064A\u0634\u064A\u0631 \u0644\u0645\u062E\u0627\u0637\u0631 \u0631\u0623\u0633 \u0645\u0627\u0644 \u0639\u0627\u0645\u0644.");
        score -= 15;
      } else {
        recommendations.push("\u0646\u0633\u0628\u0629 \u0627\u0644\u0623\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u062E\u0635\u0648\u0645 \u0636\u0645\u0646 \u0627\u0644\u062D\u062F\u0648\u062F \u0627\u0644\u0622\u0645\u0646\u0629 \u0644\u062A\u063A\u0637\u064A\u0629 \u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A.");
      }
      recommendations.push("\u064A\u0648\u0635\u0649 \u0628\u0625\u062C\u0631\u0627\u0621 \u0645\u0637\u0627\u0628\u0642\u0629 \u0634\u0647\u0631\u064A\u0629 \u0644\u0644\u062E\u0632\u064A\u0646\u0629 \u0648\u0627\u0644\u0628\u0646\u0643 \u0644\u0636\u0645\u0627\u0646 \u0639\u062F\u0645 \u0648\u062C\u0648\u062F \u0641\u0631\u0648\u0642\u0627\u062A \u0646\u0642\u062F\u064A\u0629.");
      recommendations.push("\u062A\u0645 \u0627\u0639\u062A\u0645\u0627\u062F \u0633\u062C\u0644 \u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0628\u0646\u062C\u0627\u062D \u0648\u062A\u0623\u0645\u064A\u0646 \u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0636\u062F \u0623\u064A \u062A\u0639\u062F\u064A\u0644 \u063A\u064A\u0631 \u0645\u0628\u0631\u0631.");
      return {
        status: warnings.length > 0 ? "\u062A\u062A\u0637\u0644\u0628 \u0645\u0631\u0627\u062C\u0639\u0629" : "\u0645\u0633\u062A\u0648\u0641\u064A\u0629 \u0648\u0645\u0639\u064A\u0627\u0631\u064A\u0629",
        score,
        warnings,
        recommendations,
        totals: {
          debits: totalDebits,
          credits: totalCredits,
          assets: assetTotal,
          liabilities: liabilityTotal
        }
      };
    }),
    // Smart Document & Image Parser with AI for Merchant Auditing
    smartParseDocumentOrImage: protectedProcedure.input(z2.object({
      fileUrl: z2.string().optional(),
      rawText: z2.string().optional()
    })).mutation(async ({ input }) => {
      const allAccounts = await (await getDb())?.select().from(accounts) || [];
      const prompt = `\u0623\u0646\u062A \u0645\u062D\u0627\u0633\u0628 \u0642\u0627\u0646\u0648\u0646\u064A \u0648\u0645\u0631\u0627\u062C\u0639 \u0645\u0627\u0644\u064A \u062E\u0628\u064A\u0631. \u0642\u0645 \u0628\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0646\u0635 \u0623\u0648 \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0627\u0644\u0645\u0631\u0641\u0642 \u0628\u062F\u0642\u0629 \u0645\u062A\u0646\u0627\u0647\u064A\u0629 \u0648\u0627\u0633\u062A\u062E\u0631\u062C \u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0623\u0648 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0627\u0641\u062A\u062A\u0627\u062D\u064A\u0629 \u0628\u062F\u0642\u0629 \u0639\u0627\u0644\u064A\u0629. 
\u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u062A\u0627\u062D\u0629 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u062D\u0627\u0644\u064A\u0627\u064B \u0647\u064A:
${allAccounts.map((a) => `- \u0643\u0648\u062F ${a.code}: ${a.name} (\u0646\u0648\u0639 ${a.type})`).join("\n")}

\u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u062F\u062E\u0644 \u0623\u0648 \u0627\u0644\u0645\u0633\u062A\u062E\u0631\u062C:
${input.rawText || input.fileUrl || "\u0644\u0627 \u064A\u0648\u062C\u062F \u0646\u0635"}

\u0642\u0645 \u0628\u0625\u0631\u062C\u0627\u0639 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0628\u0635\u064A\u063A\u0629 JSON \u062D\u0635\u0631\u0627\u064B \u062A\u062A\u0636\u0645\u0646 \u0645\u0635\u0641\u0648\u0641\u0629 items \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649:
- accountCode (\u0643\u0648\u062F \u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0637\u0627\u0628\u0642 \u0628\u062F\u0642\u0629)
- amount (\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0631\u0642\u0645\u064A\u0629)
- type (debit \u0623\u0648 credit)
- narration (\u0648\u0635\u0641 \u0627\u0644\u062D\u0631\u0643\u0629 \u0623\u0648 \u0628\u064A\u0627\u0646\u0647\u0627)`;
      try {
        const response = await invokeLLM({
          messages: [{ role: "user", content: prompt }],
          outputSchema: {
            name: "parsed_financial_entries",
            schema: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      accountCode: { type: "string" },
                      amount: { type: "string" },
                      type: { type: "string" },
                      narration: { type: "string" }
                    },
                    required: ["accountCode", "amount", "type"]
                  }
                }
              },
              required: ["items"]
            }
          }
        });
        const contentVal = response.choices[0]?.message?.content;
        const contentStr = typeof contentVal === "string" ? contentVal : JSON.stringify(contentVal || {});
        const parsed = JSON.parse(contentStr);
        const items = Array.isArray(parsed?.items) ? parsed.items : [];
        if (items.length === 0) {
          return { success: false, message: "\u062A\u0639\u0630\u0631 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0628\u0646\u0648\u062F \u0645\u0627\u0644\u064A\u0629 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u0646\u062F", items: [] };
        }
        return { success: true, items };
      } catch (e) {
        console.warn("[smartParse] Parsing failed:", e);
        return {
          success: false,
          message: "\u062A\u0639\u0630\u0631 \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u2014 \u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u064A\u062F\u0648\u064A\u0627\u064B",
          items: []
        };
      }
    }),
    // AuraLedger Multi-Tenant & Branch Management
    getTenantsAndBranches: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { tenants: [], branches: [] };
      const allTenants = await db.select().from(tenants);
      const allBranches = await db.select().from(branches);
      if (allTenants.length === 0) {
        await db.insert(tenants).values({
          name: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644",
          code: "ALH-HQ",
          ownerUserId: ctx.user.id,
          currency: "YER",
          country: "\u0627\u0644\u064A\u0645\u0646",
          subscriptionPlan: "standard"
        });
        const createdT = await db.select().from(tenants).limit(1);
        if (createdT.length > 0) {
          await db.insert(branches).values({
            tenantId: createdT[0].id,
            name: "\u0627\u0644\u0641\u0631\u0639 \u0627\u0644\u0631\u0626\u064A\u0633\u064A",
            code: "HQ-01",
            city: "\u0635\u0646\u0639\u0627\u0621",
            isMain: true
          });
        }
      }
      return {
        tenants: await db.select().from(tenants),
        branches: await db.select().from(branches)
      };
    }),
    createBranch: protectedProcedure.input(z2.object({
      tenantId: z2.number(),
      name: z2.string(),
      code: z2.string(),
      city: z2.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(branches).values({
        tenantId: input.tenantId,
        name: input.name,
        code: input.code,
        city: input.city || null,
        isMain: false
      });
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `\u0625\u0636\u0627\u0641\u0629 \u0641\u0631\u0639 \u062C\u062F\u064A\u062F: ${input.name} (${input.code})`,
        details: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0641\u0631\u0639 \u062A\u062D\u062A \u0627\u0644\u0645\u0624\u0633\u0633\u0629 \u0631\u0642\u0645 ${input.tenantId}`
      });
      return { success: true };
    }),
    // Custom role & branch permissions management
    getUserPermissions: protectedProcedure.input(z2.object({
      userId: z2.number()
    })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(userBranchPermissions).where(eq2(userBranchPermissions.userId, input.userId));
    }),
    saveUserPermission: protectedProcedure.input(z2.object({
      userId: z2.number(),
      branchId: z2.number(),
      canView: z2.boolean(),
      canInsert: z2.boolean(),
      canApprove: z2.boolean(),
      canPost: z2.boolean()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(userBranchPermissions).where(
        and(eq2(userBranchPermissions.userId, input.userId), eq2(userBranchPermissions.branchId, input.branchId))
      );
      if (existing.length > 0) {
        await db.update(userBranchPermissions).set({
          canView: input.canView,
          canInsert: input.canInsert,
          canApprove: input.canApprove,
          canPost: input.canPost
        }).where(eq2(userBranchPermissions.id, existing[0].id));
      } else {
        await db.insert(userBranchPermissions).values({
          userId: input.userId,
          branchId: input.branchId,
          canView: input.canView,
          canInsert: input.canInsert,
          canApprove: input.canApprove,
          canPost: input.canPost
        });
      }
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `\u062A\u062D\u062F\u064A\u062B \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0631\u0642\u0645 ${input.userId} \u0644\u0644\u0641\u0631\u0639 ${input.branchId}`,
        details: `\u0639\u0631\u0636: ${input.canView}, \u0625\u062F\u062E\u0627\u0644: ${input.canInsert}, \u0627\u0639\u062A\u0645\u0627\u062F: ${input.canApprove}, \u062A\u0631\u062D\u064A\u0644: ${input.canPost}`
      });
      return { success: true };
    }),
    // Branch Performance Comparison Analytics
    getBranchPerformanceComparison: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { comparison: [] };
      const allBranches = await db.select().from(branches);
      if (allBranches.length === 0) return { comparison: [] };
      const mainBranchId = allBranches.find((b) => b.isMain)?.id || allBranches[0].id;
      const txRows = await db.select({
        id: transactions.id,
        amount: transactions.amount,
        type: transactions.type,
        branchId: transactions.branchId,
        accountType: accounts.type
      }).from(transactions).leftJoin(accounts, eq2(transactions.accountId, accounts.id)).where(eq2(transactions.lifecycleStatus, "approved"));
      const branchStats = /* @__PURE__ */ new Map();
      for (const b of allBranches) {
        branchStats.set(b.id, { revenue: 0, expenses: 0, count: 0 });
      }
      for (const tx of txRows) {
        const amt = parseFloat(tx.amount || "0");
        const bid = tx.branchId ?? mainBranchId;
        const stats = branchStats.get(bid);
        if (!stats) continue;
        stats.count++;
        if (tx.accountType === "revenue") {
          stats.revenue += tx.type === "credit" ? amt : -amt;
        } else if (tx.accountType === "expense") {
          stats.expenses += tx.type === "debit" ? amt : -amt;
        }
      }
      const comparison = allBranches.map((b) => {
        const stats = branchStats.get(b.id) || { revenue: 0, expenses: 0, count: 0 };
        return {
          id: b.id,
          name: b.name,
          code: b.code,
          city: b.city || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
          isMain: b.isMain,
          revenue: stats.revenue,
          expenses: stats.expenses,
          netProfit: stats.revenue - stats.expenses,
          transactionsCount: stats.count,
          complianceScore: 90
        };
      });
      return { comparison };
    }),
    // AI Financial Advisor & Deep Recommendations
    getAiFinancialAdvisorAnalysis: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { analysis: "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631\u0629 \u062D\u0627\u0644\u064A\u0627\u064B", status: "\u062E\u0637\u0623", timestamp: (/* @__PURE__ */ new Date()).toISOString() };
      const allTx = await db.select().from(transactions).where(eq2(transactions.lifecycleStatus, "approved"));
      const allAccts = await db.select().from(accounts);
      const prompt = `\u0623\u0646\u062A \u0645\u0633\u0627\u0639\u062F \u0645\u0627\u0644\u064A \u0630\u0643\u064A \u0648\u062E\u0628\u064A\u0631 \u0645\u062D\u0627\u0633\u0628\u064A \u0645\u0639\u062A\u0645\u062F \u0644\u0646\u0638\u0627\u0645 AuraLedger. \u0642\u0645 \u0628\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0648\u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u0648\u062A\u0642\u062F\u064A\u0645:
1. \u062A\u0642\u064A\u064A\u0645 \u062A\u0646\u0641\u064A\u0630\u064A \u0644\u0644\u0623\u062F\u0627\u0621 \u0627\u0644\u0645\u0627\u0644\u064A \u0627\u0644\u0639\u0627\u0645.
2. 3 \u062A\u0648\u0635\u064A\u0627\u062A \u0630\u0643\u064A\u0629 \u0648\u0639\u0645\u064A\u0642\u0629 \u0648\u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062A\u0646\u0641\u064A\u0630 \u0644\u062A\u062D\u0633\u064A\u0646 \u0627\u0644\u062A\u062F\u0641\u0642\u0627\u062A \u0627\u0644\u0646\u0642\u062F\u064A\u0629 \u0648\u062E\u0641\u0636 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A.
3. \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0643\u0641\u0627\u0621\u0629 \u0648\u0627\u0644\u0633\u064A\u0648\u0644\u0629.

\u0623\u062C\u0628 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0628\u0623\u0633\u0644\u0648\u0628 \u0645\u0647\u0646\u064A \u0648\u0627\u062D\u062A\u0631\u0627\u0641\u064A.`;
      try {
        const response = await invokeLLM({
          messages: [{ role: "user", content: prompt }]
        });
        const content = response.choices[0]?.message?.content || "\u0627\u0644\u0623\u062F\u0627\u0621 \u0627\u0644\u0645\u0627\u0644\u064A \u0645\u0633\u062A\u0642\u0631 \u0645\u0639 \u0641\u0631\u0635\u0629 \u0644\u062A\u062D\u0633\u064A\u0646 \u062A\u062D\u0635\u064A\u0644 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0648\u0627\u0644\u0645\u062F\u064A\u0646\u0629.";
        return {
          analysis: typeof content === "string" ? content : JSON.stringify(content),
          status: "\u0645\u0643\u062A\u0645\u0644 \u0628\u062F\u0642\u0629 \u0639\u0627\u0644\u064A\u0629",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      } catch (e) {
        return {
          analysis: "\u064A\u0642\u062A\u0631\u062D \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0645\u0627\u0644\u064A \u0632\u064A\u0627\u062F\u0629 \u0646\u0633\u0628\u0629 \u0627\u0644\u0633\u064A\u0648\u0644\u0629 \u0627\u0644\u0646\u0642\u062F\u064A\u0629 \u0641\u064A \u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0631\u0626\u064A\u0633\u064A \u0628\u0645\u0642\u062F\u0627\u0631 15% \u0648\u0645\u0631\u0627\u0642\u0628\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A\u0629 \u0644\u0644\u0631\u0648\u0627\u062A\u0628 \u0648\u0627\u0644\u0625\u064A\u062C\u0627\u0631\u0627\u062A.",
          status: "\u062A\u062D\u0644\u064A\u0644 \u0627\u0641\u062A\u0631\u0627\u0636\u064A \u0645\u0639\u062A\u0645\u062F",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    })
  }),
  // ─── Offline-First Sync Router ──────────────────────────────────
  sync: router({
    // Get all data for offline cache (full snapshot)
    getFullSnapshot: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { accounts: [], transactions: [], settings: null, budgets: [], openingBalances: [], branches: [], tenants: [], products: [], warehouses: [], inventoryMovements: [], customers: [], suppliers: [], salesInvoices: [], salesInvoiceItems: [], purchaseInvoices: [], purchaseInvoiceItems: [], orders: [], orderItems: [], payments: [], activityLogs: [] };
      const allAccounts = await db.select().from(accounts).orderBy(asc(accounts.code));
      const allTransactions = await db.select().from(transactions).orderBy(desc(transactions.id)).limit(500);
      const settingsData = await db.select().from(settings).limit(1);
      const allBudgets = await db.select().from(budgets).orderBy(desc(budgets.id));
      const allOpeningBalances = await db.select().from(openingBalances);
      const allBranches = await db.select().from(branches);
      const allTenants = await db.select().from(tenants);
      const allProducts = await db.select().from(products).orderBy(asc(products.code));
      const allWarehouses = await db.select().from(warehouses);
      const allInventoryMovements = await db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.createdAt)).limit(500);
      const allCustomers = await db.select().from(customers).orderBy(asc(customers.code));
      const allSuppliers = await db.select().from(suppliers).orderBy(asc(suppliers.code));
      const allSalesInvoices = await db.select().from(salesInvoices).orderBy(desc(salesInvoices.createdAt)).limit(200);
      const allSalesItems = await db.select().from(salesInvoiceItems);
      const allPurchaseInvoices = await db.select().from(purchaseInvoices).orderBy(desc(purchaseInvoices.createdAt)).limit(200);
      const allPurchaseItems = await db.select().from(purchaseInvoiceItems);
      const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200);
      const allOrderItems = await db.select().from(orderItems);
      const allPayments = await db.select().from(payments).orderBy(desc(payments.createdAt)).limit(500);
      const allActivityLogs = await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(200);
      return {
        accounts: allAccounts,
        transactions: allTransactions,
        settings: settingsData[0] || null,
        budgets: allBudgets,
        openingBalances: allOpeningBalances,
        branches: allBranches,
        tenants: allTenants,
        products: allProducts,
        warehouses: allWarehouses,
        inventoryMovements: allInventoryMovements,
        customers: allCustomers,
        suppliers: allSuppliers,
        salesInvoices: allSalesInvoices,
        salesInvoiceItems: allSalesItems,
        purchaseInvoices: allPurchaseInvoices,
        purchaseInvoiceItems: allPurchaseItems,
        orders: allOrders,
        orderItems: allOrderItems,
        payments: allPayments,
        activityLogs: allActivityLogs,
        serverTime: (/* @__PURE__ */ new Date()).toISOString()
      };
    }),
    // Push batch of offline mutations (for bulk sync)
    pushMutations: protectedProcedure.input(z2.object({
      mutations: z2.array(z2.object({
        table: z2.string(),
        operation: z2.enum(["create", "update", "delete"]),
        recordId: z2.string(),
        payload: z2.any(),
        timestamp: z2.number(),
        deviceId: z2.string()
      }))
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const results = [];
      for (const mutation of input.mutations) {
        try {
          if (mutation.table === "accounts") {
            if (mutation.operation === "create") {
              const inserted = await db.insert(accounts).values({
                ...mutation.payload,
                isCustom: true
              }).returning();
              results.push({ recordId: mutation.recordId, status: "ok", serverId: inserted[0]?.id });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(accounts).set({
                name: mutation.payload.name,
                code: mutation.payload.code,
                type: mutation.payload.type,
                isActive: mutation.payload.isActive,
                parentAccountId: mutation.payload.parentAccountId
              }).where(eq2(accounts.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "delete" && mutation.payload.id) {
              await db.delete(accounts).where(eq2(accounts.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "transactions") {
            if (mutation.operation === "create") {
              const inserted = await db.insert(transactions).values({
                accountId: mutation.payload.accountId,
                amount: mutation.payload.amount,
                type: mutation.payload.type,
                transactionDate: new Date(mutation.payload.transactionDate),
                narration: mutation.payload.narration,
                notes: mutation.payload.notes,
                lifecycleStatus: mutation.payload.lifecycleStatus || "saved",
                isReversed: false,
                userId: ctx.user.id
              }).returning();
              results.push({ recordId: mutation.recordId, status: "ok", serverId: inserted[0]?.id });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(transactions).set({
                amount: mutation.payload.amount,
                narration: mutation.payload.narration,
                notes: mutation.payload.notes,
                lifecycleStatus: mutation.payload.lifecycleStatus
              }).where(eq2(transactions.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "delete" && mutation.payload.id) {
              await db.delete(transactions).where(eq2(transactions.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "settings") {
            const existing = await db.select().from(settings).limit(1);
            if (existing.length > 0) {
              await db.update(settings).set(mutation.payload).where(eq2(settings.id, existing[0].id));
            } else {
              await db.insert(settings).values(mutation.payload);
            }
            results.push({ recordId: mutation.recordId, status: "ok" });
          } else if (mutation.table === "budgets") {
            if (mutation.operation === "create") {
              await db.insert(budgets).values(mutation.payload);
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "openingBalances") {
            if (mutation.operation === "create" || mutation.operation === "update") {
              const existing = await db.select().from(openingBalances).where(
                and(eq2(openingBalances.accountId, mutation.payload.accountId), eq2(openingBalances.periodName, mutation.payload.periodName))
              ).limit(1);
              if (existing.length > 0) {
                await db.update(openingBalances).set({
                  amount: mutation.payload.amount,
                  type: mutation.payload.type,
                  notes: mutation.payload.notes
                }).where(eq2(openingBalances.id, existing[0].id));
              } else {
                await db.insert(openingBalances).values(mutation.payload);
              }
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "products") {
            if (mutation.operation === "create") {
              await db.insert(products).values({ ...mutation.payload, currentStock: mutation.payload.currentStock ?? 0 });
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(products).set(mutation.payload).where(eq2(products.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "delete" && mutation.payload.id) {
              await db.delete(products).where(eq2(products.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "customers") {
            if (mutation.operation === "create") {
              await db.insert(customers).values({ ...mutation.payload, balance: mutation.payload.balance ?? "0" });
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(customers).set(mutation.payload).where(eq2(customers.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "delete" && mutation.payload.id) {
              await db.delete(customers).where(eq2(customers.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "suppliers") {
            if (mutation.operation === "create") {
              await db.insert(suppliers).values({ ...mutation.payload, balance: mutation.payload.balance ?? "0" });
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(suppliers).set(mutation.payload).where(eq2(suppliers.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "delete" && mutation.payload.id) {
              await db.delete(suppliers).where(eq2(suppliers.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "warehouses") {
            if (mutation.operation === "create") {
              await db.insert(warehouses).values(mutation.payload);
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "inventoryMovements") {
            if (mutation.operation === "create") {
              await db.insert(inventoryMovements).values(mutation.payload);
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "salesInvoices") {
            if (mutation.operation === "create") {
              const inserted = await db.insert(salesInvoices).values(mutation.payload).returning();
              results.push({ recordId: mutation.recordId, status: "ok", serverId: inserted[0]?.id });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(salesInvoices).set(mutation.payload).where(eq2(salesInvoices.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "salesInvoiceItems") {
            if (mutation.operation === "create") {
              await db.insert(salesInvoiceItems).values(mutation.payload);
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "purchaseInvoices") {
            if (mutation.operation === "create") {
              const inserted = await db.insert(purchaseInvoices).values(mutation.payload).returning();
              results.push({ recordId: mutation.recordId, status: "ok", serverId: inserted[0]?.id });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(purchaseInvoices).set(mutation.payload).where(eq2(purchaseInvoices.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "purchaseInvoiceItems") {
            if (mutation.operation === "create") {
              await db.insert(purchaseInvoiceItems).values(mutation.payload);
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "orders") {
            if (mutation.operation === "create") {
              const inserted = await db.insert(orders).values(mutation.payload).returning();
              results.push({ recordId: mutation.recordId, status: "ok", serverId: inserted[0]?.id });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(orders).set(mutation.payload).where(eq2(orders.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "orderItems") {
            if (mutation.operation === "create") {
              await db.insert(orderItems).values(mutation.payload);
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "payments") {
            if (mutation.operation === "create") {
              await db.insert(payments).values(mutation.payload);
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "branches") {
            if (mutation.operation === "create") {
              await db.insert(branches).values(mutation.payload);
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          }
          await db.insert(activityLogs).values({
            userId: ctx.user.id,
            userName: ctx.user.name,
            action: `\u0645\u0632\u0627\u0645\u0646\u0629 (${mutation.operation}) - ${mutation.table}`,
            details: `Device: ${mutation.deviceId} | Record: ${mutation.recordId}`
          });
        } catch (error) {
          results.push({
            recordId: mutation.recordId,
            status: "error",
            error: error.message || "Unknown error"
          });
        }
      }
      return {
        results,
        serverTime: (/* @__PURE__ */ new Date()).toISOString(),
        accepted: results.filter((r) => r.status === "ok").length,
        rejected: results.filter((r) => r.status === "error").length
      };
    }),
    // Get changes since a timestamp (incremental sync)
    getChangesSince: protectedProcedure.input(z2.object({
      since: z2.string().datetime(),
      tables: z2.array(z2.string()).optional()
    })).query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { changes: {}, serverTime: (/* @__PURE__ */ new Date()).toISOString() };
      const sinceDate = new Date(input.since);
      const tablesToSync = input.tables || ["accounts", "transactions", "settings", "budgets", "openingBalances", "products", "warehouses", "inventoryMovements", "customers", "suppliers", "salesInvoices", "salesInvoiceItems", "purchaseInvoices", "purchaseInvoiceItems", "orders", "orderItems", "payments", "activityLogs", "branches", "tenants"];
      const changes = {};
      for (const table of tablesToSync) {
        switch (table) {
          case "accounts":
            changes.accounts = await db.select().from(accounts).where(gte(accounts.updatedAt, sinceDate));
            break;
          case "transactions":
            changes.transactions = await db.select().from(transactions).where(gte(transactions.updatedAt, sinceDate));
            break;
          case "settings":
            changes.settings = await db.select().from(settings);
            break;
          case "budgets":
            changes.budgets = await db.select().from(budgets).where(gte(budgets.createdAt, sinceDate));
            break;
          case "openingBalances":
            changes.openingBalances = await db.select().from(openingBalances).where(gte(openingBalances.createdAt, sinceDate));
            break;
          case "products":
            changes.products = await db.select().from(products).where(gte(products.updatedAt, sinceDate));
            break;
          case "warehouses":
            changes.warehouses = await db.select().from(warehouses).where(gte(warehouses.createdAt, sinceDate));
            break;
          case "inventoryMovements":
            changes.inventoryMovements = await db.select().from(inventoryMovements).where(gte(inventoryMovements.createdAt, sinceDate));
            break;
          case "customers":
            changes.customers = await db.select().from(customers).where(gte(customers.updatedAt, sinceDate));
            break;
          case "suppliers":
            changes.suppliers = await db.select().from(suppliers).where(gte(suppliers.updatedAt, sinceDate));
            break;
          case "salesInvoices":
            changes.salesInvoices = await db.select().from(salesInvoices).where(gte(salesInvoices.updatedAt, sinceDate));
            break;
          case "salesInvoiceItems":
            changes.salesInvoiceItems = await db.select().from(salesInvoiceItems).where(gte(salesInvoiceItems.createdAt, sinceDate));
            break;
          case "purchaseInvoices":
            changes.purchaseInvoices = await db.select().from(purchaseInvoices).where(gte(purchaseInvoices.updatedAt, sinceDate));
            break;
          case "purchaseInvoiceItems":
            changes.purchaseInvoiceItems = await db.select().from(purchaseInvoiceItems).where(gte(purchaseInvoiceItems.createdAt, sinceDate));
            break;
          case "orders":
            changes.orders = await db.select().from(orders).where(gte(orders.updatedAt, sinceDate));
            break;
          case "orderItems":
            changes.orderItems = await db.select().from(orderItems).where(gte(orderItems.createdAt, sinceDate));
            break;
          case "payments":
            changes.payments = await db.select().from(payments).where(gte(payments.createdAt, sinceDate));
            break;
          case "activityLogs":
            changes.activityLogs = await db.select().from(activityLogs).where(gte(activityLogs.createdAt, sinceDate));
            break;
          case "branches":
            changes.branches = await db.select().from(branches).where(gte(branches.createdAt, sinceDate));
            break;
          case "tenants":
            changes.tenants = await db.select().from(tenants).where(gte(tenants.createdAt, sinceDate));
            break;
        }
      }
      return {
        changes,
        serverTime: (/* @__PURE__ */ new Date()).toISOString()
      };
    }),
    // Heartbeat: check server status and exchange device clocks
    heartbeat: protectedProcedure.input(z2.object({
      deviceId: z2.string(),
      lastSyncAt: z2.number().optional(),
      pendingCount: z2.number().optional()
    })).query(async ({ input }) => {
      const db = await getDb();
      const dbAvailable = !!db;
      let serverTxnCount = 0;
      if (db) {
        try {
          const [r] = await db.select({ count: sql`count(*)::int` }).from(transactions).limit(1);
          serverTxnCount = r?.count ?? 0;
        } catch {
        }
      }
      return {
        serverTime: (/* @__PURE__ */ new Date()).toISOString(),
        serverVersion: "1.1.0",
        deviceId: input.deviceId,
        dbAvailable,
        serverTxnCount,
        syncRecommended: dbAvailable && (input.pendingCount ?? 0) > 0
      };
    })
  }),
  // ─── Products & Inventory ──────────────────────────────────────
  products: router({
    list: publicProcedure.input(z2.object({
      limit: z2.number().min(1).max(100).default(50),
      offset: z2.number().min(0).default(0),
      search: z2.string().optional(),
      category: z2.string().optional()
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const conditions = [eq2(products.isActive, true)];
      if (input?.search) {
        conditions.push(or(
          ilike(products.name, `%${input.search}%`),
          ilike(products.code, `%${input.search}%`),
          ilike(products.barcode, `%${input.search}%`)
        ));
      }
      if (input?.category) conditions.push(eq2(products.category, input.category));
      const where = and(...conditions);
      const [countResult] = await db.select({ count: sql`count(*)::int` }).from(products).where(where);
      const items = await db.select().from(products).where(where).orderBy(asc(products.code)).limit(limit).offset(offset);
      return { items, total: countResult?.count ?? 0 };
    }),
    create: protectedProcedure.input(z2.object({
      code: z2.string().min(1),
      name: z2.string().min(1),
      nameAr: z2.string().optional(),
      type: z2.enum(["goods", "service"]).default("goods"),
      category: z2.string().optional(),
      unit: z2.string().default("\u0642\u0637\u0639\u0629"),
      purchasePrice: z2.string().default("0"),
      salePrice: z2.string().default("0"),
      minStock: z2.number().default(0),
      barcode: z2.string().optional(),
      description: z2.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(products).values({ ...input, currentStock: 0 });
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `\u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062A\u062C \u062C\u062F\u064A\u062F: ${input.name} (${input.code})`
      });
      return { success: true };
    }),
    update: protectedProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().optional(),
      salePrice: z2.string().optional(),
      purchasePrice: z2.string().optional(),
      minStock: z2.number().optional(),
      barcode: z2.string().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(products).set(data).where(eq2(products.id, id));
      return { success: true };
    }),
    adjustStock: protectedProcedure.input(z2.object({
      productId: z2.number(),
      quantity: z2.number().int().min(1, "\u0627\u0644\u0643\u0645\u064A\u0629 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 1"),
      type: z2.enum(["in", "out", "adjustment"]),
      notes: z2.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const product = await db.select().from(products).where(eq2(products.id, input.productId)).limit(1);
      if (product.length === 0) throw new Error("\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
      const currentStock = product[0].currentStock || 0;
      let newStock = currentStock;
      if (input.type === "in") {
        newStock = currentStock + input.quantity;
      } else if (input.type === "out") {
        if (currentStock < input.quantity) {
          throw new Error(`\u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u063A\u064A\u0631 \u0643\u0627\u0641\u064D \u2014 \u0627\u0644\u0645\u062A\u0648\u0641\u0631: ${currentStock}, \u0627\u0644\u0645\u0637\u0644\u0648\u0628: ${input.quantity}`);
        }
        newStock = currentStock - input.quantity;
      } else {
        newStock = input.quantity;
      }
      if (input.type === "in") {
        await db.update(products).set({ currentStock: sql`${products.currentStock} + ${input.quantity}` }).where(eq2(products.id, input.productId));
      } else if (input.type === "out") {
        await db.update(products).set({ currentStock: sql`${products.currentStock} - ${input.quantity}` }).where(eq2(products.id, input.productId));
      } else {
        await db.update(products).set({ currentStock: input.quantity }).where(eq2(products.id, input.productId));
      }
      await db.insert(inventoryMovements).values({
        productId: input.productId,
        type: input.type,
        quantity: input.quantity,
        notes: input.notes || null
      });
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `\u062A\u0639\u062F\u064A\u0644 \u0645\u062E\u0632\u0648\u0646: ${product[0].name} (${input.type === "in" ? "\u0625\u062F\u062E\u0627\u0644" : input.type === "out" ? "\u0625\u062E\u0631\u0627\u062C" : "\u062A\u0633\u0648\u064A\u0629"}: ${input.quantity})`,
        details: `\u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0627\u0644\u0633\u0627\u0628\u0642: ${currentStock} \u2014 \u0627\u0644\u062C\u062F\u064A\u062F: ${newStock}`
      });
      return { success: true, previousStock: currentStock, newStock };
    }),
    movements: publicProcedure.input(z2.object({
      productId: z2.number().optional()
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      if (input?.productId) {
        return await db.select().from(inventoryMovements).where(eq2(inventoryMovements.productId, input.productId)).orderBy(desc(inventoryMovements.createdAt));
      }
      return await db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.createdAt));
    })
  }),
  // ─── Customers ──────────────────────────────────────────────────
  customers: router({
    list: publicProcedure.input(z2.object({
      limit: z2.number().min(1).max(100).default(50),
      offset: z2.number().min(0).default(0),
      search: z2.string().optional()
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const conditions = [eq2(customers.isActive, true)];
      if (input?.search) {
        conditions.push(or(
          ilike(customers.name, `%${input.search}%`),
          ilike(customers.code, `%${input.search}%`),
          ilike(customers.phone, `%${input.search}%`)
        ));
      }
      const where = and(...conditions);
      const [countResult] = await db.select({ count: sql`count(*)::int` }).from(customers).where(where);
      const items = await db.select().from(customers).where(where).orderBy(asc(customers.code)).limit(limit).offset(offset);
      return { items, total: countResult?.count ?? 0 };
    }),
    create: protectedProcedure.input(z2.object({
      code: z2.string().min(1),
      name: z2.string().min(1),
      phone: z2.string().optional(),
      email: z2.string().optional(),
      address: z2.string().optional(),
      city: z2.string().optional(),
      taxNumber: z2.string().optional(),
      creditLimit: z2.string().default("0"),
      notes: z2.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(customers).values({ ...input, balance: "0" });
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `\u0625\u0636\u0627\u0641\u0629 \u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F: ${input.name} (${input.code})`
      });
      return { success: true };
    }),
    update: protectedProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().optional(),
      phone: z2.string().optional(),
      email: z2.string().optional(),
      address: z2.string().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(customers).set(data).where(eq2(customers.id, id));
      return { success: true };
    })
  }),
  // ─── Suppliers ──────────────────────────────────────────────────
  suppliers: router({
    list: publicProcedure.input(z2.object({
      limit: z2.number().min(1).max(100).default(50),
      offset: z2.number().min(0).default(0),
      search: z2.string().optional()
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const conditions = [eq2(suppliers.isActive, true)];
      if (input?.search) {
        conditions.push(or(
          ilike(suppliers.name, `%${input.search}%`),
          ilike(suppliers.code, `%${input.search}%`),
          ilike(suppliers.phone, `%${input.search}%`)
        ));
      }
      const where = and(...conditions);
      const [countResult] = await db.select({ count: sql`count(*)::int` }).from(suppliers).where(where);
      const items = await db.select().from(suppliers).where(where).orderBy(asc(suppliers.code)).limit(limit).offset(offset);
      return { items, total: countResult?.count ?? 0 };
    }),
    create: protectedProcedure.input(z2.object({
      code: z2.string().min(1),
      name: z2.string().min(1),
      phone: z2.string().optional(),
      email: z2.string().optional(),
      address: z2.string().optional(),
      city: z2.string().optional(),
      taxNumber: z2.string().optional(),
      notes: z2.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(suppliers).values({ ...input, balance: "0" });
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `\u0625\u0636\u0627\u0641\u0629 \u0645\u0648\u0631\u062F \u062C\u062F\u064A\u062F: ${input.name} (${input.code})`
      });
      return { success: true };
    }),
    update: protectedProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().optional(),
      phone: z2.string().optional(),
      email: z2.string().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(suppliers).set(data).where(eq2(suppliers.id, id));
      return { success: true };
    })
  }),
  // ─── Sales & POS ────────────────────────────────────────────────
  sales: router({
    list: publicProcedure.input(z2.object({
      limit: z2.number().min(1).max(100).default(50),
      offset: z2.number().min(0).default(0),
      status: z2.enum(["draft", "confirmed", "paid", "partial", "cancelled"]).optional(),
      customerId: z2.number().optional()
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const conditions = [];
      if (input?.status) conditions.push(eq2(salesInvoices.status, input.status));
      if (input?.customerId) conditions.push(eq2(salesInvoices.customerId, input.customerId));
      const where = conditions.length > 0 ? and(...conditions) : void 0;
      const [countResult] = await db.select({ count: sql`count(*)::int` }).from(salesInvoices).where(where);
      const items = await db.select().from(salesInvoices).where(where).orderBy(desc(salesInvoices.createdAt)).limit(limit).offset(offset);
      return { items, total: countResult?.count ?? 0 };
    }),
    create: protectedProcedure.input(z2.object({
      customerId: z2.number().optional(),
      items: z2.array(z2.object({
        productId: z2.number(),
        productName: z2.string().min(1),
        quantity: z2.number().int().min(1),
        unitPrice: z2.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "\u0627\u0644\u0633\u0639\u0631 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064B \u0645\u0648\u062C\u0628\u0627\u064B"),
        discount: z2.string().default("0")
      })).min(1, "\u064A\u062C\u0628 \u0625\u0636\u0627\u0641\u0629 \u0635\u0646\u0641 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644"),
      discount: z2.string().default("0"),
      taxRate: z2.string().default("0"),
      paymentMethod: z2.enum(["cash", "card", "transfer", "credit", "online"]).default("cash"),
      paidAmount: z2.string().default("0"),
      notes: z2.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await seedDefaultAccountsIfNeeded();
      const discount = parseFloat(input.discount);
      const taxRate = parseFloat(input.taxRate);
      if (isNaN(discount) || discount < 0) throw new Error("\u0627\u0644\u062E\u0635\u0645 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D");
      if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) throw new Error("\u0646\u0633\u0628\u0629 \u0627\u0644\u0636\u0631\u064A\u0628\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629");
      const now = /* @__PURE__ */ new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const randPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const invoiceNumber = `SI-${datePart}-${randPart}`;
      const productIds = input.items.map((i) => i.productId);
      const productRows = await db.select().from(products).where(inArray(products.id, productIds));
      const productMap = new Map(productRows.map((p) => [p.id, p]));
      for (const item of input.items) {
        const prod = productMap.get(item.productId);
        if (!prod) throw new Error(`\u0627\u0644\u0645\u0646\u062A\u062C \u0631\u0642\u0645 ${item.productId} \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F`);
        if (prod.currentStock < item.quantity) {
          throw new Error(`\u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u063A\u064A\u0631 \u0643\u0627\u0641\u064D \u0644\u0644\u0645\u0646\u062A\u062C "${prod.name}" \u2014 \u0627\u0644\u0645\u062A\u0648\u0641\u0631: ${prod.currentStock}, \u0627\u0644\u0645\u0637\u0644\u0648\u0628: ${item.quantity}`);
        }
      }
      const subtotal = input.items.reduce((sum, item) => sum + parseFloat(item.unitPrice) * item.quantity, 0);
      const taxAmount = (subtotal - discount) * taxRate / 100;
      const total = subtotal - discount + taxAmount;
      const paidAmount = parseFloat(input.paidAmount);
      if (isNaN(paidAmount) || paidAmount < 0) throw new Error("\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u062F\u0641\u0648\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D");
      if (paidAmount > total + 0.01) throw new Error("\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u062F\u0641\u0648\u0639 \u064A\u062A\u062C\u0627\u0648\u0632 \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629");
      const initialStatus = paidAmount >= total - 0.01 ? "paid" : paidAmount > 0 ? "partial" : "draft";
      const result = await db.transaction(async (tx) => {
        const [invoice] = await tx.insert(salesInvoices).values({
          invoiceNumber,
          customerId: input.customerId || null,
          status: initialStatus,
          subtotal: subtotal.toString(),
          discount: input.discount,
          taxRate: input.taxRate,
          taxAmount: taxAmount.toString(),
          total: total.toString(),
          paidAmount: input.paidAmount,
          paymentMethod: input.paymentMethod,
          notes: input.notes || null,
          userId: ctx.user.id
        }).returning();
        const itemValues = input.items.map((item) => ({
          invoiceId: invoice.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: (parseFloat(item.unitPrice) * item.quantity - parseFloat(item.discount)).toString()
        }));
        await tx.insert(salesInvoiceItems).values(itemValues);
        for (const item of input.items) {
          await tx.update(products).set({ currentStock: sql`${products.currentStock} - ${item.quantity}` }).where(eq2(products.id, item.productId));
          await tx.insert(inventoryMovements).values({
            productId: item.productId,
            type: "out",
            quantity: item.quantity,
            referenceId: invoice.id,
            referenceType: "sale",
            notes: `\u0641\u0627\u062A\u0648\u0631\u0629 ${invoiceNumber}`
          });
        }
        if (input.customerId) {
          const unpaidAmount = total - paidAmount;
          if (unpaidAmount > 0) {
            await tx.update(customers).set({ balance: sql`${customers.balance} + ${unpaidAmount}` }).where(eq2(customers.id, input.customerId));
          }
        }
        await postInvoiceGlEntries(tx, {
          kind: "sale",
          invoiceId: invoice.id,
          invoiceNumber,
          total,
          paidAmount,
          branchId: null,
          userId: ctx.user.id
        });
        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `\u0625\u0646\u0634\u0627\u0621 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0628\u064A\u0639\u0627\u062A: ${invoiceNumber}`,
          details: `\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A: ${total} \u2014 \u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062F\u0641\u0639: ${input.paymentMethod}`
        });
        return { invoiceId: invoice.id, invoiceNumber };
      });
      return { success: true, ...result };
    }),
    updateStatus: protectedProcedure.input(z2.object({
      id: z2.number(),
      status: z2.enum(["draft", "confirmed", "paid", "partial", "cancelled"])
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(salesInvoices).where(eq2(salesInvoices.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
      const inv = existing[0];
      if (inv.status === "cancelled" && input.status !== "cancelled") {
        throw new Error("\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0644\u063A\u0627\u0629 \u0648\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0639\u0627\u062F\u0629 \u062A\u0641\u0639\u064A\u0644\u0647\u0627");
      }
      if (inv.status === input.status) return { success: true, unchanged: true };
      if (input.status === "cancelled" && inv.status !== "draft") {
        const items = await db.select().from(salesInvoiceItems).where(eq2(salesInvoiceItems.invoiceId, inv.id));
        const itemPayments = await db.select().from(payments).where(
          and(eq2(payments.source, "sales"), eq2(payments.invoiceId, inv.id))
        );
        await db.transaction(async (tx) => {
          for (const item of items) {
            await tx.update(products).set({ currentStock: sql`${products.currentStock} + ${item.quantity}` }).where(eq2(products.id, item.productId));
            await tx.insert(inventoryMovements).values({
              productId: item.productId,
              type: "in",
              quantity: item.quantity,
              referenceId: inv.id,
              referenceType: "sale-cancel",
              notes: `\u0625\u0644\u063A\u0627\u0621 \u0641\u0627\u062A\u0648\u0631\u0629 ${inv.invoiceNumber}`
            });
          }
          if (inv.customerId) {
            const reversedUnpaid = parseFloat(inv.total) - parseFloat(inv.paidAmount);
            if (reversedUnpaid > 0) {
              await tx.update(customers).set({ balance: sql`${customers.balance} - ${reversedUnpaid}` }).where(eq2(customers.id, inv.customerId));
            }
          }
          for (const p of itemPayments) {
            await tx.update(payments).set({ notes: `\u0645\u0633\u062A\u0631\u062F\u0629 \u2014 \u0625\u0644\u063A\u0627\u0621 \u0641\u0627\u062A\u0648\u0631\u0629 ${inv.invoiceNumber}` }).where(eq2(payments.id, p.id));
          }
          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `\u0625\u0644\u063A\u0627\u0621 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0628\u064A\u0639\u0627\u062A: ${inv.invoiceNumber}`,
            details: `\u062A\u0645 \u0639\u0643\u0633 \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0648\u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629`
          });
        });
      }
      await db.update(salesInvoices).set({ status: input.status, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(salesInvoices.id, inv.id));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `\u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A ${inv.invoiceNumber} \u0625\u0644\u0649 "${input.status}"`
      });
      return { success: true };
    }),
    getItems: publicProcedure.input(z2.object({
      invoiceId: z2.number()
    })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(salesInvoiceItems).where(eq2(salesInvoiceItems.invoiceId, input.invoiceId));
    })
  }),
  // ─── Purchases ──────────────────────────────────────────────────
  purchases: router({
    list: publicProcedure.input(z2.object({
      limit: z2.number().min(1).max(100).default(50),
      offset: z2.number().min(0).default(0),
      status: z2.enum(["draft", "confirmed", "paid", "partial", "cancelled"]).optional(),
      supplierId: z2.number().optional()
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const conditions = [];
      if (input?.status) conditions.push(eq2(purchaseInvoices.status, input.status));
      if (input?.supplierId) conditions.push(eq2(purchaseInvoices.supplierId, input.supplierId));
      const where = conditions.length > 0 ? and(...conditions) : void 0;
      const [countResult] = await db.select({ count: sql`count(*)::int` }).from(purchaseInvoices).where(where);
      const items = await db.select().from(purchaseInvoices).where(where).orderBy(desc(purchaseInvoices.createdAt)).limit(limit).offset(offset);
      return { items, total: countResult?.count ?? 0 };
    }),
    create: protectedProcedure.input(z2.object({
      supplierId: z2.number().optional(),
      items: z2.array(z2.object({
        productId: z2.number(),
        productName: z2.string().min(1),
        quantity: z2.number().int().min(1),
        unitPrice: z2.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "\u0627\u0644\u0633\u0639\u0631 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064B \u0645\u0648\u062C\u0628\u0627\u064B"),
        discount: z2.string().default("0")
      })).min(1, "\u064A\u062C\u0628 \u0625\u0636\u0627\u0641\u0629 \u0635\u0646\u0641 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644"),
      discount: z2.string().default("0"),
      taxRate: z2.string().default("0"),
      paymentMethod: z2.enum(["cash", "card", "transfer", "credit", "online"]).default("cash"),
      paidAmount: z2.string().default("0"),
      notes: z2.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await seedDefaultAccountsIfNeeded();
      const discount = parseFloat(input.discount);
      const taxRate = parseFloat(input.taxRate);
      if (isNaN(discount) || discount < 0) throw new Error("\u0627\u0644\u062E\u0635\u0645 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D");
      if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) throw new Error("\u0646\u0633\u0628\u0629 \u0627\u0644\u0636\u0631\u064A\u0628\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629");
      const now = /* @__PURE__ */ new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const randPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const invoiceNumber = `PI-${datePart}-${randPart}`;
      const productIds = input.items.map((i) => i.productId);
      const productRows = await db.select().from(products).where(inArray(products.id, productIds));
      const productMap = new Map(productRows.map((p) => [p.id, p]));
      for (const item of input.items) {
        if (!productMap.has(item.productId)) throw new Error(`\u0627\u0644\u0645\u0646\u062A\u062C \u0631\u0642\u0645 ${item.productId} \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F`);
      }
      const subtotal = input.items.reduce((sum, item) => sum + parseFloat(item.unitPrice) * item.quantity, 0);
      const taxAmount = (subtotal - discount) * taxRate / 100;
      const total = subtotal - discount + taxAmount;
      const paidAmount = parseFloat(input.paidAmount);
      if (isNaN(paidAmount) || paidAmount < 0) throw new Error("\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u062F\u0641\u0648\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D");
      if (paidAmount > total + 0.01) throw new Error("\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u062F\u0641\u0648\u0639 \u064A\u062A\u062C\u0627\u0648\u0632 \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629");
      const initialStatus = paidAmount >= total - 0.01 ? "paid" : paidAmount > 0 ? "partial" : "draft";
      const result = await db.transaction(async (tx) => {
        const [invoice] = await tx.insert(purchaseInvoices).values({
          invoiceNumber,
          supplierId: input.supplierId || null,
          status: initialStatus,
          subtotal: subtotal.toString(),
          discount: input.discount,
          taxRate: input.taxRate,
          taxAmount: taxAmount.toString(),
          total: total.toString(),
          paidAmount: input.paidAmount,
          paymentMethod: input.paymentMethod,
          notes: input.notes || null,
          userId: ctx.user.id
        }).returning();
        const itemValues = input.items.map((item) => ({
          invoiceId: invoice.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: (parseFloat(item.unitPrice) * item.quantity - parseFloat(item.discount)).toString()
        }));
        await tx.insert(purchaseInvoiceItems).values(itemValues);
        for (const item of input.items) {
          await tx.update(products).set({ currentStock: sql`${products.currentStock} + ${item.quantity}` }).where(eq2(products.id, item.productId));
          await tx.insert(inventoryMovements).values({
            productId: item.productId,
            type: "in",
            quantity: item.quantity,
            referenceId: invoice.id,
            referenceType: "purchase",
            notes: `\u0641\u0627\u062A\u0648\u0631\u0629 \u0634\u0631\u0627\u0621 ${invoiceNumber}`
          });
        }
        if (input.supplierId) {
          const unpaidAmount = total - paidAmount;
          if (unpaidAmount > 0) {
            await tx.update(suppliers).set({ balance: sql`${suppliers.balance} + ${unpaidAmount}` }).where(eq2(suppliers.id, input.supplierId));
          }
        }
        await postInvoiceGlEntries(tx, {
          kind: "purchase",
          invoiceId: invoice.id,
          invoiceNumber,
          total,
          paidAmount,
          branchId: null,
          userId: ctx.user.id
        });
        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `\u0625\u0646\u0634\u0627\u0621 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0634\u062A\u0631\u064A\u0627\u062A: ${invoiceNumber}`,
          details: `\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A: ${total} \u2014 \u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062F\u0641\u0639: ${input.paymentMethod}`
        });
        return { invoiceId: invoice.id, invoiceNumber };
      });
      return { success: true, ...result };
    }),
    updateStatus: protectedProcedure.input(z2.object({
      id: z2.number(),
      status: z2.enum(["draft", "confirmed", "paid", "partial", "cancelled"])
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(purchaseInvoices).where(eq2(purchaseInvoices.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
      const inv = existing[0];
      if (inv.status === "cancelled" && input.status !== "cancelled") {
        throw new Error("\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0644\u063A\u0627\u0629 \u0648\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0639\u0627\u062F\u0629 \u062A\u0641\u0639\u064A\u0644\u0647\u0627");
      }
      if (inv.status === input.status) return { success: true, unchanged: true };
      if (input.status === "cancelled" && inv.status !== "draft") {
        const items = await db.select().from(purchaseInvoiceItems).where(eq2(purchaseInvoiceItems.invoiceId, inv.id));
        await db.transaction(async (tx) => {
          for (const item of items) {
            await tx.update(products).set({ currentStock: sql`${products.currentStock} - ${item.quantity}` }).where(eq2(products.id, item.productId));
            await tx.insert(inventoryMovements).values({
              productId: item.productId,
              type: "out",
              quantity: item.quantity,
              referenceId: inv.id,
              referenceType: "purchase-cancel",
              notes: `\u0625\u0644\u063A\u0627\u0621 \u0641\u0627\u062A\u0648\u0631\u0629 \u0634\u0631\u0627\u0621 ${inv.invoiceNumber}`
            });
          }
          if (inv.supplierId) {
            const reversedUnpaid = parseFloat(inv.total) - parseFloat(inv.paidAmount);
            if (reversedUnpaid > 0) {
              await tx.update(suppliers).set({ balance: sql`${suppliers.balance} - ${reversedUnpaid}` }).where(eq2(suppliers.id, inv.supplierId));
            }
          }
          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `\u0625\u0644\u063A\u0627\u0621 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0634\u062A\u0631\u064A\u0627\u062A: ${inv.invoiceNumber}`,
            details: `\u062A\u0645 \u0639\u0643\u0633 \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0648\u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629`
          });
        });
      }
      await db.update(purchaseInvoices).set({ status: input.status, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(purchaseInvoices.id, inv.id));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `\u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A ${inv.invoiceNumber} \u0625\u0644\u0649 "${input.status}"`
      });
      return { success: true };
    }),
    getItems: publicProcedure.input(z2.object({
      invoiceId: z2.number()
    })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(purchaseInvoiceItems).where(eq2(purchaseInvoiceItems.invoiceId, input.invoiceId));
    })
  }),
  // ─── Orders & Distribution ──────────────────────────────────────
  orders: router({
    list: publicProcedure.input(z2.object({
      limit: z2.number().min(1).max(100).default(50),
      offset: z2.number().min(0).default(0),
      status: z2.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]).optional()
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const where = input?.status ? eq2(orders.status, input.status) : void 0;
      const [countResult] = await db.select({ count: sql`count(*)::int` }).from(orders).where(where);
      const items = await db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(limit).offset(offset);
      return { items, total: countResult?.count ?? 0 };
    }),
    create: protectedProcedure.input(z2.object({
      customerId: z2.number().optional(),
      items: z2.array(z2.object({
        productId: z2.number(),
        productName: z2.string().min(1),
        quantity: z2.number().int().min(1),
        unitPrice: z2.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "\u0627\u0644\u0633\u0639\u0631 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064B \u0645\u0648\u062C\u0628\u0627\u064B")
      })).min(1, "\u064A\u062C\u0628 \u0625\u0636\u0627\u0641\u0629 \u0635\u0646\u0641 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644"),
      deliveryAddress: z2.string().optional(),
      deliveryDate: z2.string().optional(),
      deliveryNotes: z2.string().optional(),
      assignedTo: z2.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const productIds = input.items.map((i) => i.productId);
      const productRows = await db.select().from(products).where(inArray(products.id, productIds));
      if (productRows.length !== productIds.length) throw new Error("\u0648\u0627\u062D\u062F \u0623\u0648 \u0623\u0643\u062B\u0631 \u0645\u0646 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
      const total = input.items.reduce((sum, item) => sum + parseFloat(item.unitPrice) * item.quantity, 0);
      const now = /* @__PURE__ */ new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const randPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const orderNumber = `ORD-${datePart}-${randPart}`;
      const result = await db.transaction(async (tx) => {
        const [order] = await tx.insert(orders).values({
          orderNumber,
          customerId: input.customerId || null,
          total: total.toString(),
          deliveryAddress: input.deliveryAddress || null,
          deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : null,
          deliveryNotes: input.deliveryNotes || null,
          assignedTo: input.assignedTo || null,
          userId: ctx.user.id
        }).returning();
        const itemValues = input.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: (parseFloat(item.unitPrice) * item.quantity).toString()
        }));
        await tx.insert(orderItems).values(itemValues);
        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `\u0625\u0646\u0634\u0627\u0621 \u0637\u0644\u0628 \u062A\u0648\u0632\u064A\u0639: ${orderNumber}`,
          details: `\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A: ${total}`
        });
        return { orderId: order.id, orderNumber };
      });
      return { success: true, ...result };
    }),
    updateStatus: protectedProcedure.input(z2.object({
      id: z2.number(),
      status: z2.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"])
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(orders).where(eq2(orders.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
      const currentStatus = existing[0].status;
      if (currentStatus === "delivered") {
        throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u063A\u064A\u064A\u0631 \u062D\u0627\u0644\u0629 \u0637\u0644\u0628 \u0645\u064F\u0633\u0644\u0651\u0645 \u0623\u0648 \u0645\u064F\u0644\u063A\u0649");
      }
      if (currentStatus === "cancelled" && input.status !== "cancelled") {
        throw new Error("\u0627\u0644\u0637\u0644\u0628 \u0645\u064F\u0644\u063A\u0649 \u0648\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0639\u0627\u062F\u0629 \u062A\u0641\u0639\u064A\u0644\u0647");
      }
      await db.update(orders).set({ status: input.status, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(orders.id, input.id));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `\u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628 #${input.id} \u0645\u0646 "${currentStatus}" \u0625\u0644\u0649 "${input.status}"`
      });
      return { success: true };
    }),
    getItems: publicProcedure.input(z2.object({
      orderId: z2.number()
    })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(orderItems).where(eq2(orderItems.orderId, input.orderId));
    })
  }),
  // ─── Commercial Dashboard Stats ────────────────────────────────
  commercial: router({
    getStats: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { lowStock: [], topCustomers: [], monthStats: { salesTotal: 0, purchasesTotal: 0, ordersCount: 0 }, counts: { products: 0, customers: 0, suppliers: 0, sales: 0, purchases: 0, orders: 0 } };
      const allProducts = await db.select().from(products).where(eq2(products.isActive, true));
      const lowStock = allProducts.filter((p) => p.currentStock <= p.minStock).sort((a, b) => a.currentStock - a.minStock - (b.currentStock - b.minStock)).slice(0, 10);
      const monthStart = new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth(), 1);
      const [salesAgg] = await db.select({ total: sql`coalesce(sum(${salesInvoices.total}), '0')` }).from(salesInvoices).where(and(gte(salesInvoices.invoiceDate, monthStart), ne(salesInvoices.status, "cancelled")));
      const [purchasesAgg] = await db.select({ total: sql`coalesce(sum(${purchaseInvoices.total}), '0')` }).from(purchaseInvoices).where(and(gte(purchaseInvoices.invoiceDate, monthStart), ne(purchaseInvoices.status, "cancelled")));
      const [ordersAgg] = await db.select({ count: sql`count(*)::int` }).from(orders).where(gte(orders.createdAt, monthStart));
      const [productsCount] = await db.select({ count: sql`count(*)::int` }).from(products).where(eq2(products.isActive, true));
      const [customersCount] = await db.select({ count: sql`count(*)::int` }).from(customers).where(eq2(customers.isActive, true));
      const [suppliersCount] = await db.select({ count: sql`count(*)::int` }).from(suppliers).where(eq2(suppliers.isActive, true));
      const [salesCount] = await db.select({ count: sql`count(*)::int` }).from(salesInvoices).where(ne(salesInvoices.status, "cancelled"));
      const [purchasesCount] = await db.select({ count: sql`count(*)::int` }).from(purchaseInvoices).where(ne(purchaseInvoices.status, "cancelled"));
      const [ordersCount] = await db.select({ count: sql`count(*)::int` }).from(orders).where(ne(orders.status, "cancelled"));
      const topCustomers = await db.select().from(customers).where(and(eq2(customers.isActive, true), sql`${customers.balance} > 0`)).orderBy(desc(customers.balance)).limit(5);
      return {
        lowStock: lowStock.map((p) => ({ id: p.id, code: p.code, name: p.name, currentStock: p.currentStock, minStock: p.minStock, unit: p.unit })),
        topCustomers: topCustomers.map((c) => ({ id: c.id, code: c.code, name: c.name, balance: c.balance, phone: c.phone })),
        monthStats: {
          salesTotal: parseFloat(salesAgg?.total || "0"),
          purchasesTotal: parseFloat(purchasesAgg?.total || "0"),
          ordersCount: ordersAgg?.count ?? 0
        },
        counts: {
          products: productsCount?.count ?? 0,
          customers: customersCount?.count ?? 0,
          suppliers: suppliersCount?.count ?? 0,
          sales: salesCount?.count ?? 0,
          purchases: purchasesCount?.count ?? 0,
          orders: ordersCount?.count ?? 0
        }
      };
    })
  }),
  // ─── Payments (Installments & Settlements) ─────────────────────
  payments: router({
    list: publicProcedure.input(z2.object({
      source: z2.enum(["sales", "purchases"]),
      invoiceId: z2.number()
    })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(payments).where(and(eq2(payments.source, input.source), eq2(payments.invoiceId, input.invoiceId))).orderBy(desc(payments.paymentDate));
    }),
    create: protectedProcedure.input(z2.object({
      source: z2.enum(["sales", "purchases"]),
      invoiceId: z2.number(),
      amount: z2.string().refine((v) => {
        const n = parseFloat(v);
        return !isNaN(n) && n > 0 && n < 1e9;
      }, "\u0627\u0644\u0645\u0628\u0644\u063A \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064B \u0645\u0648\u062C\u0628\u0627\u064B"),
      paymentMethod: z2.enum(["cash", "card", "transfer", "credit", "online"]).default("cash"),
      paymentDate: z2.string().optional(),
      notes: z2.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const paymentAmount = parseFloat(input.amount);
      if (input.source === "sales") {
        const invoices = await db.select().from(salesInvoices).where(eq2(salesInvoices.id, input.invoiceId)).limit(1);
        if (invoices.length === 0) throw new Error("\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
        const inv = invoices[0];
        if (inv.status === "cancelled") throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u062D\u0635\u064A\u0644 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0644\u063A\u0627\u0629");
        const remaining = parseFloat(inv.total) - parseFloat(inv.paidAmount);
        if (paymentAmount > remaining + 0.01) throw new Error(`\u0627\u0644\u0645\u0628\u0644\u063A \u064A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0639\u0644\u0649 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 (${remaining})`);
        await db.transaction(async (tx) => {
          const [pay] = await tx.insert(payments).values({
            source: "sales",
            invoiceId: input.invoiceId,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            paymentDate: input.paymentDate ? new Date(input.paymentDate) : /* @__PURE__ */ new Date(),
            notes: input.notes || null,
            userId: ctx.user.id
          }).returning();
          const newPaid = parseFloat(inv.paidAmount) + paymentAmount;
          const newStatus = newPaid >= parseFloat(inv.total) - 0.01 ? "paid" : "partial";
          await tx.update(salesInvoices).set({ paidAmount: newPaid.toString(), status: newStatus, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(salesInvoices.id, input.invoiceId));
          if (inv.customerId) {
            await tx.update(customers).set({ balance: sql`${customers.balance} - ${paymentAmount}` }).where(eq2(customers.id, inv.customerId));
          }
          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `\u062A\u062D\u0635\u064A\u0644 \u062F\u0641\u0639\u0629 \u0645\u0646 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0628\u064A\u0639\u0627\u062A ${inv.invoiceNumber}`,
            details: `\u0627\u0644\u0645\u0628\u0644\u063A: ${input.amount} \u2014 \u0627\u0644\u0637\u0631\u064A\u0642\u0629: ${input.paymentMethod}`
          });
          return { paymentId: pay.id };
        });
      } else {
        const invoices = await db.select().from(purchaseInvoices).where(eq2(purchaseInvoices.id, input.invoiceId)).limit(1);
        if (invoices.length === 0) throw new Error("\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
        const inv = invoices[0];
        if (inv.status === "cancelled") throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0633\u062F\u0627\u062F \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0644\u063A\u0627\u0629");
        const remaining = parseFloat(inv.total) - parseFloat(inv.paidAmount);
        if (paymentAmount > remaining + 0.01) throw new Error(`\u0627\u0644\u0645\u0628\u0644\u063A \u064A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0639\u0644\u0649 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 (${remaining})`);
        await db.transaction(async (tx) => {
          const [pay] = await tx.insert(payments).values({
            source: "purchases",
            invoiceId: input.invoiceId,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            paymentDate: input.paymentDate ? new Date(input.paymentDate) : /* @__PURE__ */ new Date(),
            notes: input.notes || null,
            userId: ctx.user.id
          }).returning();
          const newPaid = parseFloat(inv.paidAmount) + paymentAmount;
          const newStatus = newPaid >= parseFloat(inv.total) - 0.01 ? "paid" : "partial";
          await tx.update(purchaseInvoices).set({ paidAmount: newPaid.toString(), status: newStatus, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(purchaseInvoices.id, input.invoiceId));
          if (inv.supplierId) {
            await tx.update(suppliers).set({ balance: sql`${suppliers.balance} - ${paymentAmount}` }).where(eq2(suppliers.id, inv.supplierId));
          }
          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `\u062A\u0633\u062C\u064A\u0644 \u062F\u0641\u0639\u0629 \u0633\u062F\u0627\u062F \u0639\u0644\u0649 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0634\u062A\u0631\u064A\u0627\u062A ${inv.invoiceNumber}`,
            details: `\u0627\u0644\u0645\u0628\u0644\u063A: ${input.amount} \u2014 \u0627\u0644\u0637\u0631\u064A\u0642\u0629: ${input.paymentMethod}`
          });
          return { paymentId: pay.id };
        });
      }
      return { success: true };
    })
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

// server/_core/app.ts
function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      ok: true,
      service: "alhusainia-accounting",
      version: "1.1.0",
      time: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  return app;
}

// server/_core/vite.ts
import express2 from "express";
import fs2 from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [
  react(),
  tailwindcss(),
  // Dev-only instrumentation — excluded from production builds
  ...process.env.NODE_ENV === "production" ? [] : [jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()]
];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return void 0;
          if (id.includes("recharts") || id.includes("/d3-") || id.includes("victory")) return "charts";
          if (id.includes("react") || id.includes("/scheduler") || id.includes("react-dom")) return "react";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("@radix-ui") || id.includes("cmdk") || id.includes("vaul") || id.includes("input-otp") || id.includes("react-day-picker") || id.includes("sonner") || id.includes("react-resizable-panels") || id.includes("embla-carousel")) return "ui";
          return "vendor";
        }
      }
    }
  },
  server: {
    host: true,
    hmr: {
      clientPort: 443
    },
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
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
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express2.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
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
async function startServer() {
  const app = createApp();
  const server = createServer(app);
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
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
if (!process.env.VERCEL) {
  startServer().catch(console.error);
}
export {
  createApp
};
