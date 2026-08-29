/**
 * server/financialReportsRouter.ts — Server-side Financial Reporting Engine
 *
 * Closes a critical gap: previously GL reports were computed only in the client
 * (no authoritative/taxable server-side truth). This router computes the core
 * statutory financial statements directly from the database:
 *
 *   - Trial Balance (ميزان المراجعة)
 *   - Income Statement (قائمة الدخل)
 *   - Balance Sheet (الميزانية العمومية)
 *   - Account Statement (كشف حساب مفصل لأي حساب)
 *   - AR / AP Aging (تأجيل الذمم المدينة والدائنة)
 *   - Cash Flow summary (التدفقات النقدية)
 *
 * Non-destructive: purely additive read procedures. Balances reuse the ledger
 * invariant (opening balances + posted transactions, non-reversed).
 */
import { z } from "zod";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { router, tenantProcedure } from "./_core/trpc";
import { requireTenantId } from "./_core/tenant";
import { getDb } from "./db";
import {
  accounts,
  transactions,
  openingBalances,
  customers,
  suppliers,
  salesInvoices,
  purchaseInvoices,
} from "../drizzle/schema";

type Db = any;

const ACTIVE_LIFECYCLE = ["approved", "posted"] as const;

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Legend: how a ledger debit/credit rolls into an account's balance depends on
 * the normal balance side of the account type (ISO 25010 / double-entry rules).
 */
function normalSide(type: string): "debit" | "credit" {
  return ["asset", "expense"].includes(type) ? "debit" : "credit";
}

/** Combine opening balance + all non-reversed posted transactions per account. */
async function accountBalances(
  db: Db,
  tenantId: number,
  asOf?: Date
): Promise<{ account: any; balance: number }[]> {
  const acctRows = (await db
    .select()
    .from(accounts)
    .where(eq(accounts.tenantId, tenantId))) as unknown as (typeof accounts.$inferSelect)[];
  const obRows = await db
    .select()
    .from(openingBalances)
    .where(eq(openingBalances.tenantId, tenantId));

  const txQuery = asOf
    ? and(
        eq(transactions.tenantId, tenantId),
        lte(transactions.transactionDate, asOf),
        eq(transactions.isReversed, false),
        inArray(transactions.lifecycleStatus, ACTIVE_LIFECYCLE)
      )
    : and(
        eq(transactions.tenantId, tenantId),
        eq(transactions.isReversed, false),
        inArray(transactions.lifecycleStatus, ACTIVE_LIFECYCLE)
      );
  const txRows = await db.select().from(transactions).where(txQuery);

  const net = new Map<number, number>();
  const ledger = new Map<number, { dr: number; cr: number }>();

  for (const ob of obRows) {
    const v = toNum(ob.amount);
    net.set(ob.accountId, (net.get(ob.accountId) ?? 0) + (ob.type === "debit" ? v : -v));
  }
  for (const tx of txRows) {
    const v = toNum(tx.amount);
    net.set(tx.accountId, (net.get(tx.accountId) ?? 0) + (tx.type === "debit" ? v : -v));
    const l = ledger.get(tx.accountId) ?? { dr: 0, cr: 0 };
    if (tx.type === "debit") l.dr += v;
    else l.cr += v;
    ledger.set(tx.accountId, l);
  }

  return acctRows.map(a => ({
    account: a,
    // Normalize to the normal side: +ve = normal direction.
    balance: (net.get(a.id) ?? 0) * (normalSide(a.type) === "debit" ? 1 : -1),
  }));
}

export const financialReportsRouter = router({
  /** ميزان المراجعة — trial balance */
  trialBalance: tenantProcedure
    .input(z.object({ asOf: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { rows: [], totals: { debit: 0, credit: 0 } };
      const tid = requireTenantId(ctx);
      const asOf = input?.asOf ? new Date(input.asOf) : undefined;
      const balances = await accountBalances(db, tid, asOf);
      let totalDebit = 0;
      let totalCredit = 0;
      const rows = balances
        .filter(r => Math.abs(r.balance) > 0.0001)
        .sort((a, b) => a.account.code.localeCompare(b.account.code, "ar"))
        .map(r => {
          const side = r.balance >= 0 ? "debit" : "credit";
          const amount = Math.abs(r.balance);
          if (side === "debit") totalDebit += amount;
          else totalCredit += amount;
          return {
            accountId: r.account.id,
            code: r.account.code,
            name: r.account.name,
            type: r.account.type,
            debit: side === "debit" ? amount : 0,
            credit: side === "credit" ? amount : 0,
            balance: r.balance,
          };
        });
      return { rows, totals: { debit: totalDebit, credit: totalCredit } };
    }),

  /** قائمة الدخل — income statement */
  incomeStatement: tenantProcedure
    .input(z.object({ asOf: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { revenues: [], expenses: [], totals: { revenue: 0, expense: 0, net: 0 } };
      const tid = requireTenantId(ctx);
      const asOf = input?.asOf ? new Date(input.asOf) : undefined;
      const balances = await accountBalances(db, tid, asOf);

      const revenues = balances
        .filter(r => r.account.type === "revenue" && Math.abs(r.balance) > 0.0001)
        .map(r => ({ code: r.account.code, name: r.account.name, amount: r.balance }))
        .sort((a, b) => a.code.localeCompare(b.code, "ar"));
      const expenses = balances
        .filter(r => r.account.type === "expense" && Math.abs(r.balance) > 0.0001)
        .map(r => ({ code: r.account.code, name: r.account.name, amount: Math.abs(r.balance) }))
        .sort((a, b) => a.code.localeCompare(b.code, "ar"));

      const revenueTotal = revenues.reduce((s, r) => s + r.amount, 0);
      const expenseTotal = expenses.reduce((s, r) => s + r.amount, 0);
      return {
        revenues,
        expenses,
        totals: { revenue: revenueTotal, expense: expenseTotal, net: revenueTotal - expenseTotal },
      };
    }),

  /** الميزانية العمومية — balance sheet */
  balanceSheet: tenantProcedure
    .input(z.object({ asOf: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { assets: [], liabilities: [], equity: [], totals: {} };
      const tid = requireTenantId(ctx);
      const asOf = input?.asOf ? new Date(input.asOf) : undefined;
      const balances = await accountBalances(db, tid, asOf);

      const pick = (type: string, sign: 1 | -1) =>
        balances
          .filter(r => r.account.type === type && Math.abs(r.balance) > 0.0001)
          .map(r => ({ code: r.account.code, name: r.account.name, amount: r.balance * sign }))
          .sort((a, b) => a.code.localeCompare(b.code, "ar"));

      const assets = pick("asset", 1);
      const liabilities = pick("liability", -1);
      const equity = pick("equity", -1);

      const assetTotal = assets.reduce((s, r) => s + r.amount, 0);
      const liabTotal = liabilities.reduce((s, r) => s + r.amount, 0);
      const eqTotal = equity.reduce((s, r) => s + r.amount, 0);
      return {
        assets,
        liabilities,
        equity,
        totals: { assets: assetTotal, liabilities: liabTotal, equity: eqTotal, net: assetTotal - liabTotal - eqTotal },
      };
    }),

  /** كشف حساب — detailed statement for one account */
  accountStatement: tenantProcedure
    .input(
      z.object({
        accountId: z.number(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { account: null, lines: [], opening: 0, closing: 0 };
      const tid = requireTenantId(ctx);
      const [acc] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, input.accountId), eq(accounts.tenantId, tid)))
        .limit(1);
      if (!acc) return { account: null, lines: [], opening: 0, closing: 0 };

      const obRows = await db
        .select()
        .from(openingBalances)
        .where(
          and(eq(openingBalances.tenantId, tid), eq(openingBalances.accountId, input.accountId))
        );

      const conditions = [
        eq(transactions.tenantId, tid),
        eq(transactions.accountId, input.accountId),
        eq(transactions.isReversed, false),
        inArray(transactions.lifecycleStatus, ACTIVE_LIFECYCLE),
      ];
      if (input.from) conditions.push(gte(transactions.transactionDate, new Date(input.from)));
      if (input.to) conditions.push(lte(transactions.transactionDate, new Date(input.to)));
      const txRows = await db
        .select()
        .from(transactions)
        .where(and(...conditions))
        .orderBy(transactions.transactionDate, transactions.id);

      const side = normalSide(acc.type);
      const opening = obRows.reduce(
        (s, ob) => s + (ob.type === "debit" ? toNum(ob.amount) : -toNum(ob.amount)),
        0
      );
      const openingNorm = opening * (side === "debit" ? 1 : -1);

      let running = opening;
      const lines = txRows.map(tx => {
        const v = toNum(tx.amount);
        const flow = tx.type === "debit" ? v : -v;
        running += flow;
        return {
          id: tx.id,
          date: tx.transactionDate,
          narration: tx.narration,
          debit: tx.type === "debit" ? v : 0,
          credit: tx.type === "credit" ? v : 0,
          balance: running * (side === "debit" ? 1 : -1),
        };
      });
      return {
        account: { id: acc.id, code: acc.code, name: acc.name, type: acc.type },
        lines,
        opening: openingNorm,
        closing: running * (side === "debit" ? 1 : -1),
      };
    }),

  /** تأجيل الديون المدينة (AR aging) */
  arAging: tenantProcedure
    .input(z.object({ asOf: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { buckets: [], totals: { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 } };
      const tid = requireTenantId(ctx);
      const asOf = input?.asOf ? new Date(input.asOf) : new Date();
      const invRows = await db
        .select()
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, tid),
            inArray(salesInvoices.status, ["confirmed", "partial"])
          )
        );
      const custRows = await db
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(eq(customers.tenantId, tid));
      const custMap = new Map(custRows.map(c => [c.id, c.name]));

      const bucketOf = (due: Date): string => {
        const days = Math.max(0, Math.floor((asOf.getTime() - due.getTime()) / 86400000));
        if (days <= 0) return "current";
        if (days <= 30) return "d30";
        if (days <= 60) return "d60";
        if (days <= 90) return "d90";
        return "over90";
      };

      const totals = { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 };
      const rows = invRows.map(inv => {
        const outstanding = Math.max(0, toNum(inv.total) - toNum(inv.paidAmount));
        const due = inv.dueDate ?? inv.invoiceDate;
        const bucket = bucketOf(due);
        totals[bucket as keyof typeof totals] += outstanding;
        return {
          invoiceNumber: inv.invoiceNumber,
          customer: custMap.get(inv.customerId ?? 0) ?? "غير معروف",
          invoiceDate: inv.invoiceDate,
          dueDate: due,
          outstanding,
          bucket,
        };
      });
      return { rows, totals };
    }),

  /** تأجيل الديون الدائنة (AP aging) */
  apAging: tenantProcedure
    .input(z.object({ asOf: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { rows: [], totals: { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 } };
      const tid = requireTenantId(ctx);
      const asOf = input?.asOf ? new Date(input.asOf) : new Date();
      const invRows = await db
        .select()
        .from(purchaseInvoices)
        .where(
          and(
            eq(purchaseInvoices.tenantId, tid),
            inArray(purchaseInvoices.status, ["confirmed", "partial"])
          )
        );
      const supRows = await db
        .select({ id: suppliers.id, name: suppliers.name })
        .from(suppliers)
        .where(eq(suppliers.tenantId, tid));
      const supMap = new Map(supRows.map(s => [s.id, s.name]));

      const bucketOf = (due: Date): string => {
        const days = Math.max(0, Math.floor((asOf.getTime() - due.getTime()) / 86400000));
        if (days <= 0) return "current";
        if (days <= 30) return "d30";
        if (days <= 60) return "d60";
        if (days <= 90) return "d90";
        return "over90";
      };

      const totals = { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 };
      const rows = invRows.map(inv => {
        const outstanding = Math.max(0, toNum(inv.total) - toNum(inv.paidAmount));
        const due = inv.dueDate ?? inv.invoiceDate;
        const bucket = bucketOf(due);
        totals[bucket as keyof typeof totals] += outstanding;
        return {
          invoiceNumber: inv.invoiceNumber,
          supplier: supMap.get(inv.supplierId ?? 0) ?? "غير معروف",
          invoiceDate: inv.invoiceDate,
          dueDate: due,
          outstanding,
          bucket,
        };
      });
      return { rows, totals };
    }),

  /** التدفقات النقدية — cash flow: net change by cash-asset account */
  cashFlow: tenantProcedure
    .input(
      z.object({ from: z.string().optional(), to: z.string().optional() }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { lines: [], net: 0 };
      const tid = requireTenantId(ctx);
      const conditions = [
        eq(transactions.tenantId, tid),
        eq(transactions.isReversed, false),
        inArray(transactions.lifecycleStatus, ACTIVE_LIFECYCLE),
      ];
      if (input?.from) conditions.push(gte(transactions.transactionDate, new Date(input.from)));
      if (input?.to) conditions.push(lte(transactions.transactionDate, new Date(input.to)));
      const txRows = await db
        .select()
        .from(transactions)
        .where(and(...conditions));

      const flows = new Map<number, number>();
      for (const tx of txRows) {
        const v = toNum(tx.amount);
        flows.set(tx.accountId, (flows.get(tx.accountId) ?? 0) + (tx.type === "debit" ? v : -v));
      }
      const acctRows = await db
        .select()
        .from(accounts)
        .where(eq(accounts.tenantId, tid));
      const acctMap = new Map(acctRows.map(a => [a.id, a]));

      const isCash = (type: string, code: string) =>
        type === "asset" && /^(1[01]|2[01])/.test(code);
      const lines = [...flows.entries()]
        .filter(([id]) => {
          const a = acctMap.get(id);
          return a && isCash(a.type, a.code);
        })
        .map(([id, v]) => ({
          accountId: id,
          code: acctMap.get(id)!.code,
          name: acctMap.get(id)!.name,
          net: v,
        }))
        .sort((a, b) => a.code.localeCompare(b.code, "ar"));

      return { lines, net: lines.reduce((s, l) => s + l.net, 0) };
    }),
});
