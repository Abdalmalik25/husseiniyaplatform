import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { enforceSubscription } from "./subscription";
import { requireOwner } from "./tenant";

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

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const requireTenant = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  // Subscription lifecycle: suspended tenants are blocked; an expired
  // trial auto-transitions to grace (never blocks the business).
  if (ctx.tenantId) {
    await enforceSubscription(ctx.tenantId);
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      tenantId: ctx.tenantId,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);
export const tenantProcedure = t.procedure.use(requireTenant);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
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
    return next({ ctx: { ...ctx, user: ctx.user, tenantId: ctx.tenantId } });
  })
);
