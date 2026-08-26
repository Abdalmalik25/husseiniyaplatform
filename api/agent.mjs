// server/db.ts
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

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
  unique,
  jsonb,
  uuid,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
var userRoleEnum = pgEnum("role", [
  "admin",
  "auditor",
  "accountant",
  "owner",
  "user",
]);
var accountTypeEnum = pgEnum("account_type", [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
]);
var transactionTypeEnum = pgEnum("transaction_type", ["debit", "credit"]);
var lifecycleStatusEnum = pgEnum("lifecycle_status", [
  "saved",
  "approved",
  "sent",
  "posted",
  "completed",
]);
var subscriptionStatusEnum = pgEnum("subscription_status", [
  "trial",
  "active",
  "grace",
  "suspended",
]);
var users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    openId: varchar("openId", { length: 255 }).notNull().unique(),
    tenantId: integer("tenantId"),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }),
    loginMethod: varchar("loginMethod", { length: 50 }),
    username: varchar("username", { length: 120 }),
    passwordHash: text("passwordHash"),
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
    // Security & session tracking
    currentSessionId: uuid("currentSessionId"),
    failedLoginAttempts: integer("failedLoginAttempts").default(0).notNull(),
    lockedUntil: timestamp("lockedUntil"),
    passwordChangedAt: timestamp("passwordChangedAt").defaultNow().notNull(),
    mfaEnabled: boolean("mfaEnabled").default(false).notNull(),
    mfaSecret: varchar("mfaSecret", { length: 255 }),
  },
  t => [
    // PERFORMANCE: Index for tenant-scoped user lookups
    index("idx_users_tenant").on(t.tenantId),
    index("idx_users_session").on(t.currentSessionId),
  ]
);
var loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId"),
    userId: integer("userId"),
    username: varchar("username", { length: 120 }),
    success: boolean("success").notNull(),
    ip: varchar("ip", { length: 64 }),
    userAgent: text("userAgent"),
    device: varchar("device", { length: 120 }),
    deviceFingerprint: varchar("deviceFingerprint", { length: 255 }),
    country: varchar("country", { length: 100 }),
    city: varchar("city", { length: 120 }),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
    riskScore: integer("riskScore").default(0).notNull(),
    riskFactors: jsonb("riskFactors"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_login_attempts_username").on(t.username),
    index("idx_login_attempts_user").on(t.userId),
    index("idx_login_attempts_created").on(t.createdAt),
    index("idx_login_attempts_tenant_created").on(t.tenantId, t.createdAt),
    index("idx_login_attempts_ip").on(t.ip),
    index("idx_login_attempts_device").on(t.deviceFingerprint),
  ]
);
var tenants = pgTable(
  "tenants",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    ownerUserId: integer("ownerUserId"),
    currency: varchar("currency", { length: 20 }).default("YER").notNull(),
    country: varchar("country", { length: 100 })
      .default("\u0627\u0644\u064A\u0645\u0646")
      .notNull(),
    subscriptionPlan: varchar("subscriptionPlan", { length: 50 })
      .default("standard")
      .notNull(),
    sector: varchar("sector", { length: 50 }).default("general").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [check("chk_tenant_currency_valid", sql`${t.currency} ~ '^[A-Z]{3}$'`)]
);
var branches = pgTable(
  "branches",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").default(1).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    city: varchar("city", { length: 100 }),
    isMain: boolean("isMain").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    unique("branches_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_branch_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var userBranchPermissions = pgTable(
  "user_branch_permissions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    userId: integer("userId").notNull(),
    branchId: integer("branchId").notNull(),
    canView: boolean("canView").default(true).notNull(),
    canInsert: boolean("canInsert").default(true).notNull(),
    canApprove: boolean("canApprove").default(false).notNull(),
    canPost: boolean("canPost").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    unique("userBranchPermissions_tenant_user_branch_unique").on(
      t.tenantId,
      t.userId,
      t.branchId
    ),
  ]
);
var accounts = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    type: accountTypeEnum("type").notNull(),
    parentAccountId: integer("parentAccountId"),
    category: varchar("category", { length: 100 }),
    description: text("description"),
    isActive: boolean("isActive").default(true).notNull(),
    isCustom: boolean("isCustom").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_accounts_tenant").on(t.tenantId),
    index("idx_accounts_tenant_type").on(t.tenantId, t.type),
    unique("accounts_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_account_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
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
    journalEntryId: integer("journalEntryId"),
    sourceModule: varchar("sourceModule", { length: 50 }),
    userId: integer("userId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    // Financial constraints
    currencyId: integer("currencyId").references(() => currencies.id),
    exchangeRate: decimal("exchangeRate", { precision: 18, scale: 8 })
      .default("1")
      .notNull(),
    baseAmount: decimal("baseAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
  },
  t => [
    index("idx_transactions_tenant").on(t.tenantId),
    index("idx_transactions_account").on(t.accountId),
    index("idx_transactions_date").on(t.transactionDate),
    index("idx_transactions_branch").on(t.branchId),
    index("idx_transactions_reference").on(t.referenceType, t.referenceId),
    index("idx_transactions_currency").on(t.currencyId),
    // PERFORMANCE: Composite indexes for frequently filtered queries
    index("idx_transactions_tenant_status").on(t.tenantId, t.lifecycleStatus),
    index("idx_transactions_tenant_reversed").on(t.tenantId, t.isReversed),
    index("idx_transactions_tenant_date").on(t.tenantId, t.transactionDate),
    index("idx_transactions_tenant_account_date").on(
      t.tenantId,
      t.accountId,
      t.transactionDate
    ),
    check("chk_transaction_amount_not_negative", sql`${t.amount} >= 0`),
    check(
      "chk_transaction_base_amount_not_negative",
      sql`${t.baseAmount} >= 0`
    ),
    check("chk_transaction_exchange_rate_positive", sql`${t.exchangeRate} > 0`),
    check("chk_transaction_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
    check("chk_transaction_account_not_null", sql`${t.accountId} IS NOT NULL`),
  ]
);
var openingBalances = pgTable(
  "opening_balances",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    accountId: integer("accountId").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    type: transactionTypeEnum("type").default("debit").notNull(),
    notes: text("notes"),
    periodName: varchar("periodName", { length: 50 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
    exchangeRate: decimal("exchangeRate", { precision: 18, scale: 8 })
      .default("1")
      .notNull(),
    baseAmount: decimal("baseAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
  },
  t => [
    index("idx_openingBalances_tenant").on(t.tenantId),
    unique("openingBalances_account_period_tenant_unique").on(
      t.accountId,
      t.periodName,
      t.tenantId
    ),
    check("chk_opening_balance_amount_not_negative", sql`${t.amount} >= 0`),
    check(
      "chk_opening_balance_exchange_rate_positive",
      sql`${t.exchangeRate} > 0`
    ),
  ]
);
var budgets = pgTable(
  "budgets",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
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
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_budgets_tenant").on(t.tenantId),
    unique("budgets_tenant_period_unique").on(t.tenantId, t.periodName),
    check("chk_budget_revenue_not_negative", sql`${t.targetRevenue} >= 0`),
    check("chk_budget_expense_not_negative", sql`${t.targetExpense} >= 0`),
  ]
);
var fiscalPeriodStatusEnum = pgEnum("fiscal_period_status", [
  "open",
  "closing",
  "closed",
  "reopened",
]);
var fiscalPeriods = pgTable(
  "fiscal_periods",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    // e.g., "2026", "Q1-2026"
    label: varchar("label", { length: 100 }),
    // e.g., "السنة المالية 2026"
    startDate: timestamp("startDate").notNull(),
    endDate: timestamp("endDate").notNull(),
    status: fiscalPeriodStatusEnum("status").default("open").notNull(),
    closedAt: timestamp("closedAt"),
    closedById: integer("closedById"),
    reopenedAt: timestamp("reopenedAt"),
    reopenedById: integer("reopenedById"),
    reopenReason: varchar("reopenReason", { length: 255 }),
    closingEntryId: integer("closingEntryId"),
    // FK to journal_entries
    retainedEarningsAccountId: integer("retainedEarningsAccountId"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_fiscal_periods_tenant").on(t.tenantId),
    index("idx_fiscal_periods_status").on(t.status),
    unique("fiscal_periods_tenant_name_unique").on(t.tenantId, t.name),
    check("chk_fiscal_period_dates", sql`${t.startDate} <= ${t.endDate}`),
    check("chk_fiscal_period_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var settings = pgTable(
  "settings",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull().unique(),
    institutionName: varchar("institutionName", { length: 255 })
      .default(
        "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0633\u064A\u0646\u064A\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0639\u0645\u0627\u0644"
      )
      .notNull(),
    currency: varchar("currency", { length: 50 })
      .default("\u0631\u064A\u0627\u0644 \u064A\u0645\u0646\u064A (YER)")
      .notNull(),
    country: varchar("country", { length: 100 })
      .default("\u0627\u0644\u064A\u0645\u0646")
      .notNull(),
    accountingPeriod: varchar("accountingPeriod", { length: 50 })
      .default("2026")
      .notNull(),
    managerName: varchar("managerName", { length: 255 })
      .default(
        "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u0629"
      )
      .notNull(),
    notes: text("notes"),
    subscriptionStatus: subscriptionStatusEnum("subscriptionStatus")
      .default("trial")
      .notNull(),
    trialEndsAt: timestamp("trialEndsAt"),
    // ─── POS / Sales configuration (stored as JSON text) ─────────────
    posConfig: text("posConfig"),
    salesPolicy: text("salesPolicy"),
    paymentMethods: text("paymentMethods"),
    postingRules: text("postingRules"),
    // ─── ZATCA (Saudi e-invoicing) configuration ────────────────────
    zatcaConfig: text("zatcaConfig"),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [check("chk_settings_tenant_not_null", sql`${t.tenantId} IS NOT NULL`)]
);
var activityLogs = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId"),
    userId: integer("userId"),
    sessionId: uuid("sessionId"),
    userName: varchar("userName", { length: 255 }),
    action: varchar("action", { length: 255 }).notNull(),
    entityType: varchar("entityType", { length: 100 }),
    entityId: integer("entityId"),
    details: text("details"),
    // Device & geo context
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: varchar("userAgent", { length: 500 }),
    deviceId: integer("deviceId"),
    deviceFingerprint: varchar("deviceFingerprint", { length: 255 }),
    country: varchar("country", { length: 100 }),
    city: varchar("city", { length: 120 }),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
    // Audit chain
    previousHash: varchar("previousHash", { length: 64 }),
    currentHash: varchar("currentHash", { length: 64 }).default("").notNull(),
    chainSequence: integer("chainSequence").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_activityLogs_tenant").on(t.tenantId),
    index("idx_activityLogs_user").on(t.userId),
    index("idx_activityLogs_session").on(t.sessionId),
    index("idx_activityLogs_entity").on(t.entityType, t.entityId),
    index("idx_activityLogs_created").on(t.createdAt),
    index("idx_activityLogs_chain").on(t.tenantId, t.chainSequence),
  ]
);
var productTypeEnum = pgEnum("product_type", ["goods", "service"]);
var inventoryMovementTypeEnum = pgEnum("inventory_movement_type", [
  "in",
  "out",
  "transfer",
  "adjustment",
]);
function govColumns() {
  return {
    country: varchar("country", { length: 100 }).default(
      "\u0627\u0644\u064A\u0645\u0646"
    ),
    workSiteId: integer("workSiteId"),
    deviceId: integer("deviceId"),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
    globalCode: varchar("globalCode", { length: 160 }),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  };
}
var products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    nameAr: varchar("nameAr", { length: 255 }),
    type: productTypeEnum("type").default("goods").notNull(),
    category: varchar("category", { length: 100 }),
    country: varchar("country", { length: 100 }).default(
      "\u0627\u0644\u064A\u0645\u0646"
    ),
    unit: varchar("unit", { length: 50 })
      .default("\u0642\u0637\u0639\u0629")
      .notNull(),
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
    unitId: integer("unitId"),
    categoryId: integer("categoryId"),
    description: text("description"),
    // Per-item account linkage (overrides tenant default posting rules)
    salesAccountId: integer("salesAccountId"),
    cogsAccountId: integer("cogsAccountId"),
    inventoryAccountId: integer("inventoryAccountId"),
    // ─── Inventory / unit flexibility ──────────────────────────────
    unitOfMeasure: varchar("unitOfMeasure", { length: 50 })
      .default("\u0642\u0637\u0639\u0629")
      .notNull(),
    secondaryUnit: varchar("secondaryUnit", { length: 50 }),
    conversionFactor: decimal("conversionFactor", { precision: 15, scale: 4 })
      .default("1")
      .notNull(),
    // ─── Composite / bundled items (Bill of Materials) ────────────
    isComposite: boolean("isComposite").default(false).notNull(),
    bom: text("bom"),
    // JSON: [{ componentProductId, quantity }]
    alternativeIds: text("alternativeIds"),
    // JSON: number[]
    attachmentUrl: text("attachmentUrl"),
    // ─── Services costing & pricing ───────────────────────────────
    costMethod: varchar("costMethod", { length: 30 })
      .default("average")
      .notNull(),
    directCost: decimal("directCost", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    indirectCost: decimal("indirectCost", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    productionMinutes: integer("productionMinutes"),
    priceMode: varchar("priceMode", { length: 20 }).default("direct").notNull(),
    // direct | costPlus
    marginPct: decimal("marginPct", { precision: 6, scale: 2 })
      .default("0")
      .notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    // ─── Reorder automation (Module C) ─────────────────────────────
    reorderPoint: decimal("reorderPoint", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    reorderQty: decimal("reorderQty", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_products_tenant").on(t.tenantId),
    index("idx_products_tenant_deleted").on(t.tenantId, t.deletedAt),
    index("idx_products_category").on(t.category),
    index("idx_products_supplier").on(t.supplierId),
    index("idx_products_currency").on(t.currencyId),
    unique("products_code_tenant_unique").on(t.code, t.tenantId),
    check(
      "chk_product_purchase_price_not_negative",
      sql`${t.purchasePrice} >= 0`
    ),
    check("chk_product_sale_price_not_negative", sql`${t.salePrice} >= 0`),
    check(
      "chk_product_wholesale_price_not_negative",
      sql`${t.wholesalePrice} >= 0`
    ),
    check(
      "chk_product_conversion_factor_positive",
      sql`${t.conversionFactor} > 0`
    ),
    check("chk_product_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var warehouses = pgTable(
  "warehouses",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    location: varchar("location", { length: 255 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_warehouses_tenant").on(t.tenantId),
    unique("warehouses_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_warehouse_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var workSites = pgTable(
  "work_sites",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    address: text("address"),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_workSites_tenant").on(t.tenantId),
    unique("workSites_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_workSite_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var devices = pgTable(
  "devices",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 30 }).default("pos").notNull(),
    // pos | scanner | scale | other
    workSiteId: integer("workSiteId"),
    location: varchar("location", { length: 255 }),
    lastSeenAt: timestamp("lastSeenAt"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    // Device fingerprinting
    fingerprint: varchar("fingerprint", { length: 255 }).unique(),
    os: varchar("os", { length: 100 }),
    osVersion: varchar("osVersion", { length: 50 }),
    appVersion: varchar("appVersion", { length: 50 }),
    publicKey: text("publicKey"),
    // For device attestation
  },
  t => [
    index("idx_devices_tenant").on(t.tenantId),
    unique("devices_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_device_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    productId: integer("productId").notNull(),
    warehouseId: integer("warehouseId"),
    type: inventoryMovementTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull(),
    referenceId: integer("referenceId"),
    referenceType: varchar("referenceType", { length: 50 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_inventoryMovements_tenant").on(t.tenantId),
    index("idx_inventoryMovements_product").on(t.productId),
    index("idx_inventoryMovements_warehouse").on(t.warehouseId),
    check("chk_inventory_movement_quantity_not_zero", sql`${t.quantity} != 0`),
    check(
      "chk_inventory_movement_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var stockAdjustments = pgTable(
  "stock_adjustments",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    ...govColumns(),
    productId: integer("productId").notNull(),
    warehouseId: integer("warehouseId"),
    previousQty: integer("previousQty").notNull(),
    newQty: integer("newQty").notNull(),
    reason: varchar("reason", { length: 100 }).default(
      "\u062A\u0633\u0648\u064A\u0629"
    ),
    notes: text("notes"),
    userId: integer("userId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_stockAdjustments_tenant").on(t.tenantId),
    unique("stockAdjustments_gc_tenant_unique").on(t.tenantId, t.globalCode),
    check(
      "chk_stock_adjustment_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var warehouseTransfers = pgTable(
  "warehouse_transfers",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    ...govColumns(),
    productId: integer("productId").notNull(),
    fromWarehouseId: integer("fromWarehouseId").notNull(),
    toWarehouseId: integer("toWarehouseId").notNull(),
    quantity: integer("quantity").notNull(),
    notes: text("notes"),
    userId: integer("userId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_warehouseTransfers_tenant").on(t.tenantId),
    unique("warehouseTransfers_gc_tenant_unique").on(t.tenantId, t.globalCode),
    check("chk_warehouse_transfer_quantity_positive", sql`${t.quantity} > 0`),
    check(
      "chk_warehouse_transfer_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
    check(
      "chk_warehouse_transfer_from_to_different",
      sql`${t.fromWarehouseId} != ${t.toWarehouseId}`
    ),
  ]
);
var warehouseStock = pgTable(
  "warehouse_stock",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    productId: integer("productId").notNull(),
    warehouseId: integer("warehouseId").notNull(),
    quantity: integer("quantity").default(0).notNull(),
    reservedQty: integer("reservedQty").default(0).notNull(),
    availableQty: integer("availableQty").default(0).notNull(),
    lastMovementAt: timestamp("lastMovementAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_warehouseStock_tenant").on(t.tenantId),
    index("idx_warehouseStock_product").on(t.productId),
    index("idx_warehouseStock_warehouse").on(t.warehouseId),
    unique("warehouseStock_product_warehouse_tenant_unique").on(
      t.productId,
      t.warehouseId,
      t.tenantId
    ),
    check("chk_warehouse_stock_qty_not_negative", sql`${t.quantity} >= 0`),
    check(
      "chk_warehouse_stock_reserved_not_negative",
      sql`${t.reservedQty} >= 0`
    ),
    check(
      "chk_warehouse_stock_available_not_negative",
      sql`${t.availableQty} >= 0`
    ),
    check(
      "chk_warehouse_stock_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var batchTrackingMethodEnum = pgEnum("batch_tracking_method", [
  "none",
  "batch",
  "lot",
  "serial",
]);
var inventoryBatches = pgTable(
  "inventory_batches",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    productId: integer("productId").notNull(),
    warehouseId: integer("warehouseId").notNull(),
    batchNumber: varchar("batchNumber", { length: 100 }).notNull(),
    lotNumber: varchar("lotNumber", { length: 100 }),
    serialNumber: varchar("serialNumber", { length: 100 }),
    manufacturingDate: timestamp("manufacturingDate"),
    expiryDate: timestamp("expiryDate"),
    quantity: integer("quantity").default(0).notNull(),
    reservedQty: integer("reservedQty").default(0).notNull(),
    unitCost: decimal("unitCost", { precision: 15, scale: 4 })
      .default("0")
      .notNull(),
    purchaseInvoiceId: integer("purchaseInvoiceId"),
    purchaseInvoiceItemId: integer("purchaseInvoiceItemId"),
    notes: text("notes"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_inventoryBatches_tenant").on(t.tenantId),
    index("idx_inventoryBatches_product").on(t.productId),
    index("idx_inventoryBatches_warehouse").on(t.warehouseId),
    index("idx_inventoryBatches_expiry").on(t.expiryDate),
    index("idx_inventoryBatches_batchNumber").on(t.batchNumber),
    unique("inventoryBatches_product_warehouse_batch_tenant_unique").on(
      t.productId,
      t.warehouseId,
      t.batchNumber,
      t.tenantId
    ),
    check("chk_inventory_batch_qty_not_negative", sql`${t.quantity} >= 0`),
    check(
      "chk_inventory_batch_reserved_not_negative",
      sql`${t.reservedQty} >= 0`
    ),
    check(
      "chk_inventory_batch_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var reservationStatusEnum = pgEnum("reservation_status", [
  "active",
  "fulfilled",
  "released",
  "expired",
]);
var reservationSourceEnum = pgEnum("reservation_source", [
  "sales_order",
  "purchase_order",
  "production_order",
  "transfer_order",
  "manual",
]);
var stockReservations = pgTable(
  "stock_reservations",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    productId: integer("productId").notNull(),
    warehouseId: integer("warehouseId"),
    batchId: integer("batchId"),
    quantity: integer("quantity").notNull(),
    status: reservationStatusEnum("status").default("active").notNull(),
    source: reservationSourceEnum("source").default("manual").notNull(),
    sourceId: integer("sourceId"),
    sourceType: varchar("sourceType", { length: 50 }),
    customerId: integer("customerId"),
    expiresAt: timestamp("expiresAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    fulfilledAt: timestamp("fulfilledAt"),
    releasedAt: timestamp("releasedAt"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_stockReservations_tenant").on(t.tenantId),
    index("idx_stockReservations_product").on(t.productId),
    index("idx_stockReservations_warehouse").on(t.warehouseId),
    index("idx_stockReservations_batch").on(t.batchId),
    index("idx_stockReservations_status").on(t.status),
    index("idx_stockReservations_source").on(t.source, t.sourceId),
    index("idx_stockReservations_expires").on(t.expiresAt),
    check("chk_stock_reservation_qty_positive", sql`${t.quantity} > 0`),
    check(
      "chk_stock_reservation_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var cycleCountStatusEnum = pgEnum("cycle_count_status", [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
  "approved",
]);
var cycleCounts = pgTable(
  "cycle_counts",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    ...govColumns(),
    countNumber: varchar("countNumber", { length: 50 }).notNull(),
    warehouseId: integer("warehouseId").notNull(),
    status: cycleCountStatusEnum("status").default("planned").notNull(),
    plannedDate: timestamp("plannedDate").notNull(),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    approvedAt: timestamp("approvedAt"),
    approvedById: integer("approvedById"),
    assignedToId: integer("assignedToId"),
    varianceThreshold: decimal("varianceThreshold", { precision: 5, scale: 2 })
      .default("5")
      .notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_cycleCounts_tenant").on(t.tenantId),
    index("idx_cycleCounts_warehouse").on(t.warehouseId),
    index("idx_cycleCounts_status").on(t.status),
    index("idx_cycleCounts_plannedDate").on(t.plannedDate),
    unique("cycleCounts_countNumber_tenant_unique").on(
      t.countNumber,
      t.tenantId
    ),
    check("chk_cycle_count_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var cycleCountLines = pgTable(
  "cycle_count_lines",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    cycleCountId: integer("cycleCountId").notNull(),
    productId: integer("productId").notNull(),
    warehouseId: integer("warehouseId").notNull(),
    batchId: integer("batchId"),
    systemQty: integer("systemQty").default(0).notNull(),
    countedQty: integer("countedQty"),
    varianceQty: integer("varianceQty"),
    variancePct: decimal("variancePct", { precision: 5, scale: 2 }),
    varianceValue: decimal("varianceValue", { precision: 15, scale: 2 }),
    unitCost: decimal("unitCost", { precision: 15, scale: 4 }),
    status: varchar("status", { length: 20 }).default("pending"),
    countedById: integer("countedById"),
    countedAt: timestamp("countedAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_cycleCountLines_tenant").on(t.tenantId),
    index("idx_cycleCountLines_cycleCount").on(t.cycleCountId),
    index("idx_cycleCountLines_product").on(t.productId),
    unique("cycleCountLines_cycleCount_product_warehouse_batch_unique").on(
      t.cycleCountId,
      t.productId,
      t.warehouseId,
      t.batchId
    ),
    check(
      "chk_cycle_count_line_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var inventoryValuationLayers = pgTable(
  "inventory_valuation_layers",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    productId: integer("productId").notNull(),
    warehouseId: integer("warehouseId"),
    batchId: integer("batchId"),
    layerDate: timestamp("layerDate").notNull(),
    quantity: integer("quantity").notNull(),
    remainingQty: integer("remainingQty").notNull(),
    unitCost: decimal("unitCost", { precision: 15, scale: 4 }).notNull(),
    totalCost: decimal("totalCost", { precision: 15, scale: 2 }).notNull(),
    sourceType: varchar("sourceType", { length: 50 }).notNull(),
    sourceId: integer("sourceId"),
    referenceType: varchar("referenceType", { length: 50 }),
    referenceId: integer("referenceId"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_valuationLayers_tenant").on(t.tenantId),
    index("idx_valuationLayers_product").on(t.productId),
    index("idx_valuationLayers_warehouse").on(t.warehouseId),
    index("idx_valuationLayers_batch").on(t.batchId),
    index("idx_valuationLayers_layerDate").on(t.layerDate),
    index("idx_valuationLayers_active").on(t.isActive),
    check("chk_valuation_layer_qty_positive", sql`${t.quantity} > 0`),
    check(
      "chk_valuation_layer_remaining_not_negative",
      sql`${t.remainingQty} >= 0`
    ),
    check("chk_valuation_layer_unit_cost_positive", sql`${t.unitCost} > 0`),
    check(
      "chk_valuation_layer_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 50 }).notNull(),
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
    deletedAt: timestamp("deleted_at"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_customers_tenant").on(t.tenantId),
    index("idx_customers_tenant_deleted").on(t.tenantId, t.deletedAt),
    index("idx_customers_currency").on(t.currencyId),
    unique("customers_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_customer_credit_limit_not_negative", sql`${t.creditLimit} >= 0`),
    check("chk_customer_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var suppliers = pgTable(
  "suppliers",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 50 }).notNull(),
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
    deletedAt: timestamp("deleted_at"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_suppliers_tenant").on(t.tenantId),
    index("idx_suppliers_tenant_deleted").on(t.tenantId, t.deletedAt),
    index("idx_suppliers_currency").on(t.currencyId),
    unique("suppliers_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_supplier_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var salesInvoiceStatusEnum = pgEnum("sales_invoice_status", [
  "draft",
  "confirmed",
  "paid",
  "partial",
  "cancelled",
]);
var purchaseInvoiceStatusEnum = pgEnum("purchase_invoice_status", [
  "draft",
  "confirmed",
  "paid",
  "partial",
  "cancelled",
]);
var orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);
var paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "card",
  "transfer",
  "credit",
  "online",
  // ─── وسائل الدفع المحلية (اليمن) ───
  "cash_yer",
  // كاش بالريال اليمني
  "cash_sar",
  // كاش بالريال السعودي
  "hawala",
  // حوالة (صرافة)
  "shabab",
  // شباب (أي شبكة محلية)
  "mobile_money",
  // محفظة إلكترونية (فليكسي / أمين)
  "bank_transfer",
  // حوالة بنكية محلية
]);
var salesInvoices = pgTable(
  "sales_invoices",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    ...govColumns(),
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
    // ZATCA (Saudi e-invoicing) payload: { uuid, qrBase64, hash, stampedAt }
    zatca: text("zatca"),
    invoiceDate: timestamp("invoiceDate").defaultNow().notNull(),
    dueDate: timestamp("dueDate"),
    userId: integer("userId"),
    // ─── Sales rep linkage (Module A: commissions) ────────────────
    salesRepId: text("salesRepId"),
    // ─── Multi-currency (Module B) ─────────────────────────────────
    currency: varchar("currency", { length: 10 }).default("YER").notNull(),
    currencyRate: decimal("currencyRate", { precision: 18, scale: 8 })
      .default("1")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
    // Posted/Reversed immutable tracking
    postedAt: timestamp("postedAt"),
    postedById: integer("postedById"),
    reversedAt: timestamp("reversedAt"),
    reversedById: integer("reversedById"),
    reversalReason: varchar("reversalReason", { length: 255 }),
  },
  t => [
    index("idx_salesInvoices_tenant").on(t.tenantId),
    index("idx_salesInvoices_customer").on(t.customerId),
    index("idx_salesInvoices_status").on(t.status),
    index("idx_salesInvoices_currency").on(t.currencyId),
    index("idx_salesInvoices_salesRep").on(t.salesRepId),
    index("idx_salesInvoices_tenant_salesrep").on(t.tenantId, t.salesRepId),
    index("idx_salesInvoices_tenant_status_date").on(
      t.tenantId,
      t.status,
      t.invoiceDate
    ),
    index("idx_salesInvoices_tenant_customer_date").on(
      t.tenantId,
      t.customerId,
      t.invoiceDate
    ),
    unique("salesInvoices_gc_tenant_unique").on(t.tenantId, t.globalCode),
    check("chk_sales_invoice_subtotal_not_negative", sql`${t.subtotal} >= 0`),
    check("chk_sales_invoice_tax_rate_not_negative", sql`${t.taxRate} >= 0`),
    check(
      "chk_sales_invoice_tax_amount_not_negative",
      sql`${t.taxAmount} >= 0`
    ),
    check("chk_sales_invoice_discount_not_negative", sql`${t.discount} >= 0`),
    check("chk_sales_invoice_total_not_negative", sql`${t.total} >= 0`),
    check("chk_sales_invoice_paid_not_negative", sql`${t.paidAmount} >= 0`),
    check(
      "chk_sales_invoice_currency_rate_positive",
      sql`${t.currencyRate} > 0`
    ),
    check("chk_sales_invoice_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
    check(
      "chk_sales_invoice_status_posted_immutable",
      sql`
      CASE WHEN ${t.status} IN ('paid', 'cancelled') THEN
        ${t.postedAt} IS NOT NULL
      ELSE TRUE END
    `
    ),
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
    discount: decimal("discount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [index("idx_sales_items_invoice").on(t.invoiceId)]
);
var purchaseInvoices = pgTable(
  "purchase_invoices",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    ...govColumns(),
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
    zatca: text("zatca"),
    invoiceDate: timestamp("invoiceDate").defaultNow().notNull(),
    dueDate: timestamp("dueDate"),
    userId: integer("userId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
    exchangeRate: decimal("exchangeRate", { precision: 18, scale: 8 })
      .default("1")
      .notNull(),
    baseAmount: decimal("baseAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    // Posted/Reversed immutable tracking
    postedAt: timestamp("postedAt"),
    postedById: integer("postedById"),
    reversedAt: timestamp("reversedAt"),
    reversedById: integer("reversedById"),
    reversalReason: varchar("reversalReason", { length: 255 }),
  },
  t => [
    index("idx_purchaseInvoices_tenant").on(t.tenantId),
    index("idx_purchaseInvoices_supplier").on(t.supplierId),
    index("idx_purchaseInvoices_status").on(t.status),
    index("idx_purchaseInvoices_currency").on(t.currencyId),
    unique("purchaseInvoices_gc_tenant_unique").on(t.tenantId, t.globalCode),
    check(
      "chk_purchase_invoice_subtotal_not_negative",
      sql`${t.subtotal} >= 0`
    ),
    check("chk_purchase_invoice_tax_rate_not_negative", sql`${t.taxRate} >= 0`),
    check(
      "chk_purchase_invoice_tax_amount_not_negative",
      sql`${t.taxAmount} >= 0`
    ),
    check(
      "chk_purchase_invoice_discount_not_negative",
      sql`${t.discount} >= 0`
    ),
    check("chk_purchase_invoice_total_not_negative", sql`${t.total} >= 0`),
    check("chk_purchase_invoice_paid_not_negative", sql`${t.paidAmount} >= 0`),
    check(
      "chk_purchase_invoice_exchange_rate_positive",
      sql`${t.exchangeRate} > 0`
    ),
    check(
      "chk_purchase_invoice_base_amount_not_negative",
      sql`${t.baseAmount} >= 0`
    ),
    check(
      "chk_purchase_invoice_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
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
    discount: decimal("discount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [index("idx_purchase_items_invoice").on(t.invoiceId)]
);
var orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    ...govColumns(),
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
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_orders_tenant").on(t.tenantId),
    index("idx_orders_customer").on(t.customerId),
    index("idx_orders_status").on(t.status),
    index("idx_orders_currency").on(t.currencyId),
    unique("orders_gc_tenant_unique").on(t.tenantId, t.globalCode),
    check("chk_order_total_not_negative", sql`${t.total} >= 0`),
    check("chk_order_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
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
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [index("idx_order_items_order").on(t.orderId)]
);
var paymentSourceEnum = pgEnum("payment_source", ["sales", "purchases"]);
var payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    source: paymentSourceEnum("source").notNull(),
    invoiceId: integer("invoiceId").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum("paymentMethod").default("cash"),
    paymentDate: timestamp("paymentDate").defaultNow().notNull(),
    notes: text("notes"),
    userId: integer("userId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
    exchangeRate: decimal("exchangeRate", { precision: 18, scale: 8 })
      .default("1")
      .notNull(),
    baseAmount: decimal("baseAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
  },
  t => [
    index("idx_payments_tenant").on(t.tenantId),
    index("idx_payments_invoice").on(t.source, t.invoiceId),
    index("idx_payments_currency").on(t.currencyId),
    check("chk_payment_amount_positive", sql`${t.amount} > 0`),
    check("chk_payment_base_amount_positive", sql`${t.baseAmount} >= 0`),
    check("chk_payment_exchange_rate_positive", sql`${t.exchangeRate} > 0`),
    check("chk_payment_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    description: text("description"),
    priceMonthly: decimal("priceMonthly", {
      precision: 10,
      scale: 2,
    }).notNull(),
    priceYearly: decimal("priceYearly", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("USD").notNull(),
    maxUsers: integer("maxUsers").default(5).notNull(),
    maxBranches: integer("maxBranches").default(1).notNull(),
    maxTransactions: integer("maxTransactions").default(1e3).notNull(),
    features: jsonb("features"),
    isActive: boolean("isActive").default(true).notNull(),
    sortOrder: integer("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    check(
      "chk_subscription_plan_price_monthly_positive",
      sql`${t.priceMonthly} > 0`
    ),
    check(
      "chk_subscription_plan_price_yearly_positive",
      sql`${t.priceYearly} > 0`
    ),
    check(
      "chk_subscription_plan_currency_format",
      sql`${t.currency} ~ '^[A-Z]{3}$'`
    ),
  ]
);
var tenantSubscriptions = pgTable(
  "tenant_subscriptions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    planId: integer("planId").notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    billingCycle: varchar("billingCycle", { length: 10 })
      .default("monthly")
      .notNull(),
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
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_tenant_sub_tenant").on(t.tenantId),
    index("idx_tenant_sub_status").on(t.status),
    index("idx_tenant_sub_currency").on(t.currencyId),
    check("chk_tenant_sub_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var billingInvoices = pgTable(
  "billing_invoices",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    subscriptionId: integer("subscriptionId"),
    invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
    status: varchar("status", { length: 20 }).notNull(),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    taxAmount: decimal("taxAmount", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("USD").notNull(),
    dueDate: timestamp("dueDate").notNull(),
    paidAt: timestamp("paidAt"),
    paymentMethod: varchar("paymentMethod", { length: 50 }),
    externalPaymentId: varchar("externalPaymentId", { length: 255 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_billing_invoice_tenant").on(t.tenantId),
    index("idx_billing_invoice_status").on(t.status),
    index("idx_billing_invoice_currency").on(t.currencyId),
    check("chk_billing_invoice_subtotal_not_negative", sql`${t.subtotal} >= 0`),
    check("chk_billing_invoice_tax_not_negative", sql`${t.taxAmount} >= 0`),
    check("chk_billing_invoice_total_not_negative", sql`${t.total} >= 0`),
    check(
      "chk_billing_invoice_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var paymentHistory = pgTable(
  "payment_history",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    invoiceId: integer("invoiceId"),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("USD").notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    paymentMethod: varchar("paymentMethod", { length: 50 }),
    transactionId: varchar("transactionId", { length: 255 }),
    refundedAmount: decimal("refundedAmount", {
      precision: 10,
      scale: 2,
    }).default("0"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_payment_history_tenant").on(t.tenantId),
    index("idx_payment_history_invoice").on(t.invoiceId),
    index("idx_payment_history_currency").on(t.currencyId),
    check("chk_payment_history_amount_positive", sql`${t.amount} > 0`),
    check(
      "chk_payment_history_refund_not_negative",
      sql`${t.refundedAmount} >= 0`
    ),
    check(
      "chk_payment_history_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    userId: integer("userId"),
    sessionId: uuid("sessionId"),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entityType", { length: 100 }).notNull(),
    entityId: integer("entityId").notNull(),
    entityGlobalId: uuid("entityGlobalId"),
    oldValues: jsonb("oldValues"),
    newValues: jsonb("newValues"),
    // Device & geo context
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: varchar("userAgent", { length: 500 }),
    deviceId: integer("deviceId"),
    deviceFingerprint: varchar("deviceFingerprint", { length: 255 }),
    country: varchar("country", { length: 100 }),
    city: varchar("city", { length: 120 }),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
    // Audit chain
    previousHash: varchar("previousHash", { length: 64 }),
    currentHash: varchar("currentHash", { length: 64 }).default("").notNull(),
    chainSequence: integer("chainSequence").default(0).notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_audit_logs_tenant").on(t.tenantId),
    index("idx_audit_logs_user").on(t.userId),
    index("idx_audit_logs_session").on(t.sessionId),
    index("idx_audit_logs_entity").on(t.entityType, t.entityId),
    index("idx_audit_logs_entity_global").on(t.entityGlobalId),
    index("idx_audit_logs_created").on(t.createdAt),
    index("idx_audit_logs_chain").on(t.tenantId, t.chainSequence),
    check("chk_audit_log_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
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
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_notifications_tenant").on(t.tenantId),
    index("idx_notifications_user").on(t.userId),
    index("idx_notifications_status").on(t.status),
  ]
);
var teamInvitations = pgTable(
  "team_invitations",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    role: userRoleEnum("role").default("user").notNull(),
    invitedBy: integer("invitedBy").notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    acceptedAt: timestamp("acceptedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_team_inv_tenant").on(t.tenantId),
    index("idx_team_inv_email").on(t.email),
    check(
      "chk_team_invitation_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var currencies = pgTable(
  "currencies",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId"),
    code: varchar("code", { length: 10 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    symbol: varchar("symbol", { length: 10 }).notNull(),
    rate: decimal("rate", { precision: 18, scale: 8 }).default("1").notNull(),
    isDefault: boolean("isDefault").default(false).notNull(),
    decimalPlaces: integer("decimalPlaces").default(2).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_currencies_tenant").on(t.tenantId),
    check("chk_currency_rate_positive", sql`${t.rate} > 0`),
    check("chk_currency_code_format", sql`${t.code} ~ '^[A-Z]{3}$'`),
  ]
);
var exchangeRates = pgTable(
  "exchange_rates",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    baseCurrency: varchar("baseCurrency", { length: 10 }).notNull(),
    quoteCurrency: varchar("quoteCurrency", { length: 10 }).notNull(),
    rate: decimal("rate", { precision: 18, scale: 8 }).notNull(),
    source: varchar("source", { length: 50 }),
    effectiveFrom: timestamp("effectiveFrom").notNull(),
    effectiveTo: timestamp("effectiveTo"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_exchange_rates_pair").on(t.baseCurrency, t.quoteCurrency),
    index("idx_exchange_rates_effective").on(t.effectiveFrom),
    unique("exchange_rates_pair_effective_unique").on(
      t.baseCurrency,
      t.quoteCurrency,
      t.effectiveFrom
    ),
    check("chk_exchange_rate_positive", sql`${t.rate} > 0`),
  ]
);
var fileUploads = pgTable(
  "file_uploads",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId"),
    userId: integer("userId"),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 100 }).notNull(),
    fileSize: integer("fileSize").notNull(),
    storageKey: varchar("storageKey", { length: 500 }).notNull(),
    storageProvider: varchar("storageProvider", { length: 50 })
      .default("s3")
      .notNull(),
    url: varchar("url", { length: 500 }).notNull(),
    entityType: varchar("entityType", { length: 50 }),
    entityId: integer("entityId"),
    folder: varchar("folder", { length: 200 }),
    isPublic: boolean("isPublic").default(false).notNull(),
    metadata: jsonb("metadata"),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    // Security & integrity
    sha256Hash: varchar("sha256Hash", { length: 64 }).default("").notNull(),
    md5Hash: varchar("md5Hash", { length: 32 }),
    isEncrypted: boolean("isEncrypted").default(false).notNull(),
    encryptionKeyId: varchar("encryptionKeyId", { length: 100 }),
    encryptionAlgorithm: varchar("encryptionAlgorithm", { length: 50 }),
    // Device & geo context
    deviceId: integer("deviceId"),
    deviceFingerprint: varchar("deviceFingerprint", { length: 255 }),
    ipAddress: varchar("ipAddress", { length: 45 }),
    country: varchar("country", { length: 100 }),
    city: varchar("city", { length: 120 }),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
    // Retention
    retentionPolicy: varchar("retentionPolicy", { length: 50 }).default(
      "standard"
    ),
    retentionExpiresAt: timestamp("retentionExpiresAt"),
    legalHold: boolean("legalHold").default(false).notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_file_uploads_tenant").on(t.tenantId),
    index("idx_file_uploads_entity").on(t.entityType, t.entityId),
    index("idx_file_uploads_hash").on(t.sha256Hash),
    index("idx_file_uploads_retention").on(t.retentionExpiresAt),
    check("chk_file_upload_size_positive", sql`${t.fileSize} > 0`),
  ]
);
var apiKeys = pgTable(
  "api_keys",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
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
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_api_keys_tenant").on(t.tenantId),
    check("chk_api_key_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var webhooks = pgTable(
  "webhooks",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
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
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_webhooks_tenant").on(t.tenantId),
    check("chk_webhook_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    webhookId: integer("webhookId").notNull(),
    event: varchar("event", { length: 100 }).notNull(),
    payload: jsonb("payload").notNull(),
    responseStatus: integer("responseStatus"),
    responseBody: text("responseBody"),
    deliveredAt: timestamp("deliveredAt"),
    success: boolean("success").default(false).notNull(),
    attemptCount: integer("attemptCount").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_webhook_deliveries_webhook").on(t.webhookId),
    index("idx_webhook_deliveries_created").on(t.createdAt),
  ]
);
var featureFlags = pgTable(
  "feature_flags",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId"),
    key: varchar("key", { length: 100 }).notNull(),
    value: varchar("value", { length: 255 }).notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_feature_flags_tenant_key").on(t.tenantId, t.key),
    unique("feature_flags_tenant_key_unique").on(t.tenantId, t.key),
  ]
);
var employeeStatusEnum = pgEnum("employee_status", [
  "active",
  "on_leave",
  "terminated",
]);
var projectStatusEnum = pgEnum("project_status", [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
]);
var taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "review",
  "done",
]);
var taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);
var requisitionStatusEnum = pgEnum("requisition_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "ordered",
  "received",
]);
var approvalDecisionEnum = pgEnum("approval_decision", [
  "pending",
  "approved",
  "rejected",
]);
var ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);
var ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);
var inspectionResultEnum = pgEnum("inspection_result", [
  "pass",
  "fail",
  "conditional",
]);
var attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "leave",
]);
var payrollStatusEnum = pgEnum("payroll_status", [
  "draft",
  "processed",
  "paid",
]);
var departments = pgTable(
  "departments",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 30 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    managerId: integer("managerId"),
    parentDepartmentId: integer("parentDepartmentId"),
    costCenter: varchar("costCenter", { length: 50 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_departments_tenant").on(t.tenantId),
    uniqueIndex("uq_departments_tenant_code").on(t.tenantId, t.code),
    check("chk_department_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var employees = pgTable(
  "employees",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
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
    deletedAt: timestamp("deleted_at"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_employees_tenant").on(t.tenantId),
    index("idx_employees_currency").on(t.currencyId),
    uniqueIndex("uq_employees_tenant_code").on(t.tenantId, t.code),
    check("chk_employee_salary_not_negative", sql`${t.salary} >= 0`),
    check("chk_employee_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var attendance = pgTable(
  "attendance",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    employeeId: integer("employeeId").notNull(),
    date: timestamp("date").notNull(),
    checkIn: timestamp("checkIn"),
    checkOut: timestamp("checkOut"),
    status: attendanceStatusEnum("status").default("present").notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    deviceId: integer("deviceId"),
    ipAddress: varchar("ipAddress", { length: 45 }),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
  },
  t => [
    index("idx_attendance_tenant").on(t.tenantId),
    index("idx_attendance_employee").on(t.employeeId),
    index("idx_attendance_date").on(t.date),
    unique("attendance_employee_date_unique").on(t.employeeId, t.date),
    check("chk_attendance_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var payrollRuns = pgTable(
  "payroll_runs",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
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
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_payroll_runs_tenant").on(t.tenantId),
    unique("payroll_runs_tenant_period_unique").on(t.tenantId, t.periodName),
    check("chk_payroll_run_total_not_negative", sql`${t.totalNet} >= 0`),
    check("chk_payroll_run_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var payrollItems = pgTable(
  "payroll_items",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
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
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_payroll_items_tenant").on(t.tenantId),
    index("idx_payroll_items_run").on(t.payrollRunId),
    index("idx_payroll_items_employee").on(t.employeeId),
    unique("payroll_items_run_employee_unique").on(
      t.payrollRunId,
      t.employeeId
    ),
    check("chk_payroll_item_basic_not_negative", sql`${t.basicSalary} >= 0`),
    check(
      "chk_payroll_item_deductions_not_negative",
      sql`${t.deductions} >= 0`
    ),
    check("chk_payroll_item_net_not_negative", sql`${t.net} >= 0`),
    check("chk_payroll_item_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
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
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_projects_tenant").on(t.tenantId),
    index("idx_projects_currency").on(t.currencyId),
    uniqueIndex("uq_projects_tenant_code").on(t.tenantId, t.code),
    check("chk_project_budget_not_negative", sql`${t.budget} >= 0`),
    check("chk_project_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var projectTasks = pgTable(
  "project_tasks",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
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
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_project_tasks_tenant").on(t.tenantId),
    index("idx_project_tasks_project").on(t.projectId),
    index("idx_project_tasks_assignee").on(t.assigneeId),
    check("chk_project_task_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var projectMembers = pgTable(
  "project_members",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    projectId: integer("projectId").notNull(),
    employeeId: integer("employeeId").notNull(),
    roleInProject: varchar("roleInProject", { length: 80 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_project_members_tenant").on(t.tenantId),
    index("idx_project_members_project").on(t.projectId),
    index("idx_project_members_employee").on(t.employeeId),
    unique("project_members_project_employee_unique").on(
      t.projectId,
      t.employeeId
    ),
    check("chk_project_member_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var procurements = pgTable(
  "procurements",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    requisitionNumber: varchar("requisitionNumber", { length: 40 }).notNull(),
    requestedById: integer("requestedById"),
    departmentId: integer("departmentId"),
    itemName: varchar("itemName", { length: 200 }).notNull(),
    description: text("description"),
    quantity: decimal("quantity", { precision: 12, scale: 2 })
      .default("1")
      .notNull(),
    unit: varchar("unit", { length: 20 }).default("\u0642\u0637\u0639\u0629"),
    estimatedCost: decimal("estimatedCost", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    currency: varchar("currency", { length: 10 }).default("YER"),
    supplierId: integer("supplierId"),
    status: requisitionStatusEnum("status").default("draft").notNull(),
    approvedById: integer("approvedById"),
    // ─── Multi-step approval workflow (Module A) ─────────────────────
    approvers: jsonb("approvers"),
    // ordered array of userIds
    approvalStep: integer("approvalStep").default(0).notNull(),
    approvalLog: jsonb("approvalLog"),
    // [{ by, at, action, note }]
    receivedCost: decimal("receivedCost", { precision: 15, scale: 2 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_procurements_tenant").on(t.tenantId),
    index("idx_procurements_currency").on(t.currencyId),
    uniqueIndex("uq_procurements_tenant_req").on(
      t.tenantId,
      t.requisitionNumber
    ),
    check("chk_procurement_quantity_positive", sql`${t.quantity} > 0`),
    check(
      "chk_procurement_estimated_cost_not_negative",
      sql`${t.estimatedCost} >= 0`
    ),
    check("chk_procurement_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var procurementApprovals = pgTable(
  "procurement_approvals",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    procurementId: integer("procurementId").notNull(),
    approverId: integer("approverId"),
    level: integer("level").default(1).notNull(),
    decision: approvalDecisionEnum("decision").default("pending").notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_procurement_approvals_tenant").on(t.tenantId),
    index("idx_procurement_approvals_proc").on(t.procurementId),
    unique("procurement_approvals_proc_level_unique").on(
      t.procurementId,
      t.level
    ),
    check(
      "chk_procurement_approval_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var tickets = pgTable(
  "tickets",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
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
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_tickets_tenant").on(t.tenantId),
    index("idx_tickets_assigned").on(t.assignedToId),
    uniqueIndex("uq_tickets_tenant_num").on(t.tenantId, t.ticketNumber),
    check("chk_ticket_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var qualityInspections = pgTable(
  "quality_inspections",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
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
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_quality_inspections_tenant").on(t.tenantId),
    uniqueIndex("uq_quality_tenant_code").on(t.tenantId, t.code),
    check(
      "chk_quality_score_range",
      sql`${t.score} IS NULL OR (${t.score} >= 0 AND ${t.score} <= 100)`
    ),
    check("chk_quality_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var journalEntries = pgTable(
  "journal_entries",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    branchId: integer("branchId"),
    sourceModule: varchar("sourceModule", { length: 50 }),
    sourceRefType: varchar("sourceRefType", { length: 50 }),
    sourceRefId: integer("sourceRefId"),
    referenceNo: varchar("referenceNo", { length: 80 }),
    status: varchar("status", { length: 20 }).default("posted").notNull(),
    totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }).default(
      "0"
    ),
    memo: text("memo"),
    createdById: integer("createdById"),
    postedAt: timestamp("postedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
    // Immutable once posted
    isImmutable: boolean("isImmutable").default(false).notNull(),
  },
  t => [
    index("idx_journal_tenant").on(t.tenantId),
    index("idx_journal_source").on(t.sourceModule, t.sourceRefId),
    index("idx_journal_currency").on(t.currencyId),
    check("chk_journal_total_not_negative", sql`${t.totalAmount} >= 0`),
    check("chk_journal_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
    check(
      "chk_journal_immutable_posted",
      sql`
      CASE WHEN ${t.status} = 'posted' THEN ${t.isImmutable} = true ELSE true END
    `
    ),
  ]
);
var scheduledJournalEntries = pgTable(
  "scheduled_journal_entries",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    branchId: integer("branchId"),
    frequency: varchar("frequency", { length: 20 })
      .default("monthly")
      .notNull(),
    nextRunAt: timestamp("nextRunAt"),
    isActive: boolean("isActive").default(true).notNull(),
    legs: jsonb("legs"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_scheduledJournal_tenant").on(t.tenantId),
    index("idx_scheduledJournal_nextRun").on(t.nextRunAt),
    check(
      "chk_scheduled_journal_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var recurringExpenseStatusEnum = pgEnum("recurring_expense_status", [
  "draft",
  "active",
  "paused",
  "completed",
  "cancelled",
]);
var recurringExpenseFrequencyEnum = pgEnum("recurring_expense_frequency", [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
  "custom",
]);
var expenseBasisEnum = pgEnum("expense_basis", ["accrual", "cash"]);
var expenseApprovalStatusEnum = pgEnum("expense_approval_status", [
  "pending",
  "approved",
  "rejected",
  "auto_approved",
]);
var recurringExpenses = pgTable(
  "recurring_expenses",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    categoryId: integer("categoryId").references(() => categories.id),
    vendorId: integer("vendorId").references(() => suppliers.id),
    accountId: integer("accountId")
      .references(() => accounts.id)
      .notNull(),
    branchId: integer("branchId").references(() => branches.id),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("YER").notNull(),
    exchangeRate: decimal("exchangeRate", { precision: 18, scale: 8 })
      .default("1")
      .notNull(),
    taxRate: decimal("taxRate", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),
    taxAccountId: integer("taxAccountId").references(() => accounts.id),
    frequency: recurringExpenseFrequencyEnum("frequency")
      .default("monthly")
      .notNull(),
    customCron: varchar("customCron", { length: 100 }),
    dayOfMonth: integer("dayOfMonth"),
    dayOfWeek: integer("dayOfWeek"),
    weekOfMonth: integer("weekOfMonth"),
    startDate: timestamp("startDate").notNull(),
    endDate: timestamp("endDate"),
    maxOccurrences: integer("maxOccurrences"),
    occurrencesCount: integer("occurrencesCount").default(0).notNull(),
    basis: expenseBasisEnum("basis").default("accrual").notNull(),
    status: recurringExpenseStatusEnum("status").default("draft").notNull(),
    approvalStatus: expenseApprovalStatusEnum("approvalStatus")
      .default("pending")
      .notNull(),
    approverId: integer("approverId").references(() => users.id),
    approvedAt: timestamp("approvedAt"),
    approvedById: integer("approvedById").references(() => users.id),
    paymentMethod: varchar("paymentMethod", { length: 50 }),
    paymentAccountId: integer("paymentAccountId").references(() => accounts.id),
    autoPay: boolean("autoPay").default(false).notNull(),
    nextRunAt: timestamp("nextRunAt"),
    lastRunAt: timestamp("lastRunAt"),
    lastRunStatus: varchar("lastRunStatus", { length: 20 }),
    lastRunError: text("lastRunError"),
    budgetId: integer("budgetId").references(() => budgets.id),
    departmentId: integer("departmentId").references(() => departments.id),
    projectId: integer("projectId").references(() => projects.id),
    tags: jsonb("tags"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    createdById: integer("createdById").references(() => users.id),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_recurring_expenses_tenant").on(t.tenantId),
    index("idx_recurring_expenses_status").on(t.status),
    index("idx_recurring_expenses_next_run").on(t.nextRunAt),
    index("idx_recurring_expenses_vendor").on(t.vendorId),
    index("idx_recurring_expenses_category").on(t.categoryId),
    index("idx_recurring_expenses_account").on(t.accountId),
    index("idx_recurring_expenses_budget").on(t.budgetId),
    check("chk_recurring_expense_amount_positive", sql`${t.amount} > 0`),
    check(
      "chk_recurring_expense_exchange_rate_positive",
      sql`${t.exchangeRate} > 0`
    ),
    check(
      "chk_recurring_expense_tax_rate_not_negative",
      sql`${t.taxRate} >= 0`
    ),
    check(
      "chk_recurring_expense_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
    check(
      "chk_recurring_expense_account_not_null",
      sql`${t.accountId} IS NOT NULL`
    ),
    check(
      "chk_recurring_expense_dates",
      sql`${t.startDate} <= ${t.endDate} OR ${t.endDate} IS NULL`
    ),
  ]
);
var recurringExpenseRuns = pgTable(
  "recurring_expense_runs",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    recurringExpenseId: integer("recurringExpenseId")
      .notNull()
      .references(() => recurringExpenses.id),
    runNumber: integer("runNumber").notNull(),
    scheduledDate: timestamp("scheduledDate").notNull(),
    executedDate: timestamp("executedDate"),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    taxAmount: decimal("taxAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }).notNull(),
    baseAmount: decimal("baseAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    exchangeRate: decimal("exchangeRate", { precision: 18, scale: 8 })
      .default("1")
      .notNull(),
    journalEntryId: integer("journalEntryId").references(
      () => journalEntries.id
    ),
    purchaseInvoiceId: integer("purchaseInvoiceId").references(
      () => purchaseInvoices.id
    ),
    paymentTransactionId: integer("paymentTransactionId").references(
      () => transactions.id
    ),
    errorMessage: text("errorMessage"),
    processedById: integer("processedById").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_recurring_expense_runs_tenant").on(t.tenantId),
    index("idx_recurring_expense_runs_recurring").on(t.recurringExpenseId),
    index("idx_recurring_expense_runs_scheduled").on(t.scheduledDate),
    index("idx_recurring_expense_runs_status").on(t.status),
    unique("recurring_expense_runs_unique").on(
      t.recurringExpenseId,
      t.runNumber
    ),
    check("chk_recurring_expense_run_amount_positive", sql`${t.amount} > 0`),
    check(
      "chk_recurring_expense_run_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var units = pgTable(
  "units",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 20 }).notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    nameAr: varchar("nameAr", { length: 80 }),
    symbol: varchar("symbol", { length: 20 }),
    baseUnitId: integer("baseUnitId"),
    conversionFactor: decimal("conversionFactor", {
      precision: 15,
      scale: 6,
    }).default("1"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_units_tenant").on(t.tenantId),
    uniqueIndex("uq_units_tenant_code").on(t.tenantId, t.code),
    check("chk_unit_conversion_positive", sql`${t.conversionFactor} > 0`),
    check("chk_unit_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var productUnits = pgTable(
  "product_units",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    productId: integer("productId").notNull(),
    unitId: integer("unitId").notNull(),
    conversionFactor: decimal("conversionFactor", { precision: 15, scale: 6 })
      .default("1")
      .notNull(),
    isBase: boolean("isBase").default(false).notNull(),
    barcode: varchar("barcode", { length: 100 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_productUnits_tenant").on(t.tenantId),
    index("idx_productUnits_product").on(t.productId),
    unique("product_units_product_unit_unique").on(t.productId, t.unitId),
    check(
      "chk_product_unit_conversion_positive",
      sql`${t.conversionFactor} > 0`
    ),
    check("chk_product_unit_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 30 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    nameAr: varchar("nameAr", { length: 100 }),
    parentId: integer("parentId"),
    type: varchar("type", { length: 30 }).default("product"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_categories_tenant").on(t.tenantId),
    uniqueIndex("uq_categories_tenant_code").on(t.tenantId, t.code),
    check("chk_category_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var roles = pgTable(
  "roles",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    code: varchar("code", { length: 40 }).notNull(),
    description: text("description"),
    permissions: text("permissions"),
    // JSON array of permission keys
    isSystem: boolean("isSystem").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_roles_tenant").on(t.tenantId),
    uniqueIndex("uq_roles_tenant_code").on(t.tenantId, t.code),
    check("chk_role_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var userRoles = pgTable(
  "user_roles",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    userId: integer("userId").notNull(),
    roleId: integer("roleId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_userroles_tenant").on(t.tenantId),
    uniqueIndex("uq_userroles_user_role").on(t.userId, t.roleId),
    check("chk_user_role_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var permissions = pgTable(
  "permissions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    key: varchar("key", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    category: varchar("category", { length: 50 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [uniqueIndex("uq_permissions_key").on(t.key)]
);
var documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 40 }),
    title: varchar("title", { length: 200 }).notNull(),
    type: varchar("type", { length: 50 }),
    entityType: varchar("entityType", { length: 50 }),
    entityId: integer("entityId"),
    fileUrl: text("fileUrl"),
    fileUploadId: integer("fileUploadId"),
    notes: text("notes"),
    uploadedById: integer("uploadedById"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_documents_tenant").on(t.tenantId),
    index("idx_documents_entity").on(t.entityType, t.entityId),
    check("chk_document_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    fromUserId: text("fromUserId").notNull(),
    fromName: text("fromName"),
    toUserId: text("toUserId").notNull(),
    body: text("body").notNull(),
    isRead: boolean("isRead").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_messages_tenant").on(t.tenantId),
    index("idx_messages_to").on(t.tenantId, t.toUserId),
    index("idx_messages_from").on(t.tenantId, t.fromUserId),
    check("chk_message_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var posSessions = pgTable(
  "pos_sessions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 40 }).notNull(),
    openedById: integer("openedById").notNull(),
    openedAt: timestamp("openedAt").defaultNow().notNull(),
    closedAt: timestamp("closedAt"),
    openingFloat: decimal("openingFloat", { precision: 15, scale: 2 }).default(
      "0"
    ),
    closingFloat: decimal("closingFloat", { precision: 15, scale: 2 }),
    expectedCash: decimal("expectedCash", { precision: 15, scale: 2 }),
    countedCash: decimal("countedCash", { precision: 15, scale: 2 }),
    variance: decimal("variance", { precision: 15, scale: 2 }),
    status: varchar("status", { length: 20 }).default("open").notNull(),
    notes: text("notes"),
    branchId: integer("branchId"),
    deviceId: integer("deviceId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_pos_sessions_tenant").on(t.tenantId),
    index("idx_pos_sessions_currency").on(t.currencyId),
    check("chk_pos_session_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var posOrders = pgTable(
  "pos_orders",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    sessionId: integer("sessionId"),
    salesInvoiceId: integer("salesInvoiceId"),
    total: decimal("total", { precision: 15, scale: 2 }).default("0"),
    paymentMethod: varchar("paymentMethod", { length: 20 }),
    status: varchar("status", { length: 20 }).default("completed"),
    createdById: integer("createdById"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_pos_orders_tenant").on(t.tenantId),
    index("idx_pos_orders_currency").on(t.currencyId),
    check("chk_pos_order_total_not_negative", sql`${t.total} >= 0`),
    check("chk_pos_order_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var customFieldDefs = pgTable(
  "custom_field_defs",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    key: varchar("key", { length: 50 }).notNull(),
    label: varchar("label", { length: 120 }).notNull(),
    type: varchar("type", { length: 20 }).notNull().default("text"),
    options: text("options"),
    required: boolean("required").default(false).notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    // JSON Schema validation
    jsonSchema: jsonb("jsonSchema"),
  },
  t => [
    uniqueIndex("custom_field_defs_tenant_entity_key").on(
      t.tenantId,
      t.entityType,
      t.key
    ),
    check(
      "chk_custom_field_def_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var customFieldValues = pgTable(
  "custom_field_values",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: integer("entity_id").notNull(),
    fieldKey: varchar("field_key", { length: 50 }).notNull(),
    value: text("value"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("custom_field_values_tenant_entity").on(
      t.tenantId,
      t.entityType,
      t.entityId
    ),
    unique("custom_field_values_entity_field_unique").on(
      t.entityType,
      t.entityId,
      t.fieldKey
    ),
    check(
      "chk_custom_field_value_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var salesReps = pgTable(
  "sales_reps",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    commissionType: varchar("commissionType", { length: 20 })
      .default("percent")
      .notNull(),
    commissionValue: decimal("commissionValue", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    bonusThreshold: decimal("bonusThreshold", { precision: 15, scale: 2 }),
    bonusAmount: decimal("bonusAmount", { precision: 15, scale: 2 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_sales_reps_tenant").on(t.tenantId),
    index("idx_sales_reps_currency").on(t.currencyId),
    check(
      "chk_sales_rep_commission_not_negative",
      sql`${t.commissionValue} >= 0`
    ),
    check("chk_sales_rep_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var offers = pgTable(
  "offers",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    kind: varchar("kind", { length: 20 }).default("financial").notNull(),
    discountPercent: decimal("discountPercent", { precision: 6, scale: 2 })
      .default("0")
      .notNull(),
    minQty: decimal("minQty", { precision: 15, scale: 2 }),
    productId: integer("productId"),
    categoryId: integer("categoryId"),
    startDate: timestamp("startDate"),
    endDate: timestamp("endDate"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_offers_tenant").on(t.tenantId),
    index("idx_offers_product").on(t.productId),
    index("idx_offers_category").on(t.categoryId),
    check("chk_offer_discount_not_negative", sql`${t.discountPercent} >= 0`),
    check("chk_offer_discount_not_over_100", sql`${t.discountPercent} <= 100`),
    check("chk_offer_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var translations = pgTable(
  "translations",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    key: varchar("key", { length: 255 }).notNull(),
    culture: varchar("culture", { length: 10 }).notNull(),
    value: text("value").notNull(),
    context: varchar("context", { length: 100 }),
    isApproved: boolean("isApproved").default(false).notNull(),
    approvedById: integer("approvedById"),
    approvedAt: timestamp("approvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_translations_tenant").on(t.tenantId),
    index("idx_translations_culture").on(t.culture),
    unique("translations_key_culture_tenant_unique").on(
      t.key,
      t.culture,
      t.tenantId
    ),
    check("chk_translation_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var biometricTemplates = pgTable(
  "biometric_templates",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    userId: integer("userId").notNull(),
    type: varchar("type", { length: 30 }).notNull(),
    // fingerprint, face, iris, voice
    algorithm: varchar("algorithm", { length: 50 }).notNull(),
    // e.g., ISO 19794-2, ISO 39794-5
    algorithmVersion: varchar("algorithmVersion", { length: 20 }).notNull(),
    templateHash: varchar("templateHash", { length: 64 }).notNull(),
    // SHA-256 of encrypted template
    encryptedTemplate: text("encryptedTemplate").notNull(),
    // Encrypted biometric data
    encryptionKeyId: varchar("encryptionKeyId", { length: 100 }).notNull(),
    qualityScore: integer("qualityScore"),
    // 0-100
    status: varchar("status", { length: 20 }).default("active").notNull(),
    // active, revoked, expired
    enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
    enrolledById: integer("enrolledById").notNull(),
    approvedById: integer("approvedById"),
    approvedAt: timestamp("approvedAt"),
    revokedAt: timestamp("revokedAt"),
    revokedById: integer("revokedById"),
    revocationReason: varchar("revocationReason", { length: 255 }),
    expiresAt: timestamp("expiresAt"),
    lastVerifiedAt: timestamp("lastVerifiedAt"),
    verificationCount: integer("verificationCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_biometric_tenant").on(t.tenantId),
    index("idx_biometric_user").on(t.userId),
    index("idx_biometric_type").on(t.type),
    index("idx_biometric_status").on(t.status),
    unique("biometric_template_user_type_unique").on(t.userId, t.type),
    check(
      "chk_biometric_quality_score_range",
      sql`${t.qualityScore} IS NULL OR (${t.qualityScore} >= 0 AND ${t.qualityScore} <= 100)`
    ),
    check("chk_biometric_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var syncMetadata = pgTable(
  "sync_metadata",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    aggregateId: uuid("aggregateId").notNull(),
    entityType: varchar("entityType", { length: 100 }).notNull(),
    entityId: integer("entityId").notNull(),
    entityGlobalId: uuid("entityGlobalId").notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
    clientVersion: integer("clientVersion").default(0).notNull(),
    conflictState: varchar("conflictState", { length: 20 })
      .default("none")
      .notNull(),
    // none, client_wins, server_wins, manual
    conflictData: jsonb("conflictData"),
    // { clientValue, serverValue, resolvedValue }
    lastSyncAt: timestamp("lastSyncAt").defaultNow().notNull(),
    lastConflictAt: timestamp("lastConflictAt"),
    resolvedAt: timestamp("resolvedAt"),
    resolvedById: integer("resolvedById"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_sync_metadata_tenant").on(t.tenantId),
    index("idx_sync_metadata_aggregate").on(t.aggregateId),
    index("idx_sync_metadata_entity").on(t.entityType, t.entityId),
    unique("sync_metadata_aggregate_entity_unique").on(
      t.aggregateId,
      t.entityType,
      t.entityId
    ),
    check("chk_sync_metadata_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var costCenterTypeEnum = pgEnum("cost_center_type", [
  "cost",
  // مركز تكلفة
  "profit",
  // مركز ربح
  "investment",
  // مركز استثمار
  "revenue",
  // مركز إيراد
]);
var costCenters = pgTable(
  "cost_centers",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 30 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    nameAr: varchar("nameAr", { length: 150 }),
    type: costCenterTypeEnum("type").default("cost").notNull(),
    parentId: integer("parentId"),
    managerId: integer("managerId"),
    // موظف مسؤول
    departmentId: integer("departmentId"),
    budgetAccountId: integer("budgetAccountId"),
    // حساب الموازنة المرتبط
    isActive: boolean("isActive").default(true).notNull(),
    description: text("description"),
    // Allocation configuration
    allocationBase: varchar("allocationBase", { length: 50 }),
    // headcount, area, revenue, direct_hours, machine_hours, custom
    allocationWeight: decimal("allocationWeight", {
      precision: 10,
      scale: 4,
    }).default("1"),
    // Hierarchy path for fast queries
    path: varchar("path", { length: 500 }),
    // e.g., /1/5/12/
    level: integer("level").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_cost_centers_tenant").on(t.tenantId),
    index("idx_cost_centers_parent").on(t.parentId),
    index("idx_cost_centers_type").on(t.type),
    index("idx_cost_centers_path").on(t.path),
    unique("cost_centers_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_cost_center_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var allocationMethodEnum = pgEnum("allocation_method", [
  "fixed",
  // نسبة ثابتة
  "proportional",
  // تناسبي حسب الأساس
  "step_down",
  // خطوة بخطوة (sequential)
  "reciprocal",
  // تبادلي (simultaneous equations)
  "activity_based",
  // القائم على الأنشطة (ABC)
]);
var allocationRules = pgTable(
  "allocation_rules",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    description: text("description"),
    method: allocationMethodEnum("method").default("proportional").notNull(),
    // Source: ما يتم توزيعه
    sourceType: varchar("sourceType", { length: 30 }).notNull(),
    // cost_center, account, fixed_amount
    sourceCostCenterId: integer("sourceCostCenterId"),
    sourceAccountId: integer("sourceAccountId"),
    sourceFixedAmount: decimal("sourceFixedAmount", {
      precision: 15,
      scale: 2,
    }),
    // Target: куда يتم التوزيع
    targetCostCenterIds: jsonb("targetCostCenterIds").notNull(),
    // array of cost center IDs
    // Basis: أساس التوزيع
    basisType: varchar("basisType", { length: 50 }),
    // headcount, area, revenue, direct_labor_hours, machine_hours, custom_driver
    basisDriverId: integer("basisDriverId"),
    // custom driver account/cost center
    basisFormula: text("basisFormula"),
    // JSON: custom formula
    // Filters
    filterAccountTypes: jsonb("filterAccountTypes"),
    // which account types to allocate
    filterDateRange: jsonb("filterDateRange"),
    // {from, to} or periodName
    // Schedule
    isRecurring: boolean("isRecurring").default(false).notNull(),
    frequency: varchar("frequency", { length: 20 }),
    // monthly, quarterly, yearly
    nextRunAt: timestamp("nextRunAt"),
    lastRunAt: timestamp("lastRunAt"),
    // Status
    isActive: boolean("isActive").default(true).notNull(),
    priority: integer("priority").default(0).notNull(),
    // for step-down ordering
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_allocation_rules_tenant").on(t.tenantId),
    index("idx_allocation_rules_source_cc").on(t.sourceCostCenterId),
    index("idx_allocation_rules_next_run").on(t.nextRunAt),
    check(
      "chk_allocation_rule_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var allocationRuns = pgTable(
  "allocation_runs",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    ruleId: integer("ruleId").notNull(),
    periodName: varchar("periodName", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).default("draft").notNull(),
    // draft, posted, reversed
    totalAllocated: decimal("totalAllocated", {
      precision: 15,
      scale: 2,
    }).default("0"),
    details: jsonb("details"),
    // [{ targetCostCenterId, basisValue, allocatedAmount }]
    postedAt: timestamp("postedAt"),
    postedById: integer("postedById"),
    reversedAt: timestamp("reversedAt"),
    reversedById: integer("reversedById"),
    reversalReason: varchar("reversalReason", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_allocation_runs_tenant").on(t.tenantId),
    index("idx_allocation_runs_rule").on(t.ruleId),
    index("idx_allocation_runs_period").on(t.periodName),
    unique("allocation_runs_rule_period_unique").on(t.ruleId, t.periodName),
    check("chk_allocation_run_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var budgetVersionEnum = pgEnum("budget_version", [
  "draft",
  "approved",
  "revised",
  "final",
]);
var budgetScenarios = pgTable(
  "budget_scenarios",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    version: budgetVersionEnum("version").default("draft").notNull(),
    periodName: varchar("periodName", { length: 50 }).notNull(),
    costCenterId: integer("costCenterId"),
    // Scenario assumptions
    assumptions: jsonb("assumptions"),
    // { growthRate, inflationRate, fxRate, ... }
    // Status
    approvedById: integer("approvedById"),
    approvedAt: timestamp("approvedAt"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_budget_scenarios_tenant").on(t.tenantId),
    index("idx_budget_scenarios_period").on(t.periodName),
    unique("budget_scenarios_tenant_name_period_unique").on(
      t.tenantId,
      t.name,
      t.periodName
    ),
    check(
      "chk_budget_scenario_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var budgetLines = pgTable(
  "budget_lines",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    scenarioId: integer("scenarioId").notNull(),
    accountId: integer("accountId").notNull(),
    costCenterId: integer("costCenterId"),
    periodName: varchar("periodName", { length: 50 }).notNull(),
    // monthly breakdown
    amount: decimal("amount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    quantity: decimal("quantity", { precision: 15, scale: 4 }),
    // for driver-based budgets
    unitPrice: decimal("unitPrice", { precision: 15, scale: 4 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_budget_lines_tenant").on(t.tenantId),
    index("idx_budget_lines_scenario").on(t.scenarioId),
    index("idx_budget_lines_account").on(t.accountId),
    index("idx_budget_lines_cc_period").on(t.costCenterId, t.periodName),
    unique("budget_lines_scenario_account_cc_period_unique").on(
      t.scenarioId,
      t.accountId,
      t.costCenterId,
      t.periodName
    ),
    check("chk_budget_line_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var varianceAnalyses = pgTable(
  "variance_analyses",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    scenarioId: integer("scenarioId").notNull(),
    periodName: varchar("periodName", { length: 50 }).notNull(),
    accountId: integer("accountId").notNull(),
    costCenterId: integer("costCenterId"),
    budgetAmount: decimal("budgetAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    actualAmount: decimal("actualAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    varianceAmount: decimal("varianceAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    variancePercent: decimal("variancePercent", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    varianceType: varchar("varianceType", { length: 20 }),
    // favorable, unfavorable
    // Variance breakdown
    priceVariance: decimal("priceVariance", {
      precision: 15,
      scale: 2,
    }).default("0"),
    quantityVariance: decimal("quantityVariance", {
      precision: 15,
      scale: 2,
    }).default("0"),
    mixVariance: decimal("mixVariance", { precision: 15, scale: 2 }).default(
      "0"
    ),
    volumeVariance: decimal("volumeVariance", {
      precision: 15,
      scale: 2,
    }).default("0"),
    // Commentary
    commentary: text("commentary"),
    reviewedById: integer("reviewedById"),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_variance_tenant").on(t.tenantId),
    index("idx_variance_scenario").on(t.scenarioId),
    index("idx_variance_account_cc").on(t.accountId, t.costCenterId),
    index("idx_variance_period").on(t.periodName),
    unique("variance_scenario_account_cc_period_unique").on(
      t.scenarioId,
      t.accountId,
      t.costCenterId,
      t.periodName
    ),
    check("chk_variance_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var kpiDataTypeEnum = pgEnum("kpi_data_type", [
  "currency",
  "percentage",
  "ratio",
  "count",
  "days",
  "custom",
]);
var kpiFrequencyEnum = pgEnum("kpi_frequency", [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "realtime",
]);
var kpis = pgTable(
  "kpis",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    nameAr: varchar("nameAr", { length: 150 }),
    description: text("description"),
    category: varchar("category", { length: 50 }),
    // financial, operational, sales, hr, inventory
    dataType: kpiDataTypeEnum("dataType").default("currency").notNull(),
    frequency: kpiFrequencyEnum("frequency").default("monthly").notNull(),
    // Formula / Calculation
    formula: text("formula"),
    // SQL or expression: (revenue - cogs) / revenue * 100
    numeratorAccountIds: jsonb("numeratorAccountIds"),
    // account IDs for numerator
    denominatorAccountIds: jsonb("denominatorAccountIds"),
    // account IDs for denominator
    // Targets
    targetValue: decimal("targetValue", { precision: 15, scale: 4 }),
    targetMin: decimal("targetMin", { precision: 15, scale: 4 }),
    targetMax: decimal("targetMax", { precision: 15, scale: 4 }),
    // Thresholds for alerts
    warningThreshold: decimal("warningThreshold", { precision: 15, scale: 4 }),
    criticalThreshold: decimal("criticalThreshold", {
      precision: 15,
      scale: 4,
    }),
    // Direction
    higherIsBetter: boolean("higherIsBetter").default(true).notNull(),
    // Display
    decimalPlaces: integer("decimalPlaces").default(2).notNull(),
    chartType: varchar("chartType", { length: 20 }).default("line"),
    // line, bar, gauge, kpi_card
    color: varchar("color", { length: 20 }).default("#3B82F6"),
    // Status
    isActive: boolean("isActive").default(true).notNull(),
    isSystem: boolean("isSystem").default(false).notNull(),
    // built-in KPIs
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_kpis_tenant").on(t.tenantId),
    index("idx_kpis_category").on(t.category),
    unique("kpis_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_kpi_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var kpiMeasurements = pgTable(
  "kpi_measurements",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    kpiId: integer("kpiId").notNull(),
    periodName: varchar("periodName", { length: 50 }).notNull(),
    costCenterId: integer("costCenterId"),
    value: decimal("value", { precision: 15, scale: 4 }).notNull(),
    targetValue: decimal("targetValue", { precision: 15, scale: 4 }),
    variance: decimal("variance", { precision: 15, scale: 4 }),
    variancePercent: decimal("variancePercent", { precision: 10, scale: 2 }),
    status: varchar("status", { length: 20 }).default("on_track").notNull(),
    // on_track, warning, critical
    computedAt: timestamp("computedAt").defaultNow().notNull(),
    computedBy: varchar("computedBy", { length: 50 }).default("auto"),
    // auto, manual
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_kpi_measurements_tenant").on(t.tenantId),
    index("idx_kpi_measurements_kpi").on(t.kpiId),
    index("idx_kpi_measurements_period").on(t.periodName),
    index("idx_kpi_measurements_status").on(t.status),
    unique("kpi_measurements_kpi_period_cc_unique").on(
      t.kpiId,
      t.periodName,
      t.costCenterId
    ),
    check(
      "chk_kpi_measurement_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var reportTypeEnum = pgEnum("report_type", [
  "tabular",
  "pivot",
  "chart",
  "dashboard",
  "financial_statement",
  "custom",
]);
var reportDefinitions = pgTable(
  "report_definitions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    nameAr: varchar("nameAr", { length: 150 }),
    description: text("description"),
    type: reportTypeEnum("type").default("tabular").notNull(),
    category: varchar("category", { length: 50 }),
    // financial, managerial, operational, compliance
    // Data Source
    dataSource: varchar("dataSource", { length: 100 }).notNull(),
    // transactions, accounts, budget_lines, kpi_measurements, custom_sql
    queryConfig: jsonb("queryConfig").notNull(),
    // { filters, dimensions, measures, sorting, grouping }
    // Layout
    layoutConfig: jsonb("layoutConfig"),
    // { columns, rows, values, filters, formatting }
    chartConfig: jsonb("chartConfig"),
    // for chart types
    // Parameters
    parameters: jsonb("parameters"),
    // [{ name, type, default, required, options }]
    // Scheduling
    isScheduled: boolean("isScheduled").default(false).notNull(),
    scheduleCron: varchar("scheduleCron", { length: 100 }),
    // cron expression
    scheduleRecipients: jsonb("scheduleRecipients"),
    // [{ userId, email, format }]
    lastGeneratedAt: timestamp("lastGeneratedAt"),
    // Permissions
    isPublic: boolean("isPublic").default(false).notNull(),
    allowedRoles: jsonb("allowedRoles"),
    // role IDs
    allowedUsers: jsonb("allowedUsers"),
    // user IDs
    // Versioning
    version: integer("version").default(1).notNull(),
    parentReportId: integer("parentReportId"),
    // for derived reports
    // Status
    isActive: boolean("isActive").default(true).notNull(),
    isSystem: boolean("isSystem").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    createdById: integer("createdById"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_report_defs_tenant").on(t.tenantId),
    index("idx_report_defs_category").on(t.category),
    unique("report_defs_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_report_def_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var reportExecutions = pgTable(
  "report_executions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    reportId: integer("reportId").notNull(),
    parameters: jsonb("parameters"),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    // pending, running, completed, failed
    resultData: jsonb("resultData"),
    // cached result
    resultUrl: varchar("resultUrl", { length: 500 }),
    // exported file URL
    rowCount: integer("rowCount").default(0),
    executionTimeMs: integer("executionTimeMs").default(0),
    errorMessage: text("errorMessage"),
    executedById: integer("executedById"),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_report_executions_tenant").on(t.tenantId),
    index("idx_report_executions_report").on(t.reportId),
    index("idx_report_executions_status").on(t.status),
    check(
      "chk_report_execution_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);
var consolidationMethodEnum = pgEnum("consolidation_method", [
  "full",
  // دمج كامل
  "proportional",
  // تناسبي (equity method)
  "cost",
  // تكلفة
]);
var consolidationEntities = pgTable(
  "consolidation_entities",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    // parent/group tenant
    code: varchar("code", { length: 30 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    entityTenantId: integer("entityTenantId").notNull(),
    // child/subsidiary tenant
    ownershipPercent: decimal("ownershipPercent", { precision: 5, scale: 2 })
      .default("100")
      .notNull(),
    method: consolidationMethodEnum("method").default("full").notNull(),
    functionalCurrency: varchar("functionalCurrency", { length: 10 })
      .default("YER")
      .notNull(),
    reportingCurrency: varchar("reportingCurrency", { length: 10 })
      .default("YER")
      .notNull(),
    // Elimination rules
    eliminationRules: jsonb("eliminationRules"),
    // [{ fromEntity, toEntity, accountId, rule }]
    // Status
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_consolidation_entities_tenant").on(t.tenantId),
    index("idx_consolidation_entities_entity").on(t.entityTenantId),
    unique("consolidation_entities_tenant_code_unique").on(t.tenantId, t.code),
    check(
      "chk_consolidation_ownership",
      sql`${t.ownershipPercent} > 0 AND ${t.ownershipPercent} <= 100`
    ),
    check("chk_consolidation_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);
var consolidationAdjustments = pgTable(
  "consolidation_adjustments",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").notNull(),
    periodName: varchar("periodName", { length: 50 }).notNull(),
    consolidationEntityId: integer("consolidationEntityId").notNull(),
    adjustmentType: varchar("adjustmentType", { length: 50 }).notNull(),
    // elimination, translation, goodwill, nci
    accountId: integer("accountId").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull(),
    exchangeRate: decimal("exchangeRate", { precision: 18, scale: 8 }).default(
      "1"
    ),
    description: text("description"),
    postedAt: timestamp("postedAt"),
    postedById: integer("postedById"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_consolidation_adj_tenant").on(t.tenantId),
    index("idx_consolidation_adj_period").on(t.periodName),
    index("idx_consolidation_adj_entity").on(t.consolidationEntityId),
    check(
      "chk_consolidation_adj_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  ownerPassword: process.env.OWNER_PASSWORD ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  /** Master secret for encrypted backups (AES-256-GCM). Required in production. */
  backupEncryptionKey: process.env.BACKUP_ENCRYPTION_KEY ?? "",
  /** Local directory for backup blobs when S3 is not configured. */
  backupDir: process.env.BACKUP_DIR ?? "",
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const sql3 = neon(process.env.DATABASE_URL);
      _db = drizzle(sql3);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// server/serverless/agent.ts
import { desc as desc2, count, lt } from "drizzle-orm";

// server/notifications.ts
async function createNotification(db, input) {
  if (!db) return;
  await db.insert(notifications).values({
    tenantId: input.tenantId,
    userId: input.userId ?? null,
    type: input.type,
    channel: "inapp",
    subject: input.title,
    body: input.body,
    status: "unread",
    metadata: input.link ? { link: input.link } : null,
    createdAt: /* @__PURE__ */ new Date(),
  });
}

// server/automation.ts
import {
  eq as eq2,
  and,
  sql as sql2,
  ne,
  isNull,
  gte,
  desc,
  lte,
} from "drizzle-orm";
async function runProactiveAlerts(tenantId) {
  const db = await getDb();
  if (!db) {
    return {
      created: { reorder: 0, overdueSales: 0, overduePurchase: 0 },
      total: 0,
    };
  }
  const since = new Date(Date.now() - 24 * 60 * 60 * 1e3);
  const existing = await db
    .select({
      type: notifications.type,
      link: notifications.metadata,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(
      and(
        eq2(notifications.tenantId, tenantId),
        isNull(notifications.readAt),
        gte(notifications.createdAt, since)
      )
    );
  const alreadyNotified = /* @__PURE__ */ new Set();
  for (const n of existing) {
    const link = (n.link && n.link?.link) || null;
    if (link) alreadyNotified.add(`${n.type}::${link}`);
  }
  const key = (type, link) => `${type}::${link}`;
  const created = { reorder: 0, overdueSales: 0, overduePurchase: 0 };
  const lowStock = await db
    .select()
    .from(products)
    .where(
      and(
        eq2(products.tenantId, tenantId),
        isNull(products.deletedAt),
        sql2`${products.currentStock} <= ${products.reorderPoint}`,
        sql2`${products.reorderPoint} > 0`
      )
    );
  for (const p of lowStock) {
    const link = "/inventory";
    if (alreadyNotified.has(key("reorder", link))) continue;
    await createNotification(db, {
      tenantId,
      userId: null,
      title:
        "\u0645\u0646\u062A\u062C \u062A\u062D\u062A \u0646\u0642\u0637\u0629 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0637\u0644\u0628",
      body: `\u0627\u0644\u0645\u0646\u062A\u062C \xAB${p.name}\xBB \u0648\u0635\u0644 \u0645\u062E\u0632\u0648\u0646\u0647 (${Number(p.currentStock) || 0}) \u0625\u0644\u0649 \u0646\u0642\u0637\u0629 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0637\u0644\u0628 (${Number(p.reorderPoint) || 0})`,
      link,
      type: "reorder",
    });
    created.reorder++;
  }
  const overdueSales = await db
    .select()
    .from(salesInvoices)
    .where(
      and(
        eq2(salesInvoices.tenantId, tenantId),
        ne(salesInvoices.status, "cancelled"),
        ne(salesInvoices.status, "paid"),
        sql2`${salesInvoices.dueDate} < now()`,
        sql2`${salesInvoices.paidAmount} < ${salesInvoices.total}`
      )
    );
  for (const inv of overdueSales) {
    const link = "/commercial";
    if (alreadyNotified.has(key("overdue", link))) continue;
    const outstanding = (
      Number(inv.total || 0) - Number(inv.paidAmount || 0)
    ).toFixed(2);
    await createNotification(db, {
      tenantId,
      userId: null,
      title: "\u0645\u0633\u062A\u062D\u0642 \u0645\u062A\u0623\u062E\u0631",
      body: `\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A ${inv.invoiceNumber} \u0645\u0633\u062A\u062D\u0642\u0629 \u0648\u0644\u0645 \u062A\u0633\u062F\u062F \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u2014 \u0627\u0644\u0645\u062A\u0628\u0642\u064A ${outstanding}`,
      link,
      type: "overdue",
    });
    created.overdueSales++;
  }
  const overduePurchases = await db
    .select()
    .from(purchaseInvoices)
    .where(
      and(
        eq2(purchaseInvoices.tenantId, tenantId),
        ne(purchaseInvoices.status, "cancelled"),
        ne(purchaseInvoices.status, "paid"),
        sql2`${purchaseInvoices.dueDate} < now()`,
        sql2`${purchaseInvoices.paidAmount} < ${purchaseInvoices.total}`
      )
    );
  for (const inv of overduePurchases) {
    const link = "/commercial";
    if (alreadyNotified.has(key("overdue", link))) continue;
    const outstanding = (
      Number(inv.total || 0) - Number(inv.paidAmount || 0)
    ).toFixed(2);
    await createNotification(db, {
      tenantId,
      userId: null,
      title: "\u0645\u0633\u062A\u062D\u0642 \u0645\u062A\u0623\u062E\u0631",
      body: `\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A ${inv.invoiceNumber} \u0645\u0633\u062A\u062D\u0642\u0629 \u0648\u0644\u0645 \u062A\u0633\u062F\u062F \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u2014 \u0627\u0644\u0645\u062A\u0628\u0642\u064A ${outstanding}`,
      link,
      type: "overdue",
    });
    created.overduePurchase++;
  }
  return {
    created,
    total: created.reorder + created.overdueSales + created.overduePurchase,
  };
}
async function runScheduledJournalEntries(tenantId, userId = null) {
  const db = await getDb();
  if (!db) return { processed: 0 };
  const now = /* @__PURE__ */ new Date();
  const due = await db
    .select()
    .from(scheduledJournalEntries)
    .where(
      and(
        eq2(scheduledJournalEntries.tenantId, tenantId),
        eq2(scheduledJournalEntries.isActive, true)
      )
    );
  const ready = due.filter(
    s => s.nextRunAt != null && new Date(s.nextRunAt).getTime() <= now.getTime()
  );
  let processed = 0;
  for (const s of ready) {
    const legsArr = Array.isArray(s.legs) ? s.legs : [];
    const lines = [];
    let totalDebit = 0;
    let totalCredit = 0;
    for (const leg of legsArr) {
      const d = parseFloat(leg.debit || "0");
      const c = parseFloat(leg.credit || "0");
      if (d > 0) {
        lines.push({
          accountId: leg.accountId,
          type: "debit",
          amount: d.toFixed(2),
          narration: leg.description || s.name,
        });
        totalDebit += d;
      }
      if (c > 0) {
        lines.push({
          accountId: leg.accountId,
          type: "credit",
          amount: c.toFixed(2),
          narration: leg.description || s.name,
        });
        totalCredit += c;
      }
    }
    if (lines.length === 0) continue;
    if (Math.abs(totalDebit - totalCredit) > 0.01) continue;
    const bRows = await db
      .select()
      .from(branches)
      .where(eq2(branches.tenantId, tenantId))
      .orderBy(desc(branches.isMain))
      .limit(1);
    const effectiveBranchId = s.branchId ?? bRows[0]?.id ?? null;
    const [je] = await db
      .insert(journalEntries)
      .values({
        tenantId,
        branchId: effectiveBranchId,
        sourceModule: "scheduled",
        sourceRefType: "scheduled",
        sourceRefId: s.id,
        referenceNo: `SCH-${s.id}-${Date.now().toString().slice(-6)}`,
        status: "posted",
        totalAmount: totalDebit.toFixed(2),
        createdById: userId,
        postedAt: now,
      })
      .returning();
    for (const l of lines) {
      await db.insert(transactions).values({
        tenantId,
        accountId: l.accountId,
        branchId: effectiveBranchId,
        amount: l.amount,
        type: l.type,
        transactionDate: now,
        narration: l.narration,
        lifecycleStatus: "posted",
        referenceType: "scheduled",
        referenceId: s.id,
        sourceModule: "scheduled",
        userId,
        journalEntryId: je.id,
      });
    }
    let nextRunAt;
    const base = s.nextRunAt ? new Date(s.nextRunAt) : now;
    if (s.frequency === "once") {
      await db
        .update(scheduledJournalEntries)
        .set({ isActive: false })
        .where(eq2(scheduledJournalEntries.id, s.id));
      continue;
    } else if (s.frequency === "daily") {
      nextRunAt = new Date(base.getTime() + 24 * 3600 * 1e3);
    } else if (s.frequency === "weekly") {
      nextRunAt = new Date(base.getTime() + 7 * 24 * 3600 * 1e3);
    } else {
      nextRunAt = new Date(
        base.getFullYear(),
        base.getMonth() + 1,
        base.getDate(),
        base.getHours(),
        base.getMinutes(),
        base.getSeconds()
      );
    }
    await db
      .update(scheduledJournalEntries)
      .set({ nextRunAt })
      .where(eq2(scheduledJournalEntries.id, s.id));
    processed++;
  }
  return { processed };
}

// server/serverless/agent.ts
var AGENT_SECRET = process.env.AGENT_SECRET;
if (!AGENT_SECRET) {
  console.error(
    "[agent] AGENT_SECRET is not defined in .env \u2014 endpoint disabled"
  );
}
async function handler(req, res) {
  try {
    if (!AGENT_SECRET) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({ ok: false, error: "agent secret not configured" })
      );
      return;
    }
    const auth = req.headers["authorization"] || "";
    if (auth !== `Bearer ${AGENT_SECRET}`) {
      res.statusCode = 401;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
      return;
    }
    const { action } = req.query || {};
    const db = await getDb();
    if (!db) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "database unavailable" }));
      return;
    }
    if (action === "status" || !action) {
      const tenRows = await db
        .select({ id: tenants.id })
        .from(tenants)
        .orderBy(tenants.id);
      const userRows = await db
        .select({ id: users.id })
        .from(users)
        .orderBy(users.id);
      const logRows = await db
        .select({ id: activityLogs.id })
        .from(activityLogs)
        .orderBy(desc2(activityLogs.createdAt))
        .limit(10);
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          ok: true,
          agent: "strict-rule-v1",
          timestamp: /* @__PURE__ */ new Date().toISOString(),
          tenants: tenRows.length,
          users: userRows.length,
          recentActivity: logRows.length,
          features: {
            proactiveAlerts: true,
            scheduledJournalEntries: true,
            featureFlagChecks: true,
            staleSessionCleanup: true,
            analyticsStats: true,
          },
        })
      );
      return;
    }
    if (action === "force-run") {
      const tenantId = Number(req.query.tenantId);
      if (!tenantId) {
        res.statusCode = 400;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "tenantId required" }));
        return;
      }
      const alerts = await runProactiveAlerts(tenantId);
      const scheduled = await runScheduledJournalEntries(tenantId, null);
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          ok: true,
          tenantId,
          alerts: alerts.total,
          processed: scheduled.processed,
          message: "Force-run completed for tenant",
        })
      );
      return;
    }
    if (action === "purge-stale") {
      const days = Number(req.query.days) || 30;
      if (days < 1 || days > 365) {
        res.statusCode = 400;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "days must be 1-365" }));
        return;
      }
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
      const [{ total: staleAttempts }] = await db
        .select({ total: count() })
        .from(loginAttempts)
        .where(lt(loginAttempts.createdAt, cutoff));
      const [{ total: staleLogs }] = await db
        .select({ total: count() })
        .from(activityLogs)
        .where(lt(activityLogs.createdAt, cutoff));
      await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, cutoff));
      await db.delete(activityLogs).where(lt(activityLogs.createdAt, cutoff));
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          ok: true,
          deletedLoginAttempts: staleAttempts,
          deletedActivityLogs: staleLogs,
          message: `Purged data older than ${days} days`,
        })
      );
      return;
    }
    res.statusCode = 400;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "unknown action" }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      })
    );
  }
}
export { handler as default };
