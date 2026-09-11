import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  tenantId: number | null;
  /** True only for the platform owner (super-admin / مالك المنصة). */
  isSuperAdmin: boolean;
};

/**
 * Resolve the effective tenant for a request.
 *
 *  - Regular user  → bound to their own `user.tenantId`.
 *  - Platform owner → may override the tenant via the `x-tenant-id` header,
 *    enabling secure super-admin "switch into tenant" without re-auth.
 *    The header is only honoured for the owner; any other caller's value is
 *    ignored so a tenant can never impersonate another tenant.
 */
function resolveTenantId(
  user: User | null,
  req: CreateExpressContextOptions["req"]
): { tenantId: number | null; isSuperAdmin: boolean } {
  if (!user) return { tenantId: null, isSuperAdmin: false };
  if (user.openId !== ENV.ownerOpenId)
    return { tenantId: user.tenantId ?? null, isSuperAdmin: false };

  const headerVal = req.headers["x-tenant-id"];
  if (typeof headerVal === "string") {
    const parsed = Number.parseInt(headerVal, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      // P0 hardening: التحقق من وجود المستأجر سيتم لاحقاً في طبقة DB
      // هنا نمرر القيمة فقط مع تمييز superAdmin؛ الرفض يكون في الـ middleware
      // لا نسمح بتهريب tenant وهمي — التحقق الحقيقي في enforceSuperAdminTenantExists
      return { tenantId: parsed, isSuperAdmin: true };
    }
  }
  return { tenantId: user.tenantId ?? null, isSuperAdmin: true };
}

/** يتحقق وجود المستأجر عند استخدام x-tenant-id للمالك — يمنع IDOR */
export async function enforceSuperAdminTenantExists(
  ctx: { tenantId: number | null; isSuperAdmin: boolean; user: User | null },
  db: any
): Promise<void> {
  if (!ctx.isSuperAdmin || !ctx.tenantId) return;
  // إذا كان tenantId يأتي من x-tenant-id، تحقق أنه موجود فعلاً
  const { tenants } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const rows = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, ctx.tenantId)).limit(1);
  if (rows.length === 0) {
    throw new Error(`المستأجر #${ctx.tenantId} غير موجود`);
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  const { tenantId, isSuperAdmin } = resolveTenantId(user, opts.req);

  return {
    req: opts.req,
    res: opts.res,
    user,
    tenantId,
    isSuperAdmin,
  };
}
