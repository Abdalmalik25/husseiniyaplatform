import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, tenantProcedure, requirePermissions } from "./_core/trpc";
import { getDb } from "./db";
import {
  products,
  warehouseStock,
  stockAdjustments,
  products as productsTable,
} from "../drizzle/schema";
import {
  addWarehouseStock,
  deductWarehouseStock,
  setWarehouseStock,
  recordStockMovement,
} from "./services/inventoryService";
import { PERMISSIONS } from "../shared/permissions";

export const inventoryRouter = router({
  // PAGINATION (mandatory): inventory is the highest-cardinality tenant table.
  // Default 200 / max 500 prevents full-table scans on large catalogs.
  // Clients needing more must paginate with offset.
  list: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_VIEW))
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(500).optional(),
          offset: z.number().int().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return [];
      return db
        .select()
        .from(productsTable)
        .where(eq(productsTable.tenantId, ctx.tenantId))
        .orderBy(productsTable.name)
        .limit(input?.limit ?? 200)
        .offset(input?.offset ?? 0);
    }),

  view: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_VIEW))
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return null;
      const [row] = await db
        .select()
        .from(productsTable)
        .where(and(eq(productsTable.id, input.id), eq(productsTable.tenantId, ctx.tenantId!)));
      return row;
    }),

  create: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_CREATE))
    .input(
      z.object({
        code: z.string().min(1).max(30),
        name: z.string().min(2).max(150),
        type: z.enum(["goods", "service"]).default("goods"),
        salePrice: z.string().optional(),
        purchasePrice: z.string().optional(),
        currentStock: z.number().int().default(0),
        minStock: z.number().int().default(0),
        // products.reorderPoint is decimal (string); numbers are stringified.
        reorderPoint: z.number().optional(),
        unitId: z.number().optional(),
        category: z.string().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const [row] = await db
        .insert(productsTable)
        .values({
          tenantId: ctx.tenantId,
          code: input.code,
          name: input.name,
          type: input.type,
          salePrice: input.salePrice,
          purchasePrice: input.purchasePrice,
          currentStock: input.currentStock,
          minStock: input.minStock,
          reorderPoint:
            input.reorderPoint !== undefined
              ? String(input.reorderPoint)
              : undefined,
          unitId: input.unitId,
          category: input.category,
          isActive: input.isActive,
        })
        .returning();
      return row;
    }),

  edit: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_EDIT))
    .input(
      z.object({
        id: z.number(),
        code: z.string().min(1).max(30).optional(),
        name: z.string().min(2).max(150).optional(),
        type: z.enum(["goods", "service"]).optional(),
        salePrice: z.string().optional(),
        purchasePrice: z.string().optional(),
        // Direct balance edits are FORBIDDEN here: every quantity change must
        // flow through adjustStock/physicalCount (→ inventoryService atomic
        // guarded writes + source-linked movement). Passing currentStock fails
        // closed with a pointer to the correct procedure.
        currentStock: z.number().optional(),
        minStock: z.number().int().optional(),
        reorderPoint: z.number().optional(),
        unitId: z.number().optional(),
        category: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      if (input.currentStock !== undefined)
        throw new Error(
          "تعديل الرصيد المباشر ممنوع — استخدم adjustStock أو physicalCount حتى تُسجَّل حركة مرتبطة بمستند مصدر"
        );
      const { id, currentStock: _forbidden, reorderPoint, ...rest } = input;
      const [row] = await db
        .update(productsTable)
        .set({
          ...rest,
          ...(reorderPoint !== undefined
            ? { reorderPoint: String(reorderPoint) }
            : {}),
        })
        .where(and(eq(productsTable.id, id), eq(productsTable.tenantId, ctx.tenantId!)))
        .returning();
      return row;
    }),

  delete: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_DELETE))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      await db
        .delete(productsTable)
        .where(and(eq(productsTable.id, input.id), eq(productsTable.tenantId, ctx.tenantId!)));
      return { success: true };
    }),

  adjustStock: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_VIEW))
    .input(
      z.object({
        productId: z.number(),
        // warehouse_stock.warehouseId is NOT NULL — the warehouse is required
        // (the old optional+null comparison never matched any row).
        warehouseId: z.number(),
        quantity: z.number().int().min(1),
        type: z.enum(["add", "remove", "set"]).default("add"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const tid = ctx.tenantId;
      const prevRows = await db
        .select({ quantity: warehouseStock.quantity })
        .from(warehouseStock)
        .where(
          and(
            eq(warehouseStock.tenantId, tid),
            eq(warehouseStock.productId, input.productId),
            eq(warehouseStock.warehouseId, input.warehouseId)
          )
        )
        .limit(1);
      const previousQty = prevRows[0]?.quantity ?? 0;
      const newQty =
        input.type === "add"
          ? previousQty + input.quantity
          : input.type === "remove"
            ? previousQty - input.quantity
            : input.quantity;

      await (db as any).transaction(async (tx: any) => {
        // All balance writes go through the CENTRAL STOCK GUARD
        // (atomic conditional UPDATE — never read-modify-write).
        if (input.type === "add") {
          await addWarehouseStock(tx, {
            tenantId: tid,
            productId: input.productId,
            warehouseId: input.warehouseId,
            quantity: input.quantity,
          });
        } else if (input.type === "remove") {
          const deducted = await deductWarehouseStock(tx, {
            tenantId: tid,
            productId: input.productId,
            warehouseId: input.warehouseId,
            quantity: input.quantity,
          });
          if (!deducted.success)
            throw new Error(
              `المخزون المتاح غير كافٍ — المطلوب: ${input.quantity}، المتاح: ${previousQty}`
            );
        } else {
          await setWarehouseStock(tx, {
            tenantId: tid,
            productId: input.productId,
            warehouseId: input.warehouseId,
            quantity: input.quantity,
          });
        }
        // Source document for the movement (audit trail).
        const [adj] = await tx.insert(stockAdjustments).values({
          tenantId: tid,
          productId: input.productId,
          warehouseId: input.warehouseId,
          previousQty,
          newQty,
          reason:
            input.type === "add"
              ? "إدخال"
              : input.type === "remove"
                ? "إخراج"
                : "تسوية",
          notes: input.notes ?? null,
          userId: ctx.user.id,
        }).returning({ id: stockAdjustments.id });
        const diff = newQty - previousQty;
        if (diff !== 0 && adj) {
          await recordStockMovement(tx, {
            tenantId: tid,
            productId: input.productId,
            warehouseId: input.warehouseId,
            type: diff > 0 ? "in" : "out",
            quantity: Math.abs(diff),
            referenceId: adj.id,
            referenceType: "stock_adjustment",
            notes: input.notes ?? null,
          });
        }
      });
      return { success: true, previousQty, newQty };
    }),

  physicalCount: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_VIEW))
    .input(
      z.object({
        productId: z.number(),
        warehouseId: z.number(),
        countedQty: z.number().int().min(0),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const tid = ctx.tenantId;
      const prevRows = await db
        .select({ quantity: warehouseStock.quantity })
        .from(warehouseStock)
        .where(
          and(
            eq(warehouseStock.tenantId, tid),
            eq(warehouseStock.productId, input.productId),
            eq(warehouseStock.warehouseId, input.warehouseId)
          )
        )
        .limit(1);
      const previousQty = prevRows[0]?.quantity ?? 0;

      await (db as any).transaction(async (tx: any) => {
        await setWarehouseStock(tx, {
          tenantId: tid,
          productId: input.productId,
          warehouseId: input.warehouseId,
          quantity: input.countedQty,
        });
        const [adj] = await tx.insert(stockAdjustments).values({
          tenantId: tid,
          productId: input.productId,
          warehouseId: input.warehouseId,
          previousQty,
          newQty: input.countedQty,
          reason: "جرد فعلي",
          notes: input.notes ?? null,
          userId: ctx.user.id,
        }).returning({ id: stockAdjustments.id });
        const diff = input.countedQty - previousQty;
        if (diff !== 0 && adj) {
          await recordStockMovement(tx, {
            tenantId: tid,
            productId: input.productId,
            warehouseId: input.warehouseId,
            type: diff > 0 ? "in" : "out",
            quantity: Math.abs(diff),
            referenceId: adj.id,
            referenceType: "stock_adjustment",
            notes: input.notes ?? `جرد فعلي: ${previousQty} ← ${input.countedQty}`,
          });
        }
      });
      return { success: true, previousQty, newQty: input.countedQty };
    }),
});