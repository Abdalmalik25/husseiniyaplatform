import type { Express } from "express";
import { getCatalog, placePublicOrder, catalogInputSchema, placeOrderInputSchema } from "../webStore";
import { getDb } from "../db";

/**
 * Public REST endpoints for website integration (separate from the platform UI).
 * - No authentication required by design: these mirror the public storefront.
 * - CORS is open so any company website (WordPress/PHP/static) can read the
 *   catalog and submit orders directly into the shared database.
 * - The website NEVER touches the admin UI or protected procedures.
 */
export function registerWebApi(app: Express) {
  app.use("/api/web", (_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (_req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // GET /api/web/catalog?search=..&category=..  →  { items, categories }
  app.get("/api/web/catalog", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        res.status(503).json({ ok: false, error: "قاعدة البيانات غير متاحة" });
        return;
      }
      const parsed = catalogInputSchema.safeParse({
        search: typeof req.query.search === "string" ? req.query.search : undefined,
        category: typeof req.query.category === "string" ? req.query.category : undefined,
      });
      const data = await getCatalog(db, parsed.success ? parsed.data : {});
      res.status(200).json({ ok: true, ...data });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  // POST /api/web/place-order  →  { ok, orderId, orderNumber }
  app.post("/api/web/place-order", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        res.status(503).json({ ok: false, error: "قاعدة البيانات غير متاحة" });
        return;
      }
      const parsed = placeOrderInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: parsed.error.issues.map(i => i.message).join("؛ "),
        });
        return;
      }
      const result = await placePublicOrder(db, parsed.data);
      res.status(200).json({ ok: true, ...result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: String(e?.message || e) });
    }
  });
}