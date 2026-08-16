import { ENV } from "./_core/env";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
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
      { code: "1010", name: "الصندوق الرئيسي (الخزينة)", type: "asset" as const, category: "الأصول المتداولة", description: "صندوق النقدية الرئيسي للمؤسسة" },
      { code: "1020", name: "البنك التجاري / الإسلامي", type: "asset" as const, category: "الأصول المتداولة", description: "الحساب البنكي الجاري لمؤسسة الحسينية" },
      { code: "1030", name: "حساب العُملاء والمدينون", type: "asset" as const, category: "الأصول المتداولة", description: "مستحقات المؤسسة لدى العملاء مقابل الخدمات" },
      { code: "2010", name: "الدائنون والموردون", type: "liability" as const, category: "الخصوم المتداولة", description: "التزامات المؤسسة تجاه مزودي الخدمة والموردين" },
      { code: "3010", name: "رأس المال", type: "equity" as const, category: "حقوق الملكية", description: "رأس مال مؤسسة الحسينية لخدمات الأعمال" },
      { code: "4010", name: "إيرادات خدمات الأعمال والمعاملات", type: "revenue" as const, category: "الإيرادات التشغيلية", description: "إيرادات تخليص المعاملات والاستشارات الإدارية والمالية" },
      { code: "4020", name: "إيرادات متنوعة", type: "revenue" as const, category: "إيرادات أخرى", description: "إيرادات تشغيلية أخرى" },
      { code: "5010", name: "مصروفات الرواتب والأجور", type: "expense" as const, category: "المصروفات التشغيلية", description: "رواتب ومستحقات موظفي المؤسسة" },
      { code: "5020", name: "مصروفات الإيجار والخدمات (كهرباء، ماء، إنترنت)", type: "expense" as const, category: "المصروفات التشغيلية", description: "إيجار المقر وفواتير الخدمات الأساسية" },
      { code: "5030", name: "مصروفات حكومية ورسوم تخليص", type: "expense" as const, category: "المصروفات التشغيلية", description: "الرسوم الحكومية المتعلقة بالمعاملات" },
      { code: "5040", name: "مصروفات متنوعة وعمومية", type: "expense" as const, category: "المصروفات الإدارية", description: "ضيافة، أدوات مكتبية، ومصروفات نثرية" },
      { code: "5050", name: "تكلفة البضاعة المشتراة (المشتريات التجارية)", type: "expense" as const, category: "تكلفة المبيعات", description: "تكلفة شراء البضائع والمخزون المباع" }
    ];
    for (const acc of defaultAccounts) {
      await db.insert(accounts).values(acc).onConflictDoUpdate({ target: accounts.code, set: { name: acc.name, type: acc.type, category: acc.category, description: acc.description } });
    }
    const existingSettings = await db.select().from(settings).limit(1);
    if (existingSettings.length === 0) {
      await db.insert(settings).values({
        institutionName: "مؤسسة الحسينية لخدمات الأعمال",
        currency: "ريال يمني (YER)",
        accountingPeriod: "السنة المالية 2026",
        managerName: "إدارة المؤسسة",
        notes: "النظام المحاسبي المعتمد لمؤسسة الحسينية لخدمات الأعمال - مرن ودقيق."
      });
    }
    _seeded = true;
  } catch {
    // Seed will retry next time
  }
}

// ─── Auto-Posting: Double-Entry GL entries for invoices ──────────
// Creates balanced journal entries for sales/purchase invoices.
// Cash leg → 1010, Receivables → 1030, Payables → 2010,
// Sales revenue → 4010, Purchases cost → 5050.
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
    if (!revenueAcc) return; // chart not seeded yet — skip auto-posting
    if (paid > 0) {
      const cashAcc = await findAccount("1010");
      if (cashAcc) await entry(cashAcc.id, "debit", paid, `تحصيل نقدي — فاتورة مبيعات ${opts.invoiceNumber}`);
    }
    if (unpaid > 0) {
      const receivablesAcc = await findAccount("1030");
      if (receivablesAcc) await entry(receivablesAcc.id, "debit", unpaid, `ذمم عملاء — فاتورة مبيعات ${opts.invoiceNumber}`);
    }
    await entry(revenueAcc.id, "credit", opts.total, `إيراد مبيعات — فاتورة ${opts.invoiceNumber}`);
  } else {
    const costAcc = await findAccount("5050");
    if (!costAcc) return;
    await entry(costAcc.id, "debit", opts.total, `تكلفة مشتريات — فاتورة ${opts.invoiceNumber}`);
    if (paid > 0) {
      const cashAcc = await findAccount("1010");
      if (cashAcc) await entry(cashAcc.id, "credit", paid, `دفع نقدي — فاتورة مشتريات ${opts.invoiceNumber}`);
    }
    if (unpaid > 0) {
      const payablesAcc = await findAccount("2010");
      if (payablesAcc) await entry(payablesAcc.id, "credit", unpaid, `ذمم موردين — فاتورة مشتريات ${opts.invoiceNumber}`);
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
        action: "تحديث الملف الشخصي",
        details: `تم تحديث تفضيلات العرض والملف الشخصي بواسطة ${input.name}`,
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
      if (!db) return { institutionName: "مؤسسة الحسينية لخدمات الأعمال", currency: "ريال يمني (YER)", accountingPeriod: "السنة المالية 2026", managerName: "إدارة المؤسسة", subscriptionStatus: "active" };
      const res = await db.select().from(settings).limit(1);
      return res[0] || { institutionName: "مؤسسة الحسينية لخدمات الأعمال", currency: "ريال يمني (YER)", accountingPeriod: "السنة المالية 2026", managerName: "إدارة المؤسسة", subscriptionStatus: "active" };
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
        action: `تعديل أو إعادة ترتيب الحساب: ${input.name} (${input.code})`,
        details: `تم تحديث الحساب وتعديل التبعية الشجرية بنجاح`,
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
        throw new Error("لا يمكن جعل الحساب تابعاً لنفسه");
      }

      await db.update(accounts).set({
        parentAccountId: input.newParentAccountId,
      }).where(eq(accounts.id, input.accountId));

      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: `إعادة ترتيب الدليل (سحب وإفلات)`,
        details: `تم نقل الحساب رقم ${input.accountId} ليكون تحت الحساب الرئيسي رقم ${input.newParentAccountId || 'جذر رئيسي'}`,
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
      }, "المبلغ يجب أن يكون رقماً موجباً وأقل من مليار"),
      type: z.enum(["debit", "credit"]),
      transactionDate: z.string().refine(v => !isNaN(Date.parse(v)), "تاريخ غير صحيح"),
      narration: z.string().max(500).optional(),
      notes: z.string().optional(),
      lifecycleStatus: z.enum(["saved", "approved", "sent"]).default("saved"),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify account exists
      const account = await db.select().from(accounts).where(eq(accounts.id, input.accountId)).limit(1);
      if (account.length === 0) throw new Error("الحساب غير موجود");

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
      if (existing.length === 0) throw new Error("الحركة غير موجودة");
      
      // Prevent editing if already posted (ترحيل)
      if (existing[0]?.lifecycleStatus === 'posted' && input.lifecycleStatus !== 'posted') {
        throw new Error("لا يمكن تعديل أو إلغاء حركة مرحلة نهائياً. التعديل يتم عبر حركة عكسية مستقلة.");
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
        action: `تحديث حالة الحركة #${input.id} إلى: ${input.lifecycleStatus}`,
        details: input.reversalReason ? `سبب العكس: ${input.reversalReason}` : 'تغيير حالة دورة الحركة المالية',
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
      if (existing.length === 0) throw new Error("الحركة غير موجودة");
      if (existing[0]?.lifecycleStatus !== 'saved') {
        throw new Error("لا يمكن تعديل الحركة لأنها معتمدة أو مرسلة ومؤمنة تماماً");
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
      if (existing.length === 0) throw new Error("الحركة غير موجودة");
      if (existing[0].lifecycleStatus !== "saved") {
        throw new Error("لا يمكن حذف حركة معتمدة أو مرسلة — استخدم الإلغاء العكسي");
      }
      await db.delete(transactions).where(eq(transactions.id, input.id));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `حذف حركة مالية #${input.id}`,
        details: `الحساب: ${existing[0].accountId} — المبلغ: ${existing[0].amount}`,
      });
      return { success: true };
    }),

    // Smart Suggestions Engine: recommends accounts & standard amounts based on history & operation type
    getSmartSuggestions: publicProcedure.input(z.object({
      query: z.string().optional(),
      operationType: z.string().optional(), // e.g. "إيراد", "مصروف", "سداد", "عميل"
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
        if (typeKeyword.includes("إيراد") || typeKeyword.includes("تحصيل")) {
          matchedAccounts = allAccounts.filter(a => a.type === 'revenue' || a.type === 'asset');
        } else if (typeKeyword.includes("مصروف") || typeKeyword.includes("دفع") || typeKeyword.includes("سداد")) {
          matchedAccounts = allAccounts.filter(a => a.type === 'expense' || a.type === 'liability');
        }
      }

      const recentNarrations = Array.from(new Set(recentTx.map(t => t.narration).filter(Boolean)));

      // Generate deep professional insights for Al-Husainia Business Services
      const insights = [
        "تحليل العمليات: يوصى بمراجعة حسابات العملاء بانتظام لضمان تحصيل الإيرادات في مواقيتها بمؤسسة الحسينية.",
        "الرقابة المالية: العمليات ذات التواريخ السابقة تتطلب تدوين ملاحظات مبررة في عمود الملاحظات.",
        "الكفاءة التشغيلية: تسجيل العمليات الدورية (مثل الإيجار والرواتب) يساعد في استقرار التدفقات النقدية."
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
      const period = input.periodName || "السنة المالية 2026";
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
        action: `تحديث الأرصدة الافتتاحية للفترة: ${input.periodName}`,
        details: `تم حفظ الأرصدة الافتتاحية لعدد ${input.balances.length} حساب`,
      });

      return { success: true };
    }),

    // Chartered Auditor & Financial Analyst Review
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
        warnings.push("تحذير محاسبي: إجمالي الأطراف المدين والدائن في الحركات المعتمدة غير متطابق تماماً.");
        score -= 20;
      } else {
        recommendations.push("توازن القيود المحاسبية سليم ومعتمد وفق المعايير المزدوجة.");
      }

      if (assetTotal < liabilityTotal) {
        warnings.push("تنبيه المراجع القانوني: إجمالي الخصوم يتجاوز إجمالي الأصول، مما يشير لمخاطر رأس مال عامل.");
        score -= 15;
      } else {
        recommendations.push("نسبة الأصول إلى الخصوم ضمن الحدود الآمنة لتغطية الالتزامات.");
      }

      recommendations.push("يوصى بإجراء مطابقة شهرية للخزينة والبنك لضمان عدم وجود فروقات نقدية.");
      recommendations.push("تم اعتماد سجل التدقيق بنجاح وتأمين الحركات ضد أي تعديل غير مبرر.");

      return {
        status: warnings.length > 0 ? "تتطلب مراجعة" : "مستوفية ومعيارية",
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
      const prompt = `أنت محاسب قانوني ومراجع مالي خبير. قم بتحليل النص أو المستند المرفق بدقة متناهية واستخرج الحركات المالية أو الأرصدة الافتتاحية بدقة عالية. 
الحسابات المتاحة في النظام حالياً هي:
${allAccounts.map((a: any) => `- كود ${a.code}: ${a.name} (نوع ${a.type})`).join('\n')}

المحتوى المدخل أو المستخرج:
${input.rawText || input.fileUrl || "لا يوجد نص"}

قم بإرجاع النتيجة بصيغة JSON حصراً تتضمن مصفوفة items تحتوي على:
- accountCode (كود الحساب المطابق بدقة)
- amount (القيمة الرقمية)
- type (debit أو credit)
- narration (وصف الحركة أو بيانها)`;

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
          return { success: false, message: "تعذر استخراج بنود مالية من المستند", items: [] };
        }
        return { success: true, items };
      } catch (e) {
        // Never invent financial data — surface the failure for manual review
        console.warn("[smartParse] Parsing failed:", e);
        return {
          success: false,
          message: "تعذر تحليل المستند — يرجى إدخال البيانات يدوياً",
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
          name: "مؤسسة الحسينية لخدمات الأعمال",
          code: "ALH-HQ",
          ownerUserId: ctx.user.id,
          currency: "YER",
          country: "اليمن",
          subscriptionPlan: "standard",
        });
        const createdT = await db.select().from(tenants).limit(1);
        if (createdT.length > 0) {
          await db.insert(branches).values({
            tenantId: createdT[0].id,
            name: "الفرع الرئيسي",
            code: "HQ-01",
            city: "صنعاء",
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
        action: `إضافة فرع جديد: ${input.name} (${input.code})`,
        details: `تم إنشاء الفرع تحت المؤسسة رقم ${input.tenantId}`,
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
        action: `تحديث صلاحيات المستخدم رقم ${input.userId} للفرع ${input.branchId}`,
        details: `عرض: ${input.canView}, إدخال: ${input.canInsert}, اعتماد: ${input.canApprove}, ترحيل: ${input.canPost}`,
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
          city: b.city || "غير محدد",
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
      if (!db) return { analysis: "قاعدة البيانات غير متوفرة حالياً", status: "خطأ", timestamp: new Date().toISOString() };

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

      // ── Local statistical analysis (LLM-free, always available) ──
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
        if (!byAccount[key]) byAccount[key] = { name: tx.accountName || "حساب غير محدد", code: "", revenue: 0, expense: 0 };
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

      let budgetLine = "لا توجد خطط ميزانية مضافة بعد — أضف خطة من تبويب التحليلات لمراقبة الأداء مقابل الأهداف.";
      if (allBudgets.length > 0) {
        const latest = allBudgets[0];
        const revTarget = parseFloat(String(latest.targetRevenue || "0"));
        const expTarget = parseFloat(String(latest.targetExpense || "0"));
        const revPct = revTarget > 0 ? Math.round((totalRevenue / revTarget) * 100) : 0;
        const expPct = expTarget > 0 ? Math.round((totalExpense / expTarget) * 100) : 0;
        budgetLine = `خطة «${latest.periodName}»: تحقق الإيرادات ${revPct}% من المستهدف، والمصروفات ${expPct}% من السقف المخصص.`;
      }

      const fmt = (n: number) => n.toLocaleString("en-US");
      const topRevenueLine = topRevenue.length
        ? topRevenue.map((a) => `• ${a.code} ${a.name}: ${fmt(a.revenue)}`).join("\n")
        : "لا توجد إيرادات معتمدة مسجلة بعد.";
      const topExpenseLine = topExpense.length
        ? topExpense.map((a) => `• ${a.code} ${a.name}: ${fmt(a.expense)}`).join("\n")
        : "لا توجد مصروفات معتمدة مسجلة بعد.";

      const recommendations: string[] = [];
      if (totalRevenue === 0 && totalExpense === 0) {
        recommendations.push(
          "ابدأ بتسجيل أول حركة مالية معتمدة (إيرادات أو مصروفات) عبر أداة الإدخال السريع — التحليل الكامل يبدأ تلقائياً عند توفر البيانات."
        );
      } else {
        if (cashBalance < totalExpense * 0.15 && totalExpense > 0) {
          recommendations.push(
            `السيولة النقدية (${fmt(cashBalance)}) أقل من 15% من إجمالي المصروفات — عجّل تحصيل الذمم وحدّ من السحوبات غير المخطط لها لتغطية الالتزامات القادمة.`
          );
        } else if (totalExpense > 0) {
          recommendations.push(
            `السيولة النقدية الحالية (${fmt(cashBalance)}) تغطي التزامات التشغيل — حافظ على هامش احتياطي لا يقل عن شهر مصروفات.`
          );
        }
        if (expenseRatio > 70) {
          recommendations.push(
            `نسبة المصروفات إلى الإيرادات ${expenseRatio.toFixed(0)}% تتجاوز الحد الصحي (70%) — راجع بنود المصروفات الكبرى التالية لإعادة التفاوض أو الترشيد: ${topExpense.map((a) => a.name).join("، ")}.`
          );
        } else if (margin > 15) {
          recommendations.push(
            `هامش الربح التشغيلي ${margin.toFixed(1)}% قوي — وجّه الفائض نحو حساب نقدي/استثماري منفصل أو تخفيض تكلفة التمويل إذا وُجد قرض.`
          );
        } else {
          recommendations.push(
            `هامش الربح ${margin.toFixed(1)}% مقبول — ركّز على نمو الإيرادات عبر أكبر 3 مصادر حالياً ثم على تثبيت تكلفة التشغيل عند مستواها الحالي.`
          );
        }
        if (topExpense.length > 0) {
          recommendations.push(
            `تابع شهرياً البنود الثلاثة الأكبر (${topExpense.map((a) => a.name).join("، ")}) — خفض 5% منها يوفّر ${fmt(totalExpense * 0.05)} سنوياً تقريباً.`
          );
        }
      }

      const analysisText = [
        "━━─ التقييم التنفيذي ─━━",
        totalRevenue === 0 && totalExpense === 0
          ? "المنصة جاهزة والأداء المالي بانتظار أول حركة معتمدة."
          : `إجمالي الإيرادات المعتمدة: ${fmt(totalRevenue)}\nإجمالي المصروفات المعتمدة: ${fmt(totalExpense)}\nصافي الدخل التشغيلي: ${fmt(netIncome)} (هامش ${margin.toFixed(1)}%)\nنسبة المصروفات إلى الإيرادات: ${expenseRatio.toFixed(0)}%`,
        "",
        "━━─ مصادر التدفق الرئيسية ─━━",
        topRevenueLine,
        "",
        "━━─ أكبر بنود المصروفات ─━━",
        topExpenseLine,
        "",
        "━━─ السيولة والكفاءة ─━━",
        `الرصيد النقدي (الصندوق + البنوك): ${fmt(cashBalance)}`,
        budgetLine,
        "",
        "━━─ التوصيات الذكية (3) ─━━",
        recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n"),
      ].join("\n");

      // ── LLM enhancement (only when Forge/OpenAI key is configured) ──
      if (ENV.forgeApiKey) {
        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "user",
                content: `أنت مساعد مالي خبير لنظام ALHUSAINIA المحاسبي. إليك بيانات مالية محسوبة بدقة تشغيلية، فقدم تحليلاً أعمق مبنياً عليها حصراً (بالعربية، أسلوب مهني):
${analysisText}
ملاحظة: لا تختلق أرقاماً؛ اعتمد على ما ورد فقط.`,
              },
            ],
          });
          const content = response.choices[0]?.message?.content;
          if (typeof content === "string" && content.trim().length > 20) {
            return { analysis: content, status: "تحليل بالذكاء الاصطناعي (Forge LLM)", timestamp: new Date().toISOString() };
          }
        } catch {
          // fall through to the local statistical analysis
        }
      }

      return {
        analysis: analysisText,
        status: ENV.forgeApiKey ? "تحليل إحصائي محلي (تعذر الاتصال بـ LLM)" : "تحليل إحصائي محلي معتمد",
        timestamp: new Date().toISOString(),
      };
    }),
  }),

  // ─── Offline-First Sync Router ──────────────────────────────────
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
            action: `مزامنة (${mutation.operation}) - ${mutation.table}`,
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
          // count unavailable — treat as 0
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

  // ─── Products & Inventory ──────────────────────────────────────
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
      unit: z.string().default("قطعة"),
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
        action: `إضافة منتج جديد: ${input.name} (${input.code})`,
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
      quantity: z.number().int().min(1, "الكمية يجب أن تكون على الأقل 1"),
      type: z.enum(["in", "out", "adjustment"]),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const product = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
      if (product.length === 0) throw new Error("المنتج غير موجود");

      const currentStock = product[0].currentStock || 0;
      let newStock = currentStock;
      if (input.type === "in") {
        newStock = currentStock + input.quantity;
      } else if (input.type === "out") {
        if (currentStock < input.quantity) {
          throw new Error(`المخزون غير كافٍ — المتوفر: ${currentStock}, المطلوب: ${input.quantity}`);
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
        action: `تعديل مخزون: ${product[0].name} (${input.type === "in" ? "إدخال" : input.type === "out" ? "إخراج" : "تسوية"}: ${input.quantity})`,
        details: `المخزون السابق: ${currentStock} — الجديد: ${newStock}`,
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
  }),

  // ─── Customers ──────────────────────────────────────────────────
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
        action: `إضافة عميل جديد: ${input.name} (${input.code})`,
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

  // ─── Suppliers ──────────────────────────────────────────────────
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
        action: `إضافة مورد جديد: ${input.name} (${input.code})`,
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

  // ─── Sales & POS ────────────────────────────────────────────────
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
        unitPrice: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "السعر يجب أن يكون رقماً موجباً"),
        discount: z.string().default("0"),
      })).min(1, "يجب إضافة صنف واحد على الأقل"),
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
      if (isNaN(discount) || discount < 0) throw new Error("الخصم غير صحيح");
      if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) throw new Error("نسبة الضريبة غير صحيحة");

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
        if (!prod) throw new Error(`المنتج رقم ${item.productId} غير موجود`);
        if (prod.currentStock < item.quantity) {
          throw new Error(`المخزون غير كافٍ للمنتج "${prod.name}" — المتوفر: ${prod.currentStock}, المطلوب: ${item.quantity}`);
        }
      }

      // Calculate totals
      const subtotal = input.items.reduce((sum, item) => sum + parseFloat(item.unitPrice) * item.quantity, 0);
      const taxAmount = (subtotal - discount) * taxRate / 100;
      const total = subtotal - discount + taxAmount;
      const paidAmount = parseFloat(input.paidAmount);
      if (isNaN(paidAmount) || paidAmount < 0) throw new Error("المبلغ المدفوع غير صحيح");
      if (paidAmount > total + 0.01) throw new Error("المبلغ المدفوع يتجاوز إجمالي الفاتورة");
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
            notes: `فاتورة ${invoiceNumber}`,
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
          action: `إنشاء فاتورة مبيعات: ${invoiceNumber}`,
          details: `الإجمالي: ${total} — طريقة الدفع: ${input.paymentMethod}`,
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
      if (existing.length === 0) throw new Error("الفاتورة غير موجودة");
      const inv = existing[0];
      if (inv.status === "cancelled" && input.status !== "cancelled") {
        throw new Error("الفاتورة ملغاة ولا يمكن إعادة تفعيلها");
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
              notes: `إلغاء فاتورة ${inv.invoiceNumber}`,
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
            await tx.update(payments).set({ notes: `مستردة — إلغاء فاتورة ${inv.invoiceNumber}` }).where(eq(payments.id, p.id));
          }
          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `إلغاء فاتورة مبيعات: ${inv.invoiceNumber}`,
            details: `تم عكس المخزون والأرصدة المرتبطة بالفاتورة`,
          });
        });
      }

      await db.update(salesInvoices).set({ status: input.status, updatedAt: new Date() }).where(eq(salesInvoices.id, inv.id));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `تحديث حالة فاتورة المبيعات ${inv.invoiceNumber} إلى "${input.status}"`,
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

  // ─── Purchases ──────────────────────────────────────────────────
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
        unitPrice: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "السعر يجب أن يكون رقماً موجباً"),
        discount: z.string().default("0"),
      })).min(1, "يجب إضافة صنف واحد على الأقل"),
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
      if (isNaN(discount) || discount < 0) throw new Error("الخصم غير صحيح");
      if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) throw new Error("نسبة الضريبة غير صحيحة");

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
        if (!productMap.has(item.productId)) throw new Error(`المنتج رقم ${item.productId} غير موجود`);
      }

      const subtotal = input.items.reduce((sum, item) => sum + parseFloat(item.unitPrice) * item.quantity, 0);
      const taxAmount = (subtotal - discount) * taxRate / 100;
      const total = subtotal - discount + taxAmount;
      const paidAmount = parseFloat(input.paidAmount);
      if (isNaN(paidAmount) || paidAmount < 0) throw new Error("المبلغ المدفوع غير صحيح");
      if (paidAmount > total + 0.01) throw new Error("المبلغ المدفوع يتجاوز إجمالي الفاتورة");
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
            notes: `فاتورة شراء ${invoiceNumber}`,
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
          action: `إنشاء فاتورة مشتريات: ${invoiceNumber}`,
          details: `الإجمالي: ${total} — طريقة الدفع: ${input.paymentMethod}`,
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
      if (existing.length === 0) throw new Error("الفاتورة غير موجودة");
      const inv = existing[0];
      if (inv.status === "cancelled" && input.status !== "cancelled") {
        throw new Error("الفاتورة ملغاة ولا يمكن إعادة تفعيلها");
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
              notes: `إلغاء فاتورة شراء ${inv.invoiceNumber}`,
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
            action: `إلغاء فاتورة مشتريات: ${inv.invoiceNumber}`,
            details: `تم عكس المخزون والأرصدة المرتبطة بالفاتورة`,
          });
        });
      }

      await db.update(purchaseInvoices).set({ status: input.status, updatedAt: new Date() }).where(eq(purchaseInvoices.id, inv.id));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `تحديث حالة فاتورة المشتريات ${inv.invoiceNumber} إلى "${input.status}"`,
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

  // ─── Orders & Distribution ──────────────────────────────────────
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
        unitPrice: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "السعر يجب أن يكون رقماً موجباً"),
      })).min(1, "يجب إضافة صنف واحد على الأقل"),
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
      if (productRows.length !== productIds.length) throw new Error("واحد أو أكثر من المنتجات غير موجودة");

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
          action: `إنشاء طلب توزيع: ${orderNumber}`,
          details: `الإجمالي: ${total}`,
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
      if (existing.length === 0) throw new Error("الطلب غير موجود");
      const currentStatus = existing[0].status;
      if (currentStatus === "delivered") {
        throw new Error("لا يمكن تغيير حالة طلب مُسلّم أو مُلغى");
      }
      if (currentStatus === "cancelled" && input.status !== "cancelled") {
        throw new Error("الطلب مُلغى ولا يمكن إعادة تفعيله");
      }

      await db.update(orders).set({ status: input.status, updatedAt: new Date() }).where(eq(orders.id, input.id));
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: `تحديث حالة الطلب #${input.id} من "${currentStatus}" إلى "${input.status}"`,
      });
      return { success: true };
    }),

    getItems: publicProcedure.input(z.object({
      orderId: z.number(),
    })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(orderItems).where(eq(orderItems.orderId, input.orderId));
    }),
  }),

  // ─── Commercial Dashboard Stats ────────────────────────────────
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

  // ─── Payments (Installments & Settlements) ─────────────────────
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
      }, "المبلغ يجب أن يكون رقماً موجباً"),
      paymentMethod: z.enum(["cash", "card", "transfer", "credit", "online"]).default("cash"),
      paymentDate: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const paymentAmount = parseFloat(input.amount);

      if (input.source === "sales") {
        const invoices = await db.select().from(salesInvoices).where(eq(salesInvoices.id, input.invoiceId)).limit(1);
        if (invoices.length === 0) throw new Error("فاتورة المبيعات غير موجودة");
        const inv = invoices[0];
        if (inv.status === "cancelled") throw new Error("لا يمكن تحصيل فاتورة ملغاة");
        const remaining = parseFloat(inv.total) - parseFloat(inv.paidAmount);
        if (paymentAmount > remaining + 0.01) throw new Error(`المبلغ يتجاوز المتبقي على الفاتورة (${remaining})`);

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
            action: `تحصيل دفعة من فاتورة مبيعات ${inv.invoiceNumber}`,
            details: `المبلغ: ${input.amount} — الطريقة: ${input.paymentMethod}`,
          });
          return { paymentId: pay.id };
        });
      } else {
        const invoices = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, input.invoiceId)).limit(1);
        if (invoices.length === 0) throw new Error("فاتورة المشتريات غير موجودة");
        const inv = invoices[0];
        if (inv.status === "cancelled") throw new Error("لا يمكن سداد فاتورة ملغاة");
        const remaining = parseFloat(inv.total) - parseFloat(inv.paidAmount);
        if (paymentAmount > remaining + 0.01) throw new Error(`المبلغ يتجاوز المتبقي على الفاتورة (${remaining})`);

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
            action: `تسجيل دفعة سداد على فاتورة مشتريات ${inv.invoiceNumber}`,
            details: `المبلغ: ${input.amount} — الطريقة: ${input.paymentMethod}`,
          });
          return { paymentId: pay.id };
        });
      }

      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
