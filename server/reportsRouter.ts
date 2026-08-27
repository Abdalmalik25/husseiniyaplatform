import { eq } from "drizzle-orm";
import { router, tenantProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { salesReps } from "../drizzle/schema";

/**
 * reportsRouter — منفصل معيارياً لتقارير الربحية والتحليلات التشغيلية
 * تم استخراجه من modulesRouter لخفض ترابط النواة وتحسين قابلية الاختبار
 */
export const reportsRouter = router({
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
});
