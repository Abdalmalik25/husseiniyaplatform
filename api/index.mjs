// server/prod-entry.ts
import "dotenv/config";
import { createServer } from "http";
import net from "net";

// server/_core/app.ts
import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_MONTH_MS = 1e3 * 60 * 60 * 24 * 30;
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
  jsonb
} from "drizzle-orm/pg-core";
var userRoleEnum = pgEnum("role", [
  "admin",
  "auditor",
  "accountant",
  "owner",
  "user"
]);
var accountTypeEnum = pgEnum("account_type", [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense"
]);
var transactionTypeEnum = pgEnum("transaction_type", [
  "debit",
  "credit"
]);
var lifecycleStatusEnum = pgEnum("lifecycle_status", [
  "saved",
  "approved",
  "sent",
  "posted",
  "completed"
]);
var subscriptionStatusEnum = pgEnum("subscription_status", [
  "trial",
  "active",
  "expired"
]);
var users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    openId: varchar("openId", { length: 255 }).notNull().unique(),
    tenantId: integer("tenantId"),
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
  },
  (t2) => [
    // PERFORMANCE: Index for tenant-scoped user lookups
    index("idx_users_tenant").on(t2.tenantId)
  ]
);
var tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  ownerUserId: integer("ownerUserId").notNull(),
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
  tenantId: integer("tenantId").notNull(),
  userId: integer("userId").notNull(),
  branchId: integer("branchId").notNull(),
  canView: boolean("canView").default(true).notNull(),
  canInsert: boolean("canInsert").default(true).notNull(),
  canApprove: boolean("canApprove").default(false).notNull(),
  canPost: boolean("canPost").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var accounts = pgTable(
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
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_accounts_tenant").on(t2.tenantId)
  ]
);
var transactions = pgTable(
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
    lifecycleStatus: lifecycleStatusEnum("lifecycleStatus").default("saved").notNull(),
    isReversed: boolean("isReversed").default(false).notNull(),
    reversalReason: varchar("reversalReason", { length: 255 }),
    referenceType: varchar("referenceType", { length: 50 }),
    referenceId: integer("referenceId"),
    userId: integer("userId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_transactions_tenant").on(t2.tenantId),
    index("idx_transactions_account").on(t2.accountId),
    index("idx_transactions_date").on(t2.transactionDate),
    index("idx_transactions_branch").on(t2.branchId),
    index("idx_transactions_reference").on(t2.referenceType, t2.referenceId),
    // PERFORMANCE: Composite indexes for frequently filtered queries
    index("idx_transactions_tenant_status").on(t2.tenantId, t2.lifecycleStatus),
    index("idx_transactions_tenant_reversed").on(t2.tenantId, t2.isReversed),
    index("idx_transactions_tenant_date").on(t2.tenantId, t2.transactionDate)
  ]
);
var openingBalances = pgTable("opening_balances", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  accountId: integer("accountId").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").default("debit").notNull(),
  notes: text("notes"),
  periodName: varchar("periodName", { length: 50 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (t2) => [
  index("idx_openingBalances_tenant").on(t2.tenantId)
]);
var budgets = pgTable(
  "budgets",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    periodName: varchar("periodName", { length: 50 }).notNull(),
    targetRevenue: decimal("targetRevenue", {
      precision: 15,
      scale: 2
    }).notNull(),
    targetExpense: decimal("targetExpense", {
      precision: 15,
      scale: 2
    }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_budgets_tenant").on(t2.tenantId)
  ]
);
var settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull().unique(),
  institutionName: varchar("institutionName", { length: 255 }).default("\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644").notNull(),
  currency: varchar("currency", { length: 50 }).default("\u0631\u064A\u0627\u0644 \u064A\u0645\u0646\u064A (YER)").notNull(),
  accountingPeriod: varchar("accountingPeriod", { length: 50 }).default("2026").notNull(),
  managerName: varchar("managerName", { length: 255 }).default("\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u0629").notNull(),
  notes: text("notes"),
  subscriptionStatus: subscriptionStatusEnum("subscriptionStatus").default("trial").notNull(),
  trialEndsAt: timestamp("trialEndsAt"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var activityLogs = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId"),
    userId: serial("userId"),
    userName: varchar("userName", { length: 255 }),
    action: varchar("action", { length: 255 }).notNull(),
    details: text("details"),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_activityLogs_tenant").on(t2.tenantId),
    index("idx_activityLogs_user").on(t2.userId),
    index("idx_activityLogs_created").on(t2.createdAt)
  ]
);
var productTypeEnum = pgEnum("product_type", ["goods", "service"]);
var inventoryMovementTypeEnum = pgEnum("inventory_movement_type", [
  "in",
  "out",
  "transfer",
  "adjustment"
]);
var products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
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
    supplierId: integer("supplierId"),
    description: text("description"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_products_tenant").on(t2.tenantId),
    index("idx_products_category").on(t2.category),
    index("idx_products_supplier").on(t2.supplierId)
  ]
);
var warehouses = pgTable(
  "warehouses",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    location: varchar("location", { length: 255 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_warehouses_tenant").on(t2.tenantId)
  ]
);
var inventoryMovements = pgTable(
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
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_inventoryMovements_tenant").on(t2.tenantId)
  ]
);
var customers = pgTable(
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
    balance: decimal("balance", { precision: 15, scale: 2 }).default("0").notNull(),
    creditLimit: decimal("creditLimit", { precision: 15, scale: 2 }).default("0").notNull(),
    notes: text("notes"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_customers_tenant").on(t2.tenantId)
  ]
);
var suppliers = pgTable(
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
    balance: decimal("balance", { precision: 15, scale: 2 }).default("0").notNull(),
    notes: text("notes"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_suppliers_tenant").on(t2.tenantId)
  ]
);
var salesInvoiceStatusEnum = pgEnum("sales_invoice_status", [
  "draft",
  "confirmed",
  "paid",
  "partial",
  "cancelled"
]);
var purchaseInvoiceStatusEnum = pgEnum("purchase_invoice_status", [
  "draft",
  "confirmed",
  "paid",
  "partial",
  "cancelled"
]);
var orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled"
]);
var paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "card",
  "transfer",
  "credit",
  "online"
]);
var salesInvoices = pgTable(
  "sales_invoices",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
    customerId: integer("customerId"),
    branchId: integer("branchId"),
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
    userId: integer("userId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_salesInvoices_tenant").on(t2.tenantId),
    index("idx_salesInvoices_customer").on(t2.customerId),
    index("idx_salesInvoices_status").on(t2.status)
  ]
);
var salesInvoiceItems = pgTable(
  "sales_invoice_items",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoiceId").notNull(),
    productId: integer("productId").notNull(),
    productName: varchar("productName", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
    discount: decimal("discount", { precision: 15, scale: 2 }).default("0").notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [index("idx_sales_items_invoice").on(t2.invoiceId)]
);
var purchaseInvoices = pgTable(
  "purchase_invoices",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
    supplierId: integer("supplierId"),
    branchId: integer("branchId"),
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
    userId: integer("userId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_purchaseInvoices_tenant").on(t2.tenantId),
    index("idx_purchaseInvoices_supplier").on(t2.supplierId),
    index("idx_purchaseInvoices_status").on(t2.status)
  ]
);
var purchaseInvoiceItems = pgTable(
  "purchase_invoice_items",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoiceId").notNull(),
    productId: integer("productId").notNull(),
    productName: varchar("productName", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
    discount: decimal("discount", { precision: 15, scale: 2 }).default("0").notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [index("idx_purchase_items_invoice").on(t2.invoiceId)]
);
var orders = pgTable(
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
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_orders_tenant").on(t2.tenantId),
    index("idx_orders_customer").on(t2.customerId),
    index("idx_orders_status").on(t2.status)
  ]
);
var orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("orderId").notNull(),
    productId: integer("productId").notNull(),
    productName: varchar("productName", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [index("idx_order_items_order").on(t2.orderId)]
);
var paymentSourceEnum = pgEnum("payment_source", [
  "sales",
  "purchases"
]);
var payments = pgTable(
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
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_payments_tenant").on(t2.tenantId),
    index("idx_payments_invoice").on(t2.source, t2.invoiceId)
  ]
);
var subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  priceMonthly: decimal("priceMonthly", { precision: 10, scale: 2 }).notNull(),
  priceYearly: decimal("priceYearly", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  maxUsers: integer("maxUsers").default(5).notNull(),
  maxBranches: integer("maxBranches").default(1).notNull(),
  maxTransactions: integer("maxTransactions").default(1e3).notNull(),
  features: jsonb("features"),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var tenantSubscriptions = pgTable(
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
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_tenant_sub_tenant").on(t2.tenantId),
    index("idx_tenant_sub_status").on(t2.status)
  ]
);
var billingInvoices = pgTable(
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
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_billing_invoice_tenant").on(t2.tenantId),
    index("idx_billing_invoice_status").on(t2.status)
  ]
);
var paymentHistory = pgTable(
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
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_payment_history_tenant").on(t2.tenantId),
    index("idx_payment_history_invoice").on(t2.invoiceId)
  ]
);
var auditLogs = pgTable(
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
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_audit_logs_tenant").on(t2.tenantId),
    index("idx_audit_logs_user").on(t2.userId),
    index("idx_audit_logs_entity").on(t2.entityType, t2.entityId),
    index("idx_audit_logs_created").on(t2.createdAt)
  ]
);
var notifications = pgTable(
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
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_notifications_tenant").on(t2.tenantId),
    index("idx_notifications_user").on(t2.userId),
    index("idx_notifications_status").on(t2.status)
  ]
);
var teamInvitations = pgTable(
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
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_team_inv_tenant").on(t2.tenantId),
    index("idx_team_inv_email").on(t2.email)
  ]
);
var currencies = pgTable("currencies", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  decimalPlaces: integer("decimalPlaces").default(2).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var exchangeRates = pgTable(
  "exchange_rates",
  {
    id: serial("id").primaryKey(),
    baseCurrency: varchar("baseCurrency", { length: 10 }).notNull(),
    quoteCurrency: varchar("quoteCurrency", { length: 10 }).notNull(),
    rate: decimal("rate", { precision: 18, scale: 8 }).notNull(),
    source: varchar("source", { length: 50 }),
    effectiveFrom: timestamp("effectiveFrom").notNull(),
    effectiveTo: timestamp("effectiveTo"),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_exchange_rates_pair").on(t2.baseCurrency, t2.quoteCurrency),
    index("idx_exchange_rates_effective").on(t2.effectiveFrom)
  ]
);
var fileUploads = pgTable(
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
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_file_uploads_tenant").on(t2.tenantId),
    index("idx_file_uploads_entity").on(t2.entityType, t2.entityId)
  ]
);
var apiKeys = pgTable(
  "api_keys",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    userId: integer("userId").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    keyHash: varchar("keyHash", { length: 255 }).notNull().unique(),
    keyPrefix: varchar("keyPrefix", { length: 20 }).notNull(),
    scopes: jsonb("scopes"),
    rateLimit: integer("rateLimit").default(1e3).notNull(),
    expiresAt: timestamp("expiresAt"),
    lastUsedAt: timestamp("lastUsedAt"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [index("idx_api_keys_tenant").on(t2.tenantId)]
);
var webhooks = pgTable(
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
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (t2) => [index("idx_webhooks_tenant").on(t2.tenantId)]
);
var webhookDeliveries = pgTable(
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
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [index("idx_webhook_deliveries_webhook").on(t2.webhookId)]
);
var featureFlags = pgTable(
  "feature_flags",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId"),
    key: varchar("key", { length: 100 }).notNull(),
    value: varchar("value", { length: 255 }).notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (t2) => [index("idx_feature_flags_tenant_key").on(t2.tenantId, t2.key)]
);
var employeeStatusEnum = pgEnum("employee_status", [
  "active",
  "on_leave",
  "terminated"
]);
var projectStatusEnum = pgEnum("project_status", [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled"
]);
var taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "review",
  "done"
]);
var taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent"
]);
var requisitionStatusEnum = pgEnum("requisition_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "ordered",
  "received"
]);
var approvalDecisionEnum = pgEnum("approval_decision", [
  "pending",
  "approved",
  "rejected"
]);
var ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "resolved",
  "closed"
]);
var ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "urgent"
]);
var inspectionResultEnum = pgEnum("inspection_result", [
  "pass",
  "fail",
  "conditional"
]);
var attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "leave"
]);
var payrollStatusEnum = pgEnum("payroll_status", [
  "draft",
  "processed",
  "paid"
]);
var departments = pgTable(
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
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_departments_tenant").on(t2.tenantId),
    uniqueIndex("uq_departments_tenant_code").on(t2.tenantId, t2.code)
  ]
);
var employees = pgTable(
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
    salary: decimal("salary", { precision: 15, scale: 2 }).default("0").notNull(),
    currency: varchar("currency", { length: 10 }).default("YER"),
    status: employeeStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_employees_tenant").on(t2.tenantId),
    uniqueIndex("uq_employees_tenant_code").on(t2.tenantId, t2.code)
  ]
);
var attendance = pgTable(
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
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_attendance_tenant").on(t2.tenantId),
    index("idx_attendance_employee").on(t2.employeeId)
  ]
);
var payrollRuns = pgTable(
  "payroll_runs",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    periodName: varchar("periodName", { length: 40 }).notNull(),
    fromDate: timestamp("fromDate").notNull(),
    toDate: timestamp("toDate").notNull(),
    totalNet: decimal("totalNet", { precision: 15, scale: 2 }).default("0").notNull(),
    status: payrollStatusEnum("status").default("draft").notNull(),
    createdById: integer("createdById"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (t2) => [index("idx_payroll_runs_tenant").on(t2.tenantId)]
);
var payrollItems = pgTable(
  "payroll_items",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    payrollRunId: integer("payrollRunId").notNull(),
    employeeId: integer("employeeId").notNull(),
    basicSalary: decimal("basicSalary", { precision: 15, scale: 2 }).default("0").notNull(),
    deductions: decimal("deductions", { precision: 15, scale: 2 }).default("0").notNull(),
    net: decimal("net", { precision: 15, scale: 2 }).default("0").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_payroll_items_tenant").on(t2.tenantId),
    index("idx_payroll_items_run").on(t2.payrollRunId)
  ]
);
var projects = pgTable(
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
    budget: decimal("budget", { precision: 15, scale: 2 }).default("0").notNull(),
    managerId: integer("managerId"),
    customerId: integer("customerId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_projects_tenant").on(t2.tenantId),
    uniqueIndex("uq_projects_tenant_code").on(t2.tenantId, t2.code)
  ]
);
var projectTasks = pgTable(
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
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_project_tasks_tenant").on(t2.tenantId),
    index("idx_project_tasks_project").on(t2.projectId)
  ]
);
var projectMembers = pgTable(
  "project_members",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    projectId: integer("projectId").notNull(),
    employeeId: integer("employeeId").notNull(),
    roleInProject: varchar("roleInProject", { length: 80 }),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_project_members_tenant").on(t2.tenantId),
    index("idx_project_members_project").on(t2.projectId)
  ]
);
var procurements = pgTable(
  "procurements",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    requisitionNumber: varchar("requisitionNumber", { length: 40 }).notNull(),
    requestedById: integer("requestedById"),
    departmentId: integer("departmentId"),
    itemName: varchar("itemName", { length: 200 }).notNull(),
    description: text("description"),
    quantity: decimal("quantity", { precision: 12, scale: 2 }).default("1").notNull(),
    unit: varchar("unit", { length: 20 }).default("\u0642\u0637\u0639\u0629"),
    estimatedCost: decimal("estimatedCost", { precision: 15, scale: 2 }).default("0").notNull(),
    currency: varchar("currency", { length: 10 }).default("YER"),
    supplierId: integer("supplierId"),
    status: requisitionStatusEnum("status").default("draft").notNull(),
    approvedById: integer("approvedById"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_procurements_tenant").on(t2.tenantId),
    uniqueIndex("uq_procurements_tenant_req").on(
      t2.tenantId,
      t2.requisitionNumber
    )
  ]
);
var procurementApprovals = pgTable(
  "procurement_approvals",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    procurementId: integer("procurementId").notNull(),
    approverId: integer("approverId"),
    level: integer("level").default(1).notNull(),
    decision: approvalDecisionEnum("decision").default("pending").notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_procurement_approvals_tenant").on(t2.tenantId),
    index("idx_procurement_approvals_proc").on(t2.procurementId)
  ]
);
var tickets = pgTable(
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
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_tickets_tenant").on(t2.tenantId),
    uniqueIndex("uq_tickets_tenant_num").on(t2.tenantId, t2.ticketNumber)
  ]
);
var qualityInspections = pgTable(
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
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => [
    index("idx_quality_inspections_tenant").on(t2.tenantId),
    uniqueIndex("uq_quality_tenant_code").on(t2.tenantId, t2.code)
  ]
);

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
    const expiresInMs = options.expiresInMs ?? ONE_MONTH_MS;
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
    const lastSignIn = user.lastSignedIn;
    const shouldUpdateSignIn = !lastSignIn || Date.now() - new Date(lastSignIn).getTime() > 60 * 60 * 1e3;
    if (shouldUpdateSignIn) {
      await upsertUser({
        openId: user.openId,
        lastSignedIn: signedInAt
      });
    }
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
    res.clearCookie(OAUTH_STATE_COOKIE, {
      path: "/",
      secure: true,
      sameSite: "none"
    });
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
        expiresInMs: ONE_MONTH_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_MONTH_MS
      });
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
        console.error(
          `[StorageProxy] forge error: ${forgeResp.status} ${body}`
        );
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

// server/webStore.ts
import { eq as eq2, and, or, ilike, inArray, asc, gte, sql } from "drizzle-orm";
import { z } from "zod";
var catalogInputSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional()
});
var placeOrderInputSchema = z.object({
  customerName: z.string().min(1).transform((v) => v.trim()),
  customerPhone: z.string().optional(),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.number(),
      quantity: z.number().int().min(1)
    })
  ).min(1)
});
async function getCatalog(db, input) {
  const conditions = [eq2(products.isActive, true)];
  if (input?.search) {
    conditions.push(
      or(
        ilike(products.name, `%${input.search}%`),
        ilike(products.code, `%${input.search}%`),
        ilike(products.barcode, `%${input.search}%`)
      )
    );
  }
  if (input?.category && input.category !== "all")
    conditions.push(eq2(products.category, input.category));
  const items = await db.select({
    id: products.id,
    code: products.code,
    name: products.name,
    category: products.category,
    unit: products.unit,
    salePrice: products.salePrice,
    currentStock: products.currentStock,
    minStock: products.minStock,
    barcode: products.barcode
  }).from(products).where(and(...conditions)).orderBy(asc(products.category), asc(products.name)).limit(500);
  const cats = await db.selectDistinct({ category: products.category }).from(products).where(eq2(products.isActive, true));
  return {
    items,
    categories: cats.map((c) => c.category).filter((c) => !!c).sort()
  };
}
async function placePublicOrder(db, input) {
  const mergedMap = /* @__PURE__ */ new Map();
  for (const it of input.items)
    mergedMap.set(
      it.productId,
      (mergedMap.get(it.productId) || 0) + it.quantity
    );
  const effectiveItems = Array.from(mergedMap.entries()).map(
    ([productId, quantity]) => ({ productId, quantity })
  );
  const productIds = effectiveItems.map((i) => i.productId);
  const productRows = await db.select().from(products).where(inArray(products.id, productIds));
  if (productRows.length !== productIds.length)
    throw new Error("\u0648\u0627\u062D\u062F \u0623\u0648 \u0623\u0643\u062B\u0631 \u0645\u0646 \u0627\u0644\u0623\u0635\u0646\u0627\u0641 \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631 \u062D\u0627\u0644\u064A\u0627\u064B");
  const productMap = new Map(productRows.map((p) => [p.id, p]));
  for (const item of effectiveItems) {
    const p = productMap.get(item.productId);
    const stock = p.currentStock || 0;
    if (stock <= 0) throw new Error(`\xAB${p.name}\xBB \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631 \u062D\u0627\u0644\u064A\u0627\u064B`);
  }
  const itemValues = effectiveItems.map((item) => {
    const p = productMap.get(item.productId);
    const unitPrice = p.salePrice && parseFloat(p.salePrice) > 0 ? p.salePrice : "0";
    return {
      productId: p.id,
      productName: p.name,
      quantity: item.quantity,
      unitPrice,
      total: (parseFloat(unitPrice) * item.quantity).toFixed(2)
    };
  });
  const total = itemValues.reduce((s, it) => s + parseFloat(it.total), 0);
  const now = /* @__PURE__ */ new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const orderNumber = `WEB-${datePart}-${randPart}`;
  let customerId = null;
  const phone = input.customerPhone ? input.customerPhone.replace(/[\s-]/g, "") : "";
  if (phone) {
    const existing = await db.select().from(customers).where(eq2(customers.phone, phone)).limit(1);
    if (existing.length > 0) {
      customerId = existing[0].id;
    } else if (input.customerName.trim()) {
      const [cust] = await db.insert(customers).values({
        tenantId: 1,
        code: `WEB-${datePart}-${randPart}`,
        name: input.customerName.trim(),
        phone,
        address: input.deliveryAddress || null,
        city: null,
        creditLimit: "0",
        balance: "0",
        notes: "\u0639\u0645\u064A\u0644 \u0627\u0644\u0645\u062A\u062C\u0631 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A"
      }).returning();
      customerId = cust.id;
    }
  }
  const result = await db.transaction(async (tx) => {
    const [order] = await tx.insert(orders).values({
      orderNumber,
      customerId,
      total: total.toFixed(2),
      deliveryAddress: input.deliveryAddress || null,
      deliveryNotes: input.notes || "\u0637\u0644\u0628 \u0645\u0646 \u0627\u0644\u0645\u062A\u062C\u0631 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
      assignedTo: "\u0627\u0644\u0645\u062A\u062C\u0631 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
      status: "pending"
    }).returning();
    await tx.insert(orderItems).values(itemValues.map((it) => ({ ...it, orderId: order.id })));
    for (const it of itemValues) {
      const updated = await tx.update(products).set({ currentStock: sql`${products.currentStock} - ${it.quantity}` }).where(
        and(
          eq2(products.id, it.productId),
          gte(products.currentStock, it.quantity)
        )
      ).returning({ id: products.id });
      if (updated.length === 0)
        throw new Error(
          `\u0627\u0644\u0643\u0645\u064A\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0645\u0646 \xAB${it.productName}\xBB \u062A\u062C\u0627\u0648\u0632\u062A \u0627\u0644\u0645\u062A\u0648\u0641\u0631 \u0639\u0646\u062F \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0637\u0644\u0628`
        );
      await tx.insert(inventoryMovements).values({
        productId: it.productId,
        type: "out",
        quantity: it.quantity,
        referenceId: order.id,
        referenceType: "order",
        notes: `\u0637\u0644\u0628 \u0645\u062A\u062C\u0631 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A ${orderNumber}`
      });
    }
    return { orderId: order.id, orderNumber };
  });
  if (process.env.ORDER_WEBHOOK_URL) {
    const payload = {
      event: "order.created",
      orderNumber,
      customerName: input.customerName,
      customerPhone: phone || null,
      deliveryAddress: input.deliveryAddress || null,
      notes: input.notes || null,
      total: total.toFixed(2),
      items: itemValues.map((it) => ({
        name: it.productName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: it.total
      })),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    fetch(process.env.ORDER_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {
    });
  }
  return result;
}

// server/_core/webApi.ts
var ALLOWED_ORIGINS = (process.env.STORE_CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
function registerWebApi(app2) {
  app2.use("/api/web", (req, res, next) => {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.length > 0) {
      if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }
    } else {
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app2.get("/api/web/catalog", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        res.status(503).json({ ok: false, error: "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629" });
        return;
      }
      const parsed = catalogInputSchema.safeParse({
        search: typeof req.query.search === "string" ? req.query.search : void 0,
        category: typeof req.query.category === "string" ? req.query.category : void 0
      });
      const data = await getCatalog(db, parsed.success ? parsed.data : {});
      res.status(200).json({ ok: true, ...data });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });
  app2.post("/api/web/place-order", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        res.status(503).json({ ok: false, error: "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629" });
        return;
      }
      const parsed = placeOrderInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: parsed.error.issues.map((i) => i.message).join("\u061B ")
        });
        return;
      }
      const result = await placePublicOrder(db, parsed.data);
      res.status(200).json({ ok: true, ...result });
    } catch (e) {
      res.status(400).json({ ok: false, error: String(e?.message || e) });
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
      const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
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
import { z as z2 } from "zod";

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
var requireTenant = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      tenantId: ctx.tenantId
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var tenantProcedure = t.procedure.use(requireTenant);
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
    z2.object({
      timestamp: z2.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z2.object({
      title: z2.string().min(1, "title is required"),
      content: z2.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/erpRouter.ts
import { z as z3 } from "zod";
import {
  eq as eq3,
  desc,
  asc as asc2,
  and as and2,
  sql as sql2,
  ilike as ilike2,
  gte as gte2,
  lte
} from "drizzle-orm";
async function dbOrThrow() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}
async function nextSequence(db, table, tenantId) {
  const [row] = await db.select({ c: sql2`count(*)` }).from(table).where(eq3(table.tenantId, tenantId));
  return Number(row?.c ?? 0) + 1;
}
var erpRouter = router({
  // â”€â”€â”€ Ø§Ù„Ø£Ù‚Ø³Ø§Ù… â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listDepartments: tenantProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) return [];
    const db = await dbOrThrow();
    return db.select().from(departments).where(eq3(departments.tenantId, ctx.tenantId)).orderBy(asc2(departments.name));
  }),
  createDepartment: tenantProcedure.input(
    z3.object({
      code: z3.string().min(1),
      name: z3.string().min(1),
      managerId: z3.number().optional(),
      parentDepartmentId: z3.number().optional(),
      costCenter: z3.string().optional(),
      isActive: z3.boolean().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const tenantId = ctx.tenantId;
    const [row] = await db.insert(departments).values({
      tenantId,
      code: input.code,
      name: input.name,
      managerId: input.managerId,
      parentDepartmentId: input.parentDepartmentId,
      costCenter: input.costCenter,
      isActive: input.isActive ?? true
    }).returning();
    return row;
  }),
  updateDepartment: tenantProcedure.input(
    z3.object({
      id: z3.number(),
      name: z3.string().optional(),
      managerId: z3.number().nullish(),
      costCenter: z3.string().nullish(),
      isActive: z3.boolean().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const { id, ...rest } = input;
    await db.update(departments).set(rest).where(
      and2(eq3(departments.id, id), eq3(departments.tenantId, ctx.tenantId))
    );
    return { success: true };
  }),
  deleteDepartment: tenantProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    await db.delete(departments).where(
      and2(eq3(departments.id, input.id), eq3(departments.tenantId, ctx.tenantId))
    );
    return { success: true };
  }),
  // â”€â”€â”€ Ø§Ù„Ù…ÙˆØ¸ÙÙˆÙ† â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listEmployees: tenantProcedure.input(
    z3.object({ search: z3.string().optional(), status: z3.string().optional() }).optional()
  ).query(async ({ ctx, input }) => {
    if (!ctx.tenantId) return [];
    const db = await dbOrThrow();
    const where = [
      eq3(employees.tenantId, ctx.tenantId),
      input?.status ? eq3(employees.status, input.status) : void 0,
      input?.search ? ilike2(employees.fullName, `%${input.search}%`) : void 0
    ].filter(Boolean);
    return db.select().from(employees).where(and2(...where)).orderBy(asc2(employees.fullName));
  }),
  createEmployee: tenantProcedure.input(
    z3.object({
      code: z3.string().min(1),
      fullName: z3.string().min(1),
      jobTitle: z3.string().min(1),
      departmentId: z3.number().optional(),
      userId: z3.number().optional(),
      nationalId: z3.string().optional(),
      phone: z3.string().optional(),
      email: z3.string().optional(),
      hireDate: z3.string().optional(),
      salary: z3.string().optional(),
      currency: z3.string().optional(),
      status: z3.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const tenantId = ctx.tenantId;
    const [row] = await db.insert(employees).values({
      tenantId,
      code: input.code,
      fullName: input.fullName,
      jobTitle: input.jobTitle,
      departmentId: input.departmentId,
      userId: input.userId,
      nationalId: input.nationalId,
      phone: input.phone,
      email: input.email,
      hireDate: input.hireDate ? new Date(input.hireDate) : null,
      salary: input.salary ?? "0",
      currency: input.currency ?? "YER",
      status: input.status ?? "active"
    }).returning();
    return row;
  }),
  updateEmployee: tenantProcedure.input(
    z3.object({
      id: z3.number(),
      fullName: z3.string().optional(),
      jobTitle: z3.string().optional(),
      departmentId: z3.number().nullish(),
      phone: z3.string().nullish(),
      email: z3.string().nullish(),
      salary: z3.string().optional(),
      status: z3.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const { id, ...rest } = input;
    await db.update(employees).set(rest).where(and2(eq3(employees.id, id), eq3(employees.tenantId, ctx.tenantId)));
    return { success: true };
  }),
  deleteEmployee: tenantProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    await db.delete(employees).where(
      and2(eq3(employees.id, input.id), eq3(employees.tenantId, ctx.tenantId))
    );
    return { success: true };
  }),
  // â”€â”€â”€ Ø§Ù„Ø­Ø¶ÙˆØ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listAttendance: tenantProcedure.input(
    z3.object({
      from: z3.string().optional(),
      to: z3.string().optional(),
      employeeId: z3.number().optional()
    }).optional()
  ).query(async ({ ctx, input }) => {
    if (!ctx.tenantId) return [];
    const db = await dbOrThrow();
    const where = [
      eq3(attendance.tenantId, ctx.tenantId),
      input?.employeeId ? eq3(attendance.employeeId, input.employeeId) : void 0,
      input?.from ? gte2(attendance.date, new Date(input.from)) : void 0,
      input?.to ? lte(attendance.date, new Date(input.to)) : void 0
    ].filter(Boolean);
    return db.select().from(attendance).where(and2(...where)).orderBy(desc(attendance.date));
  }),
  createAttendance: tenantProcedure.input(
    z3.object({
      employeeId: z3.number(),
      date: z3.string(),
      status: z3.string().default("present"),
      checkIn: z3.string().optional(),
      checkOut: z3.string().optional(),
      note: z3.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const tenantId = ctx.tenantId;
    const [row] = await db.insert(attendance).values({
      tenantId,
      employeeId: input.employeeId,
      date: new Date(input.date),
      status: input.status,
      checkIn: input.checkIn ? new Date(input.checkIn) : null,
      checkOut: input.checkOut ? new Date(input.checkOut) : null,
      note: input.note
    }).returning();
    return row;
  }),
  // â”€â”€â”€ Ø§Ù„Ø±ÙˆØ§ØªØ¨ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listPayrollRuns: tenantProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) return [];
    const db = await dbOrThrow();
    return db.select().from(payrollRuns).where(eq3(payrollRuns.tenantId, ctx.tenantId)).orderBy(desc(payrollRuns.createdAt));
  }),
  createPayrollRun: tenantProcedure.input(
    z3.object({
      periodName: z3.string().min(1),
      fromDate: z3.string(),
      toDate: z3.string()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const tenantId = ctx.tenantId;
    const active = await db.select().from(employees).where(
      and2(eq3(employees.tenantId, tenantId), eq3(employees.status, "active"))
    );
    const items = active.map((e) => ({
      tenantId,
      payrollRunId: 0,
      employeeId: e.id,
      basicSalary: e.salary,
      deductions: "0",
      net: e.salary
    }));
    const [run] = await db.insert(payrollRuns).values({
      tenantId,
      periodName: input.periodName,
      fromDate: new Date(input.fromDate),
      toDate: new Date(input.toDate),
      totalNet: active.reduce((s, e) => s + (parseFloat(e.salary) || 0), 0).toString(),
      status: "draft",
      createdById: ctx.user.id
    }).returning();
    if (items.length) {
      await db.insert(payrollItems).values(items.map((i) => ({ ...i, payrollRunId: run.id })));
    }
    return run;
  }),
  // â”€â”€â”€ Ø§Ù„Ù…Ø´Ø§Ø±ÙŠØ¹ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listProjects: tenantProcedure.input(z3.object({ status: z3.string().optional() }).optional()).query(async ({ ctx, input }) => {
    if (!ctx.tenantId) return [];
    const db = await dbOrThrow();
    const where = [
      eq3(projects.tenantId, ctx.tenantId),
      input?.status ? eq3(projects.status, input.status) : void 0
    ].filter(Boolean);
    return db.select().from(projects).where(and2(...where)).orderBy(desc(projects.createdAt));
  }),
  createProject: tenantProcedure.input(
    z3.object({
      code: z3.string().min(1),
      name: z3.string().min(1),
      description: z3.string().optional(),
      status: z3.string().optional(),
      startDate: z3.string().optional(),
      endDate: z3.string().optional(),
      budget: z3.string().optional(),
      managerId: z3.number().optional(),
      customerId: z3.number().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const tenantId = ctx.tenantId;
    const [row] = await db.insert(projects).values({
      tenantId,
      code: input.code,
      name: input.name,
      description: input.description,
      status: input.status ?? "planning",
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      budget: input.budget ?? "0",
      managerId: input.managerId,
      customerId: input.customerId
    }).returning();
    return row;
  }),
  updateProject: tenantProcedure.input(
    z3.object({
      id: z3.number(),
      name: z3.string().optional(),
      description: z3.string().nullish(),
      status: z3.string().optional(),
      budget: z3.string().optional(),
      endDate: z3.string().nullish()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const { id, ...rest } = input;
    const set = { ...rest };
    if (rest.endDate !== void 0)
      set.endDate = rest.endDate ? new Date(rest.endDate) : null;
    await db.update(projects).set(set).where(and2(eq3(projects.id, id), eq3(projects.tenantId, ctx.tenantId)));
    return { success: true };
  }),
  deleteProject: tenantProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    await db.delete(projectTasks).where(eq3(projectTasks.projectId, input.id));
    await db.delete(projectMembers).where(eq3(projectMembers.projectId, input.id));
    await db.delete(projects).where(
      and2(eq3(projects.id, input.id), eq3(projects.tenantId, ctx.tenantId))
    );
    return { success: true };
  }),
  // â”€â”€â”€ Ù…Ù‡Ø§Ù… Ø§Ù„Ù…Ø´Ø§Ø±ÙŠØ¹ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listProjectMembers: tenantProcedure.input(z3.object({ projectId: z3.number() })).query(async ({ ctx, input }) => {
    if (!ctx.tenantId) return [];
    const db = await dbOrThrow();
    return db.select().from(projectMembers).where(
      and2(
        eq3(projectMembers.projectId, input.projectId),
        eq3(projectMembers.tenantId, ctx.tenantId)
      )
    ).orderBy(asc2(projectMembers.id));
  }),
  listTasks: tenantProcedure.input(z3.object({ projectId: z3.number().optional() }).optional()).query(async ({ ctx, input }) => {
    if (!ctx.tenantId) return [];
    const db = await dbOrThrow();
    const where = [
      eq3(projectTasks.tenantId, ctx.tenantId),
      input?.projectId ? eq3(projectTasks.projectId, input.projectId) : void 0
    ].filter(Boolean);
    return db.select().from(projectTasks).where(and2(...where)).orderBy(asc2(projectTasks.status));
  }),
  createTask: tenantProcedure.input(
    z3.object({
      projectId: z3.number(),
      title: z3.string().min(1),
      description: z3.string().optional(),
      status: z3.string().optional(),
      priority: z3.string().optional(),
      assigneeId: z3.number().optional(),
      dueDate: z3.string().optional(),
      estimatedHours: z3.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const tenantId = ctx.tenantId;
    const [row] = await db.insert(projectTasks).values({
      tenantId,
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      status: input.status ?? "todo",
      priority: input.priority ?? "medium",
      assigneeId: input.assigneeId,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      estimatedHours: input.estimatedHours
    }).returning();
    return row;
  }),
  updateTask: tenantProcedure.input(
    z3.object({
      id: z3.number(),
      status: z3.string().optional(),
      priority: z3.string().optional(),
      assigneeId: z3.number().nullish(),
      actualHours: z3.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const { id, ...rest } = input;
    await db.update(projectTasks).set(rest).where(
      and2(eq3(projectTasks.id, id), eq3(projectTasks.tenantId, ctx.tenantId))
    );
    return { success: true };
  }),
  deleteTask: tenantProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    await db.delete(projectTasks).where(
      and2(
        eq3(projectTasks.id, input.id),
        eq3(projectTasks.tenantId, ctx.tenantId)
      )
    );
    return { success: true };
  }),
  // â”€â”€â”€ Ø£Ø¹Ø¶Ø§Ø¡ Ø§Ù„Ù…Ø´Ø§Ø±ÙŠØ¹ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  addProjectMember: tenantProcedure.input(
    z3.object({
      projectId: z3.number(),
      employeeId: z3.number(),
      roleInProject: z3.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [row] = await db.insert(projectMembers).values({
      tenantId: ctx.tenantId,
      projectId: input.projectId,
      employeeId: input.employeeId,
      roleInProject: input.roleInProject
    }).returning();
    return row;
  }),
  removeProjectMember: tenantProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    await db.delete(projectMembers).where(
      and2(
        eq3(projectMembers.id, input.id),
        eq3(projectMembers.tenantId, ctx.tenantId)
      )
    );
    return { success: true };
  }),
  // â”€â”€â”€ Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listProcurements: tenantProcedure.input(z3.object({ status: z3.string().optional() }).optional()).query(async ({ ctx, input }) => {
    if (!ctx.tenantId) return [];
    const db = await dbOrThrow();
    const where = [
      eq3(procurements.tenantId, ctx.tenantId),
      input?.status ? eq3(procurements.status, input.status) : void 0
    ].filter(Boolean);
    return db.select().from(procurements).where(and2(...where)).orderBy(desc(procurements.createdAt));
  }),
  createProcurement: tenantProcedure.input(
    z3.object({
      itemName: z3.string().min(1),
      description: z3.string().optional(),
      departmentId: z3.number().optional(),
      requestedById: z3.number().optional(),
      quantity: z3.string().optional(),
      unit: z3.string().optional(),
      estimatedCost: z3.string().optional(),
      currency: z3.string().optional(),
      supplierId: z3.number().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const tenantId = ctx.tenantId;
    const seq = await nextSequence(db, procurements, tenantId);
    const [row] = await db.insert(procurements).values({
      tenantId,
      requisitionNumber: `REQ-${tenantId}-${seq}`,
      itemName: input.itemName,
      description: input.description,
      departmentId: input.departmentId,
      requestedById: input.requestedById,
      quantity: input.quantity ?? "1",
      unit: input.unit ?? "\xD9\u201A\xD8\xB7\xD8\xB9\xD8\xA9",
      estimatedCost: input.estimatedCost ?? "0",
      currency: input.currency ?? "YER",
      supplierId: input.supplierId,
      status: "draft"
    }).returning();
    return row;
  }),
  approveProcurement: tenantProcedure.input(
    z3.object({
      id: z3.number(),
      decision: z3.string(),
      note: z3.string().optional(),
      level: z3.number().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const tenantId = ctx.tenantId;
    await db.insert(procurementApprovals).values({
      tenantId,
      procurementId: input.id,
      approverId: ctx.user.id,
      level: input.level ?? 1,
      decision: input.decision,
      note: input.note
    });
    if (input.decision === "approved") {
      await db.update(procurements).set({ status: "approved", approvedById: ctx.user.id }).where(
        and2(eq3(procurements.id, input.id), eq3(procurements.tenantId, tenantId))
      );
    } else if (input.decision === "rejected") {
      await db.update(procurements).set({ status: "rejected" }).where(
        and2(eq3(procurements.id, input.id), eq3(procurements.tenantId, tenantId))
      );
    }
    return { success: true };
  }),
  listProcurementApprovals: tenantProcedure.input(z3.object({ procurementId: z3.number() })).query(async ({ ctx, input }) => {
    if (!ctx.tenantId) return [];
    const db = await dbOrThrow();
    return db.select().from(procurementApprovals).where(
      and2(
        eq3(procurementApprovals.procurementId, input.procurementId),
        eq3(procurementApprovals.tenantId, ctx.tenantId)
      )
    ).orderBy(asc2(procurementApprovals.level));
  }),
  // â”€â”€â”€ ØªØ°Ø§ÙƒØ± Ø®Ø¯Ù…Ø© Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listTickets: tenantProcedure.input(z3.object({ status: z3.string().optional() }).optional()).query(async ({ ctx, input }) => {
    if (!ctx.tenantId) return [];
    const db = await dbOrThrow();
    const where = [
      eq3(tickets.tenantId, ctx.tenantId),
      input?.status ? eq3(tickets.status, input.status) : void 0
    ].filter(Boolean);
    return db.select().from(tickets).where(and2(...where)).orderBy(desc(tickets.createdAt));
  }),
  createTicket: tenantProcedure.input(
    z3.object({
      subject: z3.string().min(1),
      description: z3.string().optional(),
      customerName: z3.string().optional(),
      customerPhone: z3.string().optional(),
      priority: z3.string().optional(),
      assignedToId: z3.number().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const tenantId = ctx.tenantId;
    const seq = await nextSequence(db, tickets, tenantId);
    const [row] = await db.insert(tickets).values({
      tenantId,
      ticketNumber: `TKT-${tenantId}-${seq}`,
      subject: input.subject,
      description: input.description,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      priority: input.priority ?? "medium",
      assignedToId: input.assignedToId,
      status: "open"
    }).returning();
    return row;
  }),
  updateTicket: tenantProcedure.input(
    z3.object({
      id: z3.number(),
      status: z3.string().optional(),
      priority: z3.string().optional(),
      assignedToId: z3.number().nullish()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const { id, ...rest } = input;
    await db.update(tickets).set(rest).where(and2(eq3(tickets.id, id), eq3(tickets.tenantId, ctx.tenantId)));
    return { success: true };
  }),
  // â”€â”€â”€ Ø§Ù„Ø¬ÙˆØ¯Ø© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  deleteTicket: tenantProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    await db.delete(tickets).where(
      and2(eq3(tickets.id, input.id), eq3(tickets.tenantId, ctx.tenantId))
    );
    return { success: true };
  }),
  listInspections: tenantProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) return [];
    const db = await dbOrThrow();
    return db.select().from(qualityInspections).where(eq3(qualityInspections.tenantId, ctx.tenantId)).orderBy(desc(qualityInspections.createdAt));
  }),
  createInspection: tenantProcedure.input(
    z3.object({
      code: z3.string().min(1),
      title: z3.string().min(1),
      type: z3.string().optional(),
      result: z3.string().optional(),
      inspectedById: z3.number().optional(),
      relatedEntity: z3.string().optional(),
      score: z3.string().optional(),
      note: z3.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const tenantId = ctx.tenantId;
    const [row] = await db.insert(qualityInspections).values({
      tenantId,
      code: input.code,
      title: input.title,
      type: input.type,
      result: input.result ?? "pass",
      inspectedById: input.inspectedById,
      relatedEntity: input.relatedEntity,
      score: input.score,
      note: input.note
    }).returning();
    return row;
  }),
  // â”€â”€â”€ Ù„ÙˆØ­Ø© Ù…Ø¹Ù„ÙˆÙ…Ø§Øª ERP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  deleteInspection: tenantProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    await db.delete(qualityInspections).where(
      and2(
        eq3(qualityInspections.id, input.id),
        eq3(qualityInspections.tenantId, ctx.tenantId)
      )
    );
    return { success: true };
  }),
  getDashboard: tenantProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) return null;
    const db = await dbOrThrow();
    const tenantId = ctx.tenantId;
    const cnt = async (table, extra) => (await db.select({ c: sql2`count(*)` }).from(table).where(
      and2(eq3(table.tenantId, tenantId), ...extra ? [extra] : [])
    ))[0]?.c;
    const [
      employeesCount,
      activeProjects,
      openTickets,
      pendingReqs,
      inspections
    ] = await Promise.all([
      cnt(employees),
      cnt(projects, eq3(projects.status, "active")),
      cnt(tickets, eq3(tickets.status, "open")),
      cnt(procurements, eq3(procurements.status, "pending")),
      cnt(qualityInspections)
    ]);
    return {
      employees: Number(employeesCount ?? 0),
      activeProjects: Number(activeProjects ?? 0),
      openTickets: Number(openTickets ?? 0),
      pendingRequisitions: Number(pendingReqs ?? 0),
      inspections: Number(inspections ?? 0)
    };
  })
});

// server/routers.ts
import {
  eq as eq4,
  desc as desc2,
  sql as sql3,
  asc as asc3,
  and as and3,
  or as or2,
  gte as gte3,
  lte as lte2,
  ilike as ilike3,
  inArray as inArray2,
  ne,
  isNull
} from "drizzle-orm";
import { z as z4 } from "zod";
var _seededTenants = /* @__PURE__ */ new Set();
async function seedDefaultAccountsForTenant(tenantId) {
  if (!tenantId) return;
  if (_seededTenants.has(tenantId)) return;
  const db = await getDb();
  if (!db) return;
  try {
    const defaultAccounts = [
      {
        code: "1010",
        name: "\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0631\u0626\u064A\u0633\u064A (\u0627\u0644\u062E\u0632\u064A\u0646\u0629)",
        type: "asset",
        category: "\u0627\u0644\u0623\u0635\u0648\u0644 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
        description: "\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0646\u0642\u062F\u064A\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A \u0644\u0644\u0645\u0624\u0633\u0633\u0629"
      },
      {
        code: "1020",
        name: "\u0627\u0644\u0628\u0646\u0643 \u0627\u0644\u062A\u062C\u0627\u0631\u064A / \u0627\u0644\u0625\u0633\u0644\u0627\u0645\u064A",
        type: "asset",
        category: "\u0627\u0644\u0623\u0635\u0648\u0644 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
        description: "\u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0628\u0646\u0643\u064A \u0627\u0644\u062C\u0627\u0631\u064A \u0644\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629"
      },
      {
        code: "1030",
        name: "\u062D\u0633\u0627\u0628 \u0627\u0644\u0639\u064F\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0645\u062F\u064A\u0646\u0648\u0646",
        type: "asset",
        category: "\u0627\u0644\u0623\u0635\u0648\u0644 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
        description: "\u0645\u0633\u062A\u062D\u0642\u0627\u062A \u0627\u0644\u0645\u0624\u0633\u0633\u0629 \u0644\u062F\u0649 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0645\u0642\u0627\u0628\u0644 \u0627\u0644\u062E\u062F\u0645\u0627\u062A"
      },
      {
        code: "2010",
        name: "\u0627\u0644\u062F\u0627\u0626\u0646\u0648\u0646 \u0648\u0627\u0644\u0645\u0648\u0631\u062F\u0648\u0646",
        type: "liability",
        category: "\u0627\u0644\u062E\u0635\u0648\u0645 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
        description: "\u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0633\u0633\u0629 \u062A\u062C\u0627\u0647 \u0645\u0632\u0648\u062F\u064A \u0627\u0644\u062E\u062F\u0645\u0629 \u0648\u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646"
      },
      {
        code: "3010",
        name: "\u0631\u0623\u0633 \u0627\u0644\u0645\u0627\u0644",
        type: "equity",
        category: "\u062D\u0642\u0648\u0642 \u0627\u0644\u0645\u0644\u0643\u064A\u0629",
        description: "\u0631\u0623\u0633 \u0645\u0627\u0644 \u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644"
      },
      {
        code: "4010",
        name: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644 \u0648\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A",
        type: "revenue",
        category: "\u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A\u0629",
        description: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u062A\u062E\u0644\u064A\u0635 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0648\u0627\u0644\u0627\u0633\u062A\u0634\u0627\u0631\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0627\u0644\u064A\u0629"
      },
      {
        code: "4020",
        name: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0645\u062A\u0646\u0648\u0639\u0629",
        type: "revenue",
        category: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0623\u062E\u0631\u0649",
        description: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u062A\u0634\u063A\u064A\u0644\u064A\u0629 \u0623\u062E\u0631\u0649"
      },
      {
        code: "5010",
        name: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u0631\u0648\u0627\u062A\u0628 \u0648\u0627\u0644\u0623\u062C\u0648\u0631",
        type: "expense",
        category: "\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A\u0629",
        description: "\u0631\u0648\u0627\u062A\u0628 \u0648\u0645\u0633\u062A\u062D\u0642\u0627\u062A \u0645\u0648\u0638\u0641\u064A \u0627\u0644\u0645\u0624\u0633\u0633\u0629"
      },
      {
        code: "5020",
        name: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u0625\u064A\u062C\u0627\u0631 \u0648\u0627\u0644\u062E\u062F\u0645\u0627\u062A (\u0643\u0647\u0631\u0628\u0627\u0621\u060C \u0645\u0627\u0621\u060C \u0625\u0646\u062A\u0631\u0646\u062A)",
        type: "expense",
        category: "\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A\u0629",
        description: "\u0625\u064A\u062C\u0627\u0631 \u0627\u0644\u0645\u0642\u0631 \u0648\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629"
      },
      {
        code: "5030",
        name: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u062D\u0643\u0648\u0645\u064A\u0629 \u0648\u0631\u0633\u0648\u0645 \u062A\u062E\u0644\u064A\u0635",
        type: "expense",
        category: "\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A\u0629",
        description: "\u0627\u0644\u0631\u0633\u0648\u0645 \u0627\u0644\u062D\u0643\u0648\u0645\u064A\u0629 \u0627\u0644\u0645\u062A\u0639\u0644\u0642\u0629 \u0628\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A"
      },
      {
        code: "5040",
        name: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0645\u062A\u0646\u0648\u0639\u0629 \u0648\u0639\u0645\u0648\u0645\u064A\u0629",
        type: "expense",
        category: "\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629",
        description: "\u0636\u064A\u0627\u0641\u0629\u060C \u0623\u062F\u0648\u0627\u062A \u0645\u0643\u062A\u0628\u064A\u0629\u060C \u0648\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0646\u062B\u0631\u064A\u0629"
      },
      {
        code: "5050",
        name: "\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0628\u0636\u0627\u0639\u0629 \u0627\u0644\u0645\u0634\u062A\u0631\u0627\u0629 (\u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629)",
        type: "expense",
        category: "\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A",
        description: "\u062A\u0643\u0644\u0641\u0629 \u0634\u0631\u0627\u0621 \u0627\u0644\u0628\u0636\u0627\u0626\u0639 \u0648\u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0627\u0644\u0645\u0628\u0627\u0639"
      }
    ];
    for (const acc of defaultAccounts) {
      await db.insert(accounts).values({ ...acc, tenantId }).onConflictDoUpdate({
        target: accounts.code,
        set: {
          name: acc.name,
          type: acc.type,
          category: acc.category,
          description: acc.description
        }
      });
    }
    const existingSettings = await db.select().from(settings).where(eq4(settings.tenantId, tenantId)).limit(1);
    if (existingSettings.length === 0) {
      await db.insert(settings).values({
        tenantId,
        institutionName: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644",
        currency: "\u0631\u064A\u0627\u0644 \u064A\u0645\u0646\u064A (YER)",
        accountingPeriod: "\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 2026",
        managerName: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u0629",
        subscriptionStatus: "trial",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3),
        notes: "\u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A \u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0644\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644 - \u0645\u0631\u0646 \u0648\u062F\u0642\u064A\u0642."
      });
    } else if (existingSettings[0].institutionName?.includes("\xD8\xA7") || existingSettings[0].institutionName?.includes("\uFFFD")) {
      await db.update(settings).set({
        institutionName: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644",
        currency: "\u0631\u064A\u0627\u0644 \u064A\u0645\u0646\u064A (YER)",
        accountingPeriod: "\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 2026",
        managerName: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u0629",
        notes: "\u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A \u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0644\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644 - \u0645\u0631\u0646 \u0648\u062F\u0642\u064A\u0642."
      }).where(eq4(settings.id, existingSettings[0].id));
    }
    const defaultProducts = [
      {
        code: "ENG-DES-01",
        name: "\u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0645\u062E\u0637\u0637\u0627\u062A \u0627\u0644\u0645\u0639\u0645\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0625\u0646\u0634\u0627\u0626\u064A\u0629 2D/3D \u0648\u0646\u0645\u0630\u062C\u0629 (BIM)",
        category: "\u0627\u0633\u062A\u0634\u0627\u0631\u0627\u062A \u0647\u0646\u062F\u0633\u064A\u0629",
        unit: "\u0645\u0634\u0631\u0648\u0639",
        salePrice: "120000",
        purchasePrice: "45000",
        currentStock: 999
      },
      {
        code: "ENG-SUR-01",
        name: "\u0627\u0644\u0631\u0641\u0639 \u0627\u0644\u0645\u0633\u0627\u062D\u064A \u0627\u0644\u0631\u0642\u0645\u064A \u0648\u062A\u062B\u0628\u064A\u062A \u062D\u062F\u0648\u062F \u0627\u0644\u0623\u0631\u0627\u0636\u064A \u0628\u062D\u0636\u0648\u0631 \u0627\u0644\u0645\u0633\u0627\u062D",
        category: "\u0627\u0633\u062A\u0634\u0627\u0631\u0627\u062A \u0647\u0646\u062F\u0633\u064A\u0629",
        unit: "\u0642\u0637\u0639\u0629",
        salePrice: "35000",
        purchasePrice: "12000",
        currentStock: 999
      },
      {
        code: "ENG-VOL-01",
        name: "\u062D\u0633\u0627\u0628 \u0643\u0645\u064A\u0627\u062A \u0627\u0644\u062D\u0641\u0631 \u0648\u0627\u0644\u0631\u062F\u0645 \u0648\u0627\u0644\u0631\u0641\u0639 \u0627\u0644\u0637\u0628\u0648\u063A\u0631\u0627\u0641\u064A \u0644\u0644\u0645\u0648\u0627\u0642\u0639",
        category: "\u0627\u0633\u062A\u0634\u0627\u0631\u0627\u062A \u0647\u0646\u062F\u0633\u064A\u0629",
        unit: "\u0645\u0648\u0642\u0639",
        salePrice: "40000",
        purchasePrice: "15000",
        currentStock: 999
      },
      {
        code: "ENG-BOQ-01",
        name: "\u0625\u0639\u062F\u0627\u062F \u062C\u062F\u0627\u0648\u0644 \u0627\u0644\u0643\u0645\u064A\u0627\u062A (BOQ) \u0648\u0642\u0648\u0627\u0626\u0645 \u062D\u0635\u0631 \u0627\u0644\u0645\u0648\u0627\u062F \u0648\u0627\u0644\u062A\u0633\u0639\u064A\u0631 \u0644\u0644\u0645\u0642\u0627\u0648\u0644\u064A\u0646",
        category: "\u0627\u0633\u062A\u0634\u0627\u0631\u0627\u062A \u0647\u0646\u062F\u0633\u064A\u0629",
        unit: "\u062C\u062F\u0648\u0644",
        salePrice: "50000",
        purchasePrice: "18000",
        currentStock: 999
      },
      {
        code: "ENG-SUP-01",
        name: "\u0627\u0644\u0625\u0634\u0631\u0627\u0641 \u0627\u0644\u0647\u0646\u062F\u0633\u064A \u0627\u0644\u0645\u064A\u062F\u0627\u0646\u064A \u0648\u0641\u062D\u0635 \u0627\u0644\u0635\u0628\u0627\u062A \u0648\u062A\u0633\u0644\u064A\u0645 \u0627\u0644\u0645\u0631\u0627\u062D\u0644",
        category: "\u0627\u0633\u062A\u0634\u0627\u0631\u0627\u062A \u0647\u0646\u062F\u0633\u064A\u0629",
        unit: "\u0645\u0631\u062D\u0644\u0629",
        salePrice: "60000",
        purchasePrice: "22000",
        currentStock: 999
      },
      {
        code: "ENG-EST-01",
        name: "\u062F\u0631\u0627\u0633\u0627\u062A \u062A\u0642\u064A\u064A\u0645 \u0648\u062A\u062B\u0645\u064A\u0646 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A \u0648\u0627\u0644\u0623\u0631\u0627\u0636\u064A \u0648\u0627\u0644\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u064A",
        category: "\u0627\u0633\u062A\u0634\u0627\u0631\u0627\u062A \u0647\u0646\u062F\u0633\u064A\u0629",
        unit: "\u062F\u0631\u0627\u0633\u0629",
        salePrice: "80000",
        purchasePrice: "30000",
        currentStock: 999
      },
      {
        code: "SRV-TECH-01",
        name: "\u0627\u0633\u062A\u0634\u0627\u0631\u0627\u062A \u0627\u0644\u062A\u062D\u0648\u0644 \u0627\u0644\u0631\u0642\u0645\u064A \u0648\u062A\u0639\u0645\u064A\u062F \u0627\u0644\u0623\u0646\u0638\u0645\u0629",
        category: "\u0627\u0633\u062A\u0634\u0627\u0631\u0627\u062A \u062A\u0642\u0646\u064A\u0629",
        unit: "\u062E\u062F\u0645\u0629",
        salePrice: "60000",
        purchasePrice: "25000",
        currentStock: 999
      },
      {
        code: "SRV-ADM-01",
        name: "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0647\u064A\u0643\u0644\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u064A\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A",
        category: "\u0627\u0633\u062A\u0634\u0627\u0631\u0627\u062A \u0625\u062F\u0627\u0631\u064A\u0629 \u0648\u0645\u0624\u0633\u0633\u064A\u0629",
        unit: "\u062E\u062F\u0645\u0629",
        salePrice: "45000",
        purchasePrice: "18000",
        currentStock: 999
      },
      {
        code: "SRV-PRINT-01",
        name: "\u062E\u062F\u0645\u0629 \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0648\u0627\u0644\u062A\u063A\u0644\u064A\u0641 \u0648\u0627\u0644\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u0645\u0643\u062A\u0628\u064A",
        category: "\u062E\u062F\u0645\u0627\u062A \u0637\u0644\u0627\u0628\u064A\u0629 \u0648\u0645\u0643\u062A\u0628\u064A\u0629",
        unit: "\u0645\u0634\u0631\u0648\u0639",
        salePrice: "1500",
        purchasePrice: "500",
        currentStock: 999
      },
      {
        code: "SRV-DES-01",
        name: "\u062A\u0635\u0645\u064A\u0645 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0627\u0644\u0628\u0635\u0631\u064A\u0629 \u0648\u0627\u0644\u0634\u0639\u0627\u0631\u0627\u062A \u0648\u0627\u0644\u0645\u0637\u0628\u0648\u0639\u0627\u062A",
        category: "\u0627\u0644\u062A\u0635\u0627\u0645\u064A\u0645 \u0648\u0627\u0644\u0637\u0628\u0627\u0639\u0629",
        unit: "\u062A\u0635\u0645\u064A\u0645",
        salePrice: "25000",
        purchasePrice: "8000",
        currentStock: 999
      },
      {
        code: "SRV-RES-01",
        name: "\u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0623\u0648\u0631\u0627\u0642 \u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629 \u0648\u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A",
        category: "\u0627\u0644\u0628\u062D\u0648\u062B \u0648\u0627\u0644\u062F\u0631\u0627\u0633\u0627\u062A",
        unit: "\u0628\u062D\u062B",
        salePrice: "35000",
        purchasePrice: "15000",
        currentStock: 999
      },
      {
        code: "SRV-MOB-01",
        name: "\u0635\u064A\u0627\u0646\u0629 \u0623\u062C\u0647\u0632\u0629 \u0627\u0644\u0645\u0648\u0628\u0627\u064A\u0644 (\u0633\u0648\u0641\u062A\u0648\u064A\u0631 \u0648\u0639\u062A\u0627\u062F)",
        category: "\u0635\u064A\u0627\u0646\u0629 \u0627\u0644\u0645\u0648\u0628\u0627\u064A\u0644",
        unit: "\u062C\u0647\u0627\u0632",
        salePrice: "8000",
        purchasePrice: "3000",
        currentStock: 999
      },
      {
        code: "SRV-PC-01",
        name: "\u0635\u064A\u0627\u0646\u0629 \u0648\u062A\u062D\u062F\u064A\u062B \u0648\u062A\u0633\u0631\u064A\u0639 \u0623\u062C\u0647\u0632\u0629 \u0627\u0644\u062D\u0627\u0633\u0648\u0628 \u0648\u0627\u0644\u0644\u0627\u0628 \u062A\u0648\u0628",
        category: "\u0635\u064A\u0627\u0646\u0629 \u0627\u0644\u0643\u0645\u0628\u064A\u0648\u062A\u0631",
        unit: "\u062C\u0647\u0627\u0632",
        salePrice: "12000",
        purchasePrice: "4000",
        currentStock: 999
      }
    ];
    for (const prd of defaultProducts) {
      await db.insert(products).values({ ...prd, tenantId }).onConflictDoNothing();
    }
    _seededTenants.add(tenantId);
  } catch {
  }
}
async function postInvoiceGlEntries(tx, opts) {
  const findAccount = async (code) => {
    const rows = await tx.select().from(accounts).where(and3(eq4(accounts.code, code), eq4(accounts.tenantId, opts.tenantId))).limit(1);
    return rows[0];
  };
  const entry = (accountId, type, amount, narration) => tx.insert(transactions).values({
    tenantId: opts.tenantId,
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
      if (cashAcc)
        await entry(
          cashAcc.id,
          "debit",
          paid,
          `\u062A\u062D\u0635\u064A\u0644 \u0646\u0642\u062F\u064A \u2014 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0628\u064A\u0639\u0627\u062A ${opts.invoiceNumber}`
        );
    }
    if (unpaid > 0) {
      const receivablesAcc = await findAccount("1030");
      if (receivablesAcc)
        await entry(
          receivablesAcc.id,
          "debit",
          unpaid,
          `\u0630\u0645\u0645 \u0639\u0645\u0644\u0627\u0621 \u2014 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0628\u064A\u0639\u0627\u062A ${opts.invoiceNumber}`
        );
    }
    await entry(
      revenueAcc.id,
      "credit",
      opts.total,
      `\u0625\u064A\u0631\u0627\u062F \u0645\u0628\u064A\u0639\u0627\u062A \u2014 \u0641\u0627\u062A\u0648\u0631\u0629 ${opts.invoiceNumber}`
    );
  } else {
    const costAcc = await findAccount("5050");
    if (!costAcc) return;
    await entry(
      costAcc.id,
      "debit",
      opts.total,
      `\u062A\u0643\u0644\u0641\u0629 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u2014 \u0641\u0627\u062A\u0648\u0631\u0629 ${opts.invoiceNumber}`
    );
    if (paid > 0) {
      const cashAcc = await findAccount("1010");
      if (cashAcc)
        await entry(
          cashAcc.id,
          "credit",
          paid,
          `\u062F\u0641\u0639 \u0646\u0642\u062F\u064A \u2014 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0634\u062A\u0631\u064A\u0627\u062A ${opts.invoiceNumber}`
        );
    }
    if (unpaid > 0) {
      const payablesAcc = await findAccount("2010");
      if (payablesAcc)
        await entry(
          payablesAcc.id,
          "credit",
          unpaid,
          `\u0630\u0645\u0645 \u0645\u0648\u0631\u062F\u064A\u0646 \u2014 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0634\u062A\u0631\u064A\u0627\u062A ${opts.invoiceNumber}`
        );
    }
  }
}
var appRouter = router({
  system: systemRouter,
  erp: erpRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
    updateProfile: tenantProcedure.input(
      z4.object({
        name: z4.string().min(1),
        email: z4.string().email().optional().or(z4.literal("")),
        themePreference: z4.string(),
        emailNotifications: z4.boolean(),
        whatsappNotifications: z4.boolean(),
        compactMode: z4.boolean()
      })
    ).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(users).set({
        name: input.name,
        email: input.email ? input.email : null,
        themePreference: input.themePreference,
        emailNotifications: input.emailNotifications,
        whatsappNotifications: input.whatsappNotifications,
        compactMode: input.compactMode
      }).where(eq4(users.id, ctx.user.id));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        userName: input.name,
        action: "\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A",
        details: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062A\u0641\u0636\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0631\u0636 \u0648\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A \u0628\u0648\u0627\u0633\u0637\u0629 ${input.name}`
      });
      return { success: true };
    }),
    getActivityLogs: tenantProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const logs = await db.select().from(activityLogs).orderBy(desc2(activityLogs.createdAt)).limit(25);
      return logs;
    }),
    onboard: protectedProcedure.input(
      z4.object({
        institutionName: z4.string().min(1),
        currency: z4.string().optional(),
        managerName: z4.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (ctx.user.tenantId) {
        throw new Error("\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0633\u062C\u0644 \u0628\u0627\u0644\u0641\u0639\u0644 \u0641\u064A \u0645\u0624\u0633\u0633\u0629");
      }
      const [tenant] = await db.insert(tenants).values({
        name: input.institutionName,
        code: `T-${Date.now()}`,
        ownerUserId: ctx.user.id,
        currency: input.currency || "YER",
        country: "\u0627\u0644\u064A\u0645\u0646",
        subscriptionPlan: "standard"
      }).returning();
      const [branch] = await db.insert(branches).values({
        tenantId: tenant.id,
        name: "\u0627\u0644\u0641\u0631\u0639 \u0627\u0644\u0631\u0626\u064A\u0633\u064A",
        code: "HQ-01",
        city: "\u0635\u0646\u0639\u0627\u0621",
        isMain: true
      }).returning();
      await db.update(users).set({ tenantId: tenant.id, role: "admin" }).where(eq4(users.id, ctx.user.id));
      await seedDefaultAccountsForTenant(tenant.id);
      return { tenantId: tenant.id, branchId: branch.id };
    })
  }),
  // Accounting & Settings Router
  accounting: router({
    // Get settings & subscription status
    getSettings: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) {
        return {
          institutionName: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644",
          currency: "\u0631\u064A\u0627\u0644 \u064A\u0645\u0646\u064A (YER)",
          accountingPeriod: "\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 2026",
          managerName: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u0629",
          subscriptionStatus: "trial"
        };
      }
      await seedDefaultAccountsForTenant(ctx.tenantId);
      const db = await getDb();
      if (!db)
        return {
          institutionName: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644",
          currency: "\u0631\u064A\u0627\u0644 \u064A\u0645\u0646\u064A (YER)",
          accountingPeriod: "\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 2026",
          managerName: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u0629",
          subscriptionStatus: "active"
        };
      const res = await db.select().from(settings).where(eq4(settings.tenantId, ctx.tenantId)).limit(1);
      return res[0] || {
        institutionName: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644",
        currency: "\u0631\u064A\u0627\u0644 \u064A\u0645\u0646\u064A (YER)",
        accountingPeriod: "\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 2026",
        managerName: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u0629",
        subscriptionStatus: "active"
      };
    }),
    // Upgrade or manage subscription (simulate payment & unlock advanced features)
    updateSubscription: tenantProcedure.input(
      z4.object({
        status: z4.enum(["trial", "active", "expired"])
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(settings).where(eq4(settings.tenantId, ctx.tenantId)).limit(1);
      if (existing.length > 0) {
        await db.update(settings).set({ subscriptionStatus: input.status }).where(eq4(settings.id, existing[0].id));
      }
      return { success: true };
    }),
    // Update settings (Permanent save)
    updateSettings: tenantProcedure.input(
      z4.object({
        institutionName: z4.string().min(1),
        currency: z4.string().min(1),
        accountingPeriod: z4.string().min(1),
        managerName: z4.string().optional(),
        taxNumber: z4.string().optional(),
        notes: z4.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(settings).where(eq4(settings.tenantId, ctx.tenantId)).limit(1);
      if (existing.length > 0) {
        await db.update(settings).set(input).where(eq4(settings.id, existing[0].id));
      } else {
        await db.insert(settings).values({ ...input, tenantId: ctx.tenantId });
      }
      return { success: true };
    }),
    // Get Chart of Accounts
    getAccounts: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      await seedDefaultAccountsForTenant(ctx.tenantId);
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(accounts).where(eq4(accounts.tenantId, ctx.tenantId)).orderBy(asc3(accounts.code));
    }),
    // Add custom account
    addAccount: tenantProcedure.input(
      z4.object({
        code: z4.string().min(1),
        name: z4.string().min(1),
        type: z4.enum(["asset", "liability", "equity", "revenue", "expense"]),
        category: z4.string().optional(),
        description: z4.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(accounts).values({
        ...input,
        tenantId: ctx.tenantId,
        isCustom: true
      });
      return { success: true };
    }),
    // Update account (Name, Code, Type, Status)
    updateAccount: tenantProcedure.input(
      z4.object({
        id: z4.number(),
        name: z4.string().min(1),
        code: z4.string().min(1),
        type: z4.enum(["asset", "liability", "equity", "revenue", "expense"]),
        isActive: z4.boolean(),
        parentAccountId: z4.number().nullable().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(accounts).set({
        name: input.name,
        code: input.code,
        type: input.type,
        isActive: input.isActive,
        ...input.parentAccountId !== void 0 ? { parentAccountId: input.parentAccountId } : {}
      }).where(and3(eq4(accounts.id, input.id), eq4(accounts.tenantId, ctx.tenantId)));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: `\u062A\u0639\u062F\u064A\u0644 \u0623\u0648 \u0625\u0639\u0627\u062F\u0629 \u062A\u0631\u062A\u064A\u0628 \u0627\u0644\u062D\u0633\u0627\u0628: ${input.name} (${input.code})`,
        details: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062D\u0633\u0627\u0628 \u0648\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u062A\u0628\u0639\u064A\u0629 \u0627\u0644\u0634\u062C\u0631\u064A\u0629 \u0628\u0646\u062C\u0627\u062D`
      });
      return { success: true };
    }),
    // Move account in Tree (Drag and Drop / Reparenting)
    moveAccount: tenantProcedure.input(
      z4.object({
        accountId: z4.number(),
        newParentAccountId: z4.number().nullable()
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.accountId === input.newParentAccountId) {
        throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062C\u0639\u0644 \u0627\u0644\u062D\u0633\u0627\u0628 \u062A\u0627\u0628\u0639\u0627\u064B \u0644\u0646\u0641\u0633\u0647");
      }
      await db.update(accounts).set({
        parentAccountId: input.newParentAccountId
      }).where(and3(eq4(accounts.id, input.accountId), eq4(accounts.tenantId, ctx.tenantId)));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: `\u0625\u0639\u0627\u062F\u0629 \u062A\u0631\u062A\u064A\u0628 \u0627\u0644\u062F\u0644\u064A\u0644 (\u0633\u062D\u0628 \u0648\u0625\u0641\u0644\u0627\u062A)`,
        details: `\u062A\u0645 \u0646\u0642\u0644 \u0627\u0644\u062D\u0633\u0627\u0628 \u0631\u0642\u0645 ${input.accountId} \u0644\u064A\u0643\u0648\u0646 \u062A\u062D\u062A \u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0631\u0626\u064A\u0633\u064A \u0631\u0642\u0645 ${input.newParentAccountId || "\u062C\u0630\u0631 \u0631\u0626\u064A\u0633\u064A"}`
      });
      return { success: true };
    }),
    // Get Transactions with pagination / filters
    getTransactions: tenantProcedure.input(
      z4.object({
        search: z4.string().optional(),
        accountId: z4.number().optional(),
        startDate: z4.string().optional(),
        endDate: z4.string().optional(),
        limit: z4.number().min(1).max(500).default(100),
        offset: z4.number().min(0).default(0),
        includeReversed: z4.boolean().optional()
      }).optional()
    ).query(async ({ input, ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      const conditions = [eq4(transactions.tenantId, ctx.tenantId)];
      if (input?.search) {
        conditions.push(
          or2(
            ilike3(transactions.narration, `%${input.search}%`),
            ilike3(transactions.notes, `%${input.search}%`),
            ilike3(accounts.name, `%${input.search}%`),
            ilike3(accounts.code, `%${input.search}%`)
          )
        );
      }
      if (input?.accountId) {
        conditions.push(eq4(transactions.accountId, input.accountId));
      }
      if (!input?.includeReversed) {
        conditions.push(eq4(transactions.isReversed, false));
      }
      if (input?.startDate) {
        conditions.push(
          gte3(transactions.transactionDate, new Date(input.startDate))
        );
      }
      if (input?.endDate) {
        conditions.push(
          lte2(transactions.transactionDate, new Date(input.endDate))
        );
      }
      const whereClause = conditions.length > 0 ? and3(...conditions) : void 0;
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
      }).from(transactions).leftJoin(accounts, eq4(transactions.accountId, accounts.id)).where(whereClause).orderBy(desc2(transactions.transactionDate), desc2(transactions.id)).limit(input?.limit ?? 100).offset(input?.offset ?? 0);
      return list;
    }),
    // Add Transaction
    addTransaction: tenantProcedure.input(
      z4.object({
        id: z4.number().optional(),
        accountId: z4.number(),
        amount: z4.string().refine((v) => {
          const n = parseFloat(v);
          return !isNaN(n) && n > 0 && n < 1e9;
        }, "\u0627\u0644\u0645\u0628\u0644\u063A \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064B \u0645\u0648\u062C\u0628\u0627\u064B \u0648\u0623\u0642\u0644 \u0645\u0646 \u0645\u0644\u064A\u0627\u0631"),
        type: z4.enum(["debit", "credit"]),
        transactionDate: z4.string().refine((v) => !isNaN(Date.parse(v)), "\u062A\u0627\u0631\u064A\u062E \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"),
        narration: z4.string().max(500).optional(),
        notes: z4.string().optional(),
        lifecycleStatus: z4.enum(["saved", "approved", "sent"]).default("saved")
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const account = await db.select().from(accounts).where(eq4(accounts.id, input.accountId)).limit(1);
      if (account.length === 0) throw new Error("\u0627\u0644\u062D\u0633\u0627\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
      const values = {
        tenantId: ctx.tenantId,
        accountId: input.accountId,
        amount: input.amount,
        type: input.type,
        transactionDate: new Date(input.transactionDate),
        narration: input.narration || null,
        notes: input.notes || null,
        lifecycleStatus: input.lifecycleStatus,
        isReversed: false,
        userId: ctx.user.id
      };
      if (input.id != null) {
        await db.insert(transactions).values({ ...values, id: input.id }).onConflictDoUpdate({
          target: transactions.id,
          set: { ...values, id: input.id }
        });
      } else {
        await db.insert(transactions).values(values);
      }
      return { success: true };
    }),
    // Batch Add Transactions with Lifecycle Status (saved, approved, sent)
    addBatchTransactions: tenantProcedure.input(
      z4.object({
        lifecycleStatus: z4.enum(["saved", "approved", "sent"]).default("saved"),
        rows: z4.array(
          z4.object({
            id: z4.number().optional(),
            accountId: z4.number(),
            amount: z4.string(),
            type: z4.enum(["debit", "credit"]).default("debit"),
            transactionDate: z4.string(),
            narration: z4.string().optional(),
            notes: z4.string().optional()
          })
        )
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      let count = 0;
      for (const item of input.rows) {
        if (!item.amount || parseFloat(item.amount) <= 0) continue;
        const values = {
          tenantId: ctx.tenantId,
          accountId: item.accountId,
          amount: item.amount,
          type: item.type || "debit",
          transactionDate: new Date(item.transactionDate),
          narration: item.narration || null,
          notes: item.notes || null,
          lifecycleStatus: input.lifecycleStatus,
          isReversed: false,
          userId: ctx.user.id
        };
        if (item.id != null) {
          await db.insert(transactions).values({ ...values, id: item.id }).onConflictDoUpdate({
            target: transactions.id,
            set: { ...values, id: item.id }
          });
        } else {
          await db.insert(transactions).values(values);
        }
        count++;
      }
      return { success: true, count };
    }),
    // Daily Entry: recording a single daily movement (debit/credit) against an account
    dailyEntry: tenantProcedure.input(
      z4.object({
        accountId: z4.number(),
        amount: z4.string().refine((v) => {
          const n = parseFloat(v);
          return !isNaN(n) && n > 0 && n < 1e9;
        }, "\u0627\u0644\u0645\u0628\u0644\u063A \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064B \u0645\u0648\u062C\u0628\u0627\u064B \u0648\u0623\u0642\u0644 \u0645\u0646 \u0645\u0644\u064A\u0627\u0631"),
        type: z4.enum(["debit", "credit"]),
        transactionDate: z4.string().refine((v) => !isNaN(Date.parse(v)), "\u062A\u0627\u0631\u064A\u062E \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"),
        narration: z4.string().max(200).optional().default("\u062D\u0631\u0643\u0629 \u064A\u0648\u0645\u064A\u0629"),
        lifecycleStatus: z4.enum(["saved"]).default("saved")
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const account = await db.select().from(accounts).where(eq4(accounts.id, input.accountId)).limit(1);
      if (account.length === 0) throw new Error("\u0627\u0644\u062D\u0633\u0627\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
      const today = /* @__PURE__ */ new Date();
      const transactionDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const values = {
        tenantId: ctx.tenantId,
        accountId: input.accountId,
        amount: input.amount,
        type: input.type,
        transactionDate: new Date(input.transactionDate),
        narration: input.narration,
        notes: null,
        lifecycleStatus: input.lifecycleStatus,
        isReversed: false,
        userId: ctx.user.id
      };
      await db.insert(transactions).values(values);
      return { success: true };
    }),
    // Update Transaction Lifecycle (Approve, Send, Post/Migrate, Reverse)
    updateTransactionLifecycle: tenantProcedure.input(
      z4.object({
        id: z4.number(),
        lifecycleStatus: z4.enum([
          "saved",
          "approved",
          "sent",
          "posted",
          "completed"
        ]),
        reversalReason: z4.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(transactions).where(eq4(transactions.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("\u0627\u0644\u062D\u0631\u0643\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
      if (existing[0]?.lifecycleStatus === "posted" && input.lifecycleStatus !== "posted") {
        throw new Error(
          "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0639\u062F\u064A\u0644 \u0623\u0648 \u0625\u0644\u063A\u0627\u0621 \u062D\u0631\u0643\u0629 \u0645\u0631\u062D\u0644\u0629 \u0646\u0647\u0627\u0626\u064A\u0627\u064B. \u0627\u0644\u062A\u0639\u062F\u064A\u0644 \u064A\u062A\u0645 \u0639\u0628\u0631 \u062D\u0631\u0643\u0629 \u0639\u0643\u0633\u064A\u0629 \u0645\u0633\u062A\u0642\u0644\u0629."
        );
      }
      await db.update(transactions).set({
        lifecycleStatus: input.lifecycleStatus,
        ...input.reversalReason ? { reversalReason: input.reversalReason, isReversed: true } : {}
      }).where(eq4(transactions.id, input.id));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `\u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u062D\u0631\u0643\u0629 #${input.id} \u0625\u0644\u0649: ${input.lifecycleStatus}`,
        details: input.reversalReason ? `\u0633\u0628\u0628 \u0627\u0644\u0639\u0643\u0633: ${input.reversalReason}` : "\u062A\u063A\u064A\u064A\u0631 \u062D\u0627\u0644\u0629 \u062F\u0648\u0631\u0629 \u0627\u0644\u062D\u0631\u0643\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629"
      });
      return { success: true };
    }),
    // Update Transaction (Only allowed if lifecycleStatus === 'saved')
    updateTransaction: tenantProcedure.input(
      z4.object({
        id: z4.number(),
        amount: z4.string(),
        narration: z4.string().optional(),
        notes: z4.string().optional()
      })
    ).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(transactions).where(eq4(transactions.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("\u0627\u0644\u062D\u0631\u0643\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
      if (existing[0]?.lifecycleStatus !== "saved") {
        throw new Error(
          "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u062D\u0631\u0643\u0629 \u0644\u0623\u0646\u0647\u0627 \u0645\u0639\u062A\u0645\u062F\u0629 \u0623\u0648 \u0645\u0631\u0633\u0644\u0629 \u0648\u0645\u0624\u0645\u0646\u0629 \u062A\u0645\u0627\u0645\u0627\u064B"
        );
      }
      await db.update(transactions).set({
        amount: input.amount,
        narration: input.narration || null,
        notes: input.notes || null
      }).where(eq4(transactions.id, input.id));
      return { success: true };
    }),
    // Delete Transaction (only if status is 'saved')
    deleteTransaction: tenantProcedure.input(
      z4.object({
        id: z4.number()
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(transactions).where(eq4(transactions.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("\u0627\u0644\u062D\u0631\u0643\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
      if (existing[0].lifecycleStatus !== "saved") {
        throw new Error(
          "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u062D\u0631\u0643\u0629 \u0645\u0639\u062A\u0645\u062F\u0629 \u0623\u0648 \u0645\u0631\u0633\u0644\u0629 \u2014 \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0639\u0643\u0633\u064A"
        );
      }
      await db.delete(transactions).where(eq4(transactions.id, input.id));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `\u062D\u0630\u0641 \u062D\u0631\u0643\u0629 \u0645\u0627\u0644\u064A\u0629 #${input.id}`,
        details: `\u0627\u0644\u062D\u0633\u0627\u0628: ${existing[0].accountId} \u2014 \u0627\u0644\u0645\u0628\u0644\u063A: ${existing[0].amount}`
      });
      return { success: true };
    }),
    // Smart Suggestions Engine: recommends accounts & standard amounts based on history & operation type
    getSmartSuggestions: tenantProcedure.input(
      z4.object({
        query: z4.string().optional(),
        operationType: z4.string().optional()
        // e.g. "إيراد", "مصروف", "سداد", "عميل"
      })
    ).query(async ({ input, ctx }) => {
      if (!ctx.tenantId) return { suggestedAccounts: [], recentNarrations: [], insights: [] };
      const db = await getDb();
      if (!db)
        return { suggestedAccounts: [], recentNarrations: [], insights: [] };
      const allAccounts = await db.select().from(accounts).where(eq4(accounts.tenantId, ctx.tenantId));
      const recentTx = await db.select({
        narration: transactions.narration,
        accountId: transactions.accountId,
        amount: transactions.amount,
        accountName: accounts.name
      }).from(transactions).leftJoin(accounts, eq4(transactions.accountId, accounts.id)).where(eq4(transactions.tenantId, ctx.tenantId)).orderBy(desc2(transactions.id)).limit(20);
      let matchedAccounts = allAccounts;
      if (input.operationType) {
        const typeKeyword = input.operationType.toLowerCase();
        if (typeKeyword.includes("\u0625\u064A\u0631\u0627\u062F") || typeKeyword.includes("\u062A\u062D\u0635\u064A\u0644")) {
          matchedAccounts = allAccounts.filter(
            (a) => a.type === "revenue" || a.type === "asset"
          );
        } else if (typeKeyword.includes("\u0645\u0635\u0631\u0648\u0641") || typeKeyword.includes("\u062F\u0641\u0639") || typeKeyword.includes("\u0633\u062F\u0627\u062F")) {
          matchedAccounts = allAccounts.filter(
            (a) => a.type === "expense" || a.type === "liability"
          );
        }
      }
      const recentNarrations = Array.from(
        new Set(recentTx.map((t2) => t2.narration).filter(Boolean))
      );
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
    getBudgets: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(budgets).where(eq4(budgets.tenantId, ctx.tenantId)).orderBy(desc2(budgets.id));
    }),
    saveBudget: tenantProcedure.input(
      z4.object({
        id: z4.number().optional(),
        periodName: z4.string(),
        targetRevenue: z4.string(),
        targetExpense: z4.string(),
        notes: z4.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const values = {
        tenantId: ctx.tenantId,
        periodName: input.periodName,
        targetRevenue: input.targetRevenue,
        targetExpense: input.targetExpense,
        notes: input.notes || null
      };
      if (input.id != null) {
        await db.insert(budgets).values({ ...values, id: input.id }).onConflictDoUpdate({
          target: budgets.id,
          set: { ...values, id: input.id }
        });
      } else {
        await db.insert(budgets).values(values);
      }
      return { success: true };
    }),
    // Financial Summary & Dashboard Stats
    getDashboardSummary: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId)
        return {
          totalRevenue: 0,
          totalExpense: 0,
          totalAssets: 0,
          netIncome: 0,
          recentTransactions: []
        };
      const db = await getDb();
      if (!db)
        return {
          totalRevenue: 0,
          totalExpense: 0,
          totalAssets: 0,
          netIncome: 0,
          recentTransactions: []
        };
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
      }).from(transactions).leftJoin(accounts, eq4(transactions.accountId, accounts.id)).where(and3(eq4(transactions.tenantId, ctx.tenantId), eq4(transactions.isReversed, false))).orderBy(desc2(transactions.transactionDate), desc2(transactions.id));
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
    getMonthlyAnalytics: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId)
        return {
          dailyData: [],
          summary: {
            currentMonthRevenues: 0,
            currentMonthExpenses: 0,
            peakDay: "-"
          }
        };
      const db = await getDb();
      if (!db)
        return {
          dailyData: [],
          summary: {
            currentMonthRevenues: 0,
            currentMonthExpenses: 0,
            peakDay: "-"
          }
        };
      const now = /* @__PURE__ */ new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const startOfMonth = new Date(currentYear, currentMonth, 1).getTime();
      const endOfMonth = new Date(
        currentYear,
        currentMonth + 1,
        0,
        23,
        59,
        59
      ).getTime();
      const allTx = await db.select({
        amount: transactions.amount,
        transactionDate: transactions.transactionDate,
        accountType: accounts.type,
        lifecycleStatus: transactions.lifecycleStatus
      }).from(transactions).leftJoin(accounts, eq4(transactions.accountId, accounts.id)).where(and3(eq4(transactions.tenantId, ctx.tenantId), eq4(transactions.isReversed, false)));
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
        if (tx.lifecycleStatus !== "approved" && tx.lifecycleStatus !== "sent" && tx.lifecycleStatus !== "posted")
          continue;
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
    getOpeningBalances: tenantProcedure.input(
      z4.object({
        periodName: z4.string().optional()
      })
    ).query(async ({ input, ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      const period = input.periodName || "\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 2026";
      return await db.select().from(openingBalances).where(and3(eq4(openingBalances.tenantId, ctx.tenantId), eq4(openingBalances.periodName, period)));
    }),
    saveOpeningBalances: tenantProcedure.input(
      z4.object({
        periodName: z4.string(),
        balances: z4.array(
          z4.object({
            accountId: z4.number(),
            amount: z4.string(),
            type: z4.enum(["debit", "credit"]),
            notes: z4.string().optional()
          })
        )
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      for (const item of input.balances) {
        const existing = await db.select().from(openingBalances).where(
          and3(
            eq4(openingBalances.accountId, item.accountId),
            eq4(openingBalances.periodName, input.periodName)
          )
        ).limit(1);
        if (existing.length > 0) {
          await db.update(openingBalances).set({
            amount: item.amount,
            type: item.type,
            notes: item.notes || null
          }).where(eq4(openingBalances.id, existing[0].id));
        } else {
          await db.insert(openingBalances).values({
            tenantId: ctx.tenantId,
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
    // Period Closing (إقفال الدورة) — preview balances then post closing entries
    closing: router({
      preview: tenantProcedure.input(
        z4.object({
          periodName: z4.string().default("\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 2026"),
          asOfDate: z4.string().optional()
        })
      ).query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          return { rows: [], revenueTotal: 0, expenseTotal: 0, netProfit: 0 };
        const asOf = input.asOfDate ? new Date(input.asOfDate) : /* @__PURE__ */ new Date();
        const allAccounts = await db.select().from(accounts).where(eq4(accounts.isActive, true));
        const opening = await db.select().from(openingBalances).where(
          and3(
            eq4(openingBalances.periodName, input.periodName),
            lte2(openingBalances.createdAt, asOf)
          )
        );
        const txns = await db.select().from(transactions).where(
          and3(
            lte2(transactions.transactionDate, asOf),
            eq4(transactions.isReversed, false),
            or2(
              isNull(transactions.referenceType),
              ne(transactions.referenceType, "closing")
            )
          )
        );
        const balanceOf = /* @__PURE__ */ new Map();
        for (const ob of opening) {
          const cur = balanceOf.get(ob.accountId) ?? 0;
          balanceOf.set(
            ob.accountId,
            cur + (ob.type === "debit" ? parseFloat(ob.amount) : -parseFloat(ob.amount))
          );
        }
        for (const t2 of txns) {
          const v = parseFloat(t2.amount || "0");
          const cur = balanceOf.get(t2.accountId) ?? 0;
          balanceOf.set(t2.accountId, cur + (t2.type === "debit" ? v : -v));
        }
        const rows = allAccounts.filter((a) => Math.abs(balanceOf.get(a.id) ?? 0) > 9e-3).map((a) => ({
          accountId: a.id,
          code: a.code,
          name: a.name,
          type: a.type,
          balance: Math.abs(balanceOf.get(a.id)),
          side: balanceOf.get(a.id) > 0 ? "debit" : "credit"
        })).sort((x, y) => x.code.localeCompare(y.code));
        const revenueTotal = rows.filter((r) => r.type === "revenue").reduce((s, r) => s + r.balance, 0);
        const expenseTotal = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.balance, 0);
        return {
          rows,
          revenueTotal,
          expenseTotal,
          netProfit: revenueTotal - expenseTotal
        };
      }),
      execute: tenantProcedure.input(
        z4.object({
          periodName: z4.string().default("\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 2026"),
          asOfDate: z4.string().optional(),
          retainedAccountId: z4.number().optional()
        })
      ).mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const asOf = input.asOfDate ? new Date(input.asOfDate) : /* @__PURE__ */ new Date();
        const already = await db.select().from(transactions).where(
          and3(
            eq4(transactions.referenceType, "closing"),
            ilike3(transactions.narration, `%${input.periodName}%`)
          )
        ).limit(1);
        if (already.length > 0)
          throw new Error(
            `\u062A\u0645 \u0625\u0642\u0641\u0627\u0644 \u0627\u0644\u062F\u0648\u0631\u0629 "${input.periodName}" \u0645\u0633\u0628\u0642\u0627\u064B \u2014 \u0627\u0644\u0642\u064A\u0648\u062F \u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0643\u0631\u0627\u0631\u0647\u0627`
          );
        let retainedId = input.retainedAccountId;
        if (!retainedId) {
          const eq3010 = await db.select().from(accounts).where(
            and3(eq4(accounts.code, "3010"), eq4(accounts.type, "equity"))
          ).limit(1);
          const fallback = eq3010.length > 0 ? eq3010[0].id : (await db.select().from(accounts).where(eq4(accounts.type, "equity")).limit(1))[0]?.id;
          if (!fallback)
            throw new Error(
              "\u0644\u0627 \u064A\u0648\u062C\u062F \u062D\u0633\u0627\u0628 \u0631\u0623\u0633 \u0645\u0627\u0644/\u0646\u062A\u0627\u0626\u062C \u2014 \u0623\u0646\u0634\u0626 \u062D\u0633\u0627\u0628\u0627\u064B \u0645\u0646 \u0646\u0648\u0639 \u0631\u0623\u0633 \u0627\u0644\u0645\u0627\u0644 \u0623\u0648\u0644\u0627\u064B"
            );
          retainedId = fallback;
        }
        const allAccounts = await db.select().from(accounts);
        const opening = await db.select().from(openingBalances).where(
          and3(
            eq4(openingBalances.periodName, input.periodName),
            lte2(openingBalances.createdAt, asOf)
          )
        );
        const txns = await db.select().from(transactions).where(
          and3(
            lte2(transactions.transactionDate, asOf),
            eq4(transactions.isReversed, false)
          )
        );
        const balanceOf = /* @__PURE__ */ new Map();
        for (const ob of opening) {
          balanceOf.set(
            ob.accountId,
            (balanceOf.get(ob.accountId) ?? 0) + (ob.type === "debit" ? parseFloat(ob.amount) : -parseFloat(ob.amount))
          );
        }
        for (const t2 of txns) {
          if (t2.referenceType === "closing") continue;
          const v = parseFloat(t2.amount || "0");
          balanceOf.set(
            t2.accountId,
            (balanceOf.get(t2.accountId) ?? 0) + (t2.type === "debit" ? v : -v)
          );
        }
        const acctMap = new Map(allAccounts.map((a) => [a.id, a]));
        const closingRows = allAccounts.filter(
          (a) => (a.type === "revenue" || a.type === "expense") && Math.abs(balanceOf.get(a.id) ?? 0) > 9e-3
        ).map((a) => ({
          account: a,
          balance: Math.abs(balanceOf.get(a.id)),
          side: balanceOf.get(a.id) > 0 ? "debit" : "credit"
        }));
        if (closingRows.length === 0)
          throw new Error(
            "\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0631\u0635\u062F\u0629 \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0623\u0648 \u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0644\u0625\u0642\u0641\u0627\u0644\u0647\u0627 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u062F\u0648\u0631\u0629"
          );
        let debitTotal = 0;
        let creditTotal = 0;
        const entries = [];
        for (const row of closingRows) {
          if (row.side === "credit") {
            if (row.account.type === "expense") continue;
            entries.push({
              accountId: row.account.id,
              amount: row.balance.toFixed(2),
              type: "debit",
              narration: `\u0625\u0642\u0641\u0627\u0644 ${row.account.name}`
            });
            entries.push({
              accountId: retainedId,
              amount: row.balance.toFixed(2),
              type: "credit",
              narration: `\u0625\u0642\u0641\u0627\u0644 ${row.account.name}`
            });
            debitTotal += row.balance;
            creditTotal += row.balance;
          } else {
            if (row.account.type === "revenue") continue;
            entries.push({
              accountId: row.account.id,
              amount: row.balance.toFixed(2),
              type: "credit",
              narration: `\u0625\u0642\u0641\u0627\u0644 ${row.account.name}`
            });
            entries.push({
              accountId: retainedId,
              amount: row.balance.toFixed(2),
              type: "debit",
              narration: `\u0625\u0642\u0641\u0627\u0644 ${row.account.name}`
            });
            debitTotal += row.balance;
            creditTotal += row.balance;
          }
        }
        if (Math.abs(debitTotal - creditTotal) > 0.01)
          throw new Error("\u0639\u062F\u0645 \u062A\u0648\u0627\u0632\u0646 \u0627\u0644\u0642\u064A\u0648\u062F \u2014 \u0631\u0627\u062C\u0639 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0642\u0628\u0644 \u0627\u0644\u0625\u0642\u0641\u0627\u0644");
        const narration = `\u0625\u0642\u0641\u0627\u0644 \u0627\u0644\u062F\u0648\u0631\u0629: ${input.periodName}`;
        const result = await db.transaction(async (tx) => {
          for (const e of entries) {
            await tx.insert(transactions).values({
              accountId: e.accountId,
              amount: e.amount,
              type: e.type,
              transactionDate: asOf,
              narration: `${narration} \u2014 ${e.narration}`,
              referenceType: "closing",
              lifecycleStatus: "approved"
            });
          }
          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `${narration} (${entries.length / 2} \u062D\u0633\u0627\u0628\u0627\u064B\u060C \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A ${debitTotal.toFixed(2)})`
          });
          return {
            entries: entries.length / 2,
            total: debitTotal,
            retainedAccountId: retainedId
          };
        });
        return result;
      })
    }),
    runAuditorReview: tenantProcedure.query(async () => {
      const db = await getDb();
      if (!db)
        return { status: "OK", score: 100, warnings: [], recommendations: [] };
      const allAccounts = await db.select().from(accounts);
      const allTransactions = await db.select().from(transactions).where(inArray2(transactions.lifecycleStatus, ["approved", "posted"]));
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
        if (acc.type === "asset")
          assetTotal += tx.type === "debit" ? val : -val;
        if (acc.type === "liability")
          liabilityTotal += tx.type === "credit" ? val : -val;
        if (acc.type === "equity")
          equityTotal += tx.type === "credit" ? val : -val;
      }
      const warnings = [];
      const recommendations = [];
      let score = 95;
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        warnings.push(
          "\u062A\u062D\u0630\u064A\u0631 \u0645\u062D\u0627\u0633\u0628\u064A: \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0623\u0637\u0631\u0627\u0641 \u0627\u0644\u0645\u062F\u064A\u0646 \u0648\u0627\u0644\u062F\u0627\u0626\u0646 \u0641\u064A \u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \u063A\u064A\u0631 \u0645\u062A\u0637\u0627\u0628\u0642 \u062A\u0645\u0627\u0645\u0627\u064B."
        );
        score -= 20;
      } else {
        recommendations.push(
          "\u062A\u0648\u0627\u0632\u0646 \u0627\u0644\u0642\u064A\u0648\u062F \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A\u0629 \u0633\u0644\u064A\u0645 \u0648\u0645\u0639\u062A\u0645\u062F \u0648\u0641\u0642 \u0627\u0644\u0645\u0639\u0627\u064A\u064A\u0631 \u0627\u0644\u0645\u0632\u062F\u0648\u062C\u0629."
        );
      }
      if (assetTotal < liabilityTotal) {
        warnings.push(
          "\u062A\u0646\u0628\u064A\u0647 \u0627\u0644\u0645\u0631\u0627\u062C\u0639 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A: \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062E\u0635\u0648\u0645 \u064A\u062A\u062C\u0627\u0648\u0632 \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0623\u0635\u0648\u0644\u060C \u0645\u0645\u0627 \u064A\u0634\u064A\u0631 \u0644\u0645\u062E\u0627\u0637\u0631 \u0631\u0623\u0633 \u0645\u0627\u0644 \u0639\u0627\u0645\u0644."
        );
        score -= 15;
      } else {
        recommendations.push(
          "\u0646\u0633\u0628\u0629 \u0627\u0644\u0623\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u062E\u0635\u0648\u0645 \u0636\u0645\u0646 \u0627\u0644\u062D\u062F\u0648\u062F \u0627\u0644\u0622\u0645\u0646\u0629 \u0644\u062A\u063A\u0637\u064A\u0629 \u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A."
        );
      }
      recommendations.push(
        "\u064A\u0648\u0635\u0649 \u0628\u0625\u062C\u0631\u0627\u0621 \u0645\u0637\u0627\u0628\u0642\u0629 \u0634\u0647\u0631\u064A\u0629 \u0644\u0644\u062E\u0632\u064A\u0646\u0629 \u0648\u0627\u0644\u0628\u0646\u0643 \u0644\u0636\u0645\u0627\u0646 \u0639\u062F\u0645 \u0648\u062C\u0648\u062F \u0641\u0631\u0648\u0642\u0627\u062A \u0646\u0642\u062F\u064A\u0629."
      );
      recommendations.push(
        "\u062A\u0645 \u0627\u0639\u062A\u0645\u0627\u062F \u0633\u062C\u0644 \u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0628\u0646\u062C\u0627\u062D \u0648\u062A\u0623\u0645\u064A\u0646 \u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0636\u062F \u0623\u064A \u062A\u0639\u062F\u064A\u0644 \u063A\u064A\u0631 \u0645\u0628\u0631\u0631."
      );
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
    smartParseDocumentOrImage: tenantProcedure.input(
      z4.object({
        fileUrl: z4.string().optional(),
        rawText: z4.string().optional()
      })
    ).mutation(async ({ input }) => {
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
          return {
            success: false,
            message: "\u062A\u0639\u0630\u0631 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0628\u0646\u0648\u062F \u0645\u0627\u0644\u064A\u0629 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u0646\u062F",
            items: []
          };
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
    getTenantsAndBranches: tenantProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { tenants: [], branches: [] };
      if (!ctx.tenantId) return { tenants: [], branches: [] };
      const userTenant = await db.select().from(tenants).where(eq4(tenants.id, ctx.tenantId)).limit(1);
      if (userTenant.length === 0) {
        return { tenants: [], branches: [] };
      }
      return {
        tenants: userTenant,
        branches: await db.select().from(branches).where(eq4(branches.tenantId, ctx.tenantId))
      };
    }),
    createBranch: tenantProcedure.input(
      z4.object({
        tenantId: z4.number(),
        name: z4.string(),
        code: z4.string(),
        city: z4.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
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
    getUserPermissions: tenantProcedure.input(
      z4.object({
        userId: z4.number()
      })
    ).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(userBranchPermissions).where(eq4(userBranchPermissions.userId, input.userId));
    }),
    saveUserPermission: tenantProcedure.input(
      z4.object({
        userId: z4.number(),
        branchId: z4.number(),
        canView: z4.boolean(),
        canInsert: z4.boolean(),
        canApprove: z4.boolean(),
        canPost: z4.boolean()
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(userBranchPermissions).where(
        and3(
          eq4(userBranchPermissions.userId, input.userId),
          eq4(userBranchPermissions.branchId, input.branchId)
        )
      );
      if (existing.length > 0) {
        await db.update(userBranchPermissions).set({
          canView: input.canView,
          canInsert: input.canInsert,
          canApprove: input.canApprove,
          canPost: input.canPost
        }).where(eq4(userBranchPermissions.id, existing[0].id));
      } else {
        await db.insert(userBranchPermissions).values({
          tenantId: ctx.tenantId,
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
    getBranchPerformanceComparison: tenantProcedure.query(async () => {
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
      }).from(transactions).leftJoin(accounts, eq4(transactions.accountId, accounts.id)).where(inArray2(transactions.lifecycleStatus, ["approved", "posted"]));
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
        const stats = branchStats.get(b.id) || {
          revenue: 0,
          expenses: 0,
          count: 0
        };
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
    getAiFinancialAdvisorAnalysis: tenantProcedure.query(async () => {
      const db = await getDb();
      if (!db)
        return {
          analysis: "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631\u0629 \u062D\u0627\u0644\u064A\u0627\u064B",
          status: "\u062E\u0637\u0623",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      const allTx = await db.select({
        id: transactions.id,
        amount: transactions.amount,
        type: transactions.type,
        accountId: transactions.accountId,
        accountType: accounts.type,
        accountName: accounts.name,
        transactionDate: transactions.transactionDate,
        narration: transactions.narration,
        lifecycleStatus: transactions.lifecycleStatus,
        isReversed: transactions.isReversed
      }).from(transactions).leftJoin(accounts, eq4(transactions.accountId, accounts.id)).where(eq4(transactions.isReversed, false)).orderBy(desc2(transactions.transactionDate), desc2(transactions.id));
      const allAccts = await db.select().from(accounts);
      const allBudgets = await db.select().from(budgets).orderBy(desc2(budgets.id));
      const approved = allTx.filter(
        (t2) => t2.lifecycleStatus === "approved" || t2.lifecycleStatus === "posted"
      );
      let totalRevenue = 0;
      let totalExpense = 0;
      const byAccount = {};
      const accountMeta = /* @__PURE__ */ new Map();
      for (const a of allAccts) {
        accountMeta.set(a.id, { name: a.name, code: a.code });
        byAccount[a.id] = {
          name: a.name,
          code: a.code,
          revenue: 0,
          expense: 0
        };
      }
      for (const tx of approved) {
        const amt = parseFloat(tx.amount || "0");
        const key = tx.accountId ?? -1;
        if (!byAccount[key])
          byAccount[key] = {
            name: tx.accountName || "\u062D\u0633\u0627\u0628 \u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
            code: "",
            revenue: 0,
            expense: 0
          };
        if (tx.accountType === "revenue") {
          totalRevenue += amt;
          byAccount[key].revenue += amt;
        } else if (tx.accountType === "expense") {
          totalExpense += amt;
          byAccount[key].expense += amt;
        }
      }
      const netIncome = totalRevenue - totalExpense;
      const margin = totalRevenue > 0 ? netIncome / totalRevenue * 100 : 0;
      const expenseRatio = totalRevenue > 0 ? totalExpense / totalRevenue * 100 : 0;
      const topRevenue = Object.values(byAccount).filter((a) => a.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 3);
      const topExpense = Object.values(byAccount).filter((a) => a.expense > 0).sort((a, b) => b.expense - a.expense).slice(0, 3);
      const cashAccounts = allAccts.filter(
        (a) => a.type === "asset" && (a.code === "1010" || a.code.startsWith("1020"))
      );
      let cashBalance = 0;
      for (const tx of approved) {
        if (!tx.accountId || !tx.accountType || tx.accountType !== "asset")
          continue;
        if (!cashAccounts.some((c) => c.id === tx.accountId)) continue;
        const amt = parseFloat(tx.amount || "0");
        cashBalance += tx.type === "debit" ? amt : -amt;
      }
      let budgetLine = "\u0644\u0627 \u062A\u0648\u062C\u062F \u062E\u0637\u0637 \u0645\u064A\u0632\u0627\u0646\u064A\u0629 \u0645\u0636\u0627\u0641\u0629 \u0628\u0639\u062F \u2014 \u0623\u0636\u0641 \u062E\u0637\u0629 \u0645\u0646 \u062A\u0628\u0648\u064A\u0628 \u0627\u0644\u062A\u062D\u0644\u064A\u0644\u0627\u062A \u0644\u0645\u0631\u0627\u0642\u0628\u0629 \u0627\u0644\u0623\u062F\u0627\u0621 \u0645\u0642\u0627\u0628\u0644 \u0627\u0644\u0623\u0647\u062F\u0627\u0641.";
      if (allBudgets.length > 0) {
        const latest = allBudgets[0];
        const revTarget = parseFloat(String(latest.targetRevenue || "0"));
        const expTarget = parseFloat(String(latest.targetExpense || "0"));
        const revPct = revTarget > 0 ? Math.round(totalRevenue / revTarget * 100) : 0;
        const expPct = expTarget > 0 ? Math.round(totalExpense / expTarget * 100) : 0;
        budgetLine = `\u062E\u0637\u0629 \xAB${latest.periodName}\xBB: \u062A\u062D\u0642\u0642 \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A ${revPct}% \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641\u060C \u0648\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A ${expPct}% \u0645\u0646 \u0627\u0644\u0633\u0642\u0641 \u0627\u0644\u0645\u062E\u0635\u0635.`;
      }
      const fmt = (n) => n.toLocaleString("en-US");
      const topRevenueLine = topRevenue.length ? topRevenue.map((a) => `\u2022 ${a.code} ${a.name}: ${fmt(a.revenue)}`).join("\n") : "\u0644\u0627 \u062A\u0648\u062C\u062F \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0645\u0639\u062A\u0645\u062F\u0629 \u0645\u0633\u062C\u0644\u0629 \u0628\u0639\u062F.";
      const topExpenseLine = topExpense.length ? topExpense.map((a) => `\u2022 ${a.code} ${a.name}: ${fmt(a.expense)}`).join("\n") : "\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0645\u0639\u062A\u0645\u062F\u0629 \u0645\u0633\u062C\u0644\u0629 \u0628\u0639\u062F.";
      const recommendations = [];
      if (totalRevenue === 0 && totalExpense === 0) {
        recommendations.push(
          "\u0627\u0628\u062F\u0623 \u0628\u062A\u0633\u062C\u064A\u0644 \u0623\u0648\u0644 \u062D\u0631\u0643\u0629 \u0645\u0627\u0644\u064A\u0629 \u0645\u0639\u062A\u0645\u062F\u0629 (\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0623\u0648 \u0645\u0635\u0631\u0648\u0641\u0627\u062A) \u0639\u0628\u0631 \u0623\u062F\u0627\u0629 \u0627\u0644\u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0633\u0631\u064A\u0639 \u2014 \u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0643\u0627\u0645\u0644 \u064A\u0628\u062F\u0623 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0639\u0646\u062F \u062A\u0648\u0641\u0631 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A."
        );
      } else {
        if (cashBalance < totalExpense * 0.15 && totalExpense > 0) {
          recommendations.push(
            `\u0627\u0644\u0633\u064A\u0648\u0644\u0629 \u0627\u0644\u0646\u0642\u062F\u064A\u0629 (${fmt(cashBalance)}) \u0623\u0642\u0644 \u0645\u0646 15% \u0645\u0646 \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u2014 \u0639\u062C\u0651\u0644 \u062A\u062D\u0635\u064A\u0644 \u0627\u0644\u0630\u0645\u0645 \u0648\u062D\u062F\u0651 \u0645\u0646 \u0627\u0644\u0633\u062D\u0648\u0628\u0627\u062A \u063A\u064A\u0631 \u0627\u0644\u0645\u062E\u0637\u0637 \u0644\u0647\u0627 \u0644\u062A\u063A\u0637\u064A\u0629 \u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A \u0627\u0644\u0642\u0627\u062F\u0645\u0629.`
          );
        } else if (totalExpense > 0) {
          recommendations.push(
            `\u0627\u0644\u0633\u064A\u0648\u0644\u0629 \u0627\u0644\u0646\u0642\u062F\u064A\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 (${fmt(cashBalance)}) \u062A\u063A\u0637\u064A \u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A \u0627\u0644\u062A\u0634\u063A\u064A\u0644 \u2014 \u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u0647\u0627\u0645\u0634 \u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0644\u0627 \u064A\u0642\u0644 \u0639\u0646 \u0634\u0647\u0631 \u0645\u0635\u0631\u0648\u0641\u0627\u062A.`
          );
        }
        if (expenseRatio > 70) {
          recommendations.push(
            `\u0646\u0633\u0628\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0625\u0644\u0649 \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A ${expenseRatio.toFixed(0)}% \u062A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0635\u062D\u064A (70%) \u2014 \u0631\u0627\u062C\u0639 \u0628\u0646\u0648\u062F \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u0643\u0628\u0631\u0649 \u0627\u0644\u062A\u0627\u0644\u064A\u0629 \u0644\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0641\u0627\u0648\u0636 \u0623\u0648 \u0627\u0644\u062A\u0631\u0634\u064A\u062F: ${topExpense.map((a) => a.name).join("\u060C ")}.`
          );
        } else if (margin > 15) {
          recommendations.push(
            `\u0647\u0627\u0645\u0634 \u0627\u0644\u0631\u0628\u062D \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A ${margin.toFixed(1)}% \u0642\u0648\u064A \u2014 \u0648\u062C\u0651\u0647 \u0627\u0644\u0641\u0627\u0626\u0636 \u0646\u062D\u0648 \u062D\u0633\u0627\u0628 \u0646\u0642\u062F\u064A/\u0627\u0633\u062A\u062B\u0645\u0627\u0631\u064A \u0645\u0646\u0641\u0635\u0644 \u0623\u0648 \u062A\u062E\u0641\u064A\u0636 \u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u062A\u0645\u0648\u064A\u0644 \u0625\u0630\u0627 \u0648\u064F\u062C\u062F \u0642\u0631\u0636.`
          );
        } else {
          recommendations.push(
            `\u0647\u0627\u0645\u0634 \u0627\u0644\u0631\u0628\u062D ${margin.toFixed(1)}% \u0645\u0642\u0628\u0648\u0644 \u2014 \u0631\u0643\u0651\u0632 \u0639\u0644\u0649 \u0646\u0645\u0648 \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0639\u0628\u0631 \u0623\u0643\u0628\u0631 3 \u0645\u0635\u0627\u062F\u0631 \u062D\u0627\u0644\u064A\u0627\u064B \u062B\u0645 \u0639\u0644\u0649 \u062A\u062B\u0628\u064A\u062A \u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644 \u0639\u0646\u062F \u0645\u0633\u062A\u0648\u0627\u0647\u0627 \u0627\u0644\u062D\u0627\u0644\u064A.`
          );
        }
        if (topExpense.length > 0) {
          recommendations.push(
            `\u062A\u0627\u0628\u0639 \u0634\u0647\u0631\u064A\u0627\u064B \u0627\u0644\u0628\u0646\u0648\u062F \u0627\u0644\u062B\u0644\u0627\u062B\u0629 \u0627\u0644\u0623\u0643\u0628\u0631 (${topExpense.map((a) => a.name).join("\u060C ")}) \u2014 \u062E\u0641\u0636 5% \u0645\u0646\u0647\u0627 \u064A\u0648\u0641\u0651\u0631 ${fmt(totalExpense * 0.05)} \u0633\u0646\u0648\u064A\u0627\u064B \u062A\u0642\u0631\u064A\u0628\u0627\u064B.`
          );
        }
      }
      const analysisText = [
        "\u2501\u2501\u2500 \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u062A\u0646\u0641\u064A\u0630\u064A \u2500\u2501\u2501",
        totalRevenue === 0 && totalExpense === 0 ? "\u0627\u0644\u0645\u0646\u0635\u0629 \u062C\u0627\u0647\u0632\u0629 \u0648\u0627\u0644\u0623\u062F\u0627\u0621 \u0627\u0644\u0645\u0627\u0644\u064A \u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0623\u0648\u0644 \u062D\u0631\u0643\u0629 \u0645\u0639\u062A\u0645\u062F\u0629." : `\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629: ${fmt(totalRevenue)}
\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629: ${fmt(totalExpense)}
\u0635\u0627\u0641\u064A \u0627\u0644\u062F\u062E\u0644 \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A: ${fmt(netIncome)} (\u0647\u0627\u0645\u0634 ${margin.toFixed(1)}%)
\u0646\u0633\u0628\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0625\u0644\u0649 \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A: ${expenseRatio.toFixed(0)}%`,
        "",
        "\u2501\u2501\u2500 \u0645\u0635\u0627\u062F\u0631 \u0627\u0644\u062A\u062F\u0641\u0642 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 \u2500\u2501\u2501",
        topRevenueLine,
        "",
        "\u2501\u2501\u2500 \u0623\u0643\u0628\u0631 \u0628\u0646\u0648\u062F \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u2500\u2501\u2501",
        topExpenseLine,
        "",
        "\u2501\u2501\u2500 \u0627\u0644\u0633\u064A\u0648\u0644\u0629 \u0648\u0627\u0644\u0643\u0641\u0627\u0621\u0629 \u2500\u2501\u2501",
        `\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0646\u0642\u062F\u064A (\u0627\u0644\u0635\u0646\u062F\u0648\u0642 + \u0627\u0644\u0628\u0646\u0648\u0643): ${fmt(cashBalance)}`,
        budgetLine,
        "",
        "\u2501\u2501\u2500 \u0627\u0644\u062A\u0648\u0635\u064A\u0627\u062A \u0627\u0644\u0630\u0643\u064A\u0629 (3) \u2500\u2501\u2501",
        recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")
      ].join("\n");
      if (ENV.forgeApiKey) {
        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "user",
                content: `\u0623\u0646\u062A \u0645\u0633\u0627\u0639\u062F \u0645\u0627\u0644\u064A \u062E\u0628\u064A\u0631 \u0644\u0646\u0638\u0627\u0645 ALHUSAINIA \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A. \u0625\u0644\u064A\u0643 \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0627\u0644\u064A\u0629 \u0645\u062D\u0633\u0648\u0628\u0629 \u0628\u062F\u0642\u0629 \u062A\u0634\u063A\u064A\u0644\u064A\u0629\u060C \u0641\u0642\u062F\u0645 \u062A\u062D\u0644\u064A\u0644\u0627\u064B \u0623\u0639\u0645\u0642 \u0645\u0628\u0646\u064A\u0627\u064B \u0639\u0644\u064A\u0647\u0627 \u062D\u0635\u0631\u0627\u064B (\u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629\u060C \u0623\u0633\u0644\u0648\u0628 \u0645\u0647\u0646\u064A):
${analysisText}
\u0645\u0644\u0627\u062D\u0638\u0629: \u0644\u0627 \u062A\u062E\u062A\u0644\u0642 \u0623\u0631\u0642\u0627\u0645\u0627\u064B\u061B \u0627\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0645\u0627 \u0648\u0631\u062F \u0641\u0642\u0637.`
              }
            ]
          });
          const content = response.choices[0]?.message?.content;
          if (typeof content === "string" && content.trim().length > 20) {
            return {
              analysis: content,
              status: "\u062A\u062D\u0644\u064A\u0644 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A (Forge LLM)",
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            };
          }
        } catch {
        }
      }
      return {
        analysis: analysisText,
        status: ENV.forgeApiKey ? "\u062A\u062D\u0644\u064A\u0644 \u0625\u062D\u0635\u0627\u0626\u064A \u0645\u062D\u0644\u064A (\u062A\u0639\u0630\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0640 LLM)" : "\u062A\u062D\u0644\u064A\u0644 \u0625\u062D\u0635\u0627\u0626\u064A \u0645\u062D\u0644\u064A \u0645\u0639\u062A\u0645\u062F",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    })
  }),
  // ─── Offline-First Sync Router ──────────────────────────────────
  sync: router({
    // Get all data for offline cache (full snapshot)
    getFullSnapshot: tenantProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId)
        return {
          accounts: [],
          transactions: [],
          settings: null,
          budgets: [],
          openingBalances: [],
          branches: [],
          tenants: [],
          products: [],
          warehouses: [],
          inventoryMovements: [],
          customers: [],
          suppliers: [],
          salesInvoices: [],
          salesInvoiceItems: [],
          purchaseInvoices: [],
          purchaseInvoiceItems: [],
          orders: [],
          orderItems: [],
          payments: [],
          activityLogs: []
        };
      const [
        allAccounts,
        allTransactions,
        settingsData,
        allBudgets,
        allOpeningBalances,
        allBranches,
        allTenants,
        allProducts,
        allWarehouses,
        allInventoryMovements,
        allCustomers,
        allSuppliers,
        allSalesInvoices,
        allSalesItems,
        allPurchaseInvoices,
        allPurchaseItems,
        allOrders,
        allOrderItems,
        allPayments,
        allActivityLogs
      ] = await Promise.all([
        db.select().from(accounts).orderBy(asc3(accounts.code)),
        db.select().from(transactions).orderBy(desc2(transactions.id)).limit(500),
        db.select().from(settings).limit(1),
        db.select().from(budgets).orderBy(desc2(budgets.id)),
        db.select().from(openingBalances),
        db.select().from(branches),
        db.select().from(tenants),
        db.select().from(products).orderBy(asc3(products.code)),
        db.select().from(warehouses),
        db.select().from(inventoryMovements).orderBy(desc2(inventoryMovements.createdAt)).limit(500),
        db.select().from(customers).orderBy(asc3(customers.code)),
        db.select().from(suppliers).orderBy(asc3(suppliers.code)),
        db.select().from(salesInvoices).orderBy(desc2(salesInvoices.createdAt)).limit(200),
        db.select().from(salesInvoiceItems),
        db.select().from(purchaseInvoices).orderBy(desc2(purchaseInvoices.createdAt)).limit(200),
        db.select().from(purchaseInvoiceItems),
        db.select().from(orders).orderBy(desc2(orders.createdAt)).limit(200),
        db.select().from(orderItems),
        db.select().from(payments).orderBy(desc2(payments.createdAt)).limit(500),
        db.select().from(activityLogs).orderBy(desc2(activityLogs.createdAt)).limit(200)
      ]);
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
    pushMutations: tenantProcedure.input(
      z4.object({
        mutations: z4.array(
          z4.object({
            table: z4.string(),
            operation: z4.enum(["create", "update", "delete"]),
            recordId: z4.string(),
            payload: z4.any(),
            timestamp: z4.number(),
            deviceId: z4.string()
          })
        )
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
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
              results.push({
                recordId: mutation.recordId,
                status: "ok",
                serverId: inserted[0]?.id
              });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(accounts).set({
                name: mutation.payload.name,
                code: mutation.payload.code,
                type: mutation.payload.type,
                isActive: mutation.payload.isActive,
                parentAccountId: mutation.payload.parentAccountId
              }).where(eq4(accounts.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "delete" && mutation.payload.id) {
              await db.delete(accounts).where(eq4(accounts.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "transactions") {
            if (mutation.operation === "create") {
              const inserted = await db.insert(transactions).values({
                tenantId: ctx.tenantId,
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
              results.push({
                recordId: mutation.recordId,
                status: "ok",
                serverId: inserted[0]?.id
              });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(transactions).set({
                amount: mutation.payload.amount,
                narration: mutation.payload.narration,
                notes: mutation.payload.notes,
                lifecycleStatus: mutation.payload.lifecycleStatus
              }).where(eq4(transactions.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "delete" && mutation.payload.id) {
              await db.delete(transactions).where(eq4(transactions.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "settings") {
            const existing = await db.select().from(settings).limit(1);
            if (existing.length > 0) {
              await db.update(settings).set(mutation.payload).where(eq4(settings.id, existing[0].id));
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
                and3(
                  eq4(openingBalances.accountId, mutation.payload.accountId),
                  eq4(
                    openingBalances.periodName,
                    mutation.payload.periodName
                  )
                )
              ).limit(1);
              if (existing.length > 0) {
                await db.update(openingBalances).set({
                  amount: mutation.payload.amount,
                  type: mutation.payload.type,
                  notes: mutation.payload.notes
                }).where(eq4(openingBalances.id, existing[0].id));
              } else {
                await db.insert(openingBalances).values(mutation.payload);
              }
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "products") {
            if (mutation.operation === "create") {
              await db.insert(products).values({
                ...mutation.payload,
                currentStock: mutation.payload.currentStock ?? 0
              });
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(products).set(mutation.payload).where(eq4(products.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "delete" && mutation.payload.id) {
              await db.delete(products).where(eq4(products.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "customers") {
            if (mutation.operation === "create") {
              await db.insert(customers).values({
                ...mutation.payload,
                balance: mutation.payload.balance ?? "0"
              });
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(customers).set(mutation.payload).where(eq4(customers.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "delete" && mutation.payload.id) {
              await db.delete(customers).where(eq4(customers.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "suppliers") {
            if (mutation.operation === "create") {
              await db.insert(suppliers).values({
                ...mutation.payload,
                balance: mutation.payload.balance ?? "0"
              });
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(suppliers).set(mutation.payload).where(eq4(suppliers.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "delete" && mutation.payload.id) {
              await db.delete(suppliers).where(eq4(suppliers.id, mutation.payload.id));
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
              results.push({
                recordId: mutation.recordId,
                status: "ok",
                serverId: inserted[0]?.id
              });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(salesInvoices).set(mutation.payload).where(eq4(salesInvoices.id, mutation.payload.id));
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
              results.push({
                recordId: mutation.recordId,
                status: "ok",
                serverId: inserted[0]?.id
              });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(purchaseInvoices).set(mutation.payload).where(eq4(purchaseInvoices.id, mutation.payload.id));
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
              results.push({
                recordId: mutation.recordId,
                status: "ok",
                serverId: inserted[0]?.id
              });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(orders).set(mutation.payload).where(eq4(orders.id, mutation.payload.id));
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
    getChangesSince: tenantProcedure.input(
      z4.object({
        since: z4.string().datetime(),
        tables: z4.array(z4.string()).optional()
      })
    ).query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { changes: {}, serverTime: (/* @__PURE__ */ new Date()).toISOString() };
      if (!ctx.tenantId) return { changes: {}, serverTime: (/* @__PURE__ */ new Date()).toISOString() };
      const sinceDate = new Date(input.since);
      const tablesToSync = input.tables || [
        "accounts",
        "transactions",
        "settings",
        "budgets",
        "openingBalances",
        "products",
        "warehouses",
        "inventoryMovements",
        "customers",
        "suppliers",
        "salesInvoices",
        "salesInvoiceItems",
        "purchaseInvoices",
        "purchaseInvoiceItems",
        "orders",
        "orderItems",
        "payments",
        "activityLogs",
        "branches",
        "tenants"
      ];
      const changes = {};
      for (const table of tablesToSync) {
        switch (table) {
          case "accounts":
            changes.accounts = await db.select().from(accounts).where(gte3(accounts.updatedAt, sinceDate));
            break;
          case "transactions":
            changes.transactions = await db.select().from(transactions).where(gte3(transactions.updatedAt, sinceDate));
            break;
          case "settings":
            changes.settings = await db.select().from(settings);
            break;
          case "budgets":
            changes.budgets = await db.select().from(budgets).where(gte3(budgets.createdAt, sinceDate));
            break;
          case "openingBalances":
            changes.openingBalances = await db.select().from(openingBalances).where(gte3(openingBalances.createdAt, sinceDate));
            break;
          case "products":
            changes.products = await db.select().from(products).where(gte3(products.updatedAt, sinceDate));
            break;
          case "warehouses":
            changes.warehouses = await db.select().from(warehouses).where(gte3(warehouses.createdAt, sinceDate));
            break;
          case "inventoryMovements":
            changes.inventoryMovements = await db.select().from(inventoryMovements).where(gte3(inventoryMovements.createdAt, sinceDate));
            break;
          case "customers":
            changes.customers = await db.select().from(customers).where(gte3(customers.updatedAt, sinceDate));
            break;
          case "suppliers":
            changes.suppliers = await db.select().from(suppliers).where(gte3(suppliers.updatedAt, sinceDate));
            break;
          case "salesInvoices":
            changes.salesInvoices = await db.select().from(salesInvoices).where(gte3(salesInvoices.updatedAt, sinceDate));
            break;
          case "salesInvoiceItems":
            changes.salesInvoiceItems = await db.select().from(salesInvoiceItems).where(gte3(salesInvoiceItems.createdAt, sinceDate));
            break;
          case "purchaseInvoices":
            changes.purchaseInvoices = await db.select().from(purchaseInvoices).where(gte3(purchaseInvoices.updatedAt, sinceDate));
            break;
          case "purchaseInvoiceItems":
            changes.purchaseInvoiceItems = await db.select().from(purchaseInvoiceItems).where(gte3(purchaseInvoiceItems.createdAt, sinceDate));
            break;
          case "orders":
            changes.orders = await db.select().from(orders).where(gte3(orders.updatedAt, sinceDate));
            break;
          case "orderItems":
            changes.orderItems = await db.select().from(orderItems).where(gte3(orderItems.createdAt, sinceDate));
            break;
          case "payments":
            changes.payments = await db.select().from(payments).where(gte3(payments.createdAt, sinceDate));
            break;
          case "activityLogs":
            changes.activityLogs = await db.select().from(activityLogs).where(gte3(activityLogs.createdAt, sinceDate));
            break;
          case "branches":
            changes.branches = await db.select().from(branches).where(gte3(branches.createdAt, sinceDate));
            break;
          case "tenants":
            changes.tenants = await db.select().from(tenants).where(gte3(tenants.createdAt, sinceDate));
            break;
        }
      }
      return {
        changes,
        serverTime: (/* @__PURE__ */ new Date()).toISOString()
      };
    }),
    // Heartbeat: check server status and exchange device clocks
    heartbeat: tenantProcedure.input(
      z4.object({
        deviceId: z4.string(),
        lastSyncAt: z4.number().optional(),
        pendingCount: z4.number().optional()
      })
    ).query(async ({ input }) => {
      const db = await getDb();
      const dbAvailable = !!db;
      let serverTxnCount = 0;
      if (db) {
        try {
          const [r] = await db.select({ count: sql3`count(*)::int` }).from(transactions).limit(1);
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
    list: tenantProcedure.input(
      z4.object({
        limit: z4.number().min(1).max(100).default(50),
        offset: z4.number().min(0).default(0),
        search: z4.string().optional(),
        category: z4.string().optional()
      }).optional()
    ).query(async ({ input, ctx }) => {
      if (!ctx.tenantId) return { items: [], total: 0 };
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const conditions = [eq4(products.isActive, true), eq4(products.tenantId, ctx.tenantId)];
      if (input?.search) {
        conditions.push(
          or2(
            ilike3(products.name, `%${input.search}%`),
            ilike3(products.code, `%${input.search}%`),
            ilike3(products.barcode, `%${input.search}%`)
          )
        );
      }
      if (input?.category)
        conditions.push(eq4(products.category, input.category));
      const where = and3(...conditions);
      const [countResult] = await db.select({ count: sql3`count(*)::int` }).from(products).where(where);
      const items = await db.select().from(products).where(where).orderBy(asc3(products.code)).limit(limit).offset(offset);
      return { items, total: countResult?.count ?? 0 };
    }),
    create: tenantProcedure.input(
      z4.object({
        code: z4.string().min(1).transform((v) => v.trim()),
        name: z4.string().min(1).transform((v) => v.trim()),
        nameAr: z4.string().optional(),
        type: z4.enum(["goods", "service"]).default("goods"),
        category: z4.string().optional().transform((v) => v?.trim() || void 0),
        unit: z4.string().default("\u0642\u0637\u0639\u0629"),
        purchasePrice: z4.string().default("0").refine((v) => {
          const n = parseFloat(v);
          return !isNaN(n) && isFinite(n) && n >= 0;
        }, "\u0633\u0639\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"),
        salePrice: z4.string().default("0").refine((v) => {
          const n = parseFloat(v);
          return !isNaN(n) && isFinite(n) && n >= 0;
        }, "\u0633\u0639\u0631 \u0627\u0644\u0628\u064A\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"),
        minStock: z4.number().int().min(0).default(0),
        barcode: z4.string().optional(),
        description: z4.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.transaction(async (tx) => {
        await tx.insert(products).values({ ...input, currentStock: 0 });
        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `\u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062A\u062C \u062C\u062F\u064A\u062F: ${input.name} (${input.code})`
        });
      });
      return { success: true };
    }),
    update: tenantProcedure.input(
      z4.object({
        id: z4.number(),
        name: z4.string().optional().transform((v) => v?.trim()),
        salePrice: z4.string().optional().refine(
          (v) => v === void 0 || !isNaN(parseFloat(v)) && isFinite(parseFloat(v)) && parseFloat(v) >= 0,
          "\u0633\u0639\u0631 \u0627\u0644\u0628\u064A\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"
        ),
        purchasePrice: z4.string().optional().refine(
          (v) => v === void 0 || !isNaN(parseFloat(v)) && isFinite(parseFloat(v)) && parseFloat(v) >= 0,
          "\u0633\u0639\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"
        ),
        minStock: z4.number().int().min(0).optional(),
        barcode: z4.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(products).set(data).where(and3(eq4(products.id, id), eq4(products.tenantId, ctx.tenantId)));
      return { success: true };
    }),
    adjustStock: tenantProcedure.input(
      z4.object({
        productId: z4.number(),
        quantity: z4.number().int().min(1, "\u0627\u0644\u0643\u0645\u064A\u0629 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 1"),
        type: z4.enum(["in", "out", "adjustment"]),
        notes: z4.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const product = await db.select().from(products).where(eq4(products.id, input.productId)).limit(1);
      if (product.length === 0) throw new Error("\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
      const currentStock = product[0].currentStock || 0;
      let newStock = currentStock;
      if (input.type === "in") {
        newStock = currentStock + input.quantity;
      } else if (input.type === "out") {
        if (currentStock < input.quantity) {
          throw new Error(
            `\u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u063A\u064A\u0631 \u0643\u0627\u0641\u064D \u2014 \u0627\u0644\u0645\u062A\u0648\u0641\u0631: ${currentStock}, \u0627\u0644\u0645\u0637\u0644\u0648\u0628: ${input.quantity}`
          );
        }
        newStock = currentStock - input.quantity;
      } else {
        newStock = input.quantity;
      }
      await db.transaction(async (tx) => {
        if (input.type === "in") {
          await tx.update(products).set({
            currentStock: sql3`${products.currentStock} + ${input.quantity}`
          }).where(eq4(products.id, input.productId));
        } else if (input.type === "out") {
          const done = await tx.update(products).set({
            currentStock: sql3`${products.currentStock} - ${input.quantity}`
          }).where(
            and3(
              eq4(products.id, input.productId),
              gte3(products.currentStock, input.quantity)
            )
          ).returning({ id: products.id });
          if (done.length === 0)
            throw new Error(
              `\u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u063A\u064A\u0631 \u0643\u0627\u0641\u064D \u2014 \u0627\u0644\u0645\u062A\u0648\u0641\u0631 \u0627\u0644\u062D\u0627\u0644\u064A \u0623\u0642\u0644 \u0645\u0646 ${input.quantity}`
            );
        } else {
          await tx.update(products).set({ currentStock: input.quantity }).where(eq4(products.id, input.productId));
        }
        await tx.insert(inventoryMovements).values({
          productId: input.productId,
          type: input.type,
          quantity: input.quantity,
          notes: input.notes || null
        });
        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `\u062A\u0639\u062F\u064A\u0644 \u0645\u062E\u0632\u0648\u0646: ${product[0].name} (${input.type === "in" ? "\u0625\u062F\u062E\u0627\u0644" : input.type === "out" ? "\u0625\u062E\u0631\u0627\u062C" : "\u062A\u0633\u0648\u064A\u0629"}: ${input.quantity})`,
          details: `\u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0627\u0644\u0633\u0627\u0628\u0642: ${currentStock} \u2014 \u0627\u0644\u062C\u062F\u064A\u062F: ${newStock}`
        });
      });
      return { success: true, previousStock: currentStock, newStock };
    }),
    movements: publicProcedure.input(
      z4.object({
        productId: z4.number().optional()
      }).optional()
    ).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      if (input?.productId) {
        return await db.select().from(inventoryMovements).where(eq4(inventoryMovements.productId, input.productId)).orderBy(desc2(inventoryMovements.createdAt));
      }
      return await db.select().from(inventoryMovements).orderBy(desc2(inventoryMovements.createdAt));
    }),
    importCsv: tenantProcedure.input(
      z4.object({
        rows: z4.array(
          z4.object({
            code: z4.string().min(1).transform((v) => v.trim()),
            name: z4.string().min(1).transform((v) => v.trim()),
            type: z4.enum(["goods", "service"]).default("goods"),
            category: z4.string().optional().transform((v) => v?.trim() || void 0),
            unit: z4.string().default("\u0642\u0637\u0639\u0629"),
            purchasePrice: z4.string().default("0").refine((v) => {
              const n = parseFloat(v);
              return !isNaN(n) && isFinite(n) && n >= 0;
            }, "\u0633\u0639\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"),
            salePrice: z4.string().default("0").refine((v) => {
              const n = parseFloat(v);
              return !isNaN(n) && isFinite(n) && n >= 0;
            }, "\u0633\u0639\u0631 \u0627\u0644\u0628\u064A\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"),
            wholesalePrice: z4.string().default("0").refine((v) => {
              const n = parseFloat(v);
              return !isNaN(n) && isFinite(n) && n >= 0;
            }, "\u0633\u0639\u0631 \u0627\u0644\u062C\u0645\u0644\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"),
            minStock: z4.number().int().min(0).default(0),
            currentStock: z4.number().int().min(0).default(0),
            barcode: z4.string().optional()
          })
        ).min(1).max(500)
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const seen = /* @__PURE__ */ new Set();
      const errors = [];
      let created = 0;
      let updated = 0;
      for (let i = 0; i < input.rows.length; i++) {
        const r = input.rows[i];
        const rowNo = i + 2;
        try {
          if (seen.has(r.code)) {
            errors.push({
              row: rowNo,
              message: `\u0631\u0645\u0632 \u0645\u0643\u0631\u0631 \u062F\u0627\u062E\u0644 \u0627\u0644\u0645\u0644\u0641: ${r.code}`
            });
            continue;
          }
          seen.add(r.code);
          await db.transaction(async (tx) => {
            const existing = await tx.select().from(products).where(eq4(products.code, r.code)).limit(1);
            const values = {
              name: r.name,
              type: r.type,
              category: r.category || null,
              unit: r.unit || "\u0642\u0637\u0639\u0629",
              purchasePrice: r.purchasePrice || "0",
              salePrice: r.salePrice || "0",
              wholesalePrice: r.wholesalePrice || "0",
              minStock: r.minStock || 0,
              barcode: r.barcode || null,
              isActive: true
            };
            if (existing.length > 0) {
              await tx.update(products).set(values).where(eq4(products.id, existing[0].id));
              const prevStock = existing[0].currentStock || 0;
              if (r.currentStock !== prevStock) {
                await tx.update(products).set({
                  currentStock: sql3`${products.currentStock} + ${r.currentStock - prevStock}`
                }).where(eq4(products.id, existing[0].id));
                await tx.insert(inventoryMovements).values({
                  productId: existing[0].id,
                  type: "adjustment",
                  quantity: Math.abs(r.currentStock - prevStock),
                  notes: `${r.currentStock > prevStock ? "\u062A\u0632\u0648\u064A\u062F" : "\u0635\u0631\u0641"} \u0639\u0628\u0631 \u0627\u0633\u062A\u064A\u0631\u0627\u062F CSV (\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062C\u062F\u064A\u062F ${r.currentStock})`
                });
              }
              updated++;
            } else {
              await tx.insert(products).values({
                ...values,
                code: r.code,
                currentStock: r.currentStock
              });
              created++;
            }
          });
        } catch (e) {
          errors.push({ row: rowNo, message: String(e?.message || e) });
        }
      }
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0623\u0635\u0646\u0627\u0641 CSV: ${created} \u062C\u062F\u064A\u062F\u060C ${updated} \u062A\u062D\u062F\u064A\u062B\u060C ${errors.length} \u062E\u0637\u0623`
      });
      return { created, updated, errors };
    })
  }),
  // ─── Customers ──────────────────────────────────────────────────
  customers: router({
    list: tenantProcedure.input(
      z4.object({
        limit: z4.number().min(1).max(100).default(50),
        offset: z4.number().min(0).default(0),
        search: z4.string().optional()
      }).optional()
    ).query(async ({ input, ctx }) => {
      if (!ctx.tenantId) return { items: [], total: 0 };
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const conditions = [eq4(customers.isActive, true), eq4(customers.tenantId, ctx.tenantId)];
      if (input?.search) {
        conditions.push(
          or2(
            ilike3(customers.name, `%${input.search}%`),
            ilike3(customers.code, `%${input.search}%`),
            ilike3(customers.phone, `%${input.search}%`)
          )
        );
      }
      const where = and3(...conditions);
      const [countResult] = await db.select({ count: sql3`count(*)::int` }).from(customers).where(where);
      const items = await db.select().from(customers).where(where).orderBy(asc3(customers.code)).limit(limit).offset(offset);
      return { items, total: countResult?.count ?? 0 };
    }),
    create: tenantProcedure.input(
      z4.object({
        code: z4.string().min(1),
        name: z4.string().min(1),
        phone: z4.string().optional(),
        email: z4.string().optional(),
        address: z4.string().optional(),
        city: z4.string().optional(),
        taxNumber: z4.string().optional(),
        creditLimit: z4.string().default("0"),
        notes: z4.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(customers).values({ ...input, tenantId: ctx.tenantId, balance: "0" });
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `\u0625\u0636\u0627\u0641\u0629 \u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F: ${input.name} (${input.code})`
      });
      return { success: true };
    }),
    update: tenantProcedure.input(
      z4.object({
        id: z4.number(),
        name: z4.string().optional(),
        phone: z4.string().optional(),
        email: z4.string().optional(),
        address: z4.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(customers).set(data).where(and3(eq4(customers.id, id), eq4(customers.tenantId, ctx.tenantId)));
      return { success: true };
    })
  }),
  // ─── Suppliers ──────────────────────────────────────────────────
  suppliers: router({
    list: tenantProcedure.input(
      z4.object({
        limit: z4.number().min(1).max(100).default(50),
        offset: z4.number().min(0).default(0),
        search: z4.string().optional()
      }).optional()
    ).query(async ({ input, ctx }) => {
      if (!ctx.tenantId) return { items: [], total: 0 };
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const conditions = [eq4(suppliers.isActive, true), eq4(suppliers.tenantId, ctx.tenantId)];
      if (input?.search) {
        conditions.push(
          or2(
            ilike3(suppliers.name, `%${input.search}%`),
            ilike3(suppliers.code, `%${input.search}%`),
            ilike3(suppliers.phone, `%${input.search}%`)
          )
        );
      }
      const where = and3(...conditions);
      const [countResult] = await db.select({ count: sql3`count(*)::int` }).from(suppliers).where(where);
      const items = await db.select().from(suppliers).where(where).orderBy(asc3(suppliers.code)).limit(limit).offset(offset);
      return { items, total: countResult?.count ?? 0 };
    }),
    create: tenantProcedure.input(
      z4.object({
        code: z4.string().min(1),
        name: z4.string().min(1),
        phone: z4.string().optional(),
        email: z4.string().optional(),
        address: z4.string().optional(),
        city: z4.string().optional(),
        taxNumber: z4.string().optional(),
        notes: z4.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(suppliers).values({ ...input, tenantId: ctx.tenantId, balance: "0" });
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `\u0625\u0636\u0627\u0641\u0629 \u0645\u0648\u0631\u062F \u062C\u062F\u064A\u062F: ${input.name} (${input.code})`
      });
      return { success: true };
    }),
    update: tenantProcedure.input(
      z4.object({
        id: z4.number(),
        name: z4.string().optional(),
        phone: z4.string().optional(),
        email: z4.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(suppliers).set(data).where(and3(eq4(suppliers.id, id), eq4(suppliers.tenantId, ctx.tenantId)));
      return { success: true };
    })
  }),
  // ─── Sales & POS ────────────────────────────────────────────────
  sales: router({
    list: tenantProcedure.input(
      z4.object({
        limit: z4.number().min(1).max(100).default(50),
        offset: z4.number().min(0).default(0),
        status: z4.enum(["draft", "confirmed", "paid", "partial", "cancelled"]).optional(),
        customerId: z4.number().optional()
      }).optional()
    ).query(async ({ input, ctx }) => {
      if (!ctx.tenantId) return { items: [], total: 0 };
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const conditions = [eq4(salesInvoices.tenantId, ctx.tenantId)];
      if (input?.status)
        conditions.push(eq4(salesInvoices.status, input.status));
      if (input?.customerId)
        conditions.push(eq4(salesInvoices.customerId, input.customerId));
      const where = and3(...conditions);
      const [countResult] = await db.select({ count: sql3`count(*)::int` }).from(salesInvoices).where(where);
      const items = await db.select().from(salesInvoices).where(where).orderBy(desc2(salesInvoices.createdAt)).limit(limit).offset(offset);
      return { items, total: countResult?.count ?? 0 };
    }),
    getInvoiceDetails: tenantProcedure.input(z4.object({ id: z4.number() })).query(async ({ input, ctx }) => {
      if (!ctx.tenantId) return null;
      const db = await getDb();
      if (!db) return null;
      const [invoice] = await db.select().from(salesInvoices).where(and3(eq4(salesInvoices.id, input.id), eq4(salesInvoices.tenantId, ctx.tenantId))).limit(1);
      if (!invoice) return null;
      const customer = invoice.customerId ? (await db.select().from(customers).where(eq4(customers.id, invoice.customerId)).limit(1))[0] ?? null : null;
      const items = await db.select().from(salesInvoiceItems).where(eq4(salesInvoiceItems.invoiceId, invoice.id)).orderBy(asc3(salesInvoiceItems.id));
      return { invoice, customer, items };
    }),
    create: tenantProcedure.input(
      z4.object({
        customerId: z4.number().optional(),
        items: z4.array(
          z4.object({
            productId: z4.number(),
            productName: z4.string().min(1),
            quantity: z4.number().int().min(1),
            unitPrice: z4.string().refine(
              (v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0,
              "\u0627\u0644\u0633\u0639\u0631 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064B \u0645\u0648\u062C\u0628\u0627\u064B"
            ),
            discount: z4.string().default("0")
          })
        ).min(1, "\u064A\u062C\u0628 \u0625\u0636\u0627\u0641\u0629 \u0635\u0646\u0641 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644"),
        discount: z4.string().default("0"),
        taxRate: z4.string().default("0"),
        paymentMethod: z4.enum(["cash", "card", "transfer", "credit", "online"]).default("cash"),
        paidAmount: z4.string().default("0"),
        notes: z4.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await seedDefaultAccountsForTenant(ctx.tenantId);
      const discount = parseFloat(input.discount);
      const taxRate = parseFloat(input.taxRate);
      if (isNaN(discount) || discount < 0) throw new Error("\u0627\u0644\u062E\u0635\u0645 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D");
      if (isNaN(taxRate) || taxRate < 0 || taxRate > 100)
        throw new Error("\u0646\u0633\u0628\u0629 \u0627\u0644\u0636\u0631\u064A\u0628\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629");
      const now = /* @__PURE__ */ new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const randPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const invoiceNumber = `SI-${datePart}-${randPart}`;
      const productIds = input.items.map((i) => i.productId);
      const productRows = await db.select().from(products).where(inArray2(products.id, productIds));
      const productMap = new Map(productRows.map((p) => [p.id, p]));
      for (const item of input.items) {
        const prod = productMap.get(item.productId);
        if (!prod) throw new Error(`\u0627\u0644\u0645\u0646\u062A\u062C \u0631\u0642\u0645 ${item.productId} \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F`);
        if (prod.currentStock < item.quantity) {
          throw new Error(
            `\u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u063A\u064A\u0631 \u0643\u0627\u0641\u064D \u0644\u0644\u0645\u0646\u062A\u062C "${prod.name}" \u2014 \u0627\u0644\u0645\u062A\u0648\u0641\u0631: ${prod.currentStock}, \u0627\u0644\u0645\u0637\u0644\u0648\u0628: ${item.quantity}`
          );
        }
      }
      const subtotal = input.items.reduce(
        (sum, item) => sum + parseFloat(item.unitPrice) * item.quantity,
        0
      );
      const taxAmount = (subtotal - discount) * taxRate / 100;
      const total = subtotal - discount + taxAmount;
      const paidAmount = parseFloat(input.paidAmount);
      if (isNaN(paidAmount) || paidAmount < 0)
        throw new Error("\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u062F\u0641\u0648\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D");
      if (paidAmount > total + 0.01)
        throw new Error("\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u062F\u0641\u0648\u0639 \u064A\u062A\u062C\u0627\u0648\u0632 \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629");
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
          await tx.update(products).set({
            currentStock: sql3`${products.currentStock} - ${item.quantity}`
          }).where(eq4(products.id, item.productId));
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
            await tx.update(customers).set({ balance: sql3`${customers.balance} + ${unpaidAmount}` }).where(eq4(customers.id, input.customerId));
          }
        }
        await postInvoiceGlEntries(tx, {
          kind: "sale",
          invoiceId: invoice.id,
          invoiceNumber,
          total,
          paidAmount,
          branchId: null,
          userId: ctx.user.id,
          tenantId: ctx.tenantId
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
    updateStatus: tenantProcedure.input(
      z4.object({
        id: z4.number(),
        status: z4.enum([
          "draft",
          "confirmed",
          "paid",
          "partial",
          "cancelled"
        ])
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(salesInvoices).where(eq4(salesInvoices.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
      const inv = existing[0];
      if (inv.status === "cancelled" && input.status !== "cancelled") {
        throw new Error("\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0644\u063A\u0627\u0629 \u0648\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0639\u0627\u062F\u0629 \u062A\u0641\u0639\u064A\u0644\u0647\u0627");
      }
      if (inv.status === input.status)
        return { success: true, unchanged: true };
      const cancelFlow = input.status === "cancelled" && inv.status !== "draft";
      const items = cancelFlow ? await db.select().from(salesInvoiceItems).where(eq4(salesInvoiceItems.invoiceId, inv.id)) : [];
      const itemPayments = cancelFlow ? await db.select().from(payments).where(
        and3(
          eq4(payments.source, "sales"),
          eq4(payments.invoiceId, inv.id)
        )
      ) : [];
      await db.transaction(async (tx) => {
        if (cancelFlow) {
          for (const item of items) {
            await tx.update(products).set({
              currentStock: sql3`${products.currentStock} + ${item.quantity}`
            }).where(eq4(products.id, item.productId));
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
              await tx.update(customers).set({
                balance: sql3`${customers.balance} - ${reversedUnpaid}`
              }).where(eq4(customers.id, inv.customerId));
            }
          }
          for (const p of itemPayments) {
            await tx.update(payments).set({ notes: `\u0645\u0633\u062A\u0631\u062F\u0629 \u2014 \u0625\u0644\u063A\u0627\u0621 \u0641\u0627\u062A\u0648\u0631\u0629 ${inv.invoiceNumber}` }).where(eq4(payments.id, p.id));
          }
          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `\u0625\u0644\u063A\u0627\u0621 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0628\u064A\u0639\u0627\u062A: ${inv.invoiceNumber}`,
            details: `\u062A\u0645 \u0639\u0643\u0633 \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0648\u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629`
          });
        }
        await tx.update(salesInvoices).set({ status: input.status, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(salesInvoices.id, inv.id));
        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `\u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A ${inv.invoiceNumber} \u0625\u0644\u0649 "${input.status}"`
        });
      });
      return { success: true };
    }),
    getItems: tenantProcedure.input(
      z4.object({
        invoiceId: z4.number()
      })
    ).query(async ({ input, ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      const [invoice] = await db.select({ id: salesInvoices.id }).from(salesInvoices).where(and3(eq4(salesInvoices.id, input.invoiceId), eq4(salesInvoices.tenantId, ctx.tenantId))).limit(1);
      if (!invoice) return [];
      return await db.select().from(salesInvoiceItems).where(eq4(salesInvoiceItems.invoiceId, input.invoiceId));
    })
  }),
  // ─── Purchases ──────────────────────────────────────────────────
  purchases: router({
    list: tenantProcedure.input(
      z4.object({
        limit: z4.number().min(1).max(100).default(50),
        offset: z4.number().min(0).default(0),
        status: z4.enum(["draft", "confirmed", "paid", "partial", "cancelled"]).optional(),
        supplierId: z4.number().optional()
      }).optional()
    ).query(async ({ input, ctx }) => {
      if (!ctx.tenantId) return { items: [], total: 0 };
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const conditions = [eq4(purchaseInvoices.tenantId, ctx.tenantId)];
      if (input?.status)
        conditions.push(eq4(purchaseInvoices.status, input.status));
      if (input?.supplierId)
        conditions.push(eq4(purchaseInvoices.supplierId, input.supplierId));
      const where = and3(...conditions);
      const [countResult] = await db.select({ count: sql3`count(*)::int` }).from(purchaseInvoices).where(where);
      const items = await db.select().from(purchaseInvoices).where(where).orderBy(desc2(purchaseInvoices.createdAt)).limit(limit).offset(offset);
      return { items, total: countResult?.count ?? 0 };
    }),
    create: tenantProcedure.input(
      z4.object({
        supplierId: z4.number().optional(),
        items: z4.array(
          z4.object({
            productId: z4.number(),
            productName: z4.string().min(1),
            quantity: z4.number().int().min(1),
            unitPrice: z4.string().refine(
              (v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0,
              "\u0627\u0644\u0633\u0639\u0631 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064B \u0645\u0648\u062C\u0628\u0627\u064B"
            ),
            discount: z4.string().default("0")
          })
        ).min(1, "\u064A\u062C\u0628 \u0625\u0636\u0627\u0641\u0629 \u0635\u0646\u0641 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644"),
        discount: z4.string().default("0"),
        taxRate: z4.string().default("0"),
        paymentMethod: z4.enum(["cash", "card", "transfer", "credit", "online"]).default("cash"),
        paidAmount: z4.string().default("0"),
        notes: z4.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await seedDefaultAccountsForTenant(ctx.tenantId);
      const discount = parseFloat(input.discount);
      const taxRate = parseFloat(input.taxRate);
      if (isNaN(discount) || discount < 0) throw new Error("\u0627\u0644\u062E\u0635\u0645 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D");
      if (isNaN(taxRate) || taxRate < 0 || taxRate > 100)
        throw new Error("\u0646\u0633\u0628\u0629 \u0627\u0644\u0636\u0631\u064A\u0628\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629");
      const now = /* @__PURE__ */ new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const randPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const invoiceNumber = `PI-${datePart}-${randPart}`;
      const productIds = input.items.map((i) => i.productId);
      const productRows = await db.select().from(products).where(inArray2(products.id, productIds));
      const productMap = new Map(productRows.map((p) => [p.id, p]));
      for (const item of input.items) {
        if (!productMap.has(item.productId))
          throw new Error(`\u0627\u0644\u0645\u0646\u062A\u062C \u0631\u0642\u0645 ${item.productId} \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F`);
      }
      const subtotal = input.items.reduce(
        (sum, item) => sum + parseFloat(item.unitPrice) * item.quantity,
        0
      );
      const taxAmount = (subtotal - discount) * taxRate / 100;
      const total = subtotal - discount + taxAmount;
      const paidAmount = parseFloat(input.paidAmount);
      if (isNaN(paidAmount) || paidAmount < 0)
        throw new Error("\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u062F\u0641\u0648\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D");
      if (paidAmount > total + 0.01)
        throw new Error("\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u062F\u0641\u0648\u0639 \u064A\u062A\u062C\u0627\u0648\u0632 \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629");
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
          await tx.update(products).set({
            currentStock: sql3`${products.currentStock} + ${item.quantity}`
          }).where(eq4(products.id, item.productId));
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
            await tx.update(suppliers).set({ balance: sql3`${suppliers.balance} + ${unpaidAmount}` }).where(eq4(suppliers.id, input.supplierId));
          }
        }
        await postInvoiceGlEntries(tx, {
          kind: "purchase",
          invoiceId: invoice.id,
          invoiceNumber,
          total,
          paidAmount,
          branchId: null,
          userId: ctx.user.id,
          tenantId: ctx.tenantId
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
    updateStatus: tenantProcedure.input(
      z4.object({
        id: z4.number(),
        status: z4.enum([
          "draft",
          "confirmed",
          "paid",
          "partial",
          "cancelled"
        ])
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(purchaseInvoices).where(eq4(purchaseInvoices.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
      const inv = existing[0];
      if (inv.status === "cancelled" && input.status !== "cancelled") {
        throw new Error("\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0644\u063A\u0627\u0629 \u0648\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0639\u0627\u062F\u0629 \u062A\u0641\u0639\u064A\u0644\u0647\u0627");
      }
      if (inv.status === input.status)
        return { success: true, unchanged: true };
      const cancelFlow = input.status === "cancelled" && inv.status !== "draft";
      const items = cancelFlow ? await db.select().from(purchaseInvoiceItems).where(eq4(purchaseInvoiceItems.invoiceId, inv.id)) : [];
      await db.transaction(async (tx) => {
        if (cancelFlow) {
          for (const item of items) {
            await tx.update(products).set({
              currentStock: sql3`${products.currentStock} - ${item.quantity}`
            }).where(eq4(products.id, item.productId));
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
              await tx.update(suppliers).set({
                balance: sql3`${suppliers.balance} - ${reversedUnpaid}`
              }).where(eq4(suppliers.id, inv.supplierId));
            }
          }
          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `\u0625\u0644\u063A\u0627\u0621 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0634\u062A\u0631\u064A\u0627\u062A: ${inv.invoiceNumber}`,
            details: `\u062A\u0645 \u0639\u0643\u0633 \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0648\u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629`
          });
        }
        await tx.update(purchaseInvoices).set({ status: input.status, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(purchaseInvoices.id, inv.id));
        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `\u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A ${inv.invoiceNumber} \u0625\u0644\u0649 "${input.status}"`
        });
      });
      return { success: true };
    }),
    getItems: tenantProcedure.input(
      z4.object({
        invoiceId: z4.number()
      })
    ).query(async ({ input, ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      const [invoice] = await db.select({ id: purchaseInvoices.id }).from(purchaseInvoices).where(and3(eq4(purchaseInvoices.id, input.invoiceId), eq4(purchaseInvoices.tenantId, ctx.tenantId))).limit(1);
      if (!invoice) return [];
      return await db.select().from(purchaseInvoiceItems).where(eq4(purchaseInvoiceItems.invoiceId, input.invoiceId));
    })
  }),
  // ─── Orders & Distribution ──────────────────────────────────────
  orders: router({
    list: publicProcedure.input(
      z4.object({
        limit: z4.number().min(1).max(100).default(50),
        offset: z4.number().min(0).default(0),
        status: z4.enum([
          "pending",
          "confirmed",
          "processing",
          "shipped",
          "delivered",
          "cancelled"
        ]).optional()
      }).optional()
    ).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const where = input?.status ? eq4(orders.status, input.status) : void 0;
      const [countResult] = await db.select({ count: sql3`count(*)::int` }).from(orders).where(where);
      const items = await db.select().from(orders).where(where).orderBy(desc2(orders.createdAt)).limit(limit).offset(offset);
      return { items, total: countResult?.count ?? 0 };
    }),
    create: tenantProcedure.input(
      z4.object({
        customerId: z4.number().optional(),
        items: z4.array(
          z4.object({
            productId: z4.number(),
            productName: z4.string().min(1),
            quantity: z4.number().int().min(1),
            unitPrice: z4.string().refine(
              (v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0,
              "\u0627\u0644\u0633\u0639\u0631 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064B \u0645\u0648\u062C\u0628\u0627\u064B"
            )
          })
        ).min(1, "\u064A\u062C\u0628 \u0625\u0636\u0627\u0641\u0629 \u0635\u0646\u0641 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644"),
        deliveryAddress: z4.string().optional(),
        deliveryDate: z4.string().optional(),
        deliveryNotes: z4.string().optional(),
        assignedTo: z4.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const mergedMap = /* @__PURE__ */ new Map();
      for (const it of input.items)
        mergedMap.set(
          it.productId,
          (mergedMap.get(it.productId) || 0) + it.quantity
        );
      const effectiveItems = Array.from(mergedMap.entries()).map(
        ([productId, quantity]) => {
          const orig = input.items.find((i) => i.productId === productId);
          return {
            productId,
            quantity,
            unitPrice: orig.unitPrice,
            productName: orig.productName
          };
        }
      );
      const productIds = effectiveItems.map((i) => i.productId);
      const productRows = await db.select().from(products).where(inArray2(products.id, productIds));
      if (productRows.length !== productIds.length)
        throw new Error("\u0648\u0627\u062D\u062F \u0623\u0648 \u0623\u0643\u062B\u0631 \u0645\u0646 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
      const total = effectiveItems.reduce(
        (sum, item) => sum + parseFloat(item.unitPrice) * item.quantity,
        0
      );
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
        const itemValues = effectiveItems.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: (parseFloat(item.unitPrice) * item.quantity).toString()
        }));
        await tx.insert(orderItems).values(itemValues);
        for (const item of itemValues) {
          const updated = await tx.update(products).set({
            currentStock: sql3`${products.currentStock} - ${item.quantity}`
          }).where(
            and3(
              eq4(products.id, item.productId),
              gte3(products.currentStock, item.quantity)
            )
          ).returning({ id: products.id });
          if (updated.length === 0)
            throw new Error(
              `\u0627\u0644\u0643\u0645\u064A\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0645\u0646 \xAB${item.productName}\xBB \u062A\u062C\u0627\u0648\u0632\u062A \u0627\u0644\u0645\u062A\u0648\u0641\u0631 \u0639\u0646\u062F \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0637\u0644\u0628`
            );
          await tx.insert(inventoryMovements).values({
            productId: item.productId,
            type: "out",
            quantity: item.quantity,
            referenceId: order.id,
            referenceType: "order",
            notes: `\u0637\u0644\u0628 \u062A\u0648\u0632\u064A\u0639 ${orderNumber}`
          });
        }
        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `\u0625\u0646\u0634\u0627\u0621 \u0637\u0644\u0628 \u062A\u0648\u0632\u064A\u0639: ${orderNumber}`,
          details: `\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A: ${total}`
        });
        return { orderId: order.id, orderNumber };
      });
      return { success: true, ...result };
    }),
    updateStatus: tenantProcedure.input(
      z4.object({
        id: z4.number(),
        status: z4.enum([
          "pending",
          "confirmed",
          "processing",
          "shipped",
          "delivered",
          "cancelled"
        ])
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(orders).where(eq4(orders.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
      const currentStatus = existing[0].status;
      if (currentStatus === "delivered") {
        throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u063A\u064A\u064A\u0631 \u062D\u0627\u0644\u0629 \u0637\u0644\u0628 \u0645\u064F\u0633\u0644\u0651\u0645 \u0623\u0648 \u0645\u064F\u0644\u063A\u0649");
      }
      if (currentStatus === "cancelled" && input.status !== "cancelled") {
        throw new Error("\u0627\u0644\u0637\u0644\u0628 \u0645\u064F\u0644\u063A\u0649 \u0648\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0639\u0627\u062F\u0629 \u062A\u0641\u0639\u064A\u0644\u0647");
      }
      const result = await db.transaction(async (tx) => {
        await tx.update(orders).set({ status: input.status, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(orders.id, input.id));
        if (input.status === "cancelled") {
          const linked = await tx.select().from(salesInvoices).where(ilike3(salesInvoices.notes, `%${existing[0].orderNumber}%`)).limit(1);
          if (linked.length === 0) {
            const items = await tx.select().from(orderItems).where(eq4(orderItems.orderId, input.id));
            for (const it of items) {
              await tx.update(products).set({
                currentStock: sql3`${products.currentStock} + ${it.quantity}`
              }).where(eq4(products.id, it.productId));
              await tx.insert(inventoryMovements).values({
                productId: it.productId,
                type: "in",
                quantity: it.quantity,
                referenceId: input.id,
                referenceType: "order",
                notes: `\u0625\u0644\u063A\u0627\u0621 \u0637\u0644\u0628 ${existing[0].orderNumber}`
              });
            }
          }
        }
        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `\u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628 #${input.id} \u0645\u0646 "${currentStatus}" \u0625\u0644\u0649 "${input.status}"`
        });
        return { success: true };
      });
      return result;
    }),
    // Convert a (web/store) order into an official sales invoice + auto-posting GL entries
    // Stock was already reserved at order time — no second deduction happens here.
    createSaleInvoice: tenantProcedure.input(
      z4.object({
        orderId: z4.number(),
        paymentMethod: z4.enum(["cash", "card", "transfer", "credit", "online"]).default("cash"),
        paidAmount: z4.string().default("0").refine((v) => {
          const n = parseFloat(v);
          return !isNaN(n) && isFinite(n) && n >= 0;
        }, "\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u062F\u0641\u0648\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D")
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await seedDefaultAccountsForTenant(ctx.tenantId);
      const [order] = await db.select().from(orders).where(eq4(orders.id, input.orderId)).limit(1);
      if (!order) throw new Error("\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
      if (order.status === "cancelled")
        throw new Error("\u0627\u0644\u0637\u0644\u0628 \u0645\u064F\u0644\u063A\u0649 \u0648\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u062D\u0648\u064A\u0644\u0647");
      const items = await db.select().from(orderItems).where(eq4(orderItems.orderId, order.id));
      if (items.length === 0) throw new Error("\u0627\u0644\u0637\u0644\u0628 \u0644\u0627 \u064A\u062D\u062A\u0648\u064A \u0623\u0635\u0646\u0627\u0641\u0627\u064B");
      const subtotal = items.reduce(
        (s, it) => s + parseFloat(it.unitPrice || "0") * it.quantity,
        0
      );
      const total = subtotal;
      const paidAmount = parseFloat(input.paidAmount || "0");
      if (paidAmount > total + 0.01)
        throw new Error("\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u062F\u0641\u0648\u0639 \u064A\u062A\u062C\u0627\u0648\u0632 \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629");
      const status = paidAmount >= total - 0.01 ? "paid" : paidAmount > 0 ? "partial" : "confirmed";
      const now = /* @__PURE__ */ new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const randPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const invoiceNumber = `SI-${datePart}-${randPart}`;
      const result = await db.transaction(async (tx) => {
        const prior = await tx.select().from(salesInvoices).where(ilike3(salesInvoices.notes, `%${order.orderNumber}%`)).limit(1);
        if (prior.length > 0)
          throw new Error(
            `\u062A\u0645 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0637\u0644\u0628 \u0645\u0633\u0628\u0642\u0627\u064B \u0625\u0644\u0649 \u0641\u0627\u062A\u0648\u0631\u0629 ${prior[0].invoiceNumber}`
          );
        const fresh = await tx.select().from(orders).where(eq4(orders.id, order.id)).limit(1);
        if (fresh.length === 0 || fresh[0].status === "cancelled")
          throw new Error("\u0627\u0644\u0637\u0644\u0628 \u0645\u064F\u0644\u063A\u0649 \u0648\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u062D\u0648\u064A\u0644\u0647");
        const [invoice] = await tx.insert(salesInvoices).values({
          invoiceNumber,
          customerId: order.customerId || null,
          status,
          subtotal: subtotal.toFixed(2),
          discount: "0",
          taxRate: "0",
          taxAmount: "0",
          total: total.toFixed(2),
          paidAmount: paidAmount.toFixed(2),
          paymentMethod: input.paymentMethod,
          notes: `\u062A\u062D\u0648\u064A\u0644 \u0645\u0646 \u0637\u0644\u0628 \u0627\u0644\u0645\u062A\u062C\u0631: ${order.orderNumber}`,
          userId: ctx.user.id
        }).returning();
        const itemValues = items.map((it) => ({
          invoiceId: invoice.id,
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: "0",
          total: (parseFloat(it.unitPrice || "0") * it.quantity).toFixed(2)
        }));
        await tx.insert(salesInvoiceItems).values(itemValues);
        const unpaid = total - paidAmount;
        if (order.customerId && unpaid > 9e-3) {
          await tx.update(customers).set({ balance: sql3`${customers.balance} + ${unpaid}` }).where(eq4(customers.id, order.customerId));
        }
        await postInvoiceGlEntries(tx, {
          kind: "sale",
          invoiceId: invoice.id,
          invoiceNumber,
          total,
          paidAmount,
          branchId: null,
          userId: ctx.user.id,
          tenantId: ctx.tenantId
        });
        if (fresh[0].status === "pending") {
          await tx.update(orders).set({ status: "confirmed", updatedAt: /* @__PURE__ */ new Date() }).where(eq4(orders.id, order.id));
        }
        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0637\u0644\u0628 ${order.orderNumber} \u0625\u0644\u0649 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0628\u064A\u0639\u0627\u062A ${invoiceNumber}`,
          details: `\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A: ${total.toFixed(2)} \u2014 \u0627\u0644\u0645\u062F\u0641\u0648\u0639: ${paidAmount.toFixed(2)} (\u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0645\u062D\u062C\u0648\u0632 \u0645\u0646 \u0648\u0642\u062A \u0627\u0644\u0637\u0644\u0628)`
        });
        return { invoiceId: invoice.id, invoiceNumber };
      });
      return { success: true, ...result };
    }),
    getItems: publicProcedure.input(
      z4.object({
        orderId: z4.number()
      })
    ).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(orderItems).where(eq4(orderItems.orderId, input.orderId));
    })
  }),
  // ─── Commercial Dashboard Stats ────────────────────────────────
  commercial: router({
    getStats: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId)
        return {
          lowStock: [],
          topCustomers: [],
          monthStats: { salesTotal: 0, purchasesTotal: 0, ordersCount: 0 },
          counts: {
            products: 0,
            customers: 0,
            suppliers: 0,
            sales: 0,
            purchases: 0,
            orders: 0
          }
        };
      const db = await getDb();
      if (!db)
        return {
          lowStock: [],
          topCustomers: [],
          monthStats: { salesTotal: 0, purchasesTotal: 0, ordersCount: 0 },
          counts: {
            products: 0,
            customers: 0,
            suppliers: 0,
            sales: 0,
            purchases: 0,
            orders: 0
          }
        };
      const allProducts = await db.select().from(products).where(and3(eq4(products.isActive, true), eq4(products.tenantId, ctx.tenantId)));
      const lowStock = allProducts.filter((p) => p.currentStock <= p.minStock).sort(
        (a, b) => a.currentStock - a.minStock - (b.currentStock - b.minStock)
      ).slice(0, 10);
      const monthStart = new Date(
        (/* @__PURE__ */ new Date()).getFullYear(),
        (/* @__PURE__ */ new Date()).getMonth(),
        1
      );
      const [salesAgg] = await db.select({
        total: sql3`coalesce(sum(${salesInvoices.total}), '0')`
      }).from(salesInvoices).where(
        and3(
          eq4(salesInvoices.tenantId, ctx.tenantId),
          gte3(salesInvoices.invoiceDate, monthStart),
          ne(salesInvoices.status, "cancelled")
        )
      );
      const [purchasesAgg] = await db.select({
        total: sql3`coalesce(sum(${purchaseInvoices.total}), '0')`
      }).from(purchaseInvoices).where(
        and3(
          eq4(purchaseInvoices.tenantId, ctx.tenantId),
          gte3(purchaseInvoices.invoiceDate, monthStart),
          ne(purchaseInvoices.status, "cancelled")
        )
      );
      const [ordersAgg] = await db.select({ count: sql3`count(*)::int` }).from(orders).where(gte3(orders.createdAt, monthStart));
      const [productsCount] = await db.select({ count: sql3`count(*)::int` }).from(products).where(and3(eq4(products.isActive, true), eq4(products.tenantId, ctx.tenantId)));
      const [customersCount] = await db.select({ count: sql3`count(*)::int` }).from(customers).where(and3(eq4(customers.isActive, true), eq4(customers.tenantId, ctx.tenantId)));
      const [suppliersCount] = await db.select({ count: sql3`count(*)::int` }).from(suppliers).where(and3(eq4(suppliers.isActive, true), eq4(suppliers.tenantId, ctx.tenantId)));
      const [salesCount] = await db.select({ count: sql3`count(*)::int` }).from(salesInvoices).where(and3(eq4(salesInvoices.tenantId, ctx.tenantId), ne(salesInvoices.status, "cancelled")));
      const [purchasesCount] = await db.select({ count: sql3`count(*)::int` }).from(purchaseInvoices).where(and3(eq4(purchaseInvoices.tenantId, ctx.tenantId), ne(purchaseInvoices.status, "cancelled")));
      const [ordersCount] = await db.select({ count: sql3`count(*)::int` }).from(orders).where(ne(orders.status, "cancelled"));
      const topCustomers = await db.select().from(customers).where(and3(eq4(customers.tenantId, ctx.tenantId), eq4(customers.isActive, true), sql3`${customers.balance} > 0`)).orderBy(desc2(customers.balance)).limit(5);
      return {
        lowStock: lowStock.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          currentStock: p.currentStock,
          minStock: p.minStock,
          unit: p.unit
        })),
        topCustomers: topCustomers.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          balance: c.balance,
          phone: c.phone
        })),
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
  // ─── Public Storefront (website integration) ────────────────────
  store: router({
    catalog: publicProcedure.input(
      z4.object({
        search: z4.string().optional(),
        category: z4.string().optional()
      }).optional()
    ).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], categories: [] };
      const data = await getCatalog(db, {
        search: input?.search,
        category: input?.category
      });
      return { items: data.items.slice(0, 200), categories: data.categories };
    }),
    placeOrder: publicProcedure.input(placeOrderInputSchema).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await placePublicOrder(db, input);
      return result;
    })
  }),
  payments: router({
    list: tenantProcedure.input(
      z4.object({
        source: z4.enum(["sales", "purchases"]),
        invoiceId: z4.number()
      })
    ).query(async ({ input, ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(payments).where(
        and3(
          eq4(payments.tenantId, ctx.tenantId),
          eq4(payments.source, input.source),
          eq4(payments.invoiceId, input.invoiceId)
        )
      ).orderBy(desc2(payments.paymentDate));
    }),
    create: tenantProcedure.input(
      z4.object({
        source: z4.enum(["sales", "purchases"]),
        invoiceId: z4.number(),
        amount: z4.string().refine((v) => {
          const n = parseFloat(v);
          return !isNaN(n) && n > 0 && n < 1e9;
        }, "\u0627\u0644\u0645\u0628\u0644\u063A \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064B \u0645\u0648\u062C\u0628\u0627\u064B"),
        paymentMethod: z4.enum(["cash", "card", "transfer", "credit", "online"]).default("cash"),
        paymentDate: z4.string().optional(),
        notes: z4.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("\u064A\u062C\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0624\u0633\u0633\u0629 \u0623\u0648\u0644\u0627\u064B");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const paymentAmount = parseFloat(input.amount);
      if (input.source === "sales") {
        const invoices = await db.select().from(salesInvoices).where(eq4(salesInvoices.id, input.invoiceId)).limit(1);
        if (invoices.length === 0)
          throw new Error("\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
        const inv = invoices[0];
        if (inv.status === "cancelled")
          throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u062D\u0635\u064A\u0644 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0644\u063A\u0627\u0629");
        const remaining = parseFloat(inv.total) - parseFloat(inv.paidAmount);
        if (paymentAmount > remaining + 0.01)
          throw new Error(
            `\u0627\u0644\u0645\u0628\u0644\u063A \u064A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0639\u0644\u0649 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 (${remaining})`
          );
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
          await tx.update(salesInvoices).set({
            paidAmount: newPaid.toString(),
            status: newStatus,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq4(salesInvoices.id, input.invoiceId));
          if (inv.customerId) {
            await tx.update(customers).set({ balance: sql3`${customers.balance} - ${paymentAmount}` }).where(eq4(customers.id, inv.customerId));
          }
          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `\u062A\u062D\u0635\u064A\u0644 \u062F\u0641\u0639\u0629 \u0645\u0646 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0628\u064A\u0639\u0627\u062A ${inv.invoiceNumber}`,
            details: `\u0627\u0644\u0645\u0628\u0644\u063A: ${input.amount} \u2014 \u0627\u0644\u0637\u0631\u064A\u0642\u0629: ${input.paymentMethod}`
          });
          return { paymentId: pay.id };
        });
      } else {
        const invoices = await db.select().from(purchaseInvoices).where(eq4(purchaseInvoices.id, input.invoiceId)).limit(1);
        if (invoices.length === 0)
          throw new Error("\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
        const inv = invoices[0];
        if (inv.status === "cancelled")
          throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0633\u062F\u0627\u062F \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0644\u063A\u0627\u0629");
        const remaining = parseFloat(inv.total) - parseFloat(inv.paidAmount);
        if (paymentAmount > remaining + 0.01)
          throw new Error(
            `\u0627\u0644\u0645\u0628\u0644\u063A \u064A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0639\u0644\u0649 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 (${remaining})`
          );
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
          await tx.update(purchaseInvoices).set({
            paidAmount: newPaid.toString(),
            status: newStatus,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq4(purchaseInvoices.id, input.invoiceId));
          if (inv.supplierId) {
            await tx.update(suppliers).set({ balance: sql3`${suppliers.balance} - ${paymentAmount}` }).where(eq4(suppliers.id, inv.supplierId));
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
  let user;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user,
    tenantId: user?.tenantId ?? null
  };
}

// server/_core/app.ts
function createApp() {
  const app2 = express();
  app2.disable("x-powered-by");
  app2.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com"
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: ["'self'", "https://*.neon.tech", "https://*.vercel.app"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" }
    })
  );
  app2.use(compression());
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    // 15 minutes
    max: 100,
    // 100 requests per window
    message: { error: "\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0645\u0646 \u0637\u0644\u0628\u0627\u062A API." },
    standardHeaders: true,
    legacyHeaders: false
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    // 15 minutes
    max: 20,
    // 20 attempts per window
    message: { error: "\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0645\u0646 \u0645\u062D\u0627\u0648\u0644\u0627\u062A \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644." },
    standardHeaders: true,
    legacyHeaders: false
  });
  app2.use(express.json({ limit: "10mb" }));
  app2.use(express.urlencoded({ limit: "10mb", extended: true }));
  app2.use(
    (err, _req, res, next) => {
      if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        res.status(400).json({ error: "Invalid JSON Payload" });
        return;
      }
      next(err);
    }
  );
  app2.get("/api/health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      ok: true,
      service: "alhusainia-platform",
      institution: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644 \u0648\u0645\u0643\u062A\u0628\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0627\u0644\u062D\u062F\u064A\u062B\u0629",
      version: "1.2.0",
      status: "Operational",
      security: "ISO-Compliant",
      time: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  registerStorageProxy(app2);
  app2.use("/api/oauth", authLimiter);
  app2.use("/api/web", apiLimiter);
  registerOAuthRoutes(app2);
  registerWebApi(app2);
  app2.use("/api/trpc", apiLimiter);
  app2.use("/api/trpc", (req, res, next) => {
    if (req.method === "GET") {
      res.setHeader(
        "Cache-Control",
        "public, s-maxage=30, stale-while-revalidate=90"
      );
    }
    next();
  });
  app2.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  app2.use(
    (err, _req, res, _next) => {
      console.error("[Error]", err);
      res.status(500).json({ error: "\u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  );
  return app2;
}

// server/_core/static.ts
import express2 from "express";
import fs from "fs";
import path from "path";
function serveStatic(app2) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// server/prod-entry.ts
var app = createApp();
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, "0.0.0.0", () => {
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
  const server = createServer(app);
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
process.on("uncaughtException", (err) => {
  console.error("[ProdServer UncaughtException]", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[ProdServer UnhandledRejection]", reason);
});
if (!process.env.VERCEL) {
  serveStatic(app);
  startServer().catch(console.error);
  setInterval(() => {
  }, 3e4);
}
var prod_entry_default = app;
export {
  prod_entry_default as default
};
