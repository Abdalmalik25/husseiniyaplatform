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
import { ENV } from "./env";
import { logger } from "./logger";

export function createApp(): Express {
  const app = express();

  // Hide X-Powered-By header
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  // 12-factor request correlation — every request gets x-request-id early so
  // both access logs and error logs can be joined.
  app.use((req, _res, next) => {
    const id =
      (req.headers["x-request-id"] as string) ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    (req as any).requestId = id;
    next();
  });

  // Helmet security headers — aligned with vercel.json (CSP + COOP/CORP).
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
          connectSrc: [
            "'self'",
            "https://*.neon.tech",
            "https://*.vercel.app",
            "https://fonts.googleapis.com",
            "https://fonts.gstatic.com",
          ],
          workerSrc: ["'self'", "blob:"],
          manifestSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "same-origin" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xDnsPrefetchControl: { allow: true },
    })
  );

  // PERFORMANCE: Enable gzip/brotli compression for all responses.
  // This significantly reduces payload sizes for JSON API responses and
  // static assets, improving load times especially on slower connections.
  app.use(compression());

  // Rate limiting — Vercel-aware.
  // - `trust proxy:1` above ensures `req.ip` is the real client behind Vercel's edge.
  // - `validate:false` silences express-rate-limit's trust-proxy warning which we
  //   handle explicitly. Memory store is per-lambda (acceptable for 5/hour guest
  //   orders); set `UPSTASH_REDIS_REST_URL` to upgrade to Redis without code change
  //   (the import is lazy so the bundle stays lean).
  const maybeRedisStore = (() => {
    try {
      // Lazy: only if the operator provisioned Upstash (Vercel Marketplace → Upstash Redis).
      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Redis } = require("@upstash/redis");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { RedisStore } = require("rate-limit-redis");
        const client = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        return new RedisStore({ sendCommand: (...args: string[]) => (client as any).sendCommand(args) });
      }
    } catch {
      // No Redis — fall back to in-memory (documented in rateLimit.ts).
    }
    return undefined;
  })();

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "تم تجاوز الحد المسموح من طلبات API." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    ...(maybeRedisStore ? { store: maybeRedisStore } : {}),
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: "تم تجاوز الحد المسموح من محاولات تسجيل الدخول." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    ...(maybeRedisStore ? { store: maybeRedisStore } : {}),
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

  // Structured access log — now via logger.info (Vercel JSON drain).
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) {
        logger.info("access", {
          requestId: (req as any).requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          ms: Date.now() - start,
        });
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
      institution: "مجموعة الحسينية — حلول الأعمال والهندسة والمعرفة",
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

  // Global error handler — correlation via logger.error.
  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      const requestId = (req as any).requestId || (req.headers["x-request-id"] as string) || "unknown";
      logger.error("unhandled", {
        requestId,
        path: req.path,
        method: req.method,
        message: err?.message ?? String(err),
        stack: ENV.isProduction ? undefined : err?.stack,
      });
      res.setHeader("x-request-id", requestId);
      const status = err?.status ?? err?.statusCode ?? 500;
      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: "خطأ داخلي في الخادم",
        requestId,
      });
    }
  );

  return app;
}
