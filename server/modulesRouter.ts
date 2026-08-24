import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, tenantProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  currencies,
  offers,
  salesReps,
  branches,
  userBranchPermissions,
  units,
  categories,
  productUnits,
  customFieldDefs,
  customFieldValues,
  documents,
  posSessions,
  users,
  roles,
  permissions,
  messages,
  activityLogs,
  salesInvoices,
  salesInvoiceItems,
  purchaseInvoices,
  products,
  accounts,
  transactions,
} from "../drizzle/schema";

export const modulesRouter = router({
  // ─── Notifications ──────────────────────────────────────────────
  notifications: router({
    unreadCount: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId || !ctx.user) return 0;
      return 0;
    }),
    list: tenantProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
          })
          .optional()
      )
      .query(async () => {
        return [];
      }),
    markRead: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async () => {
        return { success: true };
      }),
    markAllRead: tenantProcedure.mutation(async () => {
      return { success: true };
    }),
  }),

  // ─── Accounts ────────────────────────────────────────────────────
  accounts: router({
    list: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      return db.select().from(accounts).where(eq(accounts.tenantId, ctx.tenantId));
    }),
  }),

  // ─── Journal ─────────────────────────────────────────────────────
  journal: router({
    list: tenantProcedure
      .input(
        z
          .object({
            sourceModule: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ ctx }) => {
        if (!ctx.tenantId) return { items: [], total: 0 };
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const rows = await db
          .select()
          .from(transactions)
          .where(eq(transactions.tenantId, ctx.tenantId))
          .orderBy(desc(transactions.createdAt))
          .limit(50);
        return { items: rows, total: rows.length };
      }),
    entries: tenantProcedure
      .input(
        z
          .object({
            journalEntryId: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(transactions)
          .where(eq(transactions.tenantId, ctx.tenantId))
          .limit(50);
      }),
  }),

  // ─── Messages ───────────────────────────────────────────────────
  messages: router({
    unreadCount: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId || !ctx.user) return 0;
      const db = await getDb();
      if (!db) return 0;
      const [res] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(
          and(
            eq(messages.tenantId, ctx.tenantId),
            eq(messages.toUserId, String(ctx.user.id)),
            eq(messages.isRead, false)
          )
        );
      return res?.count ?? 0;
    }),
    listInbox: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId || !ctx.user) return [];
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.tenantId, ctx.tenantId),
            eq(messages.toUserId, String(ctx.user.id))
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(100);
    }),
    listWith: tenantProcedure
      .input(z.object({ userId: z.union([z.number(), z.string()]) }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId || !ctx.user) return [];
        const db = await getDb();
        if (!db) return [];
        const otherId = String(input.userId);
        const myId = String(ctx.user.id);
        return db
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.tenantId, ctx.tenantId),
              sql`(${messages.fromUserId} = ${myId} AND ${messages.toUserId} = ${otherId}) OR (${messages.fromUserId} = ${otherId} AND ${messages.toUserId} = ${myId})`
            )
          )
          .orderBy(desc(messages.createdAt))
          .limit(100);
      }),
    markRead: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) return { success: false };
        await db
          .update(messages)
          .set({ isRead: true })
          .where(
            and(eq(messages.id, input.id), eq(messages.tenantId, ctx.tenantId))
          );
        return { success: true };
      }),
    send: tenantProcedure
      .input(
        z.object({
          toUserId: z.union([z.number(), z.string()]),
          message: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId || !ctx.user) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "غير متاح" });
        }
        const [row] = await db
          .insert(messages)
          .values({
            tenantId: ctx.tenantId,
            fromUserId: String(ctx.user.id),
            fromName: ctx.user.name || "مستخدم",
            toUserId: String(input.toUserId),
            body: input.message,
            isRead: false,
          })
          .returning();
        return { success: true, id: row.id };
      }),
  }),

  // ─── RBAC ────────────────────────────────────────────────────────
  rbac: router({
    listUsers: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      return db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          username: users.username,
        })
        .from(users)
        .where(eq(users.tenantId, ctx.tenantId));
    }),
    listRoles: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      return db.select().from(roles).where(eq(roles.tenantId, ctx.tenantId));
    }),
    listPermissions: tenantProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(permissions);
    }),
    createRole: tenantProcedure
      .input(
        z.object({
          name: z.string().min(1),
          code: z.string().min(1),
          permissions: z.any().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        const [row] = await db
          .insert(roles)
          .values({
            tenantId: ctx.tenantId,
            name: input.name,
            code: input.code,
            permissions: input.permissions ?? [],
          })
          .returning();
        return row;
      }),
    assignRole: tenantProcedure
      .input(
        z.object({
          userId: z.number(),
          roleId: z.number().optional(),
          role: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        const roleValue = input.role || "user";
        await db
          .update(users)
          .set({ role: roleValue as any })
          .where(and(eq(users.id, input.userId), eq(users.tenantId, ctx.tenantId)));
        return { success: true };
      }),
  }),

  // ─── Custom Fields ───────────────────────────────────────────────
  customFields: router({
    listDefs: tenantProcedure
      .input(z.object({ entityType: z.string().optional() }).optional())
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        const conditions = [eq(customFieldDefs.tenantId, ctx.tenantId)];
        if (input?.entityType) {
          conditions.push(eq(customFieldDefs.entityType, input.entityType));
        }
        return db.select().from(customFieldDefs).where(and(...conditions));
      }),
    getValues: tenantProcedure
      .input(
        z.object({
          entityType: z.string(),
          entityId: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return {};
        const db = await getDb();
        if (!db) return {};
        const rows = await db
          .select()
          .from(customFieldValues)
          .where(
            and(
              eq(customFieldValues.tenantId, ctx.tenantId),
              eq(customFieldValues.entityType, input.entityType),
              eq(customFieldValues.entityId, input.entityId)
            )
          );
        const map: Record<string, string | null> = {};
        for (const r of rows) {
          map[r.fieldKey] = r.value;
        }
        return map;
      }),
    createDef: tenantProcedure
      .input(
        z.object({
          entityType: z.string().min(1),
          key: z.string().min(1),
          label: z.string().min(1),
          type: z.string().default("text"),
          required: z.boolean().default(false),
          options: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        const [row] = await db
          .insert(customFieldDefs)
          .values({
            tenantId: ctx.tenantId,
            entityType: input.entityType,
            key: input.key,
            label: input.label,
            type: input.type,
            required: input.required,
            options: input.options ?? null,
          })
          .returning();
        return row;
      }),
    deleteDef: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        await db
          .delete(customFieldDefs)
          .where(
            and(
              eq(customFieldDefs.id, input.id),
              eq(customFieldDefs.tenantId, ctx.tenantId)
            )
          );
        return { success: true };
      }),
    saveValues: tenantProcedure
      .input(
        z.object({
          entityType: z.string(),
          entityId: z.number(),
          values: z.record(z.string(), z.any()),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        for (const [key, val] of Object.entries(input.values)) {
          const strVal = val === null || val === undefined ? null : String(val);
          const existing = await db
            .select()
            .from(customFieldValues)
            .where(
              and(
                eq(customFieldValues.tenantId, ctx.tenantId),
                eq(customFieldValues.entityType, input.entityType),
                eq(customFieldValues.entityId, input.entityId),
                eq(customFieldValues.fieldKey, key)
              )
            );
          if (existing.length > 0) {
            await db
              .update(customFieldValues)
              .set({ value: strVal, updatedAt: new Date() })
              .where(
                and(
                  eq(customFieldValues.tenantId, ctx.tenantId),
                  eq(customFieldValues.entityType, input.entityType),
                  eq(customFieldValues.entityId, input.entityId),
                  eq(customFieldValues.fieldKey, key)
                )
              );
          } else {
            await db.insert(customFieldValues).values({
              tenantId: ctx.tenantId,
              entityType: input.entityType,
              entityId: input.entityId,
              fieldKey: key,
              value: strVal,
            });
          }
        }
        return { success: true };
      }),
  }),

  // ─── Documents ───────────────────────────────────────────────────
  documents: router({
    listByEntity: tenantProcedure
      .input(
        z.object({
          entityType: z.string(),
          entityId: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.tenantId, ctx.tenantId),
              eq(documents.entityType, input.entityType),
              eq(documents.entityId, input.entityId)
            )
          );
      }),
    recent: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return { byType: [], items: [] };
      const db = await getDb();
      if (!db) return { byType: [], items: [] };
      const items = await db
        .select()
        .from(documents)
        .where(eq(documents.tenantId, ctx.tenantId))
        .orderBy(desc(documents.createdAt))
        .limit(20);

      const typeMap = new Map<string, number>();
      for (const item of items) {
        const t = item.entityType || "غير محدد";
        typeMap.set(t, (typeMap.get(t) || 0) + 1);
      }
      const byType = Array.from(typeMap.entries()).map(([entityType, count]) => ({
        entityType,
        count,
      }));

      return { byType, items };
    }),
    link: tenantProcedure
      .input(
        z.object({
          entityType: z.string(),
          entityId: z.number(),
          documentId: z.number().optional(),
          name: z.string().optional(),
          url: z.string().optional(),
          title: z.string().optional(),
          // Persisted into the existing `documents.type` / `documents.notes`
          // columns (UI collects both).
          docType: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        const title = input.title || input.name || "مستند";
        const [row] = await db
          .insert(documents)
          .values({
            tenantId: ctx.tenantId,
            title,
            entityType: input.entityType,
            entityId: input.entityId,
            fileUrl: input.url ?? null,
            type: input.docType ?? null,
            notes: input.notes ?? null,
          })
          .returning();
        return row;
      }),
    unlink: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        await db
          .delete(documents)
          .where(
            and(eq(documents.id, input.id), eq(documents.tenantId, ctx.tenantId))
          );
        return { success: true };
      }),
  }),

  // ─── Currencies ──────────────────────────────────────────────────
  currencies: router({
    list: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(currencies)
        .where(eq(currencies.tenantId, ctx.tenantId));
      if (rows.length === 0) {
        return [
          {
            id: 1,
            code: "YER",
            name: "ريال يمني",
            symbol: "ر.ي",
            rate: "1",
            isDefault: true,
            isActive: true,
          },
          {
            id: 2,
            code: "SAR",
            name: "ريال سعودي",
            symbol: "ر.س",
            rate: "140",
            isDefault: false,
            isActive: true,
          },
          {
            id: 3,
            code: "USD",
            name: "دولار أمريكي",
            symbol: "$",
            rate: "530",
            isDefault: false,
            isActive: true,
          },
        ];
      }
      return rows;
    }),
    create: tenantProcedure
      .input(
        z.object({
          code: z.string().min(1).max(10),
          name: z.string().min(1),
          symbol: z.string().min(1),
          rate: z.string().default("1"),
          isDefault: z.boolean().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        const [row] = await db
          .insert(currencies)
          .values({
            tenantId: ctx.tenantId,
            code: input.code.toUpperCase(),
            name: input.name,
            symbol: input.symbol,
            rate: input.rate,
            isDefault: input.isDefault,
          })
          .returning();
        return row;
      }),
    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          code: z.string().optional(),
          name: z.string().optional(),
          symbol: z.string().optional(),
          rate: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        const { id, ...data } = input;
        await db
          .update(currencies)
          .set({ ...data, updatedAt: new Date() })
          .where(
            and(eq(currencies.id, id), eq(currencies.tenantId, ctx.tenantId))
          );
        return { success: true };
      }),
    setDefault: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        await db
          .update(currencies)
          .set({ isDefault: false })
          .where(eq(currencies.tenantId, ctx.tenantId));
        await db
          .update(currencies)
          .set({ isDefault: true })
          .where(
            and(eq(currencies.id, input.id), eq(currencies.tenantId, ctx.tenantId))
          );
        return { success: true };
      }),
  }),

  // ─── Sales Reps ──────────────────────────────────────────────────
  salesReps: router({
    list: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(salesReps)
        .where(eq(salesReps.tenantId, ctx.tenantId));
    }),
    commissionReport: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      const reps = await db
        .select()
        .from(salesReps)
        .where(eq(salesReps.tenantId, ctx.tenantId));
      return reps.map(r => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        totalSales: 0,
        commissionEarned: 0,
        bonusEarned: 0,
      }));
    }),
    create: tenantProcedure
      .input(
        z.object({
          name: z.string().min(1),
          phone: z.string().optional(),
          commissionType: z.string().default("percent"),
          commissionValue: z.string().default("0"),
          bonusThreshold: z.string().optional(),
          bonusAmount: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        const [row] = await db
          .insert(salesReps)
          .values({
            tenantId: ctx.tenantId,
            name: input.name,
            phone: input.phone ?? null,
            commissionType: input.commissionType,
            commissionValue: input.commissionValue,
            bonusThreshold: input.bonusThreshold ?? null,
            bonusAmount: input.bonusAmount ?? null,
          })
          .returning();
        return row;
      }),
    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          phone: z.string().optional(),
          commissionType: z.string().optional(),
          commissionValue: z.string().optional(),
          bonusThreshold: z.string().optional(),
          bonusAmount: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        const { id, ...data } = input;
        await db
          .update(salesReps)
          .set({ ...data, updatedAt: new Date() })
          .where(and(eq(salesReps.id, id), eq(salesReps.tenantId, ctx.tenantId)));
        return { success: true };
      }),
    delete: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        await db
          .delete(salesReps)
          .where(and(eq(salesReps.id, input.id), eq(salesReps.tenantId, ctx.tenantId)));
        return { success: true };
      }),
  }),

  // ─── Master Data ─────────────────────────────────────────────────
  masterData: router({
    listUnits: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(units)
        .where(eq(units.tenantId, ctx.tenantId));
      if (rows.length === 0) {
        return [
          { id: 1, name: "قطعة", code: "PCS", symbol: "قطعة" },
          { id: 2, name: "كرتون", code: "BOX", symbol: "كرتون" },
          { id: 3, name: "كيلوغرام", code: "KG", symbol: "كجم" },
          { id: 4, name: "ساعة عمل", code: "HR", symbol: "ساعة" },
        ];
      }
      return rows;
    }),
    listCategories: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(categories)
        .where(eq(categories.tenantId, ctx.tenantId));
      if (rows.length === 0) {
        return [
          { id: 1, name: "قرطاسية ومستلزمات مكتبية", description: "أدوات ومواد مكتبية" },
          { id: 2, name: "خدمات هندسية ومعمارية", description: "استشارات وتصاميم" },
          { id: 3, name: "حلول تقنية وبرمجية", description: "تطوير وأنظمة" },
          { id: 4, name: "أجهزة ومعدات إلكترونية", description: "حواسيب وملحقاتها" },
        ];
      }
      return rows;
    }),
    createUnit: tenantProcedure
      .input(
        z.object({
          name: z.string().min(1),
          code: z.string().optional(),
          symbol: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        const code = input.code || `U-${Date.now().toString(36).toUpperCase()}`;
        const [row] = await db
          .insert(units)
          .values({
            tenantId: ctx.tenantId,
            name: input.name,
            code,
            symbol: input.symbol ?? input.name,
          })
          .returning();
        return row;
      }),
    createCategory: tenantProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        const code = `CAT-${Date.now().toString(36).toUpperCase()}`;
        const [row] = await db
          .insert(categories)
          .values({
            tenantId: ctx.tenantId,
            name: input.name,
            code,
            nameAr: input.name,
          })
          .returning();
        return row;
      }),
  }),

  // ─── Branches ────────────────────────────────────────────────────
  branches: router({
    list: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(branches)
        .where(eq(branches.tenantId, ctx.tenantId));
      if (rows.length === 0) {
        return [
          {
            id: 1,
            name: "الفرع الرئيسي - صنعاء",
            code: "MAIN",
            address: "صنعاء - شارع الزبيري",
            phone: "+967 777 000 000",
            isMain: true,
            isActive: true,
          },
        ];
      }
      return rows;
    }),
    listUserPermissions: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(userBranchPermissions)
        .where(eq(userBranchPermissions.tenantId, ctx.tenantId));
    }),
    create: tenantProcedure
      .input(
        z.object({
          name: z.string().min(1),
          code: z.string().optional(),
          address: z.string().optional(),
          phone: z.string().optional(),
          isMain: z.boolean().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        const code = input.code || `BR-${Date.now().toString(36).toUpperCase()}`;
        const [row] = await db
          .insert(branches)
          .values({
            tenantId: ctx.tenantId,
            name: input.name,
            code,
            city: input.address ?? "صنعاء",
            isMain: input.isMain,
          })
          .returning();
        return row;
      }),
    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          code: z.string().optional(),
          address: z.string().optional(),
          phone: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        const { id, address, phone, ...data } = input;
        const setObj: any = { ...data, updatedAt: new Date() };
        if (address) setObj.city = address;
        await db
          .update(branches)
          .set(setObj)
          .where(and(eq(branches.id, id), eq(branches.tenantId, ctx.tenantId)));
        return { success: true };
      }),
    assignUserPermission: tenantProcedure
      .input(
        z.object({
          userId: z.number(),
          branchId: z.number(),
          canAccess: z.boolean().default(true),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        await db
          .insert(userBranchPermissions)
          .values({
            tenantId: ctx.tenantId,
            userId: input.userId,
            branchId: input.branchId,
            canView: input.canAccess,
            canInsert: input.canAccess,
          });
        return { success: true };
      }),
  }),

  // ─── Offers ──────────────────────────────────────────────────────
  offers: router({
    list: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(offers)
        .where(eq(offers.tenantId, ctx.tenantId));
    }),
    applicable: tenantProcedure
      .input(
        z.object({
          productId: z.number(),
          qty: z.number().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return null;
        const db = await getDb();
        if (!db) return null;
        const rows = await db
          .select()
          .from(offers)
          .where(
            and(
              eq(offers.tenantId, ctx.tenantId),
              eq(offers.productId, input.productId),
              eq(offers.isActive, true)
            )
          )
          .limit(1);
        return rows[0] || null;
      }),
    create: tenantProcedure
      .input(
        z.object({
          name: z.string().min(1),
          kind: z.string().default("financial"),
          discountPercent: z.string().default("0"),
          minQty: z.string().optional(),
          productId: z.number().optional(),
          categoryId: z.number().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        const [row] = await db
          .insert(offers)
          .values({
            tenantId: ctx.tenantId,
            name: input.name,
            kind: input.kind,
            discountPercent: input.discountPercent,
            minQty: input.minQty ?? null,
            productId: input.productId ?? null,
            categoryId: input.categoryId ?? null,
            startDate: input.startDate ? new Date(input.startDate) : null,
            endDate: input.endDate ? new Date(input.endDate) : null,
          })
          .returning();
        return row;
      }),
    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          kind: z.string().optional(),
          discountPercent: z.string().optional(),
          minQty: z.string().optional(),
          productId: z.number().optional(),
          categoryId: z.number().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        const { id, ...data } = input;
        await db
          .update(offers)
          .set({ ...data, updatedAt: new Date() })
          .where(and(eq(offers.id, id), eq(offers.tenantId, ctx.tenantId)));
        return { success: true };
      }),
    delete: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        await db
          .delete(offers)
          .where(and(eq(offers.id, input.id), eq(offers.tenantId, ctx.tenantId)));
        return { success: true };
      }),
  }),

  // ─── Product Units ───────────────────────────────────────────────
  productUnits: router({
    list: tenantProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(productUnits)
          .where(
            and(
              eq(productUnits.tenantId, ctx.tenantId),
              eq(productUnits.productId, input.productId)
            )
          );
      }),
    add: tenantProcedure
      .input(
        z.object({
          productId: z.number(),
          unitId: z.number(),
          conversionFactor: z.string().default("1"),
          isBase: z.boolean().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        const [row] = await db
          .insert(productUnits)
          .values({
            tenantId: ctx.tenantId,
            productId: input.productId,
            unitId: input.unitId,
            conversionFactor: input.conversionFactor,
            isBase: input.isBase,
          })
          .returning();
        return row;
      }),
    remove: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        await db
          .delete(productUnits)
          .where(
            and(
              eq(productUnits.id, input.id),
              eq(productUnits.tenantId, ctx.tenantId)
            )
          );
        return { success: true };
      }),
  }),

  // ─── POS Sessions ────────────────────────────────────────────────
  pos: router({
    listSessions: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(posSessions)
        .where(eq(posSessions.tenantId, ctx.tenantId))
        .orderBy(desc(posSessions.openedAt))
        .limit(20);
    }),
    openSession: tenantProcedure
      .input(
        z.object({
          openingFloat: z.string().default("0"),
          branchId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId || !ctx.user) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "تعذر فتح الوردية" });
        }
        const code = `POS-${Date.now().toString(36).toUpperCase()}`;
        const [row] = await db
          .insert(posSessions)
          .values({
            tenantId: ctx.tenantId,
            code,
            openedById: ctx.user.id,
            openingFloat: input.openingFloat,
            branchId: input.branchId ?? null,
            status: "open",
          })
          .returning();
        return row;
      }),
    closeSession: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        await db
          .update(posSessions)
          .set({ status: "closed", closedAt: new Date(), updatedAt: new Date() })
          .where(
            and(eq(posSessions.id, input.id), eq(posSessions.tenantId, ctx.tenantId))
          );
        return { success: true };
      }),
    listHolds: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(posSessions)
        .where(
          and(
            eq(posSessions.tenantId, ctx.tenantId),
            eq(posSessions.status, "suspended")
          )
        )
        .orderBy(desc(posSessions.openedAt))
        .limit(20);
    }),
    getHold: tenantProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return null;
        const db = await getDb();
        if (!db) return null;
        const [row] = await db
          .select()
          .from(posSessions)
          .where(
            and(
              eq(posSessions.id, input.id),
              eq(posSessions.tenantId, ctx.tenantId),
              eq(posSessions.status, "suspended")
            )
          )
          .limit(1);
        return row || null;
      }),
    deleteHold: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("تعذر الاتصال بقاعدة البيانات");
        await db
          .delete(posSessions)
          .where(
            and(
              eq(posSessions.id, input.id),
              eq(posSessions.tenantId, ctx.tenantId),
              eq(posSessions.status, "suspended")
            )
          );
        return { success: true };
      }),
    printInvoice: tenantProcedure
      .input(z.object({ invoiceNumber: z.string() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return null;
        const db = await getDb();
        if (!db) return null;
        const [invoice] = await db
          .select()
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.tenantId, ctx.tenantId),
              eq(salesInvoices.invoiceNumber, input.invoiceNumber)
            )
          )
          .limit(1);
        if (!invoice) return null;
        const items = await db
          .select()
          .from(salesInvoiceItems)
          .where(eq(salesInvoiceItems.invoiceId, invoice.id));
        return { invoice, items };
      }),
  }),

  operations: router({
    summary: tenantProcedure.query(async ({ ctx }) => {
      const defaultResult = {
        unread: 0,
        lowStock: 0,
        pendingOrders: 0,
        pendingRequisitions: 0,
        dueScheduled: 0,
        overdue: 0,
        activeOffers: 0,
        topRep: null as { name: string; commission: number; salesTotal: number } | null,
      };
      if (!ctx.tenantId) return defaultResult;
      const db = await getDb();
      if (!db) return defaultResult;
      return defaultResult;
    }),
  }),

  // ─── Analytics ───────────────────────────────────────────────────
  analytics: router({
    summary: tenantProcedure.query(async ({ ctx }) => {
      const emptyResult = {
        totalSales: 0,
        totalPurchases: 0,
        netProfit: 0,
        salesGrowth: 0,
        invoicesCount: 0,
        customersCount: 0,
        months: [] as Array<{ month: string; revenue: number; expense: number }>,
        totals: { revenue: 0, expense: 0, profit: 0 },
        note: null as string | null,
        topProducts: [] as Array<{ id: number; name: string; total: number }>,
        salesByBranch: [] as Array<{ branch: string; total: number }>,
      };
      if (!ctx.tenantId) return emptyResult;
      const db = await getDb();
      if (!db) return emptyResult;

      const sales = await db
        .select({ total: salesInvoices.total })
        .from(salesInvoices)
        .where(eq(salesInvoices.tenantId, ctx.tenantId));
      const totalSales = sales.reduce((s, i) => s + parseFloat(i.total || "0"), 0);

      const purchases = await db
        .select({ total: purchaseInvoices.total })
        .from(purchaseInvoices)
        .where(eq(purchaseInvoices.tenantId, ctx.tenantId));
      const totalPurchases = purchases.reduce((s, i) => s + parseFloat(i.total || "0"), 0);

      return {
        totalSales,
        totalPurchases,
        netProfit: totalSales - totalPurchases,
        salesGrowth: 0,
        invoicesCount: sales.length,
        customersCount: 0,
        months: [] as Array<{ month: string; revenue: number; expense: number }>,
        totals: { revenue: totalSales, expense: totalPurchases, profit: totalSales - totalPurchases },
        note: null as string | null,
        topProducts: [] as Array<{ id: number; name: string; total: number }>,
        salesByBranch: [] as Array<{ branch: string; total: number }>,
      };
    }),
  }),

  // ─── Audit ───────────────────────────────────────────────────────
  audit: router({
    list: tenantProcedure
      .input(
        z
          .object({
            limit: z.number().default(50),
            offset: z.number().default(0),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;
        return db
          .select()
          .from(activityLogs)
          .orderBy(desc(activityLogs.createdAt))
          .limit(limit)
          .offset(offset);
      }),
  }),

  // ─── Reports ─────────────────────────────────────────────────────
  reports: router({
    profitability: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) {
        return {
          byRep: [],
          discountTotal: 0,
          discountedInvoices: 0,
          offers: 0,
        };
      }
      const db = await getDb();
      if (!db) {
        return {
          byRep: [],
          discountTotal: 0,
          discountedInvoices: 0,
          offers: 0,
        };
      }
      const reps = await db
        .select()
        .from(salesReps)
        .where(eq(salesReps.tenantId, ctx.tenantId));
      const byRep = reps.map(r => ({
        rep: { id: r.id, name: r.name },
        salesTotal: 0,
        commission: 0,
        bonus: 0,
      }));
      return {
        byRep,
        discountTotal: 0,
        discountedInvoices: 0,
        offers: 0,
      };
    }),
  }),
});
