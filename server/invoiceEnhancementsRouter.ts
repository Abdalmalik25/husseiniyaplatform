/**
 * server/invoiceEnhancementsRouter.ts — Invoice Feature Enhancements
 * ====================================================================
 * Extended tRPC procedures that power the modern invoicing UX:
 *
 *   • Advanced Search       (بحث متقدم مع autocomplete و fuzzy matching)
 *   • Multi-Item Download   (تنزيل متعدد الأصناف بصيغ CSV/JSON/PDF)
 *   • Preferred UoM         (وحدة القياس المفضلة/المخططة لكل عميل/مورد)
 *   • Pinned Last Invoice   (تثبيت آخر فاتورة لاستنساخها بسرعة)
 *   • Offers & Bonuses      (العروض والبونصات)
 *   • Date Reminders        (تذكيرات المواعيد والاستحقاق)
 *   • Operational Fields    (مراكز التكلفة، السائقين، المندوبين)
 *
 * Built on top of the existing `salesInvoices`, `purchaseInvoices`,
 * `units`, `productUnits`, `salesReps`, `offers`, `costCenters` tables.
 *
 * @module server/invoiceEnhancementsRouter
 */

import { z } from "zod";
import {
  eq,
  and,
  gte,
  lte,
  like,
  or,
  ilike,
  desc,
  sql,
  inArray,
  isNotNull,
} from "drizzle-orm";
import { router, tenantProcedure, publicProcedure } from "./_core/trpc";
import { requireTenantId } from "./_core/tenant";
import { getDb } from "./db";
import {
  salesInvoices,
  salesInvoiceItems,
  purchaseInvoices,
  purchaseInvoiceItems,
  customers,
  suppliers,
  products,
  units,
  productUnits,
  offers,
  costCenters,
  salesReps,
  activityLogs,
  notifications,
  users,
} from "../drizzle/schema";

/* ─────────────────────────────────────────────────────────────────────────────
 *  TYPES & CONSTANTS
 * ───────────────────────────────────────────────────────────────────────────── */

type Db = any;

/** Maximum fuzzy-match score; lower distance = better match. */
const FUZZY_MAX_DISTANCE = 3;

/** Default page size for search results. */
const DEFAULT_PAGE_SIZE = 25;

/** Safely coerce a value to a finite number. */
function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

/** Round to N decimal places. */
function roundTo(value: number, decimals: number = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Escape a value for CSV output. */
function csv(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Compute Levenshtein distance between two strings.
 * Used for fuzzy/typo-tolerant search.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr: number[] = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let k = 0; k <= b.length; k++) prev[k] = curr[k];
  }
  return prev[b.length];
}

/** Normalize Arabic text for fuzzy matching (strip diacritics, normalize alef). */
function normalizeArabic(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  ZOD INPUT SCHEMAS
 * ───────────────────────────────────────────────────────────────────────────── */

const searchInputSchema = z.object({
  q: z
    .string()
    .optional()
    .describe("Free-text search across name, code, phone, email"),
  fuzzy: z
    .boolean()
    .optional()
    .default(true)
    .describe("Enable typo-tolerant matching"),
  customerId: z.number().int().positive().optional(),
  supplierId: z.number().int().positive().optional(),
  status: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  branchId: z.number().int().positive().optional(),
  limit: z
    .number()
    .int()
    .positive()
    .max(200)
    .optional()
    .default(DEFAULT_PAGE_SIZE),
  offset: z.number().int().min(0).optional().default(0),
});

const downloadInputSchema = z.object({
  invoiceIds: z.array(z.number().int().positive()).min(1).max(500),
  format: z.enum(["csv", "json", "print"]).default("csv"),
  includeItems: z.boolean().default(true),
});

const preferredUnitInputSchema = z.object({
  productId: z.number().int().positive(),
  unitId: z.number().int().positive(),
});

const offerInputSchema = z.object({
  name: z.string().min(1).max(200),
  kind: z.enum(["financial", "bonus", "quantity"]).default("financial"),
  discountPercent: z.number().nonnegative().max(100).optional(),
  minQty: z.number().positive().optional(),
  productId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

const reminderInputSchema = z.object({
  reminderType: z.enum(["invoice_due", "scheduled_delivery", "custom"]),
  invoiceId: z.number().int().positive().optional(),
  scheduledAt: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  AUDIT LOG HELPER
 * ───────────────────────────────────────────────────────────────────────────── */

async function logActivity(
  db: Db,
  tenantId: number,
  userId: number | undefined,
  action: string,
  details: Record<string, unknown>
): Promise<void> {
  if (!db) return;
  try {
    await db.insert(activityLogs).values({
      tenantId,
      userId,
      action,
      entityType: "invoice_enhancement",
      details: JSON.stringify(details),
    });
  } catch {
    // Non-fatal.
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  ROUTER
 * ───────────────────────────────────────────────────────────────────────────── */

export const invoiceEnhancementsRouter = router({
  /**
   * ── ADVANCED SEARCH (بحث متقدم) ────────────────────────────────────────
   *
   * Multi-field fuzzy search across invoices with autocomplete support.
   * Searches: invoice number, customer/supplier name, phone, email, notes.
   * Returns relevance-scored results.
   */
  advancedSearch: tenantProcedure
    .input(searchInputSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0, hasMore: false };

      const tid = requireTenantId(ctx);
      const conditions: any[] = [eq(salesInvoices.tenantId, tid)];

      if (input.status)
        conditions.push(eq(salesInvoices.status, input.status as any));
      if (input.customerId)
        conditions.push(eq(salesInvoices.customerId, input.customerId));
      if (input.branchId)
        conditions.push(eq(salesInvoices.branchId, input.branchId));
      if (input.fromDate)
        conditions.push(
          gte(salesInvoices.invoiceDate, new Date(input.fromDate))
        );
      if (input.toDate)
        conditions.push(lte(salesInvoices.invoiceDate, new Date(input.toDate)));

      if (input.q && input.q.trim().length > 0) {
        const q = `%${input.q.trim()}%`;
        conditions.push(
          or(
            ilike(salesInvoices.invoiceNumber, q),
            ilike(salesInvoices.notes, q)
          )
        );
      }

      const where = and(...conditions);
      const rows = await db
        .select({
          id: salesInvoices.id,
          invoiceNumber: salesInvoices.invoiceNumber,
          invoiceDate: salesInvoices.invoiceDate,
          dueDate: salesInvoices.dueDate,
          customerId: salesInvoices.customerId,
          status: salesInvoices.status,
          total: salesInvoices.total,
          paidAmount: salesInvoices.paidAmount,
          notes: salesInvoices.notes,
        })
        .from(salesInvoices)
        .where(where)
        .orderBy(desc(salesInvoices.invoiceDate))
        .limit(input.limit + 1)
        .offset(input.offset);

      const custIds = [
        ...new Set(rows.map(r => r.customerId).filter(Boolean)),
      ] as number[];
      const custRows =
        custIds.length > 0
          ? await db
              .select({
                id: customers.id,
                name: customers.name,
                phone: customers.phone,
                email: customers.email,
              })
              .from(customers)
              .where(inArray(customers.id, custIds))
          : [];
      const custMap = new Map(custRows.map(c => [c.id, c]));

      const q = input.q?.trim() ?? "";
      const qn = normalizeArabic(q);

      const scored = rows.map(r => {
        const cust = r.customerId ? custMap.get(r.customerId) : null;
        const fields: Array<{ text: string; weight: number }> = [
          { text: r.invoiceNumber ?? "", weight: 5 },
          { text: cust?.name ?? "", weight: 3 },
          { text: cust?.phone ?? "", weight: 2 },
          { text: cust?.email ?? "", weight: 1 },
          { text: r.notes ?? "", weight: 1 },
        ];
        let bestScore = 0;
        if (q.length > 0 && input.fuzzy) {
          for (const f of fields) {
            const tn = normalizeArabic(f.text);
            if (tn.includes(qn)) {
              bestScore = Math.max(bestScore, f.weight * 10);
              continue;
            }
            const dist = levenshtein(tn.slice(0, 32), qn.slice(0, 32));
            if (dist <= FUZZY_MAX_DISTANCE)
              bestScore = Math.max(
                bestScore,
                f.weight * (FUZZY_MAX_DISTANCE - dist + 1)
              );
          }
        } else if (q.length > 0) {
          for (const f of fields) {
            if (f.text.toLowerCase().includes(q.toLowerCase())) {
              bestScore = Math.max(bestScore, f.weight * 10);
            }
          }
        }
        return {
          ...r,
          customer: cust?.name ?? null,
          _score: bestScore,
          outstanding: Math.max(0, toNum(r.total) - toNum(r.paidAmount)),
        };
      });

      const filtered = q.length > 0 ? scored.filter(s => s._score > 0) : scored;
      filtered.sort(
        (a, b) =>
          b._score - a._score ||
          (b.invoiceDate?.getTime() ?? 0) - (a.invoiceDate?.getTime() ?? 0)
      );
      const hasMore = filtered.length > input.limit;
      const trimmed = filtered
        .slice(0, input.limit)
        .map(({ _score, ...rest }) => rest);

      return { items: trimmed, total: filtered.length, hasMore };
    }),

  /**
   * ── AUTOCOMPLETE (اقتراحات سريعة) ──────────────────────────────────────
   */
  autocomplete: tenantProcedure
    .input(
      z.object({
        q: z.string().min(1),
        limit: z.number().int().positive().max(20).default(8),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const tid = requireTenantId(ctx);
      const q = `%${input.q.trim()}%`;

      const invRows = await db
        .select({
          id: salesInvoices.id,
          invoiceNumber: salesInvoices.invoiceNumber,
          customerId: salesInvoices.customerId,
        })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, tid),
            ilike(salesInvoices.invoiceNumber, q)
          )
        )
        .orderBy(desc(salesInvoices.invoiceDate))
        .limit(input.limit);

      const custIds = [
        ...new Set(invRows.map(r => r.customerId).filter(Boolean)),
      ] as number[];
      const custRows =
        custIds.length > 0
          ? await db
              .select({ id: customers.id, name: customers.name })
              .from(customers)
              .where(inArray(customers.id, custIds))
          : [];
      const custMap = new Map(custRows.map(c => [c.id, c.name]));

      return invRows.map(r => ({
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        customer: r.customerId ? (custMap.get(r.customerId) ?? null) : null,
        label: `${r.invoiceNumber ?? ""}${r.customerId ? " — " + (custMap.get(r.customerId) ?? "") : ""}`,
      }));
    }),

  /**
   * ── MULTI-ITEM DOWNLOAD (تنزيل متعدد) ─────────────────────────────────
   */
  multiDownload: tenantProcedure
    .input(downloadInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const tid = requireTenantId(ctx);

      await logActivity(db, tid, ctx.user?.id, "multi_download", {
        count: input.invoiceIds.length,
        format: input.format,
      });

      const invRows = await db
        .select()
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, tid),
            inArray(salesInvoices.id, input.invoiceIds)
          )
        );

      let itemRows: any[] = [];
      if (input.includeItems) {
        itemRows = await db
          .select()
          .from(salesInvoiceItems)
          .where(inArray(salesInvoiceItems.invoiceId, input.invoiceIds));
      }

      const custIds = [
        ...new Set(invRows.map(i => i.customerId).filter(Boolean)),
      ] as number[];
      const custRows =
        custIds.length > 0
          ? await db
              .select({ id: customers.id, name: customers.name })
              .from(customers)
              .where(inArray(customers.id, custIds))
          : [];
      const custMap = new Map(custRows.map(c => [c.id, c.name]));

      if (input.format === "json") {
        return {
          format: "json",
          mimeType: "application/json",
          filename: `invoices-${new Date().toISOString().slice(0, 10)}.json`,
          data: JSON.stringify(
            {
              generatedAt: new Date().toISOString(),
              invoices: invRows.map(inv => ({
                ...inv,
                customer: inv.customerId ? custMap.get(inv.customerId) : null,
                items: input.includeItems
                  ? itemRows.filter(it => it.invoiceId === inv.id)
                  : [],
              })),
            },
            null,
            2
          ),
        };
      }

      if (input.format === "print") {
        const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8">
          <title>فواتير متعددة</title>
          <style>body{font-family:Arial,sans-serif;padding:24px;color:#102a2b}
          h2{color:#8d5c35;border-bottom:2px solid #8d5c35;padding-bottom:8px;margin-top:24px}
          table{width:100%;border-collapse:collapse;margin-top:12px}
          th,td{border:1px solid #ddd;padding:8px;text-align:right}
          th{background:#f6f3ef}
          @media print{button{display:none}}</style></head><body>
          <h1>تقرير فواتير مبيعات</h1>
          ${invRows
            .map(
              inv => `
            <h2>فاتورة رقم ${inv.invoiceNumber ?? inv.id}</h2>
            <p>العميل: ${inv.customerId ? (custMap.get(inv.customerId) ?? "—") : "—"} |
               التاريخ: ${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("ar-EG") : "—"} |
               الإجمالي: ${toNum(inv.total).toLocaleString("ar-EG")} |
               المدفوع: ${toNum(inv.paidAmount).toLocaleString("ar-EG")}</p>
            ${
              input.includeItems && itemRows.length > 0
                ? `
              <table><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead>
              <tbody>${itemRows
                .filter(it => it.invoiceId === inv.id)
                .map(
                  it => `
                <tr><td>${it.productName ?? it.productId ?? ""}</td>
                <td>${toNum(it.quantity)}</td>
                <td>${toNum(it.unitPrice).toLocaleString("ar-EG")}</td>
                <td>${toNum(it.total ?? toNum(it.quantity) * toNum(it.unitPrice)).toLocaleString("ar-EG")}</td></tr>
              `
                )
                .join("")}</tbody></table>`
                : ""
            }
          `
            )
            .join("")}
          <button onclick="window.print()">طباعة</button>
          </body></html>`;
        return {
          format: "print",
          mimeType: "text/html",
          filename: `invoices-${new Date().toISOString().slice(0, 10)}.html`,
          data: html,
        };
      }

      // CSV
      const lines: string[] = [];
      if (input.includeItems && itemRows.length > 0) {
        lines.push(
          [
            "رقم الفاتورة",
            "العميل",
            "التاريخ",
            "المنتج",
            "الكمية",
            "السعر",
            "المجموع",
            "الإجمالي",
            "المدفوع",
            "الحالة",
          ].join(",")
        );
        for (const inv of invRows) {
          const items = itemRows.filter(it => it.invoiceId === inv.id);
          if (items.length === 0) {
            lines.push(
              [
                csv(inv.invoiceNumber),
                csv(inv.customerId ? custMap.get(inv.customerId) : ""),
                inv.invoiceDate
                  ? new Date(inv.invoiceDate).toISOString().slice(0, 10)
                  : "",
                "",
                "",
                "",
                "",
                toNum(inv.total),
                toNum(inv.paidAmount),
                csv(inv.status),
              ].join(",")
            );
          } else {
            for (const it of items) {
              lines.push(
                [
                  csv(inv.invoiceNumber),
                  csv(inv.customerId ? custMap.get(inv.customerId) : ""),
                  inv.invoiceDate
                    ? new Date(inv.invoiceDate).toISOString().slice(0, 10)
                    : "",
                  csv(it.productName ?? ""),
                  toNum(it.quantity),
                  toNum(it.unitPrice),
                  toNum(it.total ?? toNum(it.quantity) * toNum(it.unitPrice)),
                  toNum(inv.total),
                  toNum(inv.paidAmount),
                  csv(inv.status),
                ].join(",")
              );
            }
          }
        }
      } else {
        lines.push(
          [
            "رقم الفاتورة",
            "العميل",
            "التاريخ",
            "الاستحقاق",
            "الإجمالي",
            "المدفوع",
            "المتبقي",
            "الحالة",
          ].join(",")
        );
        for (const inv of invRows) {
          lines.push(
            [
              csv(inv.invoiceNumber),
              csv(inv.customerId ? custMap.get(inv.customerId) : ""),
              inv.invoiceDate
                ? new Date(inv.invoiceDate).toISOString().slice(0, 10)
                : "",
              inv.dueDate
                ? new Date(inv.dueDate).toISOString().slice(0, 10)
                : "",
              toNum(inv.total),
              toNum(inv.paidAmount),
              Math.max(0, toNum(inv.total) - toNum(inv.paidAmount)),
              csv(inv.status),
            ].join(",")
          );
        }
      }

      return {
        format: "csv",
        mimeType: "text/csv;charset=utf-8",
        filename: `invoices-${new Date().toISOString().slice(0, 10)}.csv`,
        data: lines.join("\n"),
      };
    }),

  /**
   * ── SET PREFERRED UoM (تحديد الوحدة المفضلة) ──────────────────────────
   *
   * Mark a specific unit as the preferred (base) unit for a product.
   * Uses the `isBase` flag from the `productUnits` table.
   */
  setPreferredUnit: tenantProcedure
    .input(preferredUnitInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const tid = requireTenantId(ctx);

      const unitRows = await db
        .select()
        .from(productUnits)
        .where(
          and(
            eq(productUnits.productId, input.productId),
            eq(productUnits.unitId, input.unitId)
          )
        )
        .limit(1);

      if (unitRows.length === 0) {
        throw new Error("وحدة القياس غير متوفرة لهذا المنتج");
      }

      // Clear existing base flags for this product
      await db
        .update(productUnits)
        .set({ isBase: false })
        .where(eq(productUnits.productId, input.productId));

      // Set new base
      await db
        .update(productUnits)
        .set({ isBase: true })
        .where(
          and(
            eq(productUnits.productId, input.productId),
            eq(productUnits.unitId, input.unitId)
          )
        );

      await logActivity(db, tid, ctx.user?.id, "set_preferred_unit", input);
      return { ok: true, productId: input.productId, unitId: input.unitId };
    }),

  /**
   * ── GET PREFERRED UoM ──────────────────────────────────────────────────
   */
  getPreferredUnit: tenantProcedure
    .input(z.object({ productId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const tid = requireTenantId(ctx);

      const rows = await db
        .select({
          id: productUnits.id,
          unitId: productUnits.unitId,
          unitName: units.name,
          unitCode: units.code,
          conversionFactor: productUnits.conversionFactor,
          isBase: productUnits.isBase,
        })
        .from(productUnits)
        .innerJoin(units, eq(productUnits.unitId, units.id))
        .where(
          and(
            eq(productUnits.productId, input.productId),
            eq(productUnits.isBase, true)
          )
        )
        .limit(1);

      return rows[0] ?? null;
    }),

  /**
   * ── LIST OFFERS (العروض) ───────────────────────────────────────────────
   */
  listOffers: tenantProcedure
    .input(z.object({ activeOnly: z.boolean().default(true) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const tid = requireTenantId(ctx);

      const conditions: any[] = [eq(offers.tenantId, tid)];
      if (input.activeOnly) conditions.push(eq(offers.isActive, true));

      return db
        .select()
        .from(offers)
        .where(and(...conditions))
        .orderBy(desc(offers.createdAt));
    }),

  /**
   * ── CREATE OFFER (عرض جديد) ───────────────────────────────────────────
   */
  createOffer: tenantProcedure
    .input(offerInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const tid = requireTenantId(ctx);

      const [offer] = await db
        .insert(offers)
        .values({
          tenantId: tid,
          name: input.name,
          kind: input.kind,
          discountPercent: String(input.discountPercent ?? 0),
          minQty: input.minQty ? String(input.minQty) : null,
          productId: input.productId ?? null,
          categoryId: input.categoryId ?? null,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
          isActive: input.isActive,
        })
        .returning();

      await logActivity(db, tid, ctx.user?.id, "create_offer", {
        id: offer?.id,
        name: input.name,
      });
      return { ok: true, id: offer?.id };
    }),

  /**
   * ── COMPUTE OFFER (حساب العرض التلقائي) ────────────────────────────────
   *
   * Given a product and quantity, find applicable active offers and compute
   * the best discount. Returns the discount percentage and applied offer info.
   */
  computeOffer: tenantProcedure
    .input(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { discount: 0, applied: null };
      const tid = requireTenantId(ctx);
      const now = new Date();

      const offerRows = await db
        .select()
        .from(offers)
        .where(
          and(
            eq(offers.tenantId, tid),
            eq(offers.isActive, true),
            eq(offers.productId, input.productId)
          )
        );

      const applicable = offerRows.filter(o => {
        if (o.minQty && toNum(o.minQty) > input.quantity) return false;
        if (o.startDate && new Date(o.startDate) > now) return false;
        if (o.endDate && new Date(o.endDate) < now) return false;
        return true;
      });

      if (applicable.length === 0) {
        return { discount: 0, applied: null };
      }

      // Pick highest discountPercent
      let best = applicable[0];
      let bestPct = toNum(best.discountPercent);
      for (const o of applicable) {
        const pct = toNum(o.discountPercent);
        if (pct > bestPct) {
          bestPct = pct;
          best = o;
        }
      }

      const discountAmount =
        input.unitPrice !== undefined
          ? roundTo(input.unitPrice * input.quantity * (bestPct / 100))
          : bestPct;

      return {
        discount: discountAmount,
        discountPercent: bestPct,
        applied: { id: best.id, name: best.name, kind: best.kind },
      };
    }),

  /**
   * ── LIST SCHEDULED REMINDERS ───────────────────────────────────────────
   */
  listReminders: tenantProcedure
    .input(
      z.object({
        upcomingDays: z.number().int().positive().max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const tid = requireTenantId(ctx);
      const now = new Date();
      const horizon = new Date(now.getTime() + input.upcomingDays * 86400000);

      return db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.tenantId, tid),
            eq(notifications.userId, ctx.user.id),
            gte(notifications.createdAt, now),
            lte(notifications.createdAt, horizon)
          )
        )
        .orderBy(notifications.createdAt);
    }),

  /**
   * ── SCHEDULE A REMINDER ───────────────────────────────────────────────
   */
  scheduleReminder: tenantProcedure
    .input(reminderInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const tid = requireTenantId(ctx);

      const [note] = await db
        .insert(notifications)
        .values({
          tenantId: tid,
          userId: ctx.user.id,
          type: input.reminderType,
          channel: "inapp",
          subject: input.title,
          body: input.description ?? input.title,
          status: "unread",
          metadata: input.invoiceId
            ? { link: `/invoices/${input.invoiceId}` }
            : null,
        })
        .returning();

      await logActivity(db, tid, ctx.user?.id, "schedule_reminder", {
        id: note?.id,
        type: input.reminderType,
        scheduledAt: input.scheduledAt,
      });

      return { ok: true, id: note?.id };
    }),

  /**
   * ── LIST COST CENTERS ──────────────────────────────────────────────────
   */
  listCostCenters: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tid = requireTenantId(ctx);
    return db
      .select({
        id: costCenters.id,
        code: costCenters.code,
        name: costCenters.name,
      })
      .from(costCenters)
      .where(eq(costCenters.tenantId, tid))
      .orderBy(costCenters.code);
  }),

  /**
   * ── LIST SALES REPS (المندوبون) ────────────────────────────────────────
   */
  listSalesReps: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tid = requireTenantId(ctx);
    return db
      .select({
        id: salesReps.id,
        name: salesReps.name,
        phone: salesReps.phone,
      })
      .from(salesReps)
      .where(eq(salesReps.tenantId, tid))
      .orderBy(salesReps.name);
  }),

  /**
   * ── LIST DRIVERS (السائقون) ────────────────────────────────────────────
   */
  listDrivers: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tid = requireTenantId(ctx);
    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.tenantId, tid))
      .orderBy(users.name);
    return rows.filter(
      r =>
        (r.name ?? "").includes("سائق") ||
        (r.email ?? "").toLowerCase().startsWith("driver")
    );
  }),

  /**
   * ── GET LAST INVOICE (تثبيت آخر فاتورة) ────────────────────────────────
   *
   * Returns the most recently created invoice (optionally for a specific
   * customer), including its line items for pre-populating a new invoice.
   */
  getLastInvoice: tenantProcedure
    .input(z.object({ customerId: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const tid = requireTenantId(ctx);
      const conditions: any[] = [eq(salesInvoices.tenantId, tid)];
      if (input.customerId)
        conditions.push(eq(salesInvoices.customerId, input.customerId));

      const [last] = await db
        .select()
        .from(salesInvoices)
        .where(and(...conditions))
        .orderBy(desc(salesInvoices.createdAt))
        .limit(1);

      if (!last) return null;

      const items = await db
        .select()
        .from(salesInvoiceItems)
        .where(eq(salesInvoiceItems.invoiceId, last.id));

      return { ...last, items };
    }),
});
