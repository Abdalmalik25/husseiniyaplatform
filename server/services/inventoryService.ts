/**
 * inventoryService — CENTRAL STOCK GUARD (الحارس المركزي الوحيد للمخزون).
 *
 * RULE: every write that changes a stock balance (`products.currentStock`,
 * `warehouse_stock.quantity/availableQty/reservedQty`, `inventory_batches.*`)
 * MUST go through this module. Direct `db.update(products/warehouseStock/…)`
 * from routers (POS, store, inventory, …) is forbidden — it bypasses the
 * atomic guarded decrement (`UPDATE … WHERE available >= qty`) and the
 * mandatory source-document linkage on every movement.
 *
 * - Deduction uses a single conditional UPDATE and checks `returning().length`
 *   so two concurrent sales on the last unit cannot both succeed and the
 *   balance can never go negative (DB CHECK constraints are defense in depth).
 * - Every movement row MUST carry `referenceId` + `referenceType`
 *   (order / pos_invoice / transfer / adjustment / …) — see
 *   `recordStockMovement`, which throws `movement_requires_source_document`
 *   otherwise.
 */
import { eq, and, gte, sql } from "drizzle-orm";
import {
  warehouseStock,
  inventoryBatches,
  inventoryMovements,
  products,
} from "../../drizzle/schema";

/**
 * True when `err` is a Postgres unique-violation (SQLSTATE 23505) — the
 * signal that a concurrent request already claimed the same idempotency key
 * (or order number). Callers must then re-read the existing row and return it
 * instead of inserting a second order / second stock movement.
 * Works for drizzle, neon-serverless and node-postgres error shapes.
 */
export function isUniqueViolationDatabaseError(err: unknown): boolean {
  const e = err as
    | { code?: unknown; cause?: { code?: unknown }; message?: unknown }
    | null
    | undefined;
  if (!e || typeof e !== "object") return false;
  if ((e as { code?: unknown }).code === "23505") return true;
  const cause = (e as { cause?: { code?: unknown } }).cause;
  if (cause && cause.code === "23505") return true;
  const msg = String((e as { message?: unknown }).message ?? e);
  return (
    msg.includes("23505") ||
    msg.includes("duplicate key value violates unique constraint")
  );
}

type DrizzleExecutor = {
  update: (table: any) => any;
  insert: (table: any) => any;
};

interface DeductWarehouseStockParams {
  tenantId: number;
  productId: number;
  warehouseId: number;
  quantity: number;
}

export async function deductWarehouseStock(
  db: DrizzleExecutor,
  params: DeductWarehouseStockParams
): Promise<{ success: boolean; error?: string }> {
  const result = await db
    .update(warehouseStock)
    .set({
      quantity: sql`${warehouseStock.quantity} - ${params.quantity}`,
      availableQty: sql`${warehouseStock.availableQty} - ${params.quantity}`,
      lastMovementAt: new Date(),
    })
    .where(
      and(
        eq(warehouseStock.tenantId, params.tenantId),
        eq(warehouseStock.productId, params.productId),
        eq(warehouseStock.warehouseId, params.warehouseId),
        gte(warehouseStock.availableQty, params.quantity)
      )
    )
    .returning({ id: warehouseStock.id });

  if (result.length === 0) {
    return { success: false, error: "insufficient_stock" };
  }
  return { success: true };
}

interface AddWarehouseStockParams {
  tenantId: number;
  productId: number;
  warehouseId: number;
  quantity: number;
}

export async function addWarehouseStock(
  db: DrizzleExecutor,
  params: AddWarehouseStockParams
): Promise<{ success: boolean }> {
  await db
    .insert(warehouseStock)
    .values({
      tenantId: params.tenantId,
      productId: params.productId,
      warehouseId: params.warehouseId,
      quantity: params.quantity,
      reservedQty: 0,
      availableQty: params.quantity,
      lastMovementAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        warehouseStock.productId,
        warehouseStock.warehouseId,
        warehouseStock.tenantId,
      ],
      set: {
        quantity: sql`${warehouseStock.quantity} + ${params.quantity}`,
        availableQty: sql`${warehouseStock.availableQty} + ${params.quantity}`,
        lastMovementAt: new Date(),
        updatedAt: new Date(),
      },
    });
  return { success: true };
}

interface SetWarehouseStockParams {
  tenantId: number;
  productId: number;
  warehouseId: number;
  quantity: number;
}

export async function setWarehouseStock(
  db: DrizzleExecutor,
  params: SetWarehouseStockParams
): Promise<{ success: boolean }> {
  await db
    .insert(warehouseStock)
    .values({
      tenantId: params.tenantId,
      productId: params.productId,
      warehouseId: params.warehouseId,
      quantity: params.quantity,
      reservedQty: 0,
      availableQty: params.quantity,
      lastMovementAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        warehouseStock.productId,
        warehouseStock.warehouseId,
        warehouseStock.tenantId,
      ],
      set: {
        quantity: params.quantity,
        availableQty: params.quantity,
        lastMovementAt: new Date(),
        updatedAt: new Date(),
      },
    });
  return { success: true };
}

interface DeductProductStockParams {
  productId: number;
  quantity: number;
}

export async function deductProductStock(
  db: DrizzleExecutor,
  params: DeductProductStockParams
): Promise<{ success: boolean; error?: string }> {
  const result = await db
    .update(products)
    .set({
      currentStock: sql`${products.currentStock} - ${params.quantity}`,
    })
    .where(
      and(
        eq(products.id, params.productId),
        gte(products.currentStock, params.quantity)
      )
    )
    .returning({ id: products.id });

  if (result.length === 0) {
    return { success: false, error: "insufficient_product_stock" };
  }
  return { success: true };
}

interface AddProductStockParams {
  productId: number;
  quantity: number;
}

export async function addProductStock(
  db: DrizzleExecutor,
  params: AddProductStockParams
): Promise<{ success: boolean }> {
  await db
    .update(products)
    .set({
      currentStock: sql`${products.currentStock} + ${params.quantity}`,
    })
    .where(eq(products.id, params.productId));
  return { success: true };
}

interface SetProductStockParams {
  productId: number;
  quantity: number;
}

export async function setProductStock(
  db: DrizzleExecutor,
  params: SetProductStockParams
): Promise<{ success: boolean }> {
  await db
    .update(products)
    .set({ currentStock: params.quantity })
    .where(eq(products.id, params.productId));
  return { success: true };
}

interface ReserveStockParams {
  tenantId: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  batchId?: number;
}

export async function reserveStock(
  db: DrizzleExecutor,
  params: ReserveStockParams
): Promise<{ success: boolean; error?: string }> {
  if (params.batchId) {
    const result = await db
      .update(inventoryBatches)
      .set({
        reservedQty: sql`${inventoryBatches.reservedQty} + ${params.quantity}`,
      })
      .where(
        and(
          eq(inventoryBatches.id, params.batchId),
          gte(
            sql`${inventoryBatches.quantity} - ${inventoryBatches.reservedQty}`,
            params.quantity
          )
        )
      )
      .returning({ id: inventoryBatches.id });
    if (result.length === 0) {
      return { success: false, error: "insufficient_batch_stock" };
    }
  } else {
    const result = await db
      .update(warehouseStock)
      .set({
        reservedQty: sql`${warehouseStock.reservedQty} + ${params.quantity}`,
        availableQty: sql`${warehouseStock.availableQty} - ${params.quantity}`,
      })
      .where(
        and(
          eq(warehouseStock.tenantId, params.tenantId),
          eq(warehouseStock.productId, params.productId),
          eq(warehouseStock.warehouseId, params.warehouseId),
          gte(warehouseStock.availableQty, params.quantity)
        )
      )
      .returning({ id: warehouseStock.id });
    if (result.length === 0) {
      return { success: false, error: "insufficient_stock" };
    }
  }
  return { success: true };
}

interface ReleaseReservationParams {
  tenantId: number;
  productId: number;
  warehouseId?: number;
  batchId?: number;
  quantity: number;
}

export async function releaseReservation(
  db: DrizzleExecutor,
  params: ReleaseReservationParams
): Promise<{ success: boolean }> {
  if (params.batchId) {
    await db
      .update(inventoryBatches)
      .set({
        reservedQty: sql`${inventoryBatches.reservedQty} - ${params.quantity}`,
      })
      .where(eq(inventoryBatches.id, params.batchId));
  } else if (params.warehouseId) {
    await db
      .update(warehouseStock)
      .set({
        reservedQty: sql`${warehouseStock.reservedQty} - ${params.quantity}`,
        availableQty: sql`${warehouseStock.availableQty} + ${params.quantity}`,
      })
      .where(
        and(
          eq(warehouseStock.tenantId, params.tenantId),
          eq(warehouseStock.productId, params.productId),
          eq(warehouseStock.warehouseId, params.warehouseId)
        )
      );
  }
  return { success: true };
}

interface FulfillReservationParams {
  tenantId: number;
  productId: number;
  warehouseId?: number;
  batchId?: number;
  quantity: number;
}

export async function fulfillReservation(
  db: DrizzleExecutor,
  params: FulfillReservationParams
): Promise<{ success: boolean; error?: string }> {
  if (params.batchId) {
    const result = await db
      .update(inventoryBatches)
      .set({
        quantity: sql`${inventoryBatches.quantity} - ${params.quantity}`,
        reservedQty: sql`${inventoryBatches.reservedQty} - ${params.quantity}`,
      })
      .where(
        and(
          eq(inventoryBatches.id, params.batchId),
          gte(inventoryBatches.quantity, params.quantity)
        )
      )
      .returning({ id: inventoryBatches.id });
    if (result.length === 0) {
      return { success: false, error: "insufficient_batch_stock" };
    }
  } else if (params.warehouseId) {
    const result = await db
      .update(warehouseStock)
      .set({
        quantity: sql`${warehouseStock.quantity} - ${params.quantity}`,
        reservedQty: sql`${warehouseStock.reservedQty} - ${params.quantity}`,
      })
      .where(
        and(
          eq(warehouseStock.tenantId, params.tenantId),
          eq(warehouseStock.productId, params.productId),
          eq(warehouseStock.warehouseId, params.warehouseId),
          gte(warehouseStock.quantity, params.quantity)
        )
      )
      .returning({ id: warehouseStock.id });
    if (result.length === 0) {
      return { success: false, error: "insufficient_stock" };
    }
  }
  return { success: true };
}

interface AdjustWarehouseStockParams {
  tenantId: number;
  productId: number;
  warehouseId: number;
  adjustmentQty: number;
}

export async function adjustWarehouseStock(
  db: DrizzleExecutor,
  params: AdjustWarehouseStockParams
): Promise<{ success: boolean; error?: string }> {
  if (params.adjustmentQty > 0) {
    await db
      .insert(warehouseStock)
      .values({
        tenantId: params.tenantId,
        productId: params.productId,
        warehouseId: params.warehouseId,
        quantity: params.adjustmentQty,
        reservedQty: 0,
        availableQty: params.adjustmentQty,
        lastMovementAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          warehouseStock.productId,
          warehouseStock.warehouseId,
          warehouseStock.tenantId,
        ],
        set: {
          quantity: sql`${warehouseStock.quantity} + ${params.adjustmentQty}`,
          availableQty: sql`${warehouseStock.availableQty} + ${params.adjustmentQty}`,
          lastMovementAt: new Date(),
          updatedAt: new Date(),
        },
      });
  } else if (params.adjustmentQty < 0) {
    const absQty = Math.abs(params.adjustmentQty);
    const result = await db
      .update(warehouseStock)
      .set({
        quantity: sql`${warehouseStock.quantity} - ${absQty}`,
        availableQty: sql`${warehouseStock.availableQty} - ${absQty}`,
        lastMovementAt: new Date(),
      })
      .where(
        and(
          eq(warehouseStock.tenantId, params.tenantId),
          eq(warehouseStock.productId, params.productId),
          eq(warehouseStock.warehouseId, params.warehouseId),
          gte(warehouseStock.quantity, absQty)
        )
      )
      .returning({ id: warehouseStock.id });
    if (result.length === 0) {
      return { success: false, error: "insufficient_stock_for_adjustment" };
    }
  }
  return { success: true };
}

interface LogInventoryMovementParams {
  tenantId: number;
  productId: number;
  warehouseId?: number | null;
  type: string;
  quantity: number;
  referenceId?: number | null;
  referenceType?: string | null;
  notes?: string | null;
}

/**
 * The ONLY sanctioned way to append a stock-movement row.
 * `referenceId` + `referenceType` are mandatory: an orphan movement (no source
 * document) is rejected so every balance change stays traceable to the order /
 * POS invoice / transfer / adjustment that caused it.
 */
export async function recordStockMovement(
  db: DrizzleExecutor,
  params: LogInventoryMovementParams
): Promise<void> {
  if (params.referenceId == null || !params.referenceType) {
    throw new Error(
      "movement_requires_source_document: every stock_movement must link referenceId + referenceType"
    );
  }
  await db.insert(inventoryMovements).values({
    tenantId: params.tenantId,
    productId: params.productId,
    warehouseId: params.warehouseId ?? null,
    type: params.type as any,
    quantity: params.quantity,
    referenceId: params.referenceId,
    referenceType: params.referenceType,
    notes: params.notes ?? null,
  });
}

export async function logInventoryMovement(
  db: DrizzleExecutor,
  params: LogInventoryMovementParams
): Promise<void> {
  return recordStockMovement(db, params);
}

interface InvoiceItem {
  productId: number;
  warehouseId: number;
  quantity: number;
}

interface DeductStockForInvoiceParams {
  tenantId: number;
  items: InvoiceItem[];
  referenceId?: number;
  referenceType: string;
  movementNotes?: string;
}

export async function deductStockForInvoice(
  db: DrizzleExecutor,
  params: DeductStockForInvoiceParams
): Promise<{ success: boolean; errors?: string[] }> {
  const errors: string[] = [];

  for (const item of params.items) {
    const productResult = await deductProductStock(db, {
      productId: item.productId,
      quantity: item.quantity,
    });
    if (!productResult.success) {
      errors.push(
        `Insufficient product stock for product ${item.productId}: ${productResult.error}`
      );
    }

    const warehouseResult = await deductWarehouseStock(db, {
      tenantId: params.tenantId,
      productId: item.productId,
      warehouseId: item.warehouseId,
      quantity: item.quantity,
    });
    if (!warehouseResult.success) {
      errors.push(
        `Insufficient warehouse stock for product ${item.productId} in warehouse ${item.warehouseId}: ${warehouseResult.error}`
      );
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }
  return { success: true };
}
