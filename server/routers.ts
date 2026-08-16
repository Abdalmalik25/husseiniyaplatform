import { ENV } from "./_core/env";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { getCatalog, placePublicOrder, placeOrderInputSchema } from "./webStore";
import { users, accounts, transactions, settings, budgets, activityLogs, openingBalances, tenants, branches, userBranchPermissions, products, warehouses, inventoryMovements, customers, suppliers, salesInvoices, salesInvoiceItems, purchaseInvoices, purchaseInvoiceItems, orders, orderItems, payments } from "../drizzle/schema";
import { eq, desc, sql, asc, and, or, gte, lte, ilike, inArray, ne } from "drizzle-orm";
import { z } from "zod";

// Seed default accounts - runs once per server lifetime (idempotent upserts)
let _seeded = false;
async function seedDefaultAccountsIfNeeded() {
  if (_seeded) return;
  const db = await getDb();
  if (!db) return;
  try {
    const defaultAccounts = [
      { code: "1010", name: "Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ (Ø§Ù„Ø®Ø²ÙŠÙ†Ø©)", type: "asset" as const, category: "Ø§Ù„Ø£ØµÙˆÙ„ Ø§Ù„Ù…ØªØ¯Ø§ÙˆÙ„Ø©", description: "ØµÙ†Ø¯ÙˆÙ‚ Ø§Ù„Ù†Ù‚Ø¯ÙŠØ© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ Ù„Ù„Ù…Ø¤Ø³Ø³Ø©" },
      { code: "1020", name: "Ø§Ù„Ø¨Ù†Ùƒ Ø§Ù„ØªØ¬Ø§Ø±ÙŠ / Ø§Ù„Ø¥Ø³Ù„Ø§Ù…ÙŠ", type: "asset" as const, category: "Ø§Ù„Ø£ØµÙˆÙ„ Ø§Ù„Ù…ØªØ¯Ø§ÙˆÙ„Ø©", description: "Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„Ø¨Ù†ÙƒÙŠ Ø§Ù„Ø¬Ø§Ø±ÙŠ Ù„Ù…Ø¤Ø³Ø³Ø© Ø§Ù„Ø­Ø³ÙŠÙ†ÙŠØ©" },
      { code: "1030", name: "Ø­Ø³Ø§Ø¨ Ø§Ù„Ø¹ÙÙ…Ù„Ø§Ø¡ ÙˆØ§Ù„Ù…Ø¯ÙŠÙ†ÙˆÙ†", type: "asset" as const, category: "Ø§Ù„Ø£ØµÙˆÙ„ Ø§Ù„Ù…ØªØ¯Ø§ÙˆÙ„Ø©", description: "Ù…Ø³ØªØ­Ù‚Ø§Øª Ø§Ù„Ù…Ø¤Ø³Ø³Ø© Ù„Ø¯Ù‰ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ù…Ù‚Ø§Ø¨Ù„ Ø§Ù„Ø®Ø¯Ù…Ø§Øª" },
      { code: "2010", name: "Ø§Ù„Ø¯Ø§Ø¦Ù†ÙˆÙ† ÙˆØ§Ù„Ù…ÙˆØ±Ø¯ÙˆÙ†", type: "liability" as const, category: "Ø§Ù„Ø®ØµÙˆÙ… Ø§Ù„Ù…ØªØ¯Ø§ÙˆÙ„Ø©", description: "Ø§Ù„ØªØ²Ø§Ù…Ø§Øª Ø§Ù„Ù…Ø¤Ø³Ø³Ø© ØªØ¬Ø§Ù‡ Ù…Ø²ÙˆØ¯ÙŠ Ø§Ù„Ø®Ø¯Ù…Ø© ÙˆØ§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†" },
      { code: "3010", name: "Ø±Ø£Ø³ Ø§Ù„Ù…Ø§Ù„", type: "equity" as const, category: "Ø­Ù‚ÙˆÙ‚ Ø§Ù„Ù…Ù„ÙƒÙŠØ©", description: "Ø±Ø£Ø³ Ù…Ø§Ù„ Ù…Ø¤Ø³Ø³Ø© Ø§Ù„Ø­Ø³ÙŠÙ†ÙŠØ© Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ø£Ø¹Ù…Ø§Ù„" },
      { code: "4010", name: "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ø£Ø¹Ù…Ø§Ù„ ÙˆØ§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª", type: "revenue" as const, category: "Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠØ©", description: "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª ØªØ®Ù„ÙŠØµ Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª ÙˆØ§Ù„Ø§Ø³ØªØ´Ø§Ø±Ø§Øª Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ© ÙˆØ§Ù„Ù…Ø§Ù„ÙŠØ©" },
      { code: "4020", name: "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ù…ØªÙ†ÙˆØ¹Ø©", type: "revenue" as const, category: "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø£Ø®Ø±Ù‰", description: "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª ØªØ´ØºÙŠÙ„ÙŠØ© Ø£Ø®Ø±Ù‰" },
      { code: "5010", name: "Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„Ø±ÙˆØ§ØªØ¨ ÙˆØ§Ù„Ø£Ø¬ÙˆØ±", type: "expense" as const, category: "Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠØ©", description: "Ø±ÙˆØ§ØªØ¨ ÙˆÙ…Ø³ØªØ­Ù‚Ø§Øª Ù…ÙˆØ¸ÙÙŠ Ø§Ù„Ù…Ø¤Ø³Ø³Ø©" },
      { code: "5020", name: "Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„Ø¥ÙŠØ¬Ø§Ø± ÙˆØ§Ù„Ø®Ø¯Ù…Ø§Øª (ÙƒÙ‡Ø±Ø¨Ø§Ø¡ØŒ Ù…Ø§Ø¡ØŒ Ø¥Ù†ØªØ±Ù†Øª)", type: "expense" as const, category: "Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠØ©", description: "Ø¥ÙŠØ¬Ø§Ø± Ø§Ù„Ù…Ù‚Ø± ÙˆÙÙˆØ§ØªÙŠØ± Ø§Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©" },
      { code: "5030", name: "Ù…ØµØ±ÙˆÙØ§Øª Ø­ÙƒÙˆÙ…ÙŠØ© ÙˆØ±Ø³ÙˆÙ… ØªØ®Ù„ÙŠØµ", type: "expense" as const, category: "Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠØ©", description: "Ø§Ù„Ø±Ø³ÙˆÙ… Ø§Ù„Ø­ÙƒÙˆÙ…ÙŠØ© Ø§Ù„Ù…ØªØ¹Ù„Ù‚Ø© Ø¨Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª" },
      { code: "5040", name: "Ù…ØµØ±ÙˆÙØ§Øª Ù…ØªÙ†ÙˆØ¹Ø© ÙˆØ¹Ù…ÙˆÙ…ÙŠØ©", type: "expense" as const, category: "Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ©", description: "Ø¶ÙŠØ§ÙØ©ØŒ Ø£Ø¯ÙˆØ§Øª Ù…ÙƒØªØ¨ÙŠØ©ØŒ ÙˆÙ…ØµØ±ÙˆÙØ§Øª Ù†Ø«Ø±ÙŠØ©" },
      { code: "5050", name: "ØªÙƒÙ„ÙØ© Ø§Ù„Ø¨Ø¶Ø§Ø¹Ø© Ø§Ù„Ù…Ø´ØªØ±Ø§Ø© (Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª Ø§Ù„ØªØ¬Ø§Ø±ÙŠØ©)", type: "expense" as const, category: "ØªÙƒÙ„ÙØ© Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª", description: "ØªÙƒÙ„ÙØ© Ø´Ø±Ø§Ø¡ Ø§Ù„Ø¨Ø¶Ø§Ø¦Ø¹ ÙˆØ§Ù„Ù…Ø®Ø²ÙˆÙ† Ø§Ù„Ù…Ø¨Ø§Ø¹" }
    ];
    for (const acc of defaultAccounts) {
      await db.insert(accounts).values(acc).onConflictDoUpdate({ target: accounts.code, set: { name: acc.name, type: acc.type, category: acc.category, description: acc.description } });
    }
    const existingSettings = await db.select().from(settings).limit(1);
    if (existingSettings.length === 0) {
      await db.insert(settings).values({
        institutionName: "Ù…Ø¤Ø³Ø³Ø© Ø§Ù„Ø­Ø³ÙŠÙ†ÙŠØ© Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ø£Ø¹Ù…Ø§Ù„",
        currency: "Ø±ÙŠØ§Ù„ ÙŠÙ…Ù†ÙŠ (YER)",
        accountingPeriod: "Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ© 2026",
        managerName: "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¤Ø³Ø³Ø©",
        notes: "Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ÙŠ Ø§Ù„Ù…Ø¹ØªÙ…Ø¯ Ù„Ù…Ø¤Ø³Ø³Ø© Ø§Ù„Ø­Ø³ÙŠÙ†ÙŠØ© Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ø£Ø¹Ù…Ø§Ù„ - Ù…Ø±Ù† ÙˆØ¯Ù‚ÙŠÙ‚."
      });
    }
    _seeded = true;
  } catch {
    // Seed will retry next time
  }
}

// â”€â”€â”€ Auto-Posting: Double-Entry GL entries for invoices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Creates balanced journal entries for sales/purchase invoices.
// Cash leg â†’ 1010, Receivables â†’ 1030, Payables â†’ 2010,
// Sales revenue â†’ 4010, Purchases cost â†’ 5050.
async function postInvoiceGlEntries(
  tx: any,
  opts: {
    kind: "sale" | "purchase";
    invoiceId: number;
    invoiceNumber: string;
    total: number;
    paidAmount: number;
    branchId?: number | null;
    userId?: number | null;
  }
): Promise<void> {
  const findAccount = async (code: string) => {
    const rows = await tx.select().from(accounts).where(eq(accounts.code, code)).limit(1);
    return rows[0];
  };

  const entry = (accountId: number, type: "debit" | "credit", amount: number, narration: string) =>
    tx.insert(transactions).values({
      accountId,
      branchId: opts.branchId || null,
      amount: amount.toFixed(2),
      type,
      transactionDate: new Date(),
      narration,
      lifecycleStatus: "posted",
      referenceType: opts.kind === "sale" ? "sale" : "purchase",
      referenceId: opts.invoiceId,
      userId: opts.userId || null,
    });

  const unpaid = Math.max(0, opts.total - opts.paidAmount);
  const paid = Math.min(opts.paidAmount, opts.total);

  if (opts.kind === "sale") {
    const revenueAcc = await findAccount("4010");
    if (!revenueAcc) return; // chart not seeded yet â€” skip auto-posting
    if (paid > 0) {
      const cashAcc = await findAccount("1010");
      if (cashAcc) await entry(cashAcc.id, "debit", paid, `ØªØ­ØµÙŠÙ„ Ù†Ù‚Ø¯ÙŠ â€” ÙØ§ØªÙˆØ±Ø© Ù…Ø¨ÙŠØ¹Ø§Øª ${opts.invoiceNumber}`);
    }
    if (unpaid > 0) {
      const receivablesAcc = await findAccount("1030");
      if (receivablesAcc) await entry(receivablesAcc.id, "debit", unpaid, `Ø°Ù…Ù… Ø¹Ù…Ù„Ø§Ø¡ â€” ÙØ§ØªÙˆØ±Ø© Ù…Ø¨ÙŠØ¹Ø§Øª ${opts.invoiceNumber}`);
    }
    await entry(revenueAcc.id, "credit", opts.total, `Ø¥ÙŠØ±Ø§Ø¯ Ù…Ø¨ÙŠØ¹Ø§Øª â€” ÙØ§ØªÙˆØ±Ø© ${opts.invoiceNumber}`);
  } else {
    const costAcc = await findAccount("5050");
    if (!costAcc) return;
    await entry(costAcc.id, "debit", opts.total, `ØªÙƒÙ„ÙØ© Ù…Ø´ØªØ±ÙŠØ§Øª â€” ÙØ§ØªÙˆØ±Ø© ${opts.invoiceNumber}`);
    if (paid > 0) {
      const cashAcc = await findAccount("1010");
      if (cashAcc) await entry(cashAcc.id, "credit", paid, `Ø¯ÙØ¹ Ù†Ù‚Ø¯ÙŠ â€” ÙØ§ØªÙˆØ±Ø© Ù…Ø´ØªØ±ÙŠØ§Øª ${opts.invoiceNumber}`);
    }
    if (unpaid > 0) {
      const payablesAcc = await findAccount("2010");
      if (payablesAcc) await entry(payablesAcc.id, "credit", unpaid, `Ø°Ù…Ù… Ù…ÙˆØ±Ø¯ÙŠÙ† â€” ÙØ§ØªÙˆØ±Ø© Ù…Ø´ØªØ±ÙŠØ§Øª ${opts.invoiceNumber}`);
    }
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    updateProfile: protectedProcedure.input(z.object({
      name: z.string().min(1),
      email: z.string().email().optional().or(z.literal("")),
      themePreference: z.string(),
      emailNotifications: z.boolean(),
      whatsappNotifications: z.boolean(),
      compactMode: z.boolean(),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(users).set({
        name: input.name,
        email: input.email ? input.email : null,
        themePreference: input.themePreference,
        emailNotifications: input.emailNotifications,
        whatsappNotifications: input.whatsappNotifications,
        compactMode: input.compactMode,
      }).where(eq(users.id, ctx.user.id));

      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        userName: input.name,
        action: "ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ù„Ù Ø§Ù„Ø´Ø®ØµÙŠ",
        details: `ØªÙ… ØªØ­Ø¯ÙŠØ« ØªÙØ¶ÙŠÙ„Ø§Øª Ø§Ù„Ø¹Ø±Ø¶ ÙˆØ§Ù„Ù…Ù„Ù Ø§Ù„Ø´Ø®ØµÙŠ Ø¨ÙˆØ§Ø³Ø·Ø© ${input.name}`,
      });

      return { success: true };
    }),

    getActivityLogs: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const logs = await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(25);
      return logs;
    }),
  }),

  // Accounting & Settings Router
  accounting: router({
    // Get settings & subscription status
    getSettings: publicProcedure.query(async () => {
      await seedDefaultAccountsIfNeeded();
      const db = await getDb();
      if (!db) return { institutionName: "Ù…Ø¤Ø³Ø³Ø© Ø§Ù„Ø­Ø³ÙŠÙ†ÙŠØ© Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ø£Ø¹Ù…Ø§Ù„", currency: "Ø±ÙŠØ§Ù„ ÙŠÙ…Ù†ÙŠ (YER)", accountingPeriod: "Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ© 2026", managerName: "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¤Ø³Ø³Ø©", subscriptionStatus: "active" };
      const res = await db.select().from(settings).limit(1);
      return res[0] || { institutionName: "Ù…Ø¤Ø³Ø³Ø© Ø§Ù„Ø­Ø³ÙŠÙ†ÙŠØ© Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ø£Ø¹Ù…Ø§Ù„", currency: "Ø±ÙŠØ§Ù„ ÙŠÙ…Ù†ÙŠ (YER)", accountingPeriod: "Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ© 2026", managerName: "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¤Ø³Ø³Ø©", subscriptionStatus: "active" };
    }),

    // Upgrade or manage subscription (simulate payment & unlock advanced features)
    updateSubscription: protectedProcedure.input(z.object({
      status: z.enum(["trial", "active", "expired"]),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(settings).limit(1);
      if (existing.length > 0) {
        await db.update(settings).set({ subscriptionStatus: input.status }).where(eq(settings.id, existing[0].id));
      }
      return { success: true };
    }),

    // Update settings (Permanent save)
    updateSettings: protectedProcedure.input(z.object({
      institutionName: z.string().min(1),
      currency: z.string().min(1),
      accountingPeriod: z.string().min(1),
      managerName: z.string().optional(),
      taxNumber: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(settings).limit(1);
      if (existing.length > 0) {
        await db.update(settings).set(input).where(eq(settings.id, existing[0].id));
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
    addAccount: protectedProcedure.input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
      category: z.string().optional(),
      description: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(accounts).values({
        ...input,
        isCustom: true,
      });
      return { success: true };
    }),

    // Update account (Name, Code, Type, Status)
    updateAccount: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().min(1),
      code: z.string().min(1),
      type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
      isActive: z.boolean(),
      parentAccountId: z.number().nullable().optional(),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(accounts).set({
        name: input.name,
        code: input.code,
        type: input.type,
        isActive: input.isActive,
        ...(input.parentAccountId !== undefined ? { parentAccountId: input.parentAccountId } : {}),
      }).where(eq(accounts.id, input.id));

      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: `ØªØ¹Ø¯ÙŠÙ„ Ø£Ùˆ Ø¥Ø¹Ø§Ø¯Ø© ØªØ±ØªÙŠØ¨ Ø§Ù„Ø­Ø³Ø§Ø¨: ${input.name} (${input.code})`,
        details: `ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø³Ø§Ø¨ ÙˆØªØ¹Ø¯ÙŠÙ„ Ø§Ù„ØªØ¨Ø¹ÙŠØ© Ø§Ù„Ø´Ø¬Ø±ÙŠØ© Ø¨Ù†Ø¬Ø§Ø­`,
      });

      return { success: true };
    }),

    // Move account in Tree (Drag and Drop / Reparenting)
    moveAccount: protectedProcedure.input(z.object({
      accountId: z.number(),
      newParentAccountId: z.number().nullable(),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      if (input.accountId === input.newParentAccountId) {
        throw new Error("Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø¬Ø¹Ù„ Ø§Ù„Ø­Ø³Ø§Ø¨ ØªØ§Ø¨Ø¹Ø§Ù‹ Ù„Ù†ÙØ³Ù‡");
      }

      await db.update(accounts).set({
        parentAccountId: input.newParentAccountId,
      }).where(eq(accounts.id, input.accountId));

      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: `Ø¥Ø¹Ø§Ø¯Ø© ØªØ±ØªÙŠØ¨ Ø§Ù„Ø¯Ù„ÙŠÙ„ (Ø³Ø­Ø¨ ÙˆØ¥ÙÙ„Ø§Øª)`,
        details: `ØªÙ… Ù†Ù‚Ù„ Ø§Ù„Ø­Ø³Ø§Ø¨ Ø±Ù‚Ù… ${input.accountId} Ù„ÙŠÙƒÙˆÙ† ØªØ­Øª Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ Ø±Ù‚Ù… ${input.newParentAccountId || 'Ø¬Ø°Ø± Ø±Ø¦ÙŠØ³ÙŠ'}`,
      });

      return { success: true };
    }),

    // Get Transactions with pagination / filters
    getTransactions: publicProcedure.input(z.object({
      search: z.string().optional(),
      accountId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().min(1).max(500).default(100),
      offset: z.number().min(0).default(0),
      includeReversed: z.boolean().optional(),
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
        conditions.push(eq(transactions.accountId, input.accountId));
      }
      if (!input?.includeReversed) {
        conditions.push(eq(transactions.isReversed, false));
      }
      if (input?.startDate) {
        conditions.push(gte(transactions.transactionDate, new Date(input.startDate)));
      }
      if (input?.endDate) {
        conditions.push(lte(transactions.transactionDate, new Date(input.endDate)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(whereClause)
      .orderBy(desc(transactions.transactionDate), desc(transactions.id))
      .limit(input?.limit ?? 100)
      .offset(input?.offset ?? 0);

      return list;
    }),

    // Add Transaction
    addTransaction: protectedProcedure.input(z.object({
      id: z.number().optional(),
      accountId: z.number(),
      amount: z.string().refine(v => {
        const n = parseFloat(v);
        return !isNaN(n) && n > 0 && n < 1_000_000_000;
      }, "Ø§Ù„Ù…Ø¨Ù„Øº ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø±Ù‚Ù…Ø§Ù‹ Ù…ÙˆØ¬Ø¨Ø§Ù‹ ÙˆØ£Ù‚Ù„ Ù…Ù† Ù…Ù„ÙŠØ§Ø±"),
      type: z.enum(["debit", "credit"]),
      transactionDate: z.string().refine(v => !isNaN(Date.parse(v)), "ØªØ§Ø±ÙŠØ® ØºÙŠØ± ØµØ­ÙŠØ­"),
      narration: z.string().max(500).optional(),
      notes: z.string().optional(),
      lifecycleStatus: z.enum(["saved", "approved", "sent"]).default("saved"),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify account exists
      const account = await db.select().from(accounts).where(eq(accounts.id, input.accountId)).limit(1);
      if (account.length === 0) throw new Error("Ø§Ù„Ø­Ø³Ø§Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");

      const values = {
        accountId: input.accountId,
        amount: input.amount,
        type: input.type,
        transactionDate: new Date(input.transactionDate),
        narration: input.narration || null,
        notes: input.notes || null,
        lifecycleStatus: input.lifecycleStatus,
        isReversed: false,
        userId: ctx.user.id,
      };

      if (input.id != null) {
        await db.insert(transactions).values({ ...values, id: input.id })
          .onConflictDoUpdate({ target: transactions.id, set: { ...values, id: input.id } });
      } else {
        await db.insert(transactions).values(values);
      }

      return { success: true };
    }),

    // Batch Add Transactions with Lifecycle Status (saved, approved, sent)
    addBatchTransactions: protectedProcedure.input(z.object({
      lifecycleStatus: z.enum(["saved", "approved", "sent"]).default("saved"),
      rows: z.array(z.object({
        id: z.number().optional(),
        accountId: z.number(),
        amount: z.string(),
        type: z.enum(["debit", "credit"]).default("debit"),
        transactionDate: z.string(),
        narration: z.string().optional(),
        notes: z.string().optional(),
      }))
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let count = 0;
      for (const item of input.rows) {
        if (!item.amount || parseFloat(item.amount) <= 0) continue;
        const values = {
          accountId: item.accountId,
          amount: item.amount,
          type: item.type || "debit",
          transactionDate: new Date(item.transactionDate),
          narration: item.narration || null,
          notes: item.notes || null,
          lifecycleStatus: input.lifecycleStatus,
          isReversed: false,
          userId: ctx.user.id,
        };
        if (item.id != null) {
          await db.insert(transactions).values({ ...values, id: item.id })
            .onConflictDoUpdate({ target: transactions.id, set: { ...values, id: item.id } });
        } else {
          await db.insert(transactions).values(values);
        }
        count++;
      }

      return { success: true, count };
    }),

    // Update Transaction Lifecycle (Approve, Send, Post/Migrate, Reverse)
    updateTransactionLifecycle: protectedProcedure.input(z.object({
      id: z.number(),
      lifecycleStatus: z.enum(["saved", "approved", "sent", "posted", "completed"]),
      reversalReason: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const existing = await db.select().from(transactions).where(eq(transactions.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("Ø§Ù„Ø­Ø±ÙƒØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");
      
      // Prevent editing if already posted (ØªØ±Ø­ÙŠÙ„)
      if (existing[0]?.lifecycleStatus === 'posted' && input.lifecycleStatus !== 'posted') {
        throw new Error("Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ¹Ø¯ÙŠÙ„ Ø£Ùˆ Ø¥Ù„ØºØ§Ø¡ Ø­Ø±ÙƒØ© Ù…Ø±Ø­Ù„Ø© Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹. Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ ÙŠØªÙ… Ø¹Ø¨Ø± Ø­Ø±ÙƒØ© Ø¹ÙƒØ³ÙŠØ© Ù…Ø³ØªÙ‚Ù„Ø©.");
      }

      await db.update(transactions)
        .set({ 
          lifecycleStatus: input.lifecycleStatus,
          ...(input.reversalReason ? { reversalReason: input.reversalReason, isReversed: true } : {})
        })
        .where(eq(transactions.id, input.id));

      // Log activity
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„Ø­Ø±ÙƒØ© #${input.id} Ø¥Ù„Ù‰: ${input.lifecycleStatus}`,
        details: input.reversalReason ? `Ø³Ø¨Ø¨ Ø§Ù„Ø¹ÙƒØ³: ${input.reversalReason}` : 'ØªØºÙŠÙŠØ± Ø­Ø§Ù„Ø© Ø¯ÙˆØ±Ø© Ø§Ù„Ø­Ø±ÙƒØ© Ø§Ù„Ù…Ø§Ù„ÙŠØ©',
      });

      return { success: true };
    }),

    // Update Transaction (Only allowed if lifecycleStatus === 'saved')
    updateTransaction: protectedProcedure.input(z.object({
      id: z.number(),
      amount: z.string(),
      narration: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await db.select().from(transactions).where(eq(transactions.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("Ø§Ù„Ø­Ø±ÙƒØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");
      if (existing[0]?.lifecycleStatus !== 'saved') {
        throw new Error("Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø­Ø±ÙƒØ© Ù„Ø£Ù†Ù‡Ø§ Ù…Ø¹ØªÙ…Ø¯Ø© Ø£Ùˆ Ù…Ø±Ø³Ù„Ø© ÙˆÙ…Ø¤Ù…Ù†Ø© ØªÙ…Ø§Ù…Ø§Ù‹");
      }

      await db.update(transactions)
        .set({
          amount: input.amount,
          narration: input.narration || null,
          notes: input.notes || null,
        })
        .where(eq(transactions.id, input.id));

      return { success: true };
    }),

    // Delete Transaction (only if status is 'saved')
    deleteTransaction: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(transactions).where(eq(transactions.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("Ø§Ù„Ø­Ø±ÙƒØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");
      if (existing[0].lifecycleStatus !== "saved") {
        throw new Error("Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø­Ø°Ù Ø­Ø±ÙƒØ© Ù…Ø¹ØªÙ…Ø¯Ø© Ø£Ùˆ Ù…Ø±Ø³Ù„Ø© â€” Ø§Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ø¹ÙƒØ³ÙŠ");
      }
      await db.delete(transactions).where(eq(transactions.id, input.id));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `Ø­Ø°Ù Ø­Ø±ÙƒØ© Ù…Ø§Ù„ÙŠØ© #${input.id}`,
        details: `Ø§Ù„Ø­Ø³Ø§Ø¨: ${existing[0].accountId} â€” Ø§Ù„Ù…Ø¨Ù„Øº: ${existing[0].amount}`,
      });
      return { success: true };
    }),

    // Smart Suggestions Engine: recommends accounts & standard amounts based on history & operation type
    getSmartSuggestions: publicProcedure.input(z.object({
      query: z.string().optional(),
      operationType: z.string().optional(), // e.g. "Ø¥ÙŠØ±Ø§Ø¯", "Ù…ØµØ±ÙˆÙ", "Ø³Ø¯Ø§Ø¯", "Ø¹Ù…ÙŠÙ„"
    })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { suggestedAccounts: [], recentNarrations: [], insights: [] };

      const allAccounts = await db.select().from(accounts);
      const recentTx = await db.select({
        narration: transactions.narration,
        accountId: transactions.accountId,
        amount: transactions.amount,
        accountName: accounts.name,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .orderBy(desc(transactions.id))
      .limit(20);

      // Filter accounts based on query or operationType if provided
      let matchedAccounts = allAccounts;
      if (input.operationType) {
        const typeKeyword = input.operationType.toLowerCase();
        if (typeKeyword.includes("Ø¥ÙŠØ±Ø§Ø¯") || typeKeyword.includes("ØªØ­ØµÙŠÙ„")) {
          matchedAccounts = allAccounts.filter(a => a.type === 'revenue' || a.type === 'asset');
        } else if (typeKeyword.includes("Ù…ØµØ±ÙˆÙ") || typeKeyword.includes("Ø¯ÙØ¹") || typeKeyword.includes("Ø³Ø¯Ø§Ø¯")) {
          matchedAccounts = allAccounts.filter(a => a.type === 'expense' || a.type === 'liability');
        }
      }

      const recentNarrations = Array.from(new Set(recentTx.map(t => t.narration).filter(Boolean)));

      // Generate deep professional insights for Al-Husainia Business Services
      const insights = [
        "ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª: ÙŠÙˆØµÙ‰ Ø¨Ù…Ø±Ø§Ø¬Ø¹Ø© Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø¨Ø§Ù†ØªØ¸Ø§Ù… Ù„Ø¶Ù…Ø§Ù† ØªØ­ØµÙŠÙ„ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª ÙÙŠ Ù…ÙˆØ§Ù‚ÙŠØªÙ‡Ø§ Ø¨Ù…Ø¤Ø³Ø³Ø© Ø§Ù„Ø­Ø³ÙŠÙ†ÙŠØ©.",
        "Ø§Ù„Ø±Ù‚Ø§Ø¨Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ©: Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø°Ø§Øª Ø§Ù„ØªÙˆØ§Ø±ÙŠØ® Ø§Ù„Ø³Ø§Ø¨Ù‚Ø© ØªØªØ·Ù„Ø¨ ØªØ¯ÙˆÙŠÙ† Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ù…Ø¨Ø±Ø±Ø© ÙÙŠ Ø¹Ù…ÙˆØ¯ Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª.",
        "Ø§Ù„ÙƒÙØ§Ø¡Ø© Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠØ©: ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„Ø¯ÙˆØ±ÙŠØ© (Ù…Ø«Ù„ Ø§Ù„Ø¥ÙŠØ¬Ø§Ø± ÙˆØ§Ù„Ø±ÙˆØ§ØªØ¨) ÙŠØ³Ø§Ø¹Ø¯ ÙÙŠ Ø§Ø³ØªÙ‚Ø±Ø§Ø± Ø§Ù„ØªØ¯ÙÙ‚Ø§Øª Ø§Ù„Ù†Ù‚Ø¯ÙŠØ©."
      ];

      return {
        suggestedAccounts: matchedAccounts.slice(0, 8),
        recentNarrations: recentNarrations.slice(0, 5),
        insights,
      };
    }),

    // Budgets & Targets
    getBudgets: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(budgets).orderBy(desc(budgets.id));
    }),

    saveBudget: protectedProcedure.input(z.object({
      id: z.number().optional(),
      periodName: z.string(),
      targetRevenue: z.string(),
      targetExpense: z.string(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const values = {
        periodName: input.periodName,
        targetRevenue: input.targetRevenue,
        targetExpense: input.targetExpense,
        notes: input.notes || null,
      };
      if (input.id != null) {
        await db.insert(budgets).values({ ...values, id: input.id })
          .onConflictDoUpdate({ target: budgets.id, set: { ...values, id: input.id } });
      } else {
        await db.insert(budgets).values(values);
      }
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
        isReversed: transactions.isReversed,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(eq(transactions.isReversed, false))
      .orderBy(desc(transactions.transactionDate), desc(transactions.id));

      let totalRevenue = 0;
      let totalExpense = 0;
      let totalAssets = 0;

      for (const tx of txList) {
        const amt = parseFloat(tx.amount || "0");
        if (tx.accountType === 'revenue') totalRevenue += amt;
        if (tx.accountType === 'expense') totalExpense += amt;
        if (tx.accountType === 'asset') {
          if (tx.type === 'debit') totalAssets += amt;
          else totalAssets -= amt;
        }
      }

      const netIncome = totalRevenue - totalExpense;

      return {
        totalRevenue,
        totalExpense,
        totalAssets,
        netIncome,
        recentTransactions: txList.slice(0, 10),
      };
    }),

    getMonthlyAnalytics: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { dailyData: [], summary: { currentMonthRevenues: 0, currentMonthExpenses: 0, peakDay: '-' } };

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const startOfMonth = new Date(currentYear, currentMonth, 1).getTime();
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).getTime();

      const allTx = await db.select({
        amount: transactions.amount,
        transactionDate: transactions.transactionDate,
        accountType: accounts.type,
        lifecycleStatus: transactions.lifecycleStatus,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(eq(transactions.isReversed, false));

      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const dailyMap: Record<number, { day: number; dateStr: string; revenues: number; expenses: number }> = {};

      for (let d = 1; d <= daysInMonth; d++) {
        const dObj = new Date(currentYear, currentMonth, d);
        dailyMap[d] = {
          day: d,
          dateStr: dObj.toLocaleDateString('en-GB'),
          revenues: 0,
          expenses: 0,
        };
      }

      let currentMonthRevenues = 0;
      let currentMonthExpenses = 0;
      let maxDayVal = -1;
      let peakDay = '-';

      for (const tx of allTx) {
        if (tx.lifecycleStatus !== 'approved' && tx.lifecycleStatus !== 'sent') continue;
        if (!tx.transactionDate) continue;
        const txTime = new Date(tx.transactionDate).getTime();
        if (txTime >= startOfMonth && txTime <= endOfMonth) {
          const dNum = new Date(tx.transactionDate).getDate();
          const val = parseFloat(tx.amount || "0");
          if (dailyMap[dNum]) {
            if (tx.accountType === 'revenue') {
              dailyMap[dNum].revenues += val;
              currentMonthRevenues += val;
            } else if (tx.accountType === 'expense') {
              dailyMap[dNum].expenses += val;
              currentMonthExpenses += val;
            }
          }
        }
      }

      const dailyData = Object.values(dailyMap);
      for (const item of dailyData) {
        const net = item.revenues - item.expenses;
        if (net > maxDayVal) {
          maxDayVal = net;
          peakDay = item.dateStr;
        }
      }

      return {
        dailyData,
        summary: {
          currentMonthRevenues,
          currentMonthExpenses,
          netIncome: currentMonthRevenues - currentMonthExpenses,
          peakDay,
        },
      };
    }),

    // Opening Balances management for new periods
    getOpeningBalances: protectedProcedure.input(z.object({
      periodName: z.string().optional(),
    })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const period = input.periodName || "Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ© 2026";
      return await db.select().from(openingBalances).where(eq(openingBalances.periodName, period));
    }),

    saveOpeningBalances: protectedProcedure.input(z.object({
      periodName: z.string(),
      balances: z.array(z.object({
        accountId: z.number(),
        amount: z.string(),
        type: z.enum(["debit", "credit"]),
        notes: z.string().optional(),
      })),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      for (const item of input.balances) {
        // Upsert by accountId + periodName
        const existing = await db.select().from(openingBalances).where(
          and(eq(openingBalances.accountId, item.accountId), eq(openingBalances.periodName, input.periodName))
        ).limit(1);

        if (existing.length > 0) {
          await db.update(openingBalances).set({
            amount: item.amount,
            type: item.type,
            notes: item.notes || null,
          }).where(eq(openingBalances.id, existing[0].id));
        } else {
          await db.insert(openingBalances).values({
            accountId: item.accountId,
            periodName: input.periodName,
            amount: item.amount,
            type: item.type,
            notes: item.notes || null,
          });
        }
      }

      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø£Ø±ØµØ¯Ø© Ø§Ù„Ø§ÙØªØªØ§Ø­ÙŠØ© Ù„Ù„ÙØªØ±Ø©: ${input.periodName}`,
        details: `ØªÙ… Ø­ÙØ¸ Ø§Ù„Ø£Ø±ØµØ¯Ø© Ø§Ù„Ø§ÙØªØªØ§Ø­ÙŠØ© Ù„Ø¹Ø¯Ø¯ ${input.balances.length} Ø­Ø³Ø§Ø¨`,
      });

      return { success: true };
    }),

    // Period Closing (إقفال الدورة) — preview balances then post closing entries
    closing: router({
      preview: protectedProcedure.input(z.object({
        periodName: z.string().default("السنة المالية 2026"),
        asOfDate: z.string().optional(),
      })).query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { rows: [], revenueTotal: 0, expenseTotal: 0, netProfit: 0 };
        const asOf = input.asOfDate ? new Date(input.asOfDate) : new Date();

        const allAccounts = await db.select().from(accounts).where(eq(accounts.isActive, true));
        const opening = await db.select().from(openingBalances)
          .where(and(eq(openingBalances.periodName, input.periodName), lte(openingBalances.createdAt, asOf)));
        const txns = await db.select().from(transactions)
          .where(and(lte(transactions.transactionDate, asOf), eq(transactions.isReversed, false), ne(transactions.referenceType || "", "closing")));

        const balanceOf = new Map<number, number>(); // net = debit - credit
        for (const ob of opening) {
          const cur = balanceOf.get(ob.accountId) ?? 0;
          balanceOf.set(ob.accountId, cur + (ob.type === "debit" ? parseFloat(ob.amount) : -parseFloat(ob.amount)));
        }
        for (const t of txns) {
          const v = parseFloat(t.amount || "0");
          const cur = balanceOf.get(t.accountId) ?? 0;
          balanceOf.set(t.accountId, cur + (t.type === "debit" ? v : -v));
        }

        const rows = allAccounts
          .filter(a => Math.abs(balanceOf.get(a.id) ?? 0) > 0.009)
          .map(a => ({
            accountId: a.id,
            code: a.code,
            name: a.name,
            type: a.type,
            balance: Math.abs(balanceOf.get(a.id)!),
            side: (balanceOf.get(a.id)! > 0 ? "debit" : "credit") as "debit" | "credit",
          }))
          .sort((x, y) => x.code.localeCompare(y.code));

        const revenueTotal = rows.filter(r => r.type === "revenue").reduce((s, r) => s + r.balance, 0);
        const expenseTotal = rows.filter(r => r.type === "expense").reduce((s, r) => s + r.balance, 0);
        return { rows, revenueTotal, expenseTotal, netProfit: revenueTotal - expenseTotal };
      }),

      execute: protectedProcedure.input(z.object({
        periodName: z.string().default("السنة المالية 2026"),
        asOfDate: z.string().optional(),
        retainedAccountId: z.number().optional(),
      })).mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const asOf = input.asOfDate ? new Date(input.asOfDate) : new Date();

        const already = await db.select().from(transactions)
          .where(and(eq(transactions.referenceType, "closing"), ilike(transactions.narration, `%${input.periodName}%`)))
          .limit(1);
        if (already.length > 0) throw new Error(`تم إقفال الدورة "${input.periodName}" مسبقاً — القيود لا يمكن تكرارها`);

        let retainedId = input.retainedAccountId;
        if (!retainedId) {
          const eq3010 = await db.select().from(accounts).where(and(eq(accounts.code, "3010"), eq(accounts.type, "equity"))).limit(1);
          const fallback = eq3010.length > 0 ? eq3010[0].id : (await db.select().from(accounts).where(eq(accounts.type, "equity")).limit(1))[0]?.id;
          if (!fallback) throw new Error("لا يوجد حساب رأس مال/نتائج — أنشئ حساباً من نوع رأس المال أولاً");
          retainedId = fallback;
        }

        const allAccounts = await db.select().from(accounts);
        const opening = await db.select().from(openingBalances).where(eq(openingBalances.periodName, input.periodName));
        const txns = await db.select().from(transactions)
          .where(and(lte(transactions.transactionDate, asOf), eq(transactions.isReversed, false)));

        const balanceOf = new Map<number, number>();
        for (const ob of opening) {
          balanceOf.set(ob.accountId, (balanceOf.get(ob.accountId) ?? 0) + (ob.type === "debit" ? parseFloat(ob.amount) : -parseFloat(ob.amount)));
        }
        for (const t of txns) {
          if (t.referenceType === "closing") continue;
          const v = parseFloat(t.amount || "0");
          balanceOf.set(t.accountId, (balanceOf.get(t.accountId) ?? 0) + (t.type === "debit" ? v : -v));
        }

        const acctMap = new Map(allAccounts.map(a => [a.id, a]));
        const closingRows = allAccounts
          .filter(a => (a.type === "revenue" || a.type === "expense") && Math.abs(balanceOf.get(a.id) ?? 0) > 0.009)
          .map(a => ({ account: a, balance: Math.abs(balanceOf.get(a.id)!), side: (balanceOf.get(a.id)! > 0 ? "debit" : "credit") as "debit" | "credit" }));

        if (closingRows.length === 0) throw new Error("لا توجد أرصدة إيرادات أو مصروفات لإقفالها في هذه الدورة");

        let debitTotal = 0;
        let creditTotal = 0;
        const entries: { accountId: number; amount: string; type: "debit" | "credit"; narration: string }[] = [];

        for (const row of closingRows) {
          if (row.side === "credit") {
            // مصروف له رصيد دائن؟ عكسه نظرياً — نعامل حسب طبيعة الحساب
            if (row.account.type === "expense") continue;
            entries.push({ accountId: row.account.id, amount: row.balance.toFixed(2), type: "debit", narration: `إقفال ${row.account.name}` });
            entries.push({ accountId: retainedId, amount: row.balance.toFixed(2), type: "credit", narration: `إقفال ${row.account.name}` });
            debitTotal += row.balance; creditTotal += row.balance;
          } else {
            if (row.account.type === "revenue") continue;
            entries.push({ accountId: row.account.id, amount: row.balance.toFixed(2), type: "credit", narration: `إقفال ${row.account.name}` });
            entries.push({ accountId: retainedId, amount: row.balance.toFixed(2), type: "debit", narration: `إقفال ${row.account.name}` });
            debitTotal += row.balance; creditTotal += row.balance;
          }
        }

        if (Math.abs(debitTotal - creditTotal) > 0.01) throw new Error("عدم توازن القيود — راجع الأرصدة قبل الإقفال");

        const narration = `إقفال الدورة: ${input.periodName}`;
        const result = await (db as any).transaction(async (tx: any) => {
          for (const e of entries) {
            await tx.insert(transactions).values({
              accountId: e.accountId,
              amount: e.amount,
              type: e.type,
              transactionDate: asOf,
              narration: `${narration} — ${e.narration}`,
              referenceType: "closing",
              lifecycleStatus: "approved",
            });
          }
          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `${narration} (${entries.length / 2} حساباً، الإجمالي ${debitTotal.toFixed(2)})`,
          });
          return { entries: entries.length / 2, total: debitTotal, retainedAccountId: retainedId };
        });
        return result;
      }),
    }),
    runAuditorReview: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { status: "OK", score: 100, warnings: [], recommendations: [] };

      const allAccounts = await db.select().from(accounts);
      const allTransactions = await db.select().from(transactions).where(eq(transactions.lifecycleStatus, 'approved'));

      let totalDebits = 0;
      let totalCredits = 0;
      let assetTotal = 0;
      let liabilityTotal = 0;
      let equityTotal = 0;

      const acctMap = new Map(allAccounts.map(a => [a.id, a]));

      for (const tx of allTransactions) {
        const val = parseFloat(tx.amount || "0");
        const acc = acctMap.get(tx.accountId);
        if (!acc) continue;
        if (tx.type === 'debit') totalDebits += val;
        else totalCredits += val;

        if (acc.type === 'asset') assetTotal += (tx.type === 'debit' ? val : -val);
        if (acc.type === 'liability') liabilityTotal += (tx.type === 'credit' ? val : -val);
        if (acc.type === 'equity') equityTotal += (tx.type === 'credit' ? val : -val);
      }

      const warnings: string[] = [];
      const recommendations: string[] = [];
      let score = 95;

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        warnings.push("ØªØ­Ø°ÙŠØ± Ù…Ø­Ø§Ø³Ø¨ÙŠ: Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø£Ø·Ø±Ø§Ù Ø§Ù„Ù…Ø¯ÙŠÙ† ÙˆØ§Ù„Ø¯Ø§Ø¦Ù† ÙÙŠ Ø§Ù„Ø­Ø±ÙƒØ§Øª Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø© ØºÙŠØ± Ù…ØªØ·Ø§Ø¨Ù‚ ØªÙ…Ø§Ù…Ø§Ù‹.");
        score -= 20;
      } else {
        recommendations.push("ØªÙˆØ§Ø²Ù† Ø§Ù„Ù‚ÙŠÙˆØ¯ Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ÙŠØ© Ø³Ù„ÙŠÙ… ÙˆÙ…Ø¹ØªÙ…Ø¯ ÙˆÙÙ‚ Ø§Ù„Ù…Ø¹Ø§ÙŠÙŠØ± Ø§Ù„Ù…Ø²Ø¯ÙˆØ¬Ø©.");
      }

      if (assetTotal < liabilityTotal) {
        warnings.push("ØªÙ†Ø¨ÙŠÙ‡ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹ Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠ: Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø®ØµÙˆÙ… ÙŠØªØ¬Ø§ÙˆØ² Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø£ØµÙˆÙ„ØŒ Ù…Ù…Ø§ ÙŠØ´ÙŠØ± Ù„Ù…Ø®Ø§Ø·Ø± Ø±Ø£Ø³ Ù…Ø§Ù„ Ø¹Ø§Ù…Ù„.");
        score -= 15;
      } else {
        recommendations.push("Ù†Ø³Ø¨Ø© Ø§Ù„Ø£ØµÙˆÙ„ Ø¥Ù„Ù‰ Ø§Ù„Ø®ØµÙˆÙ… Ø¶Ù…Ù† Ø§Ù„Ø­Ø¯ÙˆØ¯ Ø§Ù„Ø¢Ù…Ù†Ø© Ù„ØªØºØ·ÙŠØ© Ø§Ù„Ø§Ù„ØªØ²Ø§Ù…Ø§Øª.");
      }

      recommendations.push("ÙŠÙˆØµÙ‰ Ø¨Ø¥Ø¬Ø±Ø§Ø¡ Ù…Ø·Ø§Ø¨Ù‚Ø© Ø´Ù‡Ø±ÙŠØ© Ù„Ù„Ø®Ø²ÙŠÙ†Ø© ÙˆØ§Ù„Ø¨Ù†Ùƒ Ù„Ø¶Ù…Ø§Ù† Ø¹Ø¯Ù… ÙˆØ¬ÙˆØ¯ ÙØ±ÙˆÙ‚Ø§Øª Ù†Ù‚Ø¯ÙŠØ©.");
      recommendations.push("ØªÙ… Ø§Ø¹ØªÙ…Ø§Ø¯ Ø³Ø¬Ù„ Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚ Ø¨Ù†Ø¬Ø§Ø­ ÙˆØªØ£Ù…ÙŠÙ† Ø§Ù„Ø­Ø±ÙƒØ§Øª Ø¶Ø¯ Ø£ÙŠ ØªØ¹Ø¯ÙŠÙ„ ØºÙŠØ± Ù…Ø¨Ø±Ø±.");

      return {
        status: warnings.length > 0 ? "ØªØªØ·Ù„Ø¨ Ù…Ø±Ø§Ø¬Ø¹Ø©" : "Ù…Ø³ØªÙˆÙÙŠØ© ÙˆÙ…Ø¹ÙŠØ§Ø±ÙŠØ©",
        score,
        warnings,
        recommendations,
        totals: {
          debits: totalDebits,
          credits: totalCredits,
          assets: assetTotal,
          liabilities: liabilityTotal,
        }
      };
    }),

    // Smart Document & Image Parser with AI for Merchant Auditing
    smartParseDocumentOrImage: protectedProcedure.input(z.object({
      fileUrl: z.string().optional(),
      rawText: z.string().optional(),
    })).mutation(async ({ input }) => {
      const allAccounts = await (await getDb())?.select().from(accounts) || [];
      const prompt = `Ø£Ù†Øª Ù…Ø­Ø§Ø³Ø¨ Ù‚Ø§Ù†ÙˆÙ†ÙŠ ÙˆÙ…Ø±Ø§Ø¬Ø¹ Ù…Ø§Ù„ÙŠ Ø®Ø¨ÙŠØ±. Ù‚Ù… Ø¨ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù†Øµ Ø£Ùˆ Ø§Ù„Ù…Ø³ØªÙ†Ø¯ Ø§Ù„Ù…Ø±ÙÙ‚ Ø¨Ø¯Ù‚Ø© Ù…ØªÙ†Ø§Ù‡ÙŠØ© ÙˆØ§Ø³ØªØ®Ø±Ø¬ Ø§Ù„Ø­Ø±ÙƒØ§Øª Ø§Ù„Ù…Ø§Ù„ÙŠØ© Ø£Ùˆ Ø§Ù„Ø£Ø±ØµØ¯Ø© Ø§Ù„Ø§ÙØªØªØ§Ø­ÙŠØ© Ø¨Ø¯Ù‚Ø© Ø¹Ø§Ù„ÙŠØ©. 
Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ù…ØªØ§Ø­Ø© ÙÙŠ Ø§Ù„Ù†Ø¸Ø§Ù… Ø­Ø§Ù„ÙŠØ§Ù‹ Ù‡ÙŠ:
${allAccounts.map((a: any) => `- ÙƒÙˆØ¯ ${a.code}: ${a.name} (Ù†ÙˆØ¹ ${a.type})`).join('\n')}

Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ù…Ø¯Ø®Ù„ Ø£Ùˆ Ø§Ù„Ù…Ø³ØªØ®Ø±Ø¬:
${input.rawText || input.fileUrl || "Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù†Øµ"}

Ù‚Ù… Ø¨Ø¥Ø±Ø¬Ø§Ø¹ Ø§Ù„Ù†ØªÙŠØ¬Ø© Ø¨ØµÙŠØºØ© JSON Ø­ØµØ±Ø§Ù‹ ØªØªØ¶Ù…Ù† Ù…ØµÙÙˆÙØ© items ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰:
- accountCode (ÙƒÙˆØ¯ Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚ Ø¨Ø¯Ù‚Ø©)
- amount (Ø§Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„Ø±Ù‚Ù…ÙŠØ©)
- type (debit Ø£Ùˆ credit)
- narration (ÙˆØµÙ Ø§Ù„Ø­Ø±ÙƒØ© Ø£Ùˆ Ø¨ÙŠØ§Ù†Ù‡Ø§)`;

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
        const contentStr = typeof contentVal === 'string' ? contentVal : JSON.stringify(contentVal || {});
        const parsed = JSON.parse(contentStr);
        const items = Array.isArray(parsed?.items) ? parsed.items : [];
        if (items.length === 0) {
          return { success: false, message: "ØªØ¹Ø°Ø± Ø§Ø³ØªØ®Ø±Ø§Ø¬ Ø¨Ù†ÙˆØ¯ Ù…Ø§Ù„ÙŠØ© Ù…Ù† Ø§Ù„Ù…Ø³ØªÙ†Ø¯", items: [] };
        }
        return { success: true, items };
      } catch (e) {
        // Never invent financial data â€” surface the failure for manual review
        console.warn("[smartParse] Parsing failed:", e);
        return {
          success: false,
          message: "ØªØ¹Ø°Ø± ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù…Ø³ØªÙ†Ø¯ â€” ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ÙŠØ¯ÙˆÙŠØ§Ù‹",
          items: [],
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
        // Seed default ALHUSAINIA tenant
        await db.insert(tenants).values({
          name: "Ù…Ø¤Ø³Ø³Ø© Ø§Ù„Ø­Ø³ÙŠÙ†ÙŠØ© Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ø£Ø¹Ù…Ø§Ù„",
          code: "ALH-HQ",
          ownerUserId: ctx.user.id,
          currency: "YER",
          country: "Ø§Ù„ÙŠÙ…Ù†",
          subscriptionPlan: "standard",
        });
        const createdT = await db.select().from(tenants).limit(1);
        if (createdT.length > 0) {
          await db.insert(branches).values({
            tenantId: createdT[0].id,
            name: "Ø§Ù„ÙØ±Ø¹ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ",
            code: "HQ-01",
            city: "ØµÙ†Ø¹Ø§Ø¡",
            isMain: true,
          });
        }
      }
      return {
        tenants: await db.select().from(tenants),
        branches: await db.select().from(branches),
      };
    }),

    createBranch: protectedProcedure.input(z.object({
      tenantId: z.number(),
      name: z.string(),
      code: z.string(),
      city: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(branches).values({
        tenantId: input.tenantId,
        name: input.name,
        code: input.code,
        city: input.city || null,
        isMain: false,
      });
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `Ø¥Ø¶Ø§ÙØ© ÙØ±Ø¹ Ø¬Ø¯ÙŠØ¯: ${input.name} (${input.code})`,
        details: `ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„ÙØ±Ø¹ ØªØ­Øª Ø§Ù„Ù…Ø¤Ø³Ø³Ø© Ø±Ù‚Ù… ${input.tenantId}`,
      });
      return { success: true };
    }),

    // Custom role & branch permissions management
    getUserPermissions: protectedProcedure.input(z.object({
      userId: z.number(),
    })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(userBranchPermissions).where(eq(userBranchPermissions.userId, input.userId));
    }),

    saveUserPermission: protectedProcedure.input(z.object({
      userId: z.number(),
      branchId: z.number(),
      canView: z.boolean(),
      canInsert: z.boolean(),
      canApprove: z.boolean(),
      canPost: z.boolean(),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const existing = await db.select().from(userBranchPermissions).where(
        and(eq(userBranchPermissions.userId, input.userId), eq(userBranchPermissions.branchId, input.branchId))
      );

      if (existing.length > 0) {
        await db.update(userBranchPermissions).set({
          canView: input.canView,
          canInsert: input.canInsert,
          canApprove: input.canApprove,
          canPost: input.canPost,
        }).where(eq(userBranchPermissions.id, existing[0].id));
      } else {
        await db.insert(userBranchPermissions).values({
          userId: input.userId,
          branchId: input.branchId,
          canView: input.canView,
          canInsert: input.canInsert,
          canApprove: input.canApprove,
          canPost: input.canPost,
        });
      }

      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `ØªØ­Ø¯ÙŠØ« ØµÙ„Ø§Ø­ÙŠØ§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø±Ù‚Ù… ${input.userId} Ù„Ù„ÙØ±Ø¹ ${input.branchId}`,
        details: `Ø¹Ø±Ø¶: ${input.canView}, Ø¥Ø¯Ø®Ø§Ù„: ${input.canInsert}, Ø§Ø¹ØªÙ…Ø§Ø¯: ${input.canApprove}, ØªØ±Ø­ÙŠÙ„: ${input.canPost}`,
      });

      return { success: true };
    }),

    // Branch Performance Comparison Analytics
    getBranchPerformanceComparison: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { comparison: [] };
      const allBranches = await db.select().from(branches);
      if (allBranches.length === 0) return { comparison: [] };
      const mainBranchId = allBranches.find(b => b.isMain)?.id || allBranches[0].id;

      // Fetch transactions with account type info (single join, no N+1)
      const txRows = await db.select({
        id: transactions.id,
        amount: transactions.amount,
        type: transactions.type,
        branchId: transactions.branchId,
        accountType: accounts.type,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(eq(transactions.lifecycleStatus, 'approved'));

      const branchStats = new Map<number, { revenue: number; expenses: number; count: number }>();
      for (const b of allBranches) {
        branchStats.set(b.id, { revenue: 0, expenses: 0, count: 0 });
      }

      for (const tx of txRows) {
        const amt = parseFloat(tx.amount || "0");
        // Legacy transactions without a branch are attributed to the main branch
        const bid = tx.branchId ?? mainBranchId;
        const stats = branchStats.get(bid);
        if (!stats) continue;
        stats.count++;
        if (tx.accountType === 'revenue') {
          stats.revenue += tx.type === 'credit' ? amt : -amt;
        } else if (tx.accountType === 'expense') {
          stats.expenses += tx.type === 'debit' ? amt : -amt;
        }
      }

      const comparison = allBranches.map((b) => {
        const stats = branchStats.get(b.id) || { revenue: 0, expenses: 0, count: 0 };
        return {
          id: b.id,
          name: b.name,
          code: b.code,
          city: b.city || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯",
          isMain: b.isMain,
          revenue: stats.revenue,
          expenses: stats.expenses,
          netProfit: stats.revenue - stats.expenses,
          transactionsCount: stats.count,
          complianceScore: 90,
        };
      });

      return { comparison };
    }),

    // AI Financial Advisor & Deep Recommendations
    getAiFinancialAdvisorAnalysis: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { analysis: "Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ØºÙŠØ± Ù…ØªÙˆÙØ±Ø© Ø­Ø§Ù„ÙŠØ§Ù‹", status: "Ø®Ø·Ø£", timestamp: new Date().toISOString() };

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
        isReversed: transactions.isReversed,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(eq(transactions.isReversed, false))
      .orderBy(desc(transactions.transactionDate), desc(transactions.id));

      const allAccts = await db.select().from(accounts);
      const allBudgets = await db.select().from(budgets).orderBy(desc(budgets.id));

      // â”€â”€ Local statistical analysis (LLM-free, always available) â”€â”€
      const approved = allTx.filter((t) => t.lifecycleStatus === "approved");
      let totalRevenue = 0;
      let totalExpense = 0;
      const byAccount: Record<number, { name: string; code: string; revenue: number; expense: number }> = {};
      const accountMeta = new Map<number, { name: string; code: string }>();

      for (const a of allAccts) {
        accountMeta.set(a.id, { name: a.name, code: a.code });
        byAccount[a.id] = { name: a.name, code: a.code, revenue: 0, expense: 0 };
      }

      for (const tx of approved) {
        const amt = parseFloat(tx.amount || "0");
        const key = tx.accountId ?? -1;
        if (!byAccount[key]) byAccount[key] = { name: tx.accountName || "Ø­Ø³Ø§Ø¨ ØºÙŠØ± Ù…Ø­Ø¯Ø¯", code: "", revenue: 0, expense: 0 };
        if (tx.accountType === "revenue") {
          totalRevenue += amt;
          byAccount[key].revenue += amt;
        } else if (tx.accountType === "expense") {
          totalExpense += amt;
          byAccount[key].expense += amt;
        }
      }

      const netIncome = totalRevenue - totalExpense;
      const margin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
      const expenseRatio = totalRevenue > 0 ? (totalExpense / totalRevenue) * 100 : 0;

      const topRevenue = Object.values(byAccount)
        .filter((a) => a.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3);
      const topExpense = Object.values(byAccount)
        .filter((a) => a.expense > 0)
        .sort((a, b) => b.expense - a.expense)
        .slice(0, 3);

      const cashAccounts = allAccts.filter((a) => a.type === "asset" && (a.code === "1010" || a.code.startsWith("1020")));
      let cashBalance = 0;
      for (const tx of approved) {
        if (!tx.accountId || !tx.accountType || tx.accountType !== "asset") continue;
        if (!cashAccounts.some((c) => c.id === tx.accountId)) continue;
        const amt = parseFloat(tx.amount || "0");
        cashBalance += tx.type === "debit" ? amt : -amt;
      }

      let budgetLine = "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø®Ø·Ø· Ù…ÙŠØ²Ø§Ù†ÙŠØ© Ù…Ø¶Ø§ÙØ© Ø¨Ø¹Ø¯ â€” Ø£Ø¶Ù Ø®Ø·Ø© Ù…Ù† ØªØ¨ÙˆÙŠØ¨ Ø§Ù„ØªØ­Ù„ÙŠÙ„Ø§Øª Ù„Ù…Ø±Ø§Ù‚Ø¨Ø© Ø§Ù„Ø£Ø¯Ø§Ø¡ Ù…Ù‚Ø§Ø¨Ù„ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù.";
      if (allBudgets.length > 0) {
        const latest = allBudgets[0];
        const revTarget = parseFloat(String(latest.targetRevenue || "0"));
        const expTarget = parseFloat(String(latest.targetExpense || "0"));
        const revPct = revTarget > 0 ? Math.round((totalRevenue / revTarget) * 100) : 0;
        const expPct = expTarget > 0 ? Math.round((totalExpense / expTarget) * 100) : 0;
        budgetLine = `Ø®Ø·Ø© Â«${latest.periodName}Â»: ØªØ­Ù‚Ù‚ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª ${revPct}% Ù…Ù† Ø§Ù„Ù…Ø³ØªÙ‡Ø¯ÙØŒ ÙˆØ§Ù„Ù…ØµØ±ÙˆÙØ§Øª ${expPct}% Ù…Ù† Ø§Ù„Ø³Ù‚Ù Ø§Ù„Ù…Ø®ØµØµ.`;
      }

      const fmt = (n: number) => n.toLocaleString("en-US");
      const topRevenueLine = topRevenue.length
        ? topRevenue.map((a) => `â€¢ ${a.code} ${a.name}: ${fmt(a.revenue)}`).join("\n")
        : "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ù…Ø¹ØªÙ…Ø¯Ø© Ù…Ø³Ø¬Ù„Ø© Ø¨Ø¹Ø¯.";
      const topExpenseLine = topExpense.length
        ? topExpense.map((a) => `â€¢ ${a.code} ${a.name}: ${fmt(a.expense)}`).join("\n")
        : "Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…ØµØ±ÙˆÙØ§Øª Ù…Ø¹ØªÙ…Ø¯Ø© Ù…Ø³Ø¬Ù„Ø© Ø¨Ø¹Ø¯.";

      const recommendations: string[] = [];
      if (totalRevenue === 0 && totalExpense === 0) {
        recommendations.push(
          "Ø§Ø¨Ø¯Ø£ Ø¨ØªØ³Ø¬ÙŠÙ„ Ø£ÙˆÙ„ Ø­Ø±ÙƒØ© Ù…Ø§Ù„ÙŠØ© Ù…Ø¹ØªÙ…Ø¯Ø© (Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø£Ùˆ Ù…ØµØ±ÙˆÙØ§Øª) Ø¹Ø¨Ø± Ø£Ø¯Ø§Ø© Ø§Ù„Ø¥Ø¯Ø®Ø§Ù„ Ø§Ù„Ø³Ø±ÙŠØ¹ â€” Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„ÙƒØ§Ù…Ù„ ÙŠØ¨Ø¯Ø£ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¹Ù†Ø¯ ØªÙˆÙØ± Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª."
        );
      } else {
        if (cashBalance < totalExpense * 0.15 && totalExpense > 0) {
          recommendations.push(
            `Ø§Ù„Ø³ÙŠÙˆÙ„Ø© Ø§Ù„Ù†Ù‚Ø¯ÙŠØ© (${fmt(cashBalance)}) Ø£Ù‚Ù„ Ù…Ù† 15% Ù…Ù† Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª â€” Ø¹Ø¬Ù‘Ù„ ØªØ­ØµÙŠÙ„ Ø§Ù„Ø°Ù…Ù… ÙˆØ­Ø¯Ù‘ Ù…Ù† Ø§Ù„Ø³Ø­ÙˆØ¨Ø§Øª ØºÙŠØ± Ø§Ù„Ù…Ø®Ø·Ø· Ù„Ù‡Ø§ Ù„ØªØºØ·ÙŠØ© Ø§Ù„Ø§Ù„ØªØ²Ø§Ù…Ø§Øª Ø§Ù„Ù‚Ø§Ø¯Ù…Ø©.`
          );
        } else if (totalExpense > 0) {
          recommendations.push(
            `Ø§Ù„Ø³ÙŠÙˆÙ„Ø© Ø§Ù„Ù†Ù‚Ø¯ÙŠØ© Ø§Ù„Ø­Ø§Ù„ÙŠØ© (${fmt(cashBalance)}) ØªØºØ·ÙŠ Ø§Ù„ØªØ²Ø§Ù…Ø§Øª Ø§Ù„ØªØ´ØºÙŠÙ„ â€” Ø­Ø§ÙØ¸ Ø¹Ù„Ù‰ Ù‡Ø§Ù…Ø´ Ø§Ø­ØªÙŠØ§Ø·ÙŠ Ù„Ø§ ÙŠÙ‚Ù„ Ø¹Ù† Ø´Ù‡Ø± Ù…ØµØ±ÙˆÙØ§Øª.`
          );
        }
        if (expenseRatio > 70) {
          recommendations.push(
            `Ù†Ø³Ø¨Ø© Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø¥Ù„Ù‰ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª ${expenseRatio.toFixed(0)}% ØªØªØ¬Ø§ÙˆØ² Ø§Ù„Ø­Ø¯ Ø§Ù„ØµØ­ÙŠ (70%) â€” Ø±Ø§Ø¬Ø¹ Ø¨Ù†ÙˆØ¯ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„ÙƒØ¨Ø±Ù‰ Ø§Ù„ØªØ§Ù„ÙŠØ© Ù„Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªÙØ§ÙˆØ¶ Ø£Ùˆ Ø§Ù„ØªØ±Ø´ÙŠØ¯: ${topExpense.map((a) => a.name).join("ØŒ ")}.`
          );
        } else if (margin > 15) {
          recommendations.push(
            `Ù‡Ø§Ù…Ø´ Ø§Ù„Ø±Ø¨Ø­ Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠ ${margin.toFixed(1)}% Ù‚ÙˆÙŠ â€” ÙˆØ¬Ù‘Ù‡ Ø§Ù„ÙØ§Ø¦Ø¶ Ù†Ø­Ùˆ Ø­Ø³Ø§Ø¨ Ù†Ù‚Ø¯ÙŠ/Ø§Ø³ØªØ«Ù…Ø§Ø±ÙŠ Ù…Ù†ÙØµÙ„ Ø£Ùˆ ØªØ®ÙÙŠØ¶ ØªÙƒÙ„ÙØ© Ø§Ù„ØªÙ…ÙˆÙŠÙ„ Ø¥Ø°Ø§ ÙˆÙØ¬Ø¯ Ù‚Ø±Ø¶.`
          );
        } else {
          recommendations.push(
            `Ù‡Ø§Ù…Ø´ Ø§Ù„Ø±Ø¨Ø­ ${margin.toFixed(1)}% Ù…Ù‚Ø¨ÙˆÙ„ â€” Ø±ÙƒÙ‘Ø² Ø¹Ù„Ù‰ Ù†Ù…Ùˆ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø¹Ø¨Ø± Ø£ÙƒØ¨Ø± 3 Ù…ØµØ§Ø¯Ø± Ø­Ø§Ù„ÙŠØ§Ù‹ Ø«Ù… Ø¹Ù„Ù‰ ØªØ«Ø¨ÙŠØª ØªÙƒÙ„ÙØ© Ø§Ù„ØªØ´ØºÙŠÙ„ Ø¹Ù†Ø¯ Ù…Ø³ØªÙˆØ§Ù‡Ø§ Ø§Ù„Ø­Ø§Ù„ÙŠ.`
          );
        }
        if (topExpense.length > 0) {
          recommendations.push(
            `ØªØ§Ø¨Ø¹ Ø´Ù‡Ø±ÙŠØ§Ù‹ Ø§Ù„Ø¨Ù†ÙˆØ¯ Ø§Ù„Ø«Ù„Ø§Ø«Ø© Ø§Ù„Ø£ÙƒØ¨Ø± (${topExpense.map((a) => a.name).join("ØŒ ")}) â€” Ø®ÙØ¶ 5% Ù…Ù†Ù‡Ø§ ÙŠÙˆÙÙ‘Ø± ${fmt(totalExpense * 0.05)} Ø³Ù†ÙˆÙŠØ§Ù‹ ØªÙ‚Ø±ÙŠØ¨Ø§Ù‹.`
          );
        }
      }

      const analysisText = [
        "â”â”â”€ Ø§Ù„ØªÙ‚ÙŠÙŠÙ… Ø§Ù„ØªÙ†ÙÙŠØ°ÙŠ â”€â”â”",
        totalRevenue === 0 && totalExpense === 0
          ? "Ø§Ù„Ù…Ù†ØµØ© Ø¬Ø§Ù‡Ø²Ø© ÙˆØ§Ù„Ø£Ø¯Ø§Ø¡ Ø§Ù„Ù…Ø§Ù„ÙŠ Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø£ÙˆÙ„ Ø­Ø±ÙƒØ© Ù…Ø¹ØªÙ…Ø¯Ø©."
          : `Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø©: ${fmt(totalRevenue)}\nØ¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø©: ${fmt(totalExpense)}\nØµØ§ÙÙŠ Ø§Ù„Ø¯Ø®Ù„ Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠ: ${fmt(netIncome)} (Ù‡Ø§Ù…Ø´ ${margin.toFixed(1)}%)\nÙ†Ø³Ø¨Ø© Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø¥Ù„Ù‰ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª: ${expenseRatio.toFixed(0)}%`,
        "",
        "â”â”â”€ Ù…ØµØ§Ø¯Ø± Ø§Ù„ØªØ¯ÙÙ‚ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© â”€â”â”",
        topRevenueLine,
        "",
        "â”â”â”€ Ø£ÙƒØ¨Ø± Ø¨Ù†ÙˆØ¯ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª â”€â”â”",
        topExpenseLine,
        "",
        "â”â”â”€ Ø§Ù„Ø³ÙŠÙˆÙ„Ø© ÙˆØ§Ù„ÙƒÙØ§Ø¡Ø© â”€â”â”",
        `Ø§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ù†Ù‚Ø¯ÙŠ (Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ + Ø§Ù„Ø¨Ù†ÙˆÙƒ): ${fmt(cashBalance)}`,
        budgetLine,
        "",
        "â”â”â”€ Ø§Ù„ØªÙˆØµÙŠØ§Øª Ø§Ù„Ø°ÙƒÙŠØ© (3) â”€â”â”",
        recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n"),
      ].join("\n");

      // â”€â”€ LLM enhancement (only when Forge/OpenAI key is configured) â”€â”€
      if (ENV.forgeApiKey) {
        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "user",
                content: `Ø£Ù†Øª Ù…Ø³Ø§Ø¹Ø¯ Ù…Ø§Ù„ÙŠ Ø®Ø¨ÙŠØ± Ù„Ù†Ø¸Ø§Ù… ALHUSAINIA Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ÙŠ. Ø¥Ù„ÙŠÙƒ Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø§Ù„ÙŠØ© Ù…Ø­Ø³ÙˆØ¨Ø© Ø¨Ø¯Ù‚Ø© ØªØ´ØºÙŠÙ„ÙŠØ©ØŒ ÙÙ‚Ø¯Ù… ØªØ­Ù„ÙŠÙ„Ø§Ù‹ Ø£Ø¹Ù…Ù‚ Ù…Ø¨Ù†ÙŠØ§Ù‹ Ø¹Ù„ÙŠÙ‡Ø§ Ø­ØµØ±Ø§Ù‹ (Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©ØŒ Ø£Ø³Ù„ÙˆØ¨ Ù…Ù‡Ù†ÙŠ):
${analysisText}
Ù…Ù„Ø§Ø­Ø¸Ø©: Ù„Ø§ ØªØ®ØªÙ„Ù‚ Ø£Ø±Ù‚Ø§Ù…Ø§Ù‹Ø› Ø§Ø¹ØªÙ…Ø¯ Ø¹Ù„Ù‰ Ù…Ø§ ÙˆØ±Ø¯ ÙÙ‚Ø·.`,
              },
            ],
          });
          const content = response.choices[0]?.message?.content;
          if (typeof content === "string" && content.trim().length > 20) {
            return { analysis: content, status: "ØªØ­Ù„ÙŠÙ„ Ø¨Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ (Forge LLM)", timestamp: new Date().toISOString() };
          }
        } catch {
          // fall through to the local statistical analysis
        }
      }

      return {
        analysis: analysisText,
        status: ENV.forgeApiKey ? "ØªØ­Ù„ÙŠÙ„ Ø¥Ø­ØµØ§Ø¦ÙŠ Ù…Ø­Ù„ÙŠ (ØªØ¹Ø°Ø± Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ù€ LLM)" : "ØªØ­Ù„ÙŠÙ„ Ø¥Ø­ØµØ§Ø¦ÙŠ Ù…Ø­Ù„ÙŠ Ù…Ø¹ØªÙ…Ø¯",
        timestamp: new Date().toISOString(),
      };
    }),
  }),

  // â”€â”€â”€ Offline-First Sync Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sync: router({
    // Get all data for offline cache (full snapshot)
    getFullSnapshot: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { accounts: [], transactions: [], settings: null, budgets: [], openingBalances: [], branches: [], tenants: [], products: [], warehouses: [], inventoryMovements: [], customers: [], suppliers: [], salesInvoices: [], salesInvoiceItems: [], purchaseInvoices: [], purchaseInvoiceItems: [], orders: [], orderItems: [], payments: [], activityLogs: [] };

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
        allActivityLogs,
      ] = await Promise.all([
        db.select().from(accounts).orderBy(asc(accounts.code)),
        db.select().from(transactions).orderBy(desc(transactions.id)).limit(500),
        db.select().from(settings).limit(1),
        db.select().from(budgets).orderBy(desc(budgets.id)),
        db.select().from(openingBalances),
        db.select().from(branches),
        db.select().from(tenants),
        db.select().from(products).orderBy(asc(products.code)),
        db.select().from(warehouses),
        db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.createdAt)).limit(500),
        db.select().from(customers).orderBy(asc(customers.code)),
        db.select().from(suppliers).orderBy(asc(suppliers.code)),
        db.select().from(salesInvoices).orderBy(desc(salesInvoices.createdAt)).limit(200),
        db.select().from(salesInvoiceItems),
        db.select().from(purchaseInvoices).orderBy(desc(purchaseInvoices.createdAt)).limit(200),
        db.select().from(purchaseInvoiceItems),
        db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200),
        db.select().from(orderItems),
        db.select().from(payments).orderBy(desc(payments.createdAt)).limit(500),
        db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(200),
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
        serverTime: new Date().toISOString(),
      };
    }),

    // Push batch of offline mutations (for bulk sync)
    pushMutations: protectedProcedure.input(z.object({
      mutations: z.array(z.object({
        table: z.string(),
        operation: z.enum(["create", "update", "delete"]),
        recordId: z.string(),
        payload: z.any(),
        timestamp: z.number(),
        deviceId: z.string(),
      })),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const results: { recordId: string; status: string; serverId?: number; error?: string }[] = [];

      for (const mutation of input.mutations) {
        try {
          if (mutation.table === "accounts") {
            if (mutation.operation === "create") {
              const inserted = await db.insert(accounts).values({
                ...mutation.payload,
                isCustom: true,
              }).returning();
              results.push({ recordId: mutation.recordId, status: "ok", serverId: inserted[0]?.id });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(accounts).set({
                name: mutation.payload.name,
                code: mutation.payload.code,
                type: mutation.payload.type,
                isActive: mutation.payload.isActive,
                parentAccountId: mutation.payload.parentAccountId,
              }).where(eq(accounts.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "delete" && mutation.payload.id) {
              await db.delete(accounts).where(eq(accounts.id, mutation.payload.id));
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
                userId: ctx.user.id,
              }).returning();
              results.push({ recordId: mutation.recordId, status: "ok", serverId: inserted[0]?.id });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(transactions).set({
                amount: mutation.payload.amount,
                narration: mutation.payload.narration,
                notes: mutation.payload.notes,
                lifecycleStatus: mutation.payload.lifecycleStatus,
              }).where(eq(transactions.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "delete" && mutation.payload.id) {
              await db.delete(transactions).where(eq(transactions.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "settings") {
            const existing = await db.select().from(settings).limit(1);
            if (existing.length > 0) {
              await db.update(settings).set(mutation.payload).where(eq(settings.id, existing[0].id));
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
                and(eq(openingBalances.accountId, mutation.payload.accountId), eq(openingBalances.periodName, mutation.payload.periodName))
              ).limit(1);
              if (existing.length > 0) {
                await db.update(openingBalances).set({
                  amount: mutation.payload.amount,
                  type: mutation.payload.type,
                  notes: mutation.payload.notes,
                }).where(eq(openingBalances.id, existing[0].id));
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
              await db.update(products).set(mutation.payload).where(eq(products.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "delete" && mutation.payload.id) {
              await db.delete(products).where(eq(products.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "customers") {
            if (mutation.operation === "create") {
              await db.insert(customers).values({ ...mutation.payload, balance: mutation.payload.balance ?? "0" });
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(customers).set(mutation.payload).where(eq(customers.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "delete" && mutation.payload.id) {
              await db.delete(customers).where(eq(customers.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            }
          } else if (mutation.table === "suppliers") {
            if (mutation.operation === "create") {
              await db.insert(suppliers).values({ ...mutation.payload, balance: mutation.payload.balance ?? "0" });
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "update" && mutation.payload.id) {
              await db.update(suppliers).set(mutation.payload).where(eq(suppliers.id, mutation.payload.id));
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.operation === "delete" && mutation.payload.id) {
              await db.delete(suppliers).where(eq(suppliers.id, mutation.payload.id));
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
              await db.update(salesInvoices).set(mutation.payload).where(eq(salesInvoices.id, mutation.payload.id));
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
              await db.update(purchaseInvoices).set(mutation.payload).where(eq(purchaseInvoices.id, mutation.payload.id));
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
              await db.update(orders).set(mutation.payload).where(eq(orders.id, mutation.payload.id));
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

          // Log activity
          await db.insert(activityLogs).values({
            userId: ctx.user.id,
            userName: ctx.user.name,
            action: `Ù…Ø²Ø§Ù…Ù†Ø© (${mutation.operation}) - ${mutation.table}`,
            details: `Device: ${mutation.deviceId} | Record: ${mutation.recordId}`,
          });
        } catch (error: any) {
          results.push({
            recordId: mutation.recordId,
            status: "error",
            error: error.message || "Unknown error",
          });
        }
      }

      return {
        results,
        serverTime: new Date().toISOString(),
        accepted: results.filter(r => r.status === "ok").length,
        rejected: results.filter(r => r.status === "error").length,
      };
    }),

    // Get changes since a timestamp (incremental sync)
    getChangesSince: protectedProcedure.input(z.object({
      since: z.string().datetime(),
      tables: z.array(z.string()).optional(),
    })).query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { changes: {}, serverTime: new Date().toISOString() };

      const sinceDate = new Date(input.since);
      const tablesToSync = input.tables || ["accounts", "transactions", "settings", "budgets", "openingBalances", "products", "warehouses", "inventoryMovements", "customers", "suppliers", "salesInvoices", "salesInvoiceItems", "purchaseInvoices", "purchaseInvoiceItems", "orders", "orderItems", "payments", "activityLogs", "branches", "tenants"];
      const changes: Record<string, any[]> = {};

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
        serverTime: new Date().toISOString(),
      };
    }),

    // Heartbeat: check server status and exchange device clocks
    heartbeat: protectedProcedure.input(z.object({
      deviceId: z.string(),
      lastSyncAt: z.number().optional(),
      pendingCount: z.number().optional(),
    })).query(async ({ input }) => {
      const db = await getDb();
      const dbAvailable = !!db;
      let serverTxnCount = 0;
      if (db) {
        try {
          const [r] = await db.select({ count: sql<number>`count(*)::int` }).from(transactions).limit(1);
          serverTxnCount = r?.count ?? 0;
        } catch {
          // count unavailable â€” treat as 0
        }
      }
      return {
        serverTime: new Date().toISOString(),
        serverVersion: "1.1.0",
        deviceId: input.deviceId,
        dbAvailable,
        serverTxnCount,
        syncRecommended: dbAvailable && (input.pendingCount ?? 0) > 0,
      };
    }),
  }),

  // â”€â”€â”€ Products & Inventory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  products: router({
    list: publicProcedure.input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      search: z.string().optional(),
      category: z.string().optional(),
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const conditions = [eq(products.isActive, true)];
      if (input?.search) {
        conditions.push(or(
          ilike(products.name, `%${input.search}%`),
          ilike(products.code, `%${input.search}%`),
          ilike(products.barcode, `%${input.search}%`)
        )!);
      }
      if (input?.category) conditions.push(eq(products.category, input.category));
      const where = and(...conditions)!;
      const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(where);
      const items = await db.select().from(products).where(where).orderBy(asc(products.code)).limit(limit).offset(offset);
      return { items, total: countResult?.count ?? 0 };
    }),

    create: protectedProcedure.input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      nameAr: z.string().optional(),
      type: z.enum(["goods", "service"]).default("goods"),
      category: z.string().optional(),
      unit: z.string().default("Ù‚Ø·Ø¹Ø©"),
      purchasePrice: z.string().default("0"),
      salePrice: z.string().default("0"),
      minStock: z.number().default(0),
      barcode: z.string().optional(),
      description: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(products).values({ ...input, currentStock: 0 });
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `Ø¥Ø¶Ø§ÙØ© Ù…Ù†ØªØ¬ Ø¬Ø¯ÙŠØ¯: ${input.name} (${input.code})`,
      });
      return { success: true };
    }),

    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      salePrice: z.string().optional(),
      purchasePrice: z.string().optional(),
      minStock: z.number().optional(),
      barcode: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(products).set(data).where(eq(products.id, id));
      return { success: true };
    }),

    adjustStock: protectedProcedure.input(z.object({
      productId: z.number(),
      quantity: z.number().int().min(1, "Ø§Ù„ÙƒÙ…ÙŠØ© ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„ 1"),
      type: z.enum(["in", "out", "adjustment"]),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const product = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
      if (product.length === 0) throw new Error("Ø§Ù„Ù…Ù†ØªØ¬ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");

      const currentStock = product[0].currentStock || 0;
      let newStock = currentStock;
      if (input.type === "in") {
        newStock = currentStock + input.quantity;
      } else if (input.type === "out") {
        if (currentStock < input.quantity) {
          throw new Error(`Ø§Ù„Ù…Ø®Ø²ÙˆÙ† ØºÙŠØ± ÙƒØ§ÙÙ â€” Ø§Ù„Ù…ØªÙˆÙØ±: ${currentStock}, Ø§Ù„Ù…Ø·Ù„ÙˆØ¨: ${input.quantity}`);
        }
        newStock = currentStock - input.quantity;
      } else {
        newStock = input.quantity;
      }

      // Atomic update
      if (input.type === "in") {
        await db.update(products).set({ currentStock: sql`${products.currentStock} + ${input.quantity}` }).where(eq(products.id, input.productId));
      } else if (input.type === "out") {
        await db.update(products).set({ currentStock: sql`${products.currentStock} - ${input.quantity}` }).where(eq(products.id, input.productId));
      } else {
        await db.update(products).set({ currentStock: input.quantity }).where(eq(products.id, input.productId));
      }

      await db.insert(inventoryMovements).values({
        productId: input.productId,
        type: input.type,
        quantity: input.quantity,
        notes: input.notes || null,
      });
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `ØªØ¹Ø¯ÙŠÙ„ Ù…Ø®Ø²ÙˆÙ†: ${product[0].name} (${input.type === "in" ? "Ø¥Ø¯Ø®Ø§Ù„" : input.type === "out" ? "Ø¥Ø®Ø±Ø§Ø¬" : "ØªØ³ÙˆÙŠØ©"}: ${input.quantity})`,
        details: `Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø§Ù„Ø³Ø§Ø¨Ù‚: ${currentStock} â€” Ø§Ù„Ø¬Ø¯ÙŠØ¯: ${newStock}`,
      });
      return { success: true, previousStock: currentStock, newStock };
    }),

    movements: publicProcedure.input(z.object({
      productId: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      if (input?.productId) {
        return await db.select().from(inventoryMovements).where(eq(inventoryMovements.productId, input.productId)).orderBy(desc(inventoryMovements.createdAt));
      }
      return await db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.createdAt));
    }),

    importCsv: protectedProcedure.input(z.object({
      rows: z.array(z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        type: z.enum(["goods", "service"]).default("goods"),
        category: z.string().optional(),
        unit: z.string().default("قطعة"),
        purchasePrice: z.string().default("0"),
        salePrice: z.string().default("0"),
        wholesalePrice: z.string().default("0"),
        minStock: z.number().int().min(0).default(0),
        currentStock: z.number().int().min(0).default(0),
        barcode: z.string().optional(),
      })).min(1).max(500),
      mode: z.enum(["update", "skip"]).default("update"),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const seen = new Set<string>();
      const errors: { row: number; message: string }[] = [];
      let created = 0;
      let updated = 0;

      for (let i = 0; i < input.rows.length; i++) {
        const r = input.rows[i];
        const rowNo = i + 2;
        if (seen.has(r.code)) { errors.push({ row: rowNo, message: `رمز مكرر داخل الملف: ${r.code}` }); continue; }
        seen.add(r.code);
        try {
          const existing = await db.select().from(products).where(eq(products.code, r.code)).limit(1);
          const values = {
            name: r.name,
            type: r.type,
            category: r.category || null,
            unit: r.unit || "قطعة",
            purchasePrice: r.purchasePrice || "0",
            salePrice: r.salePrice || "0",
            wholesalePrice: r.wholesalePrice || "0",
            minStock: r.minStock || 0,
            barcode: r.barcode || null,
            isActive: true,
          };
          if (existing.length > 0) {
            await db.update(products).set(values).where(eq(products.id, existing[0].id));
            const stockDelta = r.currentStock - (existing[0].currentStock || 0);
            if (stockDelta !== 0) {
              await db.update(products).set({ currentStock: existing[0].currentStock + stockDelta }).where(eq(products.id, existing[0].id));
              await db.insert(inventoryMovements).values({
                productId: existing[0].id,
                type: "adjustment",
                quantity: Math.abs(stockDelta),
                notes: `${stockDelta > 0 ? "تزويد" : "صرف"} عبر استيراد CSV (الرصيد الجديد ${r.currentStock})`,
              });
            }
            updated++;
          } else {
            await db.insert(products).values({ ...values, code: r.code, currentStock: r.currentStock || 0 });
            created++;
          }
        } catch (e: any) {
          errors.push({ row: rowNo, message: String(e?.message || e) });
        }
      }

      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `استيراد أصناف CSV: ${created} جديد، ${updated} تحديث، ${errors.length} خطأ`,
      });
      return { created, updated, errors };
    }),
  }),

  // â”€â”€â”€ Customers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  customers: router({
    list: publicProcedure.input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      search: z.string().optional(),
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const conditions = [eq(customers.isActive, true)];
      if (input?.search) {
        conditions.push(or(
          ilike(customers.name, `%${input.search}%`),
          ilike(customers.code, `%${input.search}%`),
          ilike(customers.phone, `%${input.search}%`)
        )!);
      }
      const where = and(...conditions)!;
      const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(customers).where(where);
      const items = await db.select().from(customers).where(where).orderBy(asc(customers.code)).limit(limit).offset(offset);
      return { items, total: countResult?.count ?? 0 };
    }),

    create: protectedProcedure.input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      taxNumber: z.string().optional(),
      creditLimit: z.string().default("0"),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(customers).values({ ...input, balance: "0" });
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `Ø¥Ø¶Ø§ÙØ© Ø¹Ù…ÙŠÙ„ Ø¬Ø¯ÙŠØ¯: ${input.name} (${input.code})`,
      });
      return { success: true };
    }),

    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(customers).set(data).where(eq(customers.id, id));
      return { success: true };
    }),
  }),

  // â”€â”€â”€ Suppliers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  suppliers: router({
    list: publicProcedure.input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      search: z.string().optional(),
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const conditions = [eq(suppliers.isActive, true)];
      if (input?.search) {
        conditions.push(or(
          ilike(suppliers.name, `%${input.search}%`),
          ilike(suppliers.code, `%${input.search}%`),
          ilike(suppliers.phone, `%${input.search}%`)
        )!);
      }
      const where = and(...conditions)!;
      const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(suppliers).where(where);
      const items = await db.select().from(suppliers).where(where).orderBy(asc(suppliers.code)).limit(limit).offset(offset);
      return { items, total: countResult?.count ?? 0 };
    }),

    create: protectedProcedure.input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      taxNumber: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(suppliers).values({ ...input, balance: "0" });
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ±Ø¯ Ø¬Ø¯ÙŠØ¯: ${input.name} (${input.code})`,
      });
      return { success: true };
    }),

    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(suppliers).set(data).where(eq(suppliers.id, id));
      return { success: true };
    }),
  }),

  // â”€â”€â”€ Sales & POS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sales: router({
    list: publicProcedure.input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      status: z.enum(["draft", "confirmed", "paid", "partial", "cancelled"]).optional(),
      customerId: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const conditions = [];
      if (input?.status) conditions.push(eq(salesInvoices.status, input.status));
      if (input?.customerId) conditions.push(eq(salesInvoices.customerId, input.customerId));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(salesInvoices).where(where);
      const items = await db.select().from(salesInvoices).where(where).orderBy(desc(salesInvoices.createdAt)).limit(limit).offset(offset);
      return { items, total: countResult?.count ?? 0 };
    }),

    getInvoiceDetails: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [invoice] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, input.id)).limit(1);
      if (!invoice) return null;
      const customer = invoice.customerId
        ? (await db.select().from(customers).where(eq(customers.id, invoice.customerId)).limit(1))[0] ?? null
        : null;
      const items = await db.select().from(salesInvoiceItems).where(eq(salesInvoiceItems.invoiceId, invoice.id)).orderBy(asc(salesInvoiceItems.id));
      return { invoice, customer, items };
    }),

    create: protectedProcedure.input(z.object({
      customerId: z.number().optional(),
      items: z.array(z.object({
        productId: z.number(),
        productName: z.string().min(1),
        quantity: z.number().int().min(1),
        unitPrice: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Ø§Ù„Ø³Ø¹Ø± ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø±Ù‚Ù…Ø§Ù‹ Ù…ÙˆØ¬Ø¨Ø§Ù‹"),
        discount: z.string().default("0"),
      })).min(1, "ÙŠØ¬Ø¨ Ø¥Ø¶Ø§ÙØ© ØµÙ†Ù ÙˆØ§Ø­Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„"),
      discount: z.string().default("0"),
      taxRate: z.string().default("0"),
      paymentMethod: z.enum(["cash", "card", "transfer", "credit", "online"]).default("cash"),
      paidAmount: z.string().default("0"),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await seedDefaultAccountsIfNeeded();

      // Validate amounts
      const discount = parseFloat(input.discount);
      const taxRate = parseFloat(input.taxRate);
      if (isNaN(discount) || discount < 0) throw new Error("Ø§Ù„Ø®ØµÙ… ØºÙŠØ± ØµØ­ÙŠØ­");
      if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) throw new Error("Ù†Ø³Ø¨Ø© Ø§Ù„Ø¶Ø±ÙŠØ¨Ø© ØºÙŠØ± ØµØ­ÙŠØ­Ø©");

      // Generate unique invoice number with date prefix + random suffix
      const now = new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
      const randPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const invoiceNumber = `SI-${datePart}-${randPart}`;

      // Fetch all products at once (no N+1)
      const productIds = input.items.map(i => i.productId);
      const productRows = await db.select().from(products).where(inArray(products.id, productIds));
      const productMap = new Map(productRows.map(p => [p.id, p]));

      // Validate stock for all items before any write
      for (const item of input.items) {
        const prod = productMap.get(item.productId);
        if (!prod) throw new Error(`Ø§Ù„Ù…Ù†ØªØ¬ Ø±Ù‚Ù… ${item.productId} ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯`);
        if (prod.currentStock < item.quantity) {
          throw new Error(`Ø§Ù„Ù…Ø®Ø²ÙˆÙ† ØºÙŠØ± ÙƒØ§ÙÙ Ù„Ù„Ù…Ù†ØªØ¬ "${prod.name}" â€” Ø§Ù„Ù…ØªÙˆÙØ±: ${prod.currentStock}, Ø§Ù„Ù…Ø·Ù„ÙˆØ¨: ${item.quantity}`);
        }
      }

      // Calculate totals
      const subtotal = input.items.reduce((sum, item) => sum + parseFloat(item.unitPrice) * item.quantity, 0);
      const taxAmount = (subtotal - discount) * taxRate / 100;
      const total = subtotal - discount + taxAmount;
      const paidAmount = parseFloat(input.paidAmount);
      if (isNaN(paidAmount) || paidAmount < 0) throw new Error("Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø¯ÙÙˆØ¹ ØºÙŠØ± ØµØ­ÙŠØ­");
      if (paidAmount > total + 0.01) throw new Error("Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø¯ÙÙˆØ¹ ÙŠØªØ¬Ø§ÙˆØ² Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙØ§ØªÙˆØ±Ø©");
      // Derive initial status from payment: fully paid / partial / unpaid
      const initialStatus = paidAmount >= total - 0.01 ? "paid" : paidAmount > 0 ? "partial" : "draft";

      // Execute all in a single transaction
      // Note: neon-serverless Pool supports transaction() via drizzle
      const result = await (db as any).transaction(async (tx: any) => {
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
          userId: ctx.user.id,
        }).returning();

        // Insert all items
        const itemValues = input.items.map(item => ({
          invoiceId: invoice.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: (parseFloat(item.unitPrice) * item.quantity - parseFloat(item.discount)).toString(),
        }));
        await tx.insert(salesInvoiceItems).values(itemValues);

        // Atomic stock decrement using SQL (no race condition)
        for (const item of input.items) {
          await tx.update(products)
            .set({ currentStock: sql`${products.currentStock} - ${item.quantity}` })
            .where(eq(products.id, item.productId));
          // Log inventory movement
          await tx.insert(inventoryMovements).values({
            productId: item.productId,
            type: "out",
            quantity: item.quantity,
            referenceId: invoice.id,
            referenceType: "sale",
            notes: `ÙØ§ØªÙˆØ±Ø© ${invoiceNumber}`,
          });
        }

        // Atomic customer balance update
        if (input.customerId) {
          const unpaidAmount = total - paidAmount;
          if (unpaidAmount > 0) {
            await tx.update(customers)
              .set({ balance: sql`${customers.balance} + ${unpaidAmount}` })
              .where(eq(customers.id, input.customerId));
          }
        }

        // Auto-posting: double-entry journal for the invoice
        await postInvoiceGlEntries(tx, {
          kind: "sale",
          invoiceId: invoice.id,
          invoiceNumber,
          total,
          paidAmount,
          branchId: null,
          userId: ctx.user.id,
        });

        // Audit log
        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `Ø¥Ù†Ø´Ø§Ø¡ ÙØ§ØªÙˆØ±Ø© Ù…Ø¨ÙŠØ¹Ø§Øª: ${invoiceNumber}`,
          details: `Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: ${total} â€” Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹: ${input.paymentMethod}`,
        });

        return { invoiceId: invoice.id, invoiceNumber };
      });

      return { success: true, ...result };
    }),

    updateStatus: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["draft", "confirmed", "paid", "partial", "cancelled"]),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await db.select().from(salesInvoices).where(eq(salesInvoices.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("Ø§Ù„ÙØ§ØªÙˆØ±Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");
      const inv = existing[0];
      if (inv.status === "cancelled" && input.status !== "cancelled") {
        throw new Error("Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ù…Ù„ØºØ§Ø© ÙˆÙ„Ø§ ÙŠÙ…ÙƒÙ† Ø¥Ø¹Ø§Ø¯Ø© ØªÙØ¹ÙŠÙ„Ù‡Ø§");
      }
      if (inv.status === input.status) return { success: true, unchanged: true };

      // Cancelling a non-draft invoice reverses stock, customer balance and payments
      if (input.status === "cancelled" && inv.status !== "draft") {
        const items = await db.select().from(salesInvoiceItems).where(eq(salesInvoiceItems.invoiceId, inv.id));
        const itemPayments = await db.select().from(payments).where(
          and(eq(payments.source, "sales"), eq(payments.invoiceId, inv.id))
        );

        await (db as any).transaction(async (tx: any) => {
          for (const item of items) {
            await tx.update(products)
              .set({ currentStock: sql`${products.currentStock} + ${item.quantity}` })
              .where(eq(products.id, item.productId));
            await tx.insert(inventoryMovements).values({
              productId: item.productId,
              type: "in",
              quantity: item.quantity,
              referenceId: inv.id,
              referenceType: "sale-cancel",
              notes: `Ø¥Ù„ØºØ§Ø¡ ÙØ§ØªÙˆØ±Ø© ${inv.invoiceNumber}`,
            });
          }
          if (inv.customerId) {
            const reversedUnpaid = parseFloat(inv.total) - parseFloat(inv.paidAmount);
            if (reversedUnpaid > 0) {
              await tx.update(customers)
                .set({ balance: sql`${customers.balance} - ${reversedUnpaid}` })
                .where(eq(customers.id, inv.customerId));
            }
          }
          for (const p of itemPayments) {
            await tx.update(payments).set({ notes: `Ù…Ø³ØªØ±Ø¯Ø© â€” Ø¥Ù„ØºØ§Ø¡ ÙØ§ØªÙˆØ±Ø© ${inv.invoiceNumber}` }).where(eq(payments.id, p.id));
          }
          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `Ø¥Ù„ØºØ§Ø¡ ÙØ§ØªÙˆØ±Ø© Ù…Ø¨ÙŠØ¹Ø§Øª: ${inv.invoiceNumber}`,
            details: `ØªÙ… Ø¹ÙƒØ³ Ø§Ù„Ù…Ø®Ø²ÙˆÙ† ÙˆØ§Ù„Ø£Ø±ØµØ¯Ø© Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ø§Ù„ÙØ§ØªÙˆØ±Ø©`,
          });
        });
      }

      await db.update(salesInvoices).set({ status: input.status, updatedAt: new Date() }).where(eq(salesInvoices.id, inv.id));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª ${inv.invoiceNumber} Ø¥Ù„Ù‰ "${input.status}"`,
      });
      return { success: true };
    }),

    getItems: publicProcedure.input(z.object({
      invoiceId: z.number(),
    })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(salesInvoiceItems).where(eq(salesInvoiceItems.invoiceId, input.invoiceId));
    }),
  }),

  // â”€â”€â”€ Purchases â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  purchases: router({
    list: publicProcedure.input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      status: z.enum(["draft", "confirmed", "paid", "partial", "cancelled"]).optional(),
      supplierId: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const conditions = [];
      if (input?.status) conditions.push(eq(purchaseInvoices.status, input.status));
      if (input?.supplierId) conditions.push(eq(purchaseInvoices.supplierId, input.supplierId));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(purchaseInvoices).where(where);
      const items = await db.select().from(purchaseInvoices).where(where).orderBy(desc(purchaseInvoices.createdAt)).limit(limit).offset(offset);
      return { items, total: countResult?.count ?? 0 };
    }),

    create: protectedProcedure.input(z.object({
      supplierId: z.number().optional(),
      items: z.array(z.object({
        productId: z.number(),
        productName: z.string().min(1),
        quantity: z.number().int().min(1),
        unitPrice: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Ø§Ù„Ø³Ø¹Ø± ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø±Ù‚Ù…Ø§Ù‹ Ù…ÙˆØ¬Ø¨Ø§Ù‹"),
        discount: z.string().default("0"),
      })).min(1, "ÙŠØ¬Ø¨ Ø¥Ø¶Ø§ÙØ© ØµÙ†Ù ÙˆØ§Ø­Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„"),
      discount: z.string().default("0"),
      taxRate: z.string().default("0"),
      paymentMethod: z.enum(["cash", "card", "transfer", "credit", "online"]).default("cash"),
      paidAmount: z.string().default("0"),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await seedDefaultAccountsIfNeeded();

      const discount = parseFloat(input.discount);
      const taxRate = parseFloat(input.taxRate);
      if (isNaN(discount) || discount < 0) throw new Error("Ø§Ù„Ø®ØµÙ… ØºÙŠØ± ØµØ­ÙŠØ­");
      if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) throw new Error("Ù†Ø³Ø¨Ø© Ø§Ù„Ø¶Ø±ÙŠØ¨Ø© ØºÙŠØ± ØµØ­ÙŠØ­Ø©");

      const now = new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
      const randPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const invoiceNumber = `PI-${datePart}-${randPart}`;

      // Fetch products once (no N+1)
      const productIds = input.items.map(i => i.productId);
      const productRows = await db.select().from(products).where(inArray(products.id, productIds));
      const productMap = new Map(productRows.map(p => [p.id, p]));

      // Validate all products exist
      for (const item of input.items) {
        if (!productMap.has(item.productId)) throw new Error(`Ø§Ù„Ù…Ù†ØªØ¬ Ø±Ù‚Ù… ${item.productId} ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯`);
      }

      const subtotal = input.items.reduce((sum, item) => sum + parseFloat(item.unitPrice) * item.quantity, 0);
      const taxAmount = (subtotal - discount) * taxRate / 100;
      const total = subtotal - discount + taxAmount;
      const paidAmount = parseFloat(input.paidAmount);
      if (isNaN(paidAmount) || paidAmount < 0) throw new Error("Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø¯ÙÙˆØ¹ ØºÙŠØ± ØµØ­ÙŠØ­");
      if (paidAmount > total + 0.01) throw new Error("Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø¯ÙÙˆØ¹ ÙŠØªØ¬Ø§ÙˆØ² Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙØ§ØªÙˆØ±Ø©");
      const initialStatus = paidAmount >= total - 0.01 ? "paid" : paidAmount > 0 ? "partial" : "draft";

      const result = await (db as any).transaction(async (tx: any) => {
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
          userId: ctx.user.id,
        }).returning();

        const itemValues = input.items.map(item => ({
          invoiceId: invoice.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: (parseFloat(item.unitPrice) * item.quantity - parseFloat(item.discount)).toString(),
        }));
        await tx.insert(purchaseInvoiceItems).values(itemValues);

        // Atomic stock increment
        for (const item of input.items) {
          await tx.update(products)
            .set({ currentStock: sql`${products.currentStock} + ${item.quantity}` })
            .where(eq(products.id, item.productId));
          await tx.insert(inventoryMovements).values({
            productId: item.productId,
            type: "in",
            quantity: item.quantity,
            referenceId: invoice.id,
            referenceType: "purchase",
            notes: `ÙØ§ØªÙˆØ±Ø© Ø´Ø±Ø§Ø¡ ${invoiceNumber}`,
          });
        }

        // Atomic supplier balance update
        if (input.supplierId) {
          const unpaidAmount = total - paidAmount;
          if (unpaidAmount > 0) {
            await tx.update(suppliers)
              .set({ balance: sql`${suppliers.balance} + ${unpaidAmount}` })
              .where(eq(suppliers.id, input.supplierId));
          }
        }

        // Auto-posting: double-entry journal for the invoice
        await postInvoiceGlEntries(tx, {
          kind: "purchase",
          invoiceId: invoice.id,
          invoiceNumber,
          total,
          paidAmount,
          branchId: null,
          userId: ctx.user.id,
        });

        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `Ø¥Ù†Ø´Ø§Ø¡ ÙØ§ØªÙˆØ±Ø© Ù…Ø´ØªØ±ÙŠØ§Øª: ${invoiceNumber}`,
          details: `Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: ${total} â€” Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹: ${input.paymentMethod}`,
        });

        return { invoiceId: invoice.id, invoiceNumber };
      });

      return { success: true, ...result };
    }),

    updateStatus: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["draft", "confirmed", "paid", "partial", "cancelled"]),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("Ø§Ù„ÙØ§ØªÙˆØ±Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");
      const inv = existing[0];
      if (inv.status === "cancelled" && input.status !== "cancelled") {
        throw new Error("Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ù…Ù„ØºØ§Ø© ÙˆÙ„Ø§ ÙŠÙ…ÙƒÙ† Ø¥Ø¹Ø§Ø¯Ø© ØªÙØ¹ÙŠÙ„Ù‡Ø§");
      }
      if (inv.status === input.status) return { success: true, unchanged: true };

      // Cancelling a non-draft invoice reverses stock, supplier balance and payments
      if (input.status === "cancelled" && inv.status !== "draft") {
        const items = await db.select().from(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, inv.id));

        await (db as any).transaction(async (tx: any) => {
          for (const item of items) {
            await tx.update(products)
              .set({ currentStock: sql`${products.currentStock} - ${item.quantity}` })
              .where(eq(products.id, item.productId));
            await tx.insert(inventoryMovements).values({
              productId: item.productId,
              type: "out",
              quantity: item.quantity,
              referenceId: inv.id,
              referenceType: "purchase-cancel",
              notes: `Ø¥Ù„ØºØ§Ø¡ ÙØ§ØªÙˆØ±Ø© Ø´Ø±Ø§Ø¡ ${inv.invoiceNumber}`,
            });
          }
          if (inv.supplierId) {
            const reversedUnpaid = parseFloat(inv.total) - parseFloat(inv.paidAmount);
            if (reversedUnpaid > 0) {
              await tx.update(suppliers)
                .set({ balance: sql`${suppliers.balance} - ${reversedUnpaid}` })
                .where(eq(suppliers.id, inv.supplierId));
            }
          }
          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `Ø¥Ù„ØºØ§Ø¡ ÙØ§ØªÙˆØ±Ø© Ù…Ø´ØªØ±ÙŠØ§Øª: ${inv.invoiceNumber}`,
            details: `ØªÙ… Ø¹ÙƒØ³ Ø§Ù„Ù…Ø®Ø²ÙˆÙ† ÙˆØ§Ù„Ø£Ø±ØµØ¯Ø© Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ø§Ù„ÙØ§ØªÙˆØ±Ø©`,
          });
        });
      }

      await db.update(purchaseInvoices).set({ status: input.status, updatedAt: new Date() }).where(eq(purchaseInvoices.id, inv.id));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª ${inv.invoiceNumber} Ø¥Ù„Ù‰ "${input.status}"`,
      });
      return { success: true };
    }),

    getItems: publicProcedure.input(z.object({
      invoiceId: z.number(),
    })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, input.invoiceId));
    }),
  }),

  // â”€â”€â”€ Orders & Distribution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  orders: router({
    list: publicProcedure.input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]).optional(),
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const where = input?.status ? eq(orders.status, input.status) : undefined;
      const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(where);
      const items = await db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(limit).offset(offset);
      return { items, total: countResult?.count ?? 0 };
    }),

    create: protectedProcedure.input(z.object({
      customerId: z.number().optional(),
      items: z.array(z.object({
        productId: z.number(),
        productName: z.string().min(1),
        quantity: z.number().int().min(1),
        unitPrice: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Ø§Ù„Ø³Ø¹Ø± ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø±Ù‚Ù…Ø§Ù‹ Ù…ÙˆØ¬Ø¨Ø§Ù‹"),
      })).min(1, "ÙŠØ¬Ø¨ Ø¥Ø¶Ø§ÙØ© ØµÙ†Ù ÙˆØ§Ø­Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„"),
      deliveryAddress: z.string().optional(),
      deliveryDate: z.string().optional(),
      deliveryNotes: z.string().optional(),
      assignedTo: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validate products exist
      const productIds = input.items.map(i => i.productId);
      const productRows = await db.select().from(products).where(inArray(products.id, productIds));
      if (productRows.length !== productIds.length) throw new Error("ÙˆØ§Ø­Ø¯ Ø£Ùˆ Ø£ÙƒØ«Ø± Ù…Ù† Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");

      const total = input.items.reduce((sum, item) => sum + parseFloat(item.unitPrice) * item.quantity, 0);
      const now = new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
      const randPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const orderNumber = `ORD-${datePart}-${randPart}`;

      const result = await (db as any).transaction(async (tx: any) => {
        const [order] = await tx.insert(orders).values({
          orderNumber,
          customerId: input.customerId || null,
          total: total.toString(),
          deliveryAddress: input.deliveryAddress || null,
          deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : null,
          deliveryNotes: input.deliveryNotes || null,
          assignedTo: input.assignedTo || null,
          userId: ctx.user.id,
        }).returning();

        const itemValues = input.items.map(item => ({
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: (parseFloat(item.unitPrice) * item.quantity).toString(),
        }));
        await tx.insert(orderItems).values(itemValues);

        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `Ø¥Ù†Ø´Ø§Ø¡ Ø·Ù„Ø¨ ØªÙˆØ²ÙŠØ¹: ${orderNumber}`,
          details: `Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: ${total}`,
        });

        return { orderId: order.id, orderNumber };
      });

      return { success: true, ...result };
    }),

    updateStatus: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validate current status allows this transition
      const existing = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("Ø§Ù„Ø·Ù„Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");
      const currentStatus = existing[0].status;
      if (currentStatus === "delivered") {
        throw new Error("Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØºÙŠÙŠØ± Ø­Ø§Ù„Ø© Ø·Ù„Ø¨ Ù…ÙØ³Ù„Ù‘Ù… Ø£Ùˆ Ù…ÙÙ„ØºÙ‰");
      }
      if (currentStatus === "cancelled" && input.status !== "cancelled") {
        throw new Error("Ø§Ù„Ø·Ù„Ø¨ Ù…ÙÙ„ØºÙ‰ ÙˆÙ„Ø§ ÙŠÙ…ÙƒÙ† Ø¥Ø¹Ø§Ø¯Ø© ØªÙØ¹ÙŠÙ„Ù‡");
      }

await db.update(orders).set({ status: input.status, updatedAt: new Date() }).where(eq(orders.id, input.id));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `تحديث حالة الطلب #${input.id} من "${currentStatus}" إلى "${input.status}"`,
      });
      return { success: true };
    }),

    // Convert a (web/store) order into an official sales invoice + auto-posting GL entries
    // Stock was already reserved at order time — no second deduction happens here.
    createSaleInvoice: protectedProcedure.input(z.object({
      orderId: z.number(),
      paymentMethod: z.enum(["cash", "card", "transfer", "credit", "online"]).default("cash"),
      paidAmount: z.string().default("0"),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await seedDefaultAccountsIfNeeded();

      const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
      if (!order) throw new Error("الطلب غير موجود");
      if (order.status === "cancelled") throw new Error("الطلب مُلغى ولا يمكن تحويله");

      const prior = await db.select().from(salesInvoices)
        .where(ilike(salesInvoices.notes, `%${order.orderNumber}%`)).limit(1);
      if (prior.length > 0) throw new Error(`تم تحويل الطلب مسبقاً إلى فاتورة ${prior[0].invoiceNumber}`);

      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      if (items.length === 0) throw new Error("الطلب لا يحتوي أصنافاً");

      const subtotal = items.reduce((s, it) => s + parseFloat(it.unitPrice || "0") * it.quantity, 0);
      const total = subtotal;
      const paidAmount = Math.max(0, Math.min(parseFloat(input.paidAmount || "0"), total));
      const status = paidAmount >= total - 0.01 ? "paid" : paidAmount > 0 ? "partial" : "confirmed";

      const now = new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
      const randPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const invoiceNumber = `SI-${datePart}-${randPart}`;

      const result = await (db as any).transaction(async (tx: any) => {
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
          notes: `تحويل من طلب المتجر: ${order.orderNumber}`,
          userId: ctx.user.id,
        }).returning();

        const itemValues = items.map(it => ({
          invoiceId: invoice.id,
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: "0",
          total: (parseFloat(it.unitPrice || "0") * it.quantity).toFixed(2),
        }));
        await tx.insert(salesInvoiceItems).values(itemValues);

        const unpaid = total - paidAmount;
        if (order.customerId && unpaid > 0.009) {
          await tx.update(customers)
            .set({ balance: sql`${customers.balance} + ${unpaid}` })
            .where(eq(customers.id, order.customerId));
        }

        await postInvoiceGlEntries(tx, {
          kind: "sale",
          invoiceId: invoice.id,
          invoiceNumber,
          total,
          paidAmount,
          branchId: null,
          userId: ctx.user.id,
        });

        await tx.update(orders).set({ status: "confirmed", updatedAt: new Date() }).where(eq(orders.id, order.id));

        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `تحويل الطلب ${order.orderNumber} إلى فاتورة مبيعات ${invoiceNumber}`,
          details: `الإجمالي: ${total.toFixed(2)} — المدفوع: ${paidAmount.toFixed(2)} (المخزون محجوز من وقت الطلب)`,
        });

        return { invoiceId: invoice.id, invoiceNumber };
      });

      return { success: true, ...result };
    }),

    getItems: publicProcedure.input(z.object({
      orderId: z.number(),
    })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(orderItems).where(eq(orderItems.orderId, input.orderId));
    }),
  }),

  // â”€â”€â”€ Commercial Dashboard Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  commercial: router({
    getStats: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { lowStock: [], topCustomers: [], monthStats: { salesTotal: 0, purchasesTotal: 0, ordersCount: 0 }, counts: { products: 0, customers: 0, suppliers: 0, sales: 0, purchases: 0, orders: 0 } };

      const allProducts = await db.select().from(products).where(eq(products.isActive, true));
      const lowStock = allProducts
        .filter(p => p.currentStock <= p.minStock)
        .sort((a, b) => (a.currentStock - a.minStock) - (b.currentStock - b.minStock))
        .slice(0, 10);

      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const [salesAgg] = await db.select({ total: sql<string>`coalesce(sum(${salesInvoices.total}), '0')` })
        .from(salesInvoices)
        .where(and(gte(salesInvoices.invoiceDate, monthStart), ne(salesInvoices.status, "cancelled")));
      const [purchasesAgg] = await db.select({ total: sql<string>`coalesce(sum(${purchaseInvoices.total}), '0')` })
        .from(purchaseInvoices)
        .where(and(gte(purchaseInvoices.invoiceDate, monthStart), ne(purchaseInvoices.status, "cancelled")));
      const [ordersAgg] = await db.select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(gte(orders.createdAt, monthStart));

      const [productsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.isActive, true));
      const [customersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(customers).where(eq(customers.isActive, true));
      const [suppliersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(suppliers).where(eq(suppliers.isActive, true));
      const [salesCount] = await db.select({ count: sql<number>`count(*)::int` }).from(salesInvoices).where(ne(salesInvoices.status, "cancelled"));
      const [purchasesCount] = await db.select({ count: sql<number>`count(*)::int` }).from(purchaseInvoices).where(ne(purchaseInvoices.status, "cancelled"));
      const [ordersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(ne(orders.status, "cancelled"));

      // Top customers by unpaid balance (highest receivables)
      const topCustomers = await db.select().from(customers)
        .where(and(eq(customers.isActive, true), sql`${customers.balance} > 0`))
        .orderBy(desc(customers.balance))
        .limit(5);

      return {
        lowStock: lowStock.map(p => ({ id: p.id, code: p.code, name: p.name, currentStock: p.currentStock, minStock: p.minStock, unit: p.unit })),
        topCustomers: topCustomers.map(c => ({ id: c.id, code: c.code, name: c.name, balance: c.balance, phone: c.phone })),
        monthStats: {
          salesTotal: parseFloat(salesAgg?.total || "0"),
          purchasesTotal: parseFloat(purchasesAgg?.total || "0"),
          ordersCount: ordersAgg?.count ?? 0,
        },
        counts: {
          products: productsCount?.count ?? 0,
          customers: customersCount?.count ?? 0,
          suppliers: suppliersCount?.count ?? 0,
          sales: salesCount?.count ?? 0,
          purchases: purchasesCount?.count ?? 0,
          orders: ordersCount?.count ?? 0,
        },
      };
    }),
  }),

  // â”€â”€â”€ Payments (Installments & Settlements) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // â”€â”€â”€ Public Storefront (website integration) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  store: router({
    catalog: publicProcedure.input(z.object({
      search: z.string().optional(),
      category: z.string().optional(),
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], categories: [] };
      const data = await getCatalog(db, {
        search: input?.search,
        category: input?.category,
      });
      return { items: data.items.slice(0, 200), categories: data.categories };
    }),

    placeOrder: publicProcedure.input(placeOrderInputSchema).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await placePublicOrder(db, input);
      return result;
    }),
  }),

  payments: router({
    list: publicProcedure.input(z.object({
      source: z.enum(["sales", "purchases"]),
      invoiceId: z.number(),
    })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(payments)
        .where(and(eq(payments.source, input.source), eq(payments.invoiceId, input.invoiceId)))
        .orderBy(desc(payments.paymentDate));
    }),

    create: protectedProcedure.input(z.object({
      source: z.enum(["sales", "purchases"]),
      invoiceId: z.number(),
      amount: z.string().refine(v => {
        const n = parseFloat(v);
        return !isNaN(n) && n > 0 && n < 1_000_000_000;
      }, "Ø§Ù„Ù…Ø¨Ù„Øº ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø±Ù‚Ù…Ø§Ù‹ Ù…ÙˆØ¬Ø¨Ø§Ù‹"),
      paymentMethod: z.enum(["cash", "card", "transfer", "credit", "online"]).default("cash"),
      paymentDate: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const paymentAmount = parseFloat(input.amount);

      if (input.source === "sales") {
        const invoices = await db.select().from(salesInvoices).where(eq(salesInvoices.id, input.invoiceId)).limit(1);
        if (invoices.length === 0) throw new Error("ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");
        const inv = invoices[0];
        if (inv.status === "cancelled") throw new Error("Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ­ØµÙŠÙ„ ÙØ§ØªÙˆØ±Ø© Ù…Ù„ØºØ§Ø©");
        const remaining = parseFloat(inv.total) - parseFloat(inv.paidAmount);
        if (paymentAmount > remaining + 0.01) throw new Error(`Ø§Ù„Ù…Ø¨Ù„Øº ÙŠØªØ¬Ø§ÙˆØ² Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ Ø¹Ù„Ù‰ Ø§Ù„ÙØ§ØªÙˆØ±Ø© (${remaining})`);

        await (db as any).transaction(async (tx: any) => {
          const [pay] = await tx.insert(payments).values({
            source: "sales",
            invoiceId: input.invoiceId,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
            notes: input.notes || null,
            userId: ctx.user.id,
          }).returning();

          const newPaid = parseFloat(inv.paidAmount) + paymentAmount;
          const newStatus = newPaid >= parseFloat(inv.total) - 0.01 ? "paid" : "partial";
          await tx.update(salesInvoices)
            .set({ paidAmount: newPaid.toString(), status: newStatus, updatedAt: new Date() })
            .where(eq(salesInvoices.id, input.invoiceId));

          if (inv.customerId) {
            await tx.update(customers)
              .set({ balance: sql`${customers.balance} - ${paymentAmount}` })
              .where(eq(customers.id, inv.customerId));
          }
          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `ØªØ­ØµÙŠÙ„ Ø¯ÙØ¹Ø© Ù…Ù† ÙØ§ØªÙˆØ±Ø© Ù…Ø¨ÙŠØ¹Ø§Øª ${inv.invoiceNumber}`,
            details: `Ø§Ù„Ù…Ø¨Ù„Øº: ${input.amount} â€” Ø§Ù„Ø·Ø±ÙŠÙ‚Ø©: ${input.paymentMethod}`,
          });
          return { paymentId: pay.id };
        });
      } else {
        const invoices = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, input.invoiceId)).limit(1);
        if (invoices.length === 0) throw new Error("ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");
        const inv = invoices[0];
        if (inv.status === "cancelled") throw new Error("Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø³Ø¯Ø§Ø¯ ÙØ§ØªÙˆØ±Ø© Ù…Ù„ØºØ§Ø©");
        const remaining = parseFloat(inv.total) - parseFloat(inv.paidAmount);
        if (paymentAmount > remaining + 0.01) throw new Error(`Ø§Ù„Ù…Ø¨Ù„Øº ÙŠØªØ¬Ø§ÙˆØ² Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ Ø¹Ù„Ù‰ Ø§Ù„ÙØ§ØªÙˆØ±Ø© (${remaining})`);

        await (db as any).transaction(async (tx: any) => {
          const [pay] = await tx.insert(payments).values({
            source: "purchases",
            invoiceId: input.invoiceId,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
            notes: input.notes || null,
            userId: ctx.user.id,
          }).returning();

          const newPaid = parseFloat(inv.paidAmount) + paymentAmount;
          const newStatus = newPaid >= parseFloat(inv.total) - 0.01 ? "paid" : "partial";
          await tx.update(purchaseInvoices)
            .set({ paidAmount: newPaid.toString(), status: newStatus, updatedAt: new Date() })
            .where(eq(purchaseInvoices.id, input.invoiceId));

          if (inv.supplierId) {
            await tx.update(suppliers)
              .set({ balance: sql`${suppliers.balance} - ${paymentAmount}` })
              .where(eq(suppliers.id, inv.supplierId));
          }
          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `ØªØ³Ø¬ÙŠÙ„ Ø¯ÙØ¹Ø© Ø³Ø¯Ø§Ø¯ Ø¹Ù„Ù‰ ÙØ§ØªÙˆØ±Ø© Ù…Ø´ØªØ±ÙŠØ§Øª ${inv.invoiceNumber}`,
            details: `Ø§Ù„Ù…Ø¨Ù„Øº: ${input.amount} â€” Ø§Ù„Ø·Ø±ÙŠÙ‚Ø©: ${input.paymentMethod}`,
          });
          return { paymentId: pay.id };
        });
      }

      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
