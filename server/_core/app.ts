import "dotenv/config";
import express, { type Express } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerWebApi } from "./webApi";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

export function createApp(): Express {
  const app = express();

  // Hide X-Powered-By header
  app.disable("x-powered-by");
  // Trust one reverse-proxy hop (Vercel/nginx) so `req.ip` and the per-IP
  // rate limiters see the real client address — otherwise every visitor
  // shares a single bucket and throttling becomes meaningless in prod.
  app.set("trust proxy", 1);

  // Helmet security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: ["'self'", "https://*.neon.tech", "https://*.vercel.app"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );

  // PERFORMANCE: Enable gzip/brotli compression for all responses.
  // This significantly reduces payload sizes for JSON API responses and
  // static assets, improving load times especially on slower connections.
  app.use(compression());

  // Rate limiting - API endpoints (stricter)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { error: "تم تجاوز الحد المسموح من طلبات API." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate limiting - auth endpoints (very strict)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per window
    message: { error: "تم تجاوز الحد المسموح من محاولات تسجيل الدخول." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Configure body parser with reasonable size limit
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Middleware to catch malformed JSON body errors
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (
        err instanceof SyntaxError &&
        (err as any).status === 400 &&
        "body" in (err as any)
      ) {
        res.status(400).json({ error: "Invalid JSON Payload" });
        return;
      }
      next(err);
    }
  );

  // Structured request logging (JSON lines) — one line per API request with
  // duration, so production incidents are diagnosable without extra tooling.
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) {
        console.log(
          JSON.stringify({
            t: new Date().toISOString(),
            method: req.method,
            path: req.path,
            status: res.statusCode,
            ms: Date.now() - start,
          })
        );
      }
    });
    next();
  });

  // Deep health endpoint for uptime monitors (no auth required).
  // Actually pings the database so a silent DB outage is detected (503).
  app.get("/api/health", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    let dbAvailable = false;
    try {
      const db = await getDb();
      if (db) {
        await db.execute(sql`select 1`);
        dbAvailable = true;
      }
    } catch {
      dbAvailable = false;
    }
    res.status(dbAvailable ? 200 : 503).json({
      ok: true,
      dbAvailable,
      service: "alhusainia-platform",
      institution: "مؤسسة الحسينية لخدمات الأعمال ومكتبة الحسينية الحديثة",
      version:
        typeof __APP_VERSION__ !== "undefined"
          ? __APP_VERSION__
          : // dev (tsx) runs without the esbuild define
            "dev",
      status: dbAvailable ? "Operational" : "Degraded (DB unreachable)",
      security: "ISO-Compliant",
      time: new Date().toISOString(),
    });
  });
  registerStorageProxy(app);

  // SECURITY: Throttle the unauthenticated surfaces explicitly.
  // - /api/oauth performs token exchange, so it gets the strict auth limiter.
  // - /api/web is the public storefront (including place-order writes).
  app.use("/api/oauth", authLimiter);
  app.use("/api/web", apiLimiter);

  registerOAuthRoutes(app);
  registerWebApi(app);
  // tRPC API
  // IMPORTANT (multi-tenant): responses are tenant-scoped and authenticated,
  // so they must NEVER be cached at a shared/CDN edge. A public s-maxage would
  // let one tenant's query result be served to another tenant (the cache key is
  // the URL only, ignoring the x-tenant-id header and the session cookie).
  // Mutations (POST/PATCH) are never cached regardless.
  app.use("/api/trpc", apiLimiter);
  app.use("/api/trpc", (req, res, next) => {
    if (req.method === "GET") {
      res.setHeader("Cache-Control", "no-store, private");
      res.setHeader("Vary", "x-tenant-id, cookie");
    }
    next();
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Global error handler
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error("[Error]", err);
      res.status(500).json({ error: "خطأ داخلي في الخادم" });
    }
  );

  return app;
}
