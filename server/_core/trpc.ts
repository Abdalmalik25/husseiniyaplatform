import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import * as Sentry from "@sentry/node";
import type { TrpcContext } from "./context";
import { enforceSubscription } from "./subscription";
import { requireOwner } from "./tenant";
import { logger } from "./logger";
import {
  classifyTrpcRoute,
  deriveTraceId,
  recordTrpcRequest,
} from "./observability";
import {
  resolveUserPermissions,
  PERMISSION_DENIED_MSG,
  type PermissionKey,
} from "./rbac";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

/**
 * observabilityMiddleware — runs FIRST on every procedure (see the exported
 * procedure builders below). Emits one structured JSON log per tRPC call via
 * the SINGLE logger/redact() entrypoint:
 *   { requestId, traceId, tenantId, route, type, kind, durationMs, ok }
 * and records the sample in the in-memory SLI store that feeds GET /api/slo.
 * The traceId extends x-request-id (or honours W3C `traceparent`).
 */
const observabilityMiddleware = t.middleware(async opts => {
  const { ctx, next, path, type } = opts;
  const start = Date.now();
  const traceId = deriveTraceId(
    ctx.requestId,
    (ctx.req.headers as Record<string, unknown>)?.["traceparent"]
  );
  try {
    Sentry.getCurrentScope?.().setTag("trace_id", traceId);
  } catch {
    /* Sentry optional */
  }
  const route = path ?? "unknown";
  try {
    const result = await next();
    const durationMs = Date.now() - start;
    const kind = classifyTrpcRoute(route, type);
    recordTrpcRequest({ route, kind, durationMs, ok: true });
    logger.info("trpc", {
      requestId: ctx.requestId,
      traceId,
      tenantId: ctx.tenantId ?? undefined,
      route,
      type,
      kind,
      durationMs,
      ok: true,
    });
    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    const kind = classifyTrpcRoute(route, type);
    recordTrpcRequest({ route, kind, durationMs, ok: false });
    logger.error("trpc_error", {
      requestId: ctx.requestId,
      traceId,
      tenantId: ctx.tenantId ?? undefined,
      route,
      type,
      kind,
      durationMs,
      ok: false,
      code: (err as { code?: unknown })?.code,
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
});

export const publicProcedure = t.procedure.use(observabilityMiddleware);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  const user = ctx.user;

  return next({
    ctx: {
      ...ctx,
      user,
    },
  });
});

const requireTenant = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (!ctx.tenantId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "يجب ربط المستخدم بمؤسسة (tenant) قبل تنفيذ العملية",
    });
  }
  const user = ctx.user;

  // Subscription lifecycle: suspended tenants are blocked; an expired
  // trial auto-transitions to grace (never blocks the business).
  await enforceSubscription(ctx.tenantId);

  return next({
    ctx: {
      ...ctx,
      user,
      tenantId: ctx.tenantId,
    },
  });
});

export const protectedProcedure = t.procedure
  .use(observabilityMiddleware)
  .use(requireUser);
export const tenantProcedure = t.procedure
  .use(observabilityMiddleware)
  .use(requireTenant);

export const adminProcedure = t.procedure
  .use(observabilityMiddleware)
  .use(requireTenant)
  .use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    const user = ctx.user;

    return next({
      ctx: {
        ...ctx,
        user,
      },
    });
  })
);

// ─── Platform owner (super-admin) procedure ────────────────────────
/**
 * `ownerProcedure` — للإجراءات الحصرية بمالك المنصة (إدارة بوابات الدفع،
 * سياسات الاشتراك، إدارة المستأجرين). يعتمد `requireOwner` من tenant.ts
 * والذي يقارن `openId` مع `OWNER_OPEN_ID`.
 */
export const ownerProcedure = t.procedure
  .use(observabilityMiddleware)
  .use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    requireOwner(ctx);
    const user = ctx.user;
    return next({ ctx: { ...ctx, user, tenantId: ctx.tenantId } });
  })
);

/**
 * `requirePermissions` — middleware factory enforcing granular RBAC.
 *
 * Usage:
 *   myProc: tenantProcedure
 *     .use(requirePermissions(PERMISSIONS.VOUCHERS_CREATE))
 *     .mutation(...)
 *
 * Accepts a single key, or `all`/`any` arrays for compound requirements:
 *   .use(requirePermissions({ all: [A, B] }))
 *   .use(requirePermissions({ any: [A, B] }))
 */
export function requirePermissions(
  required: PermissionKey | { all: PermissionKey[] } | { any: PermissionKey[] }
) {
  const keys: PermissionKey[] =
    typeof required === "string"
      ? [required]
      : "all" in required
        ? required.all
        : required.any;
  const mode =
    typeof required === "object" && "any" in required ? "any" : "all";

  return t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    const user = ctx.user;

    // The platform owner (super-admin) bypasses granular checks.
    if (ctx.isSuperAdmin) {
      return next({ ctx: { ...ctx, user } });
    }

    const userPerms = await resolveUserPermissions(ctx);

    const ok =
      mode === "any"
        ? keys.some(k => userPerms.includes(k))
        : keys.every(k => userPerms.includes(k));

    if (!ok) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: PERMISSION_DENIED_MSG,
      });
    }

    // Re-assert the narrowed `user` so downstream handlers keep the
    // non-null type guaranteed by `tenantProcedure`/`requireUser`.
    return next({ ctx: { ...ctx, user } });
  });
}
