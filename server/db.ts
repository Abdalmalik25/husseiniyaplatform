import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, services, projects, properties, teamMembers, serviceRequests, appointments, contactMessages, creditWallets, creditTransactions, subscriptions, devices, syncQueue, customers, suppliers, products, inventoryTransactions, invoices, invoiceItems, customerOrders, orderItems, distributionChannels, distributions, payments, expenses, organizations, branches, chartOfAccounts, currencies, unitsOfMeasure, employees, journalEntries, journalEntryLines, dailyTransactions } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { DEFAULT_SITE_CONFIG, type CreditPriority } from "../shared/config";

let _db: ReturnType<typeof drizzle> | null = null;
export function resolveTrialCredits(value: unknown = process.env.TRIAL_CREDITS) {
  const configured = Number(value ?? DEFAULT_SITE_CONFIG.credits.trialAmount);
  return Number.isFinite(configured) && configured >= 0 ? Math.floor(configured) : DEFAULT_SITE_CONFIG.credits.trialAmount;
}

const trialCredits = resolveTrialCredits();

export function resolveCreditPriority(value: unknown = process.env.CREDIT_CONSUMPTION_PRIORITY): CreditPriority {
  return value === "paid-first" ? "paid-first" : DEFAULT_SITE_CONFIG.credits.consumptionPriority;
}

export function resolveCreditCost(value: unknown = process.env.CREDIT_COST_PER_ACTION) {
  const configured = Number(value ?? DEFAULT_SITE_CONFIG.credits.costPerAction);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_SITE_CONFIG.credits.costPerAction;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date(); updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined || user.openId === ENV.ownerOpenId) { values.role = user.role ?? "admin"; updateSet.role = values.role; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return rows[0];
}

export async function getProperties() { const db = await getDb(); if (!db) return []; return db.select().from(properties).where(eq(properties.isActive, 1)).orderBy(desc(properties.createdAt)); }

export async function getPublicContent() {
  const db = await getDb();
  if (!db) return { services: [], projects: [], team: [] };
  const [serviceRows, projectRows, teamRows] = await Promise.all([
    db.select().from(services).where(eq(services.isActive, 1)).orderBy(desc(services.createdAt)),
    db.select().from(projects).orderBy(desc(projects.createdAt)),
    db.select().from(teamMembers).orderBy(desc(teamMembers.createdAt)),
  ]);
  return { services: serviceRows, projects: projectRows, team: teamRows };
}

export async function createServiceRequest(input: typeof serviceRequests.$inferInsert) { const db = await getDb(); if (!db) return null; const r = await db.insert(serviceRequests).values(input); return r; }
export async function createAppointment(input: typeof appointments.$inferInsert) { const db = await getDb(); if (!db) return null; return db.insert(appointments).values(input); }
export async function createContactMessage(input: typeof contactMessages.$inferInsert) { const db = await getDb(); if (!db) return null; return db.insert(contactMessages).values(input); }
export async function createService(input: typeof services.$inferInsert) { const db = await getDb(); if (!db) return null; return db.insert(services).values(input); }
export async function createProject(input: typeof projects.$inferInsert) { const db = await getDb(); if (!db) return null; return db.insert(projects).values(input); }

export async function updateServiceRequestStatus(id: number, status: "new" | "contacted" | "closed") { const db = await getDb(); if (!db) return null; return db.update(serviceRequests).set({ status }).where(eq(serviceRequests.id, id)); }
export async function updateAppointmentStatus(id: number, status: "new" | "confirmed" | "completed" | "cancelled") { const db = await getDb(); if (!db) return null; return db.update(appointments).set({ status }).where(eq(appointments.id, id)); }
export async function getAdminContent() { const db = await getDb(); if (!db) return { services: [], projects: [], properties: [] }; const [serviceRows, projectRows, propertyRows] = await Promise.all([db.select().from(services).orderBy(desc(services.createdAt)), db.select().from(projects).orderBy(desc(projects.createdAt)), db.select().from(properties).orderBy(desc(properties.createdAt))]); return { services: serviceRows, projects: projectRows, properties: propertyRows }; }

export async function getAdminInbox() {
  const db = await getDb(); if (!db) return { requests: [], appointments: [], messages: [] };
  const [requests, appointmentRows, messages] = await Promise.all([
    db.select().from(serviceRequests).orderBy(desc(serviceRequests.createdAt)),
    db.select().from(appointments).orderBy(desc(appointments.createdAt)),
    db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)),
  ]);
  return { requests, appointments: appointmentRows, messages };
}

export async function getOrCreateCreditWallet(userId: number) {
  const db = await getDb(); if (!db) return { freeCredits: 0, paidCredits: 0 };
  const insertResult = await db.insert(creditWallets).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
  if (insertResult[0]?.affectedRows === 1) {
    await db.insert(creditTransactions).values({ userId, amount: trialCredits, type: "grant", reference: "free-trial" });
  }
  const rows = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
  return rows[0] ?? { freeCredits: 0, paidCredits: 0 };
}

export async function getCreditTransactions(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(creditTransactions).where(eq(creditTransactions.userId, userId)).orderBy(desc(creditTransactions.createdAt));
}

export function calculateCreditUsage(wallet: { freeCredits: number; paidCredits: number }, policy: { priority?: CreditPriority; cost?: number } = {}) {
  const priority = policy.priority ?? resolveCreditPriority();
  const cost = policy.cost ?? resolveCreditCost();
  const buckets = priority === "paid-first" ? ["paidCredits", "freeCredits"] as const : ["freeCredits", "paidCredits"] as const;
  const bucket = buckets.find((candidate) => wallet[candidate] >= cost);
  return bucket ? { success: true as const, bucket, cost } : { success: false as const, reason: "insufficient-credits" as const };
}

export async function consumeCredit(userId: number, reference = "service-request") {
  const db = await getDb(); if (!db) return { success: false, reason: "database-unavailable" as const };
  return db.transaction(async (tx) => {
    await tx.insert(creditWallets).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
    const wallet = (await tx.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1))[0];
    if (!wallet) return { success: false, reason: "insufficient-credits" as const };
    const usage = calculateCreditUsage(wallet);
    if (!usage.success) return usage;
    const field = usage.bucket === "freeCredits" ? creditWallets.freeCredits : creditWallets.paidCredits;
    const updated = await tx.update(creditWallets).set({ [usage.bucket]: sql`${field} - ${usage.cost}` }).where(and(eq(creditWallets.userId, userId), sql`${field} >= ${usage.cost}`));
    if (!updated[0]?.affectedRows) return { success: false, reason: "insufficient-credits" as const };
    await tx.insert(creditTransactions).values({ userId, amount: -usage.cost, type: "consume", reference });
    return { success: true, remainingFree: wallet.freeCredits - (usage.bucket === "freeCredits" ? usage.cost : 0), remainingPaid: wallet.paidCredits - (usage.bucket === "paidCredits" ? usage.cost : 0) };
  });
}

/** Grants paid credits to a user's wallet (e.g. after a successful Stripe
 * checkout session). Mirrors the atomic pattern used by `consumeCredit`:
 * it runs inside a transaction, ensures a wallet row exists (idempotent via
 * ON DUPLICATE KEY), increments `paidCredits`, and records an audit row in
 * `creditTransactions` with type "purchase".
 *
 * `reference` should uniquely identify the payment (e.g. `stripe-<sessionId>`)
 * so the operation can be reconciled/deduplicated.
 */
export async function grantPaidCredits(userId: number, amount: number, reference: string) {
  const db = await getDb(); if (!db) return { success: false, reason: "database-unavailable" as const };
  return db.transaction(async (tx) => {
    // Ensure a wallet row exists (idempotent via ON DUPLICATE KEY).
    await tx.insert(creditWallets).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
    // Atomically add `amount` to the paidCredits bucket.
    const updated = await tx.update(creditWallets).set({ paidCredits: sql`${creditWallets.paidCredits} + ${amount}` }).where(eq(creditWallets.userId, userId));
    if (!updated[0]?.affectedRows) return { success: false, reason: "wallet-not-found" as const };
    await tx.insert(creditTransactions).values({ userId, amount, type: "purchase", reference });
    return { success: true as const, granted: amount };
  });
}

// Subscription management
export async function getOrCreateSubscription(userId: number) {
  const db = await getDb(); if (!db) return null;
  const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  const result = await db.insert(subscriptions).values({ userId, planId: "trial", status: "trial" });
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function updateSubscription(userId: number, planId: string, status: "active" | "cancelled" | "expired" | "trial") {
  const db = await getDb(); if (!db) return null;
  return db.update(subscriptions).set({ planId, status, updatedAt: new Date() }).where(eq(subscriptions.userId, userId));
}

// Device registration for multi-platform sync
export async function registerDevice(userId: number, deviceId: string, platform: string, name?: string) {
  const db = await getDb(); if (!db) return null;
  await db.insert(devices).values({ userId, deviceId, platform, name }).onDuplicateKeyUpdate({ set: { lastSyncAt: new Date(), name } });
  return db.select().from(devices).where(and(eq(devices.userId, userId), eq(devices.deviceId, deviceId))).limit(1);
}

export async function getDevices(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(devices).where(eq(devices.userId, userId)).orderBy(desc(devices.lastSyncAt));
}

// Sync queue operations
export async function enqueueSync(userId: number, deviceId: string, entityType: string, entityId: string, operation: "create" | "update" | "delete", payload?: unknown) {
  const db = await getDb(); if (!db) return null;
  return db.insert(syncQueue).values({ userId, deviceId, entityType, entityId, operation, payload: payload as any });
}

export async function getPendingSyncs(userId: number, deviceId?: string) {
  const db = await getDb(); if (!db) return [];
  const conditions = [eq(syncQueue.userId, userId), eq(syncQueue.status, "pending")];
  if (deviceId) conditions.push(eq(syncQueue.deviceId, deviceId));
  return db.select().from(syncQueue).where(and(...conditions)).orderBy(desc(syncQueue.createdAt));
}

export async function markSyncComplete(id: number) {
  const db = await getDb(); if (!db) return null;
  return db.update(syncQueue).set({ status: "synced", syncedAt: new Date() }).where(eq(syncQueue.id, id));
}

// ==== النظام التجاري: العملاء ====
export async function getCustomers(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(customers).where(eq(customers.userId, userId)).orderBy(desc(customers.createdAt));
}

export async function createCustomer(userId: number, input: { name: string; phone?: string; email?: string; address?: string; type?: string }) {
  const db = await getDb(); if (!db) return null;
  return db.insert(customers).values({ userId, ...input, type: (input.type as any) ?? "individual" });
}

// ==== النظام التجاري: الموردون ====
export async function getSuppliers(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(suppliers).where(eq(suppliers.userId, userId)).orderBy(desc(suppliers.createdAt));
}

export async function createSupplier(userId: number, input: { name: string; phone?: string; email?: string; address?: string }) {
  const db = await getDb(); if (!db) return null;
  return db.insert(suppliers).values({ userId, ...input });
}

// ==== النظام التجاري: المنتجات والمخزون ====
export async function getProducts(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(products).where(and(eq(products.userId, userId), eq(products.isActive, 1))).orderBy(desc(products.createdAt));
}

export async function createProduct(userId: number, input: { name: string; sku?: string; category?: string; unit?: string; costPrice?: number; sellingPrice?: number; stockQuantity?: number; minStock?: number }) {
  const db = await getDb(); if (!db) return null;
  return db.insert(products).values({ userId, ...input });
}

export async function adjustStock(userId: number, productId: number, quantity: number, type: "in" | "out" | "adjustment", reference?: string) {
  const db = await getDb(); if (!db) return null;
  return db.transaction(async (tx) => {
    const product = (await tx.select().from(products).where(and(eq(products.id, productId), eq(products.userId, userId))).limit(1))[0];
    if (!product) return null;
    const newQty = type === "out" ? product.stockQuantity - quantity : product.stockQuantity + quantity;
    await tx.update(products).set({ stockQuantity: Math.max(0, newQty) }).where(eq(products.id, productId));
    await tx.insert(inventoryTransactions).values({ userId, productId, quantity: type === "out" ? -quantity : quantity, type, reference });
    return { success: true, stockQuantity: Math.max(0, newQty) };
  });
}

export async function getInventoryTransactions(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(inventoryTransactions).where(eq(inventoryTransactions.userId, userId)).orderBy(desc(inventoryTransactions.createdAt));
}

// ==== النظام التجاري: الفواتير (مبيعات ومشتريات) ====
export async function getInvoices(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.createdAt));
}

export async function createInvoice(userId: number, input: { invoiceNumber: string; type: "sales" | "purchase"; customerId?: number; supplierId?: number; status?: string; subtotal?: number; discount?: number; tax?: number; total?: number; paidAmount?: number; notes?: string; items?: { description: string; quantity: number; unitPrice: number }[] }) {
  const db = await getDb(); if (!db) return null;
  return db.transaction(async (tx) => {
    const subtotal = input.subtotal ?? 0;
    const discount = input.discount ?? 0;
    const tax = input.tax ?? 0;
    const total = input.total ?? (subtotal - discount + tax);
    const result = await tx.insert(invoices).values({
      userId,
      invoiceNumber: input.invoiceNumber,
      type: input.type,
      customerId: input.customerId ?? null,
      supplierId: input.supplierId ?? null,
      status: (input.status as any) ?? "draft",
      subtotal,
      discount,
      tax,
      total,
      paidAmount: input.paidAmount ?? 0,
      notes: input.notes ?? null,
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

// ==== النظام التجاري: طلبات العملاء ====
export async function getCustomerOrders(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(customerOrders).where(eq(customerOrders.userId, userId)).orderBy(desc(customerOrders.createdAt));
}

export async function createCustomerOrder(userId: number, input: { orderNumber: string; customerId?: number; status?: string; total?: number; notes?: string; items?: { description: string; quantity: number; unitPrice: number }[] }) {
  const db = await getDb(); if (!db) return null;
  return db.transaction(async (tx) => {
    const total = input.total ?? (input.items?.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) ?? 0);
    const result = await tx.insert(customerOrders).values({
      userId,
      orderNumber: input.orderNumber,
      customerId: input.customerId ?? null,
      status: (input.status as any) ?? "new",
      total,
      notes: input.notes ?? null,
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

// ==== النظام التجاري: التوزيع ====
export async function getDistributionChannels(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(distributionChannels).where(and(eq(distributionChannels.userId, userId), eq(distributionChannels.isActive, 1))).orderBy(desc(distributionChannels.createdAt));
}

export async function createDistributionChannel(userId: number, input: { name: string; type?: string; location?: string }) {
  const db = await getDb(); if (!db) return null;
  return db.insert(distributionChannels).values({ userId, ...input, type: (input.type as any) ?? "other" });
}

export async function getDistributions(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(distributions).where(eq(distributions.userId, userId)).orderBy(desc(distributions.createdAt));
}

export async function createDistribution(userId: number, input: { channelId: number; productId: number; quantity: number }) {
  const db = await getDb(); if (!db) return null;
  return db.insert(distributions).values({ userId, ...input, status: "pending" });
}

// ==== النظام التجاري: المدفوعات والمصروفات ====
export async function getPayments(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt));
}

export async function createPayment(userId: number, input: { amount: number; type: "receive" | "pay"; method?: string; reference?: string; invoiceId?: number; customerId?: number; supplierId?: number }) {
  const db = await getDb(); if (!db) return null;
  return db.insert(payments).values({ userId, ...input, method: input.method ?? "نقدي" });
}

export async function getExpenses(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(expenses).where(eq(expenses.userId, userId)).orderBy(desc(expenses.createdAt));
}

export async function createExpense(userId: number, input: { amount: number; category: string; description?: string }) {
  const db = await getDb(); if (!db) return null;
  return db.insert(expenses).values({ userId, ...input });
}

// ==== لوحة تحكم النظام التجاري: الإحصائيات ====
export async function getCommerceDashboard(userId: number) {
  const db = await getDb(); if (!db) return { customers: 0, suppliers: 0, products: 0, lowStock: 0, invoices: 0, orders: 0, revenue: 0, expenses: 0 };
  const [customerRows, supplierRows, productRows, invoiceRows, orderRows, paymentRows, expenseRows] = await Promise.all([
    db.select().from(customers).where(eq(customers.userId, userId)),
    db.select().from(suppliers).where(eq(suppliers.userId, userId)),
    db.select().from(products).where(eq(products.userId, userId)),
    db.select().from(invoices).where(eq(invoices.userId, userId)),
    db.select().from(customerOrders).where(eq(customerOrders.userId, userId)),
    db.select().from(payments).where(eq(payments.userId, userId)),
    db.select().from(expenses).where(eq(expenses.userId, userId)),
  ]);
  return {
    customers: customerRows.length,
    suppliers: supplierRows.length,
    products: productRows.length,
    lowStock: productRows.filter((p) => p.stockQuantity <= p.minStock).length,
    invoices: invoiceRows.length,
    orders: orderRows.length,
    revenue: paymentRows.filter((p) => p.type === "receive").reduce((sum, p) => sum + p.amount, 0),
    totalExpenses: expenseRows.reduce((sum, e) => sum + e.amount, 0),
  };
}

// ==== النظام المحاسبي: المؤسسة ====
export async function getOrCreateOrganization(userId: number) {
  const db = await getDb(); if (!db) return null;
  const existing = await db.select().from(organizations).where(eq(organizations.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  const result = await db.insert(organizations).values({ userId, name: "مؤسسة الحسينية لخدمات الأعمال", commercialName: "ALHUSAINIA", legalName: "مؤسسة الحسينية لخدمات الأعمال" });
  const orgId = Number(result[0].insertId);
  // Seed default chart of accounts
  await seedDefaultChartOfAccounts(userId, orgId);
  return (await db.select().from(organizations).where(eq(organizations.userId, userId)).limit(1))[0] ?? null;
}

// ==== دليل الحسابات القياسي ====
const DEFAULT_CHART = [
  { code: "1000", name: "الأصول", type: "asset", category: "other", parentId: null },
  { code: "1100", name: "النقدية والبنوك", type: "asset", category: "current", parentId: null },
  { code: "1101", name: "الصندوق الرئيسي", type: "asset", category: "current", parentId: null },
  { code: "1102", name: "البنوك - حسابات جارية", type: "asset", category: "current", parentId: null },
  { code: "1200", name: "المدينون", type: "asset", category: "current", parentId: null },
  { code: "1201", name: "عملاء", type: "asset", category: "current", parentId: null },
  { code: "1202", name: "أوراق قبض", type: "asset", category: "current", parentId: null },
  { code: "1300", name: "المخزون", type: "asset", category: "current", parentId: null },
  { code: "1301", name: "مخزون بضاعة", type: "asset", category: "current", parentId: null },
  { code: "1400", name: "الأصول الثابتة", type: "asset", category: "fixed", parentId: null },
  { code: "1401", name: "أراضٍ ومبانٍ", type: "asset", category: "fixed", parentId: null },
  { code: "1402", name: "معدات وآلات", type: "asset", category: "fixed", parentId: null },
  { code: "1403", name: "مركبات", type: "asset", category: "fixed", parentId: null },
  { code: "1404", name: "مجمع إهلاك الأصول الثابتة", type: "asset", category: "fixed", parentId: null },
  { code: "2000", name: "الخصوم", type: "liability", category: "other", parentId: null },
  { code: "2100", name: "الدائنون", type: "liability", category: "current_liability", parentId: null },
  { code: "2101", name: "موردون", type: "liability", category: "current_liability", parentId: null },
  { code: "2102", name: "أوراق دفع", type: "liability", category: "current_liability", parentId: null },
  { code: "2200", name: "التزامات متداولة أخرى", type: "liability", category: "current_liability", parentId: null },
  { code: "2201", name: "رواتب مستحقة", type: "liability", category: "current_liability", parentId: null },
  { code: "2202", name: "ضريبة مستحقة", type: "liability", category: "current_liability", parentId: null },
  { code: "2300", name: "الالتزامات طويلة الأجل", type: "liability", category: "long_term_liability", parentId: null },
  { code: "2301", name: "قروض طويلة الأجل", type: "liability", category: "long_term_liability", parentId: null },
  { code: "3000", name: "حقوق الملكية", type: "equity", category: "other", parentId: null },
  { code: "3100", name: "رأس المال", type: "equity", category: "capital", parentId: null },
  { code: "3101", name: "رأس المال المدفوع", type: "equity", category: "capital", parentId: null },
  { code: "3200", name: "الأرباح المحتجزة", type: "equity", category: "retained_earnings", parentId: null },
  { code: "3201", name: "أرباح/خسائر متراكمة", type: "equity", category: "retained_earnings", parentId: null },
  { code: "4000", name: "الإيرادات", type: "revenue", category: "other", parentId: null },
  { code: "4100", name: "إيرادات المبيعات", type: "revenue", category: "sales", parentId: null },
  { code: "4101", name: "مبيعات بضاعة", type: "revenue", category: "sales", parentId: null },
  { code: "4102", name: "مبيعات خدمات", type: "revenue", category: "sales", parentId: null },
  { code: "4103", name: "مردودات المبيعات", type: "revenue", category: "sales", parentId: null },
  { code: "4200", name: "إيرادات أخرى", type: "revenue", category: "other_income", parentId: null },
  { code: "4201", name: "إيرادات إيجار", type: "revenue", category: "other_income", parentId: null },
  { code: "5000", name: "المصروفات", type: "expense", category: "other", parentId: null },
  { code: "5100", name: "تكلفة المبيعات", type: "expense", category: "operating", parentId: null },
  { code: "5200", name: "مصروفات تشغيلية", type: "expense", category: "operating", parentId: null },
  { code: "5201", name: "رواتب وأجور", type: "expense", category: "operating", parentId: null },
  { code: "5202", name: "إيجار", type: "expense", category: "operating", parentId: null },
  { code: "5203", name: "مرافق (كهرباء/ماء)", type: "expense", category: "operating", parentId: null },
  { code: "5300", name: "مصروفات إدارية وعامة", type: "expense", category: "administrative", parentId: null },
  { code: "5301", name: "مصروفات مكتبية", type: "expense", category: "administrative", parentId: null },
  { code: "5302", name: "اتصالات وإنترنت", type: "expense", category: "administrative", parentId: null },
  { code: "5303", name: "مصروفات تسويق وإعلان", type: "expense", category: "administrative", parentId: null },
  { code: "5400", name: "مصروفات مالية", type: "expense", category: "financial", parentId: null },
  { code: "5401", name: "رسوم بنكية", type: "expense", category: "financial", parentId: null },
  { code: "5500", name: "إهلاك الأصول", type: "expense", category: "other", parentId: null },
] as const;

export async function seedDefaultChartOfAccounts(userId: number, organizationId: number) {
  const db = await getDb(); if (!db) return;
  const existing = await db.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.userId, userId), eq(chartOfAccounts.organizationId, organizationId))).limit(1);
  if (existing[0]) return;
  for (const account of DEFAULT_CHART) {
    await db.insert(chartOfAccounts).values({
      userId, organizationId, code: account.code, name: account.name,
      type: account.type as any, category: account.category as any, parentId: null,
    });
  }
}

export async function getChartOfAccounts(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(chartOfAccounts).where(eq(chartOfAccounts.userId, userId)).orderBy(chartOfAccounts.code);
}

export async function createAccount(userId: number, input: { code: string; name: string; type: string; category?: string; parentId?: number; openingBalance?: number }) {
  const db = await getDb(); if (!db) return null;
  const org = await getOrCreateOrganization(userId);
  return db.insert(chartOfAccounts).values({
    userId, organizationId: org?.id ?? 0, code: input.code, name: input.name,
    type: input.type as any, category: (input.category as any) ?? "other", parentId: input.parentId ?? null, openingBalance: input.openingBalance ?? 0,
  });
}

// ==== النظام المحاسبي: الفروع ====
export async function getBranches(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(branches).where(eq(branches.userId, userId)).orderBy(desc(branches.createdAt));
}

export async function createBranch(userId: number, input: { name: string; code?: string; address?: string; phone?: string }) {
  const db = await getDb(); if (!db) return null;
  const org = await getOrCreateOrganization(userId);
  return db.insert(branches).values({ userId, organizationId: org?.id ?? 0, ...input });
}

// ==== النظام المحاسبي: العملات ووحدات القياس ====
export async function getCurrencies(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(currencies).where(eq(currencies.userId, userId)).orderBy(currencies.code);
}

export async function seedDefaultCurrencies(userId: number) {
  const db = await getDb(); if (!db) return;
  const existing = await db.select().from(currencies).where(eq(currencies.userId, userId)).limit(1);
  if (existing[0]) return;
  const defaults = [
    { code: "YER", name: "ريال يمني", symbol: "ر.ي", exchangeRate: 1, isBase: 1 },
    { code: "SAR", name: "ريال سعودي", symbol: "ر.س", exchangeRate: 130, isBase: 0 },
    { code: "USD", name: "دولار أمريكي", symbol: "$", exchangeRate: 490, isBase: 0 },
  ];
  for (const c of defaults) await db.insert(currencies).values({ userId, ...c });
}

export async function createCurrency(userId: number, input: { code: string; name: string; symbol?: string; exchangeRate?: number; isBase?: number }) {
  const db = await getDb(); if (!db) return null;
  return db.insert(currencies).values({ userId, ...input });
}

export async function getUnitsOfMeasure(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(unitsOfMeasure).where(eq(unitsOfMeasure.userId, userId)).orderBy(desc(unitsOfMeasure.createdAt));
}

export async function seedDefaultUnits(userId: number) {
  const db = await getDb(); if (!db) return;
  const existing = await db.select().from(unitsOfMeasure).where(eq(unitsOfMeasure.userId, userId)).limit(1);
  if (existing[0]) return;
  const defaults = ["وحدة", "قطعة", "كجم", "لتر", "متر", "متر مربع", "متر مكعب", "كرتونة", "طرد", "ساعة", "خدمة"];
  for (const u of defaults) await db.insert(unitsOfMeasure).values({ userId, name: u, abbreviation: u });
}

export async function createUnitOfMeasure(userId: number, input: { name: string; abbreviation?: string }) {
  const db = await getDb(); if (!db) return null;
  return db.insert(unitsOfMeasure).values({ userId, ...input });
}

// ==== النظام المحاسبي: الموظفون ====
export async function getEmployees(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(employees).where(eq(employees.userId, userId)).orderBy(desc(employees.createdAt));
}

export async function createEmployee(userId: number, input: { name: string; role?: string; phone?: string; email?: string; salary?: number }) {
  const db = await getDb(); if (!db) return null;
  const org = await getOrCreateOrganization(userId);
  return db.insert(employees).values({ userId, organizationId: org?.id ?? 0, ...input });
}

// ==== النظام المحاسبي: القيود اليومية ====
export async function getJournalEntries(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(journalEntries).where(eq(journalEntries.userId, userId)).orderBy(desc(journalEntries.entryDate));
}

export async function createJournalEntry(userId: number, input: { entryNumber: string; description?: string; entryDate?: Date; lines: { accountId: number; debit: number; credit: number; description?: string }[]; currencyCode?: string; exchangeRate?: number }) {
  const db = await getDb(); if (!db) return null;
  // Validate balanced entry (debit total == credit total)
  const debitTotal = input.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const creditTotal = input.lines.reduce((s, l) => s + (l.credit || 0), 0);
  if (debitTotal !== creditTotal) {
    throw new Error("القيـد غير متوازن: مجموع المدين يجب أن يساوي مجموع الدائن");
  }
  return db.transaction(async (tx) => {
    const org = await getOrCreateOrganization(userId);
    const result = await tx.insert(journalEntries).values({
      userId, organizationId: org?.id ?? 0, entryNumber: input.entryNumber,
      description: input.description ?? null, entryDate: input.entryDate ?? new Date(),
      debitTotal, creditTotal, currencyCode: input.currencyCode ?? "YER", exchangeRate: input.exchangeRate ?? 1, status: "posted",
    });
    const entryId = Number(result[0].insertId);
    for (const line of input.lines) {
      await tx.insert(journalEntryLines).values({ entryId, accountId: line.accountId, debit: line.debit || 0, credit: line.credit || 0, description: line.description ?? null });
    }
    return { id: entryId, debitTotal, creditTotal };
  });
}

// ==== المعاملات اليومية العامة ====
export async function getDailyTransactions(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(dailyTransactions).where(eq(dailyTransactions.userId, userId)).orderBy(desc(dailyTransactions.transactionDate));
}

export async function createDailyTransaction(userId: number, input: { transactionNumber: string; transactionType: string; transactionDate?: Date; accountId?: number; customerId?: number; supplierId?: number; employeeId?: number; agentId?: number; distributorId?: number; productId?: number; amount?: number; currencyCode?: string; exchangeRate?: number; quantity?: number; unitId?: number; description?: string; status?: string }) {
  const db = await getDb(); if (!db) return null;
  const org = await getOrCreateOrganization(userId);
  return db.insert(dailyTransactions).values({
    userId, organizationId: org?.id ?? 0,
    transactionNumber: input.transactionNumber, transactionType: input.transactionType as any,
    transactionDate: input.transactionDate ?? new Date(), accountId: input.accountId ?? null,
    customerId: input.customerId ?? null, supplierId: input.supplierId ?? null,
    employeeId: input.employeeId ?? null, agentId: input.agentId ?? null, distributorId: input.distributorId ?? null,
    productId: input.productId ?? null, amount: input.amount ?? 0, currencyCode: input.currencyCode ?? "YER",
    exchangeRate: input.exchangeRate ?? 1, quantity: input.quantity ?? 0, unitId: input.unitId ?? null,
    description: input.description ?? null, status: (input.status as any) ?? "draft",
  });
}
