import { eq, and, or, ilike, inArray, asc } from "drizzle-orm";
import { z } from "zod";
import { products, customers, orders, orderItems, inventoryMovements } from "../drizzle/schema";
import type { getDb } from "./db";

export type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export const catalogInputSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
});

export const placeOrderInputSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.number(),
    quantity: z.number().int().min(1),
  })).min(1),
});
export type PlaceOrderInput = z.infer<typeof placeOrderInputSchema>;

export async function getCatalog(db: Db, input?: z.infer<typeof catalogInputSchema>) {
  const conditions = [eq(products.isActive, true)];
  if (input?.search) {
    conditions.push(or(
      ilike(products.name, `%${input.search}%`),
      ilike(products.code, `%${input.search}%`),
      ilike(products.barcode, `%${input.search}%`)
    )!);
  }
  if (input?.category && input.category !== "all") conditions.push(eq(products.category, input.category));
  const items = await db.select({
    id: products.id,
    code: products.code,
    name: products.name,
    category: products.category,
    unit: products.unit,
    salePrice: products.salePrice,
    currentStock: products.currentStock,
    minStock: products.minStock,
    barcode: products.barcode,
  }).from(products).where(and(...conditions)!)
    .orderBy(asc(products.category), asc(products.name)).limit(500);
  const cats = await db.selectDistinct({ category: products.category })
    .from(products).where(eq(products.isActive, true));
  return { items, categories: cats.map(c => c.category).filter((c): c is string => !!c).sort() };
}

export async function placePublicOrder(db: Db, input: PlaceOrderInput) {
  const productIds = input.items.map(i => i.productId);
  const productRows = await db.select().from(products).where(inArray(products.id, productIds));
  if (productRows.length !== productIds.length) throw new Error("واحد أو أكثر من الأصناف غير متوفر حالياً");
  const productMap = new Map(productRows.map(p => [p.id, p]));
  for (const item of input.items) {
    const p = productMap.get(item.productId)!;
    const stock = p.currentStock || 0;
    if (stock <= 0) throw new Error(`«${p.name}» غير متوفر حالياً`);
    if (stock < item.quantity) throw new Error(`الكمية المطلوبة من «${p.name}» تتجاوز المتوفر (${stock} ${p.unit})`);
  }

  const itemValues = input.items.map(item => {
    const p = productMap.get(item.productId)!;
    const unitPrice = p.salePrice && parseFloat(p.salePrice) > 0 ? p.salePrice : "0";
    return {
      productId: p.id,
      productName: p.name,
      quantity: item.quantity,
      unitPrice,
      total: (parseFloat(unitPrice) * item.quantity).toFixed(2),
    };
  });
  const total = itemValues.reduce((s, it) => s + parseFloat(it.total), 0);

  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const orderNumber = `WEB-${datePart}-${randPart}`;

  let customerId: number | null = null;
  const phone = input.customerPhone ? input.customerPhone.replace(/[\s-]/g, "") : "";
  if (phone) {
    const existing = await db.select().from(customers)
      .where(eq(customers.phone, phone)).limit(1);
    if (existing.length > 0) {
      customerId = existing[0].id;
    } else if (input.customerName.trim()) {
      const [cust] = await db.insert(customers).values({
        code: `WEB-${datePart}-${randPart}`,
        name: input.customerName.trim(),
        phone,
        address: input.deliveryAddress || null,
        city: null,
        creditLimit: "0",
        balance: "0",
        notes: "عميل المتجر الإلكتروني",
      }).returning();
      customerId = cust.id;
    }
  }

  const result = await (db as any).transaction(async (tx: any) => {
    const [order] = await tx.insert(orders).values({
      orderNumber,
      customerId,
      total: total.toFixed(2),
      deliveryAddress: input.deliveryAddress || null,
      deliveryNotes: input.notes || "طلب من المتجر الإلكتروني",
      assignedTo: "المتجر الإلكتروني",
      status: "pending",
    }).returning();

    await tx.insert(orderItems).values(itemValues.map(it => ({ ...it, orderId: order.id })));

    for (const it of itemValues) {
      const p = productMap.get(it.productId)!;
      await tx.update(products).set({
        currentStock: (p.currentStock || 0) - it.quantity,
      }).where(eq(products.id, it.productId));
      await tx.insert(inventoryMovements).values({
        productId: p.id,
        type: "out",
        quantity: it.quantity,
        referenceId: order.id,
        referenceType: "order",
        notes: `طلب متجر إلكتروني ${orderNumber}`,
      });
    }
    return { orderId: order.id, orderNumber };
  });

  if (process.env.ORDER_WEBHOOK_URL) {
    const payload = {
      event: "order.created",
      orderNumber,
      customerName: input.customerName,
      customerPhone: phone || null,
      deliveryAddress: input.deliveryAddress || null,
      notes: input.notes || null,
      total: total.toFixed(2),
      items: itemValues.map(it => ({ name: it.productName, quantity: it.quantity, unitPrice: it.unitPrice, total: it.total })),
      timestamp: new Date().toISOString(),
    };
    fetch(process.env.ORDER_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  return result;
}