/**
 * server/_core/globalSearch.ts
 * -----------------------------
 * Unified enterprise search + smart-suggestion engine.
 *
 * - `searchEntities` — one query → matching master-data rows across products,
 *   accounts, customers, suppliers, transactions (autocomplete).
 * - Results are ALWAYS tenant-scoped: every branch of the query includes the
 *   caller's `tenantId` (and `branchId` when supplied). Zero cross-tenant leak.
 * - Uses ILIKE (backed by pg_trgm GIN indexes from 0010) for fast fuzzy
 *   matching; safe parameterized bindings (no string interpolation).
 */
import { and, eq, ilike, or, like, sql } from "drizzle-orm";
import {
  products,
  accounts,
  customers,
  suppliers,
  transactions,
} from "../../drizzle/schema";

type Db = any;

export type SearchMatch = {
  kind: "product" | "account" | "customer" | "supplier" | "transaction";
  id: number;
  code?: string;
  name: string;
  label: string;
};

const SEARCH_LIMIT = 8;

function escapeLike(input: string): string {
  // Escape wildcards so user input is never interpreted as a pattern
  // (matching is always substring, not regex).
  return input.replace(/[\\%_]/g, ch => `\\${ch}`);
}
/**
 * Fast fuzzy search across master data. `branchId` optionally tightens
 * transaction matches (master data remains tenant-global per model).
 */
export async function searchEntities(args: {
  db: Db;
  tenantId: number;
  query: string;
  branchId?: number;
  limit?: number;
}): Promise<SearchMatch[]> {
  const { db, tenantId, query, branchId } = args;
  const limit = args.limit ?? SEARCH_LIMIT;
  const q = escapeLike(String(query ?? "").trim());

  if (!q) return [];
  const pattern = `%${q}%`;
  const results: SearchMatch[] = [];

  if (!db || typeof db.select !== "function") return results;

  // ── Products (name / nameAr / code / barcode) ──────────────────────────
  try {
    const prodRows: any[] = await db
      .select({ id: products.id, code: products.code, name: products.name, nameAr: products.nameAr })
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          or(
            ilike(products.name, pattern),
            ilike(products.nameAr, pattern),
            ilike(products.code, pattern),
            ilike(products.barcode, pattern)
          )
        )
      )
      .limit(limit);
    for (const r of prodRows) {
      results.push({
        kind: "product" as const,
        id: r.id,
        code: r.code ?? undefined,
        name: r.nameAr || r.name,
        label: `${r.nameAr || r.name} (${r.code})`,
      });
    }
  } catch {
    /* table/view unavailable in partial environments — skip gracefully */
  }

  // ── Accounts ──────────────────────────────────────────────────────────
  try {
    const accRows: any[] = await db
      .select({ id: accounts.id, code: accounts.code, name: accounts.name })
      .from(accounts)
      .where(
        and(
          eq(accounts.tenantId, tenantId),
          or(ilike(accounts.name, pattern), ilike(accounts.code, pattern))
        )
      )
      .limit(limit);
    for (const r of accRows) {
      results.push({
        kind: "account" as const,
        id: r.id,
        code: r.code ?? undefined,
        name: r.name,
        label: `حساب ${r.name} (${r.code})`,
      });
    }
  } catch {
    /* graceful */
  }

  // ── Customers ─────────────────────────────────────────────────────────
  try {
    const custRows: any[] = await db
      .select({ id: customers.id, code: customers.code, name: customers.name })
      .from(customers)
      .where(
        and(
          eq(customers.tenantId, tenantId),
          or(ilike(customers.name, pattern), ilike(customers.code, pattern))
        )
      )
      .limit(limit);
    for (const r of custRows) {
      results.push({
        kind: "customer" as const,
        id: r.id,
        code: r.code ?? undefined,
        name: r.name,
        label: `عميل ${r.name}`,
      });
    }
  } catch {
    /* graceful */
  }
// ── Suppliers ─────────────────────────────────────────────────────────
  try {
    const supRows: any[] = await db
      .select({ id: suppliers.id, code: suppliers.code, name: suppliers.name })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.tenantId, tenantId),
          or(ilike(suppliers.name, pattern), ilike(suppliers.code, pattern))
        )
      )
      .limit(limit);
    for (const r of supRows) {
      results.push({
        kind: "supplier" as const,
        id: r.id,
        code: r.code ?? undefined,
        name: r.name,
        label: `مورد ${r.name}`,
      });
    }
  } catch {
    /* graceful */
  }

  // ── Transactions (optional branch tightening) ─────────────────────────
  try {
    const txFilters: any[] = [
      eq(transactions.tenantId, tenantId),
      or(ilike(transactions.narration, pattern), ilike(transactions.notes, pattern)),
    ];
    if (branchId) txFilters.push(eq(transactions.branchId, branchId));
    const txRows: any[] = await db
      .select({
        id: transactions.id,
        narration: transactions.narration,
        transactionDate: transactions.transactionDate,
      })
      .from(transactions)
      .where(and(...txFilters))
      .limit(limit);
    for (const r of txRows) {
      results.push({
        kind: "transaction" as const,
        id: r.id,
        name: r.narration ?? "قيد",
        label: `قيد ${r.narration ?? "—"} (${
          r.transactionDate?.toISOString?.().slice(0, 10) ?? ""
        })`,
      });
    }
  } catch {
    /* graceful */
  }

  return results.slice(0, limit * 4);
}

/** Suggested quick actions / smart chips for a query (lightweight, no DB hit). */
export function suggestQuickActions(query: string): Array<{ label: string; hint: string }> {
  const q = String(query ?? "").trim().toLowerCase();
  const chips: Array<{ label: string; hint: string }> = [];
  if (/عميل|عملا|cust|شركة/i.test(q)) chips.push({ label: "إنشاء عميل", hint: "/commercial?new=customer" });
  if (/فاتورة|invoice|بيع/i.test(q)) chips.push({ label: "فاتورة بيع جديدة", hint: "/commercial?new=sales" });
  if (/شراء|مشتريات|مورد|sup/i.test(q)) chips.push({ label: "فاتورة شراء", hint: "/procurement?new=purchase" });
  if (/مخزون|منتج|stock|product/i.test(q)) chips.push({ label: "التحقق من المخزون", hint: "/inventory?view=stock" });
  if (/تقرير|report|ربح/i.test(q)) chips.push({ label: "تقارير الربحية", hint: "/reports?tab=profitability" });
  if (/قيد|journal|يومية/i.test(q)) chips.push({ label: "قيد يومية جديد", hint: "/journal?new=entry" });
  if (/عميلة|نقطة|pos/i.test(q)) chips.push({ label: "نقطة البيع", hint: "/pos" });
  if (/مشروع|project/i.test(q)) chips.push({ label: "مشاريع", hint: "/projects" });
  return chips;
}

/** Analytics-friendly query stats (used by dashboards and audit screens). */
export function searchQueryStats(query: string): { length: number; words: number; hasArabic: boolean } {
  const q = String(query ?? "");
  return {
    length: q.length,
    words: q.trim().split(/\s+/).filter(Boolean).length,
    hasArabic: /[\u0600-\u06FF]/.test(q),
  };
}

export { like, sql };