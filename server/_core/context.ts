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
      return { tenantId: parsed, isSuperAdmin: true };
    }
  }
  return { tenantId: user.tenantId ?? null, isSuperAdmin: true };
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
