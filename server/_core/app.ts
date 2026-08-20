import "dotenv/config";
import express, { type Express } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerWebApi } from "./webApi";
import { appRouter } from "../routers";
import { createContext } from "./context";

export function createApp(): Express {
  const app = express();

  // Hide X-Powered-By header
  app.disable("x-powered-by");

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

  // Rate limiting - general
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per window
    message: {
      error: "تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

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

  // Apply general rate limiting
  app.use(generalLimiter);

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

  // Plain health endpoint for uptime monitors (no auth required)
  app.get("/api/health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      ok: true,
      service: "alhusainia-platform",
      institution: "مؤسسة الحسينية لخدمات الأعمال ومكتبة الحسينية الحديثة",
      version: "1.2.0",
      status: "Operational",
      security: "ISO-Compliant",
      time: new Date().toISOString(),
    });
  });
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerWebApi(app);
  // tRPC API
  // GET queries are cacheable at the edge for seconds (single-tenant data set);
  // mutations (POST/PATCH) are never cached.
  app.use("/api/trpc", apiLimiter);
  app.use("/api/trpc", (req, res, next) => {
    if (req.method === "GET") {
      res.setHeader(
        "Cache-Control",
        "public, s-maxage=30, stale-while-revalidate=90"
      );
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
