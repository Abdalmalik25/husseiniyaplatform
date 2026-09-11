import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { enforceSubscription } from "./subscription";
import { requireOwner } from "./tenant";
import {
  resolveUserPermissions,
  PERMISSION_DENIED_MSG,
  type PermissionKey,
} from "./rbac";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

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
    throw new TRPCError({ code: "FORBIDDEN", message: "يجب ربط المستخدم بمؤسسة (tenant) قبل تنفيذ العملية" });
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

export const protectedProcedure = t.procedure.use(requireUser);
export const tenantProcedure = t.procedure.use(requireTenant);

export const adminProcedure = t.procedure.use(requireTenant).use(
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
export const ownerProcedure = t.procedure.use(
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
  required:
    | PermissionKey
    | { all: PermissionKey[] }
    | { any: PermissionKey[] }
) {
  const keys: PermissionKey[] =
    typeof required === "string"
      ? [required]
      : "all" in required
        ? required.all
        : required.any;
  const mode = typeof required === "object" && "any" in required ? "any" : "all";

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
      throw new TRPCError({ code: "FORBIDDEN", message: PERMISSION_DENIED_MSG });
    }

    // Re-assert the narrowed `user` so downstream handlers keep the
    // non-null type guaranteed by `tenantProcedure`/`requireUser`.
    return next({ ctx: { ...ctx, user } });
  });
}
