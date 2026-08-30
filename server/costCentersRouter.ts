import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, tenantProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { costCenters } from "../drizzle/schema";

export const costCentersRouter = router({
  list: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db || !ctx.tenantId) return [];
    return db
      .select()
      .from(costCenters)
      .where(eq(costCenters.tenantId, ctx.tenantId))
      .orderBy(costCenters.code);
  }),
  create: tenantProcedure
    .input(
      z.object({
        code: z.string().min(1).max(30),
        name: z.string().min(1).max(150),
        parentId: z.number().nullable().optional(),
        costType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const [row] = await db
        .insert(costCenters)
        .values({
          tenantId: ctx.tenantId,
          code: input.code,
          name: input.name,
          parentId: input.parentId ?? null,
          type: (input.costType as any) || "cost",
        })
        .returning();
      return row;
    }),
  remove: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      await db
        .delete(costCenters)
        .where(
          and(
            eq(costCenters.id, input.id),
            eq(costCenters.tenantId, ctx.tenantId!)
          )
        );
      return { success: true };
    }),
});
