/**
 * Server-side RBAC middleware and helpers.
 *
 * Resolution order for user permissions:
 *  1. Platform owner → all permissions (bypass)
 *  2. user.role enum (admin/owner) → role-based defaults from ROLE_DEFINITIONS
 *  3. roles table (custom roles) → JSON permissions column merged with defaults
 *
 * Every tRPC procedure that needs a specific permission should use
 * `requirePermission(permissionKey)` as a middleware.
 */
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import {
  PERMISSIONS,
  ROLE_DEFINITIONS,
  permissionsForRole,
  type PermissionKey,
  type RoleCode,
} from "../../shared/permissions";
import { getDb } from "../db";
import { users, roles, userRoles } from "../../drizzle/schema";
import type { TrpcContext } from "./context";

// Re-export the canonical permission-key type so routers can import it
// from a single server-side entry point (`./rbac`).
export type { PermissionKey } from "../../shared/permissions";

// ─── Permission Resolution ──────────────────────────────────────

/**
 * Resolve the full set of effective permission keys for a user.
 * Returns a deduplicated array of permission key strings.
 */
export async function resolveUserPermissions(
  ctx: TrpcContext
): Promise<string[]> {
  // Platform owner gets everything
  if (ctx.isSuperAdmin) {
    return Object.values(PERMISSIONS) as string[];
  }

  if (!ctx.user) return [];

  const userRole = (ctx.user.role as RoleCode) || "user";

  // Start with role-based defaults
  const rolePerms = new Set<string>(permissionsForRole(userRole) as string[]);

  // Merge custom role permissions from the roles table
  if (ctx.tenantId) {
    const db = await getDb();
    if (db) {
      // Get custom roles assigned to this user via userRoles junction
      const assignedRoles = await db
        .select({ roleId: userRoles.roleId })
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, ctx.user.id),
            eq(userRoles.tenantId, ctx.tenantId)
          )
        );

      if (assignedRoles.length > 0) {
        const roleIds = assignedRoles.map(r => r.roleId);
        const customRoles = await db
          .select()
          .from(roles)
          .where(eq(roles.tenantId, ctx.tenantId));

        for (const role of customRoles) {
          if (roleIds.includes(role.id) && role.permissions) {
            try {
              const perms = Array.isArray(role.permissions)
                ? role.permissions
                : typeof role.permissions === "string"
                  ? JSON.parse(role.permissions)
                  : [];
              for (const p of perms) {
                if (typeof p === "string") rolePerms.add(p);
              }
            } catch {
              // malformed JSON — skip
            }
          }
        }
      }
    }
  }

  return Array.from(rolePerms);
}

/**
 * Check if a user has a specific permission.
 */
export async function userHasPermission(
  ctx: TrpcContext,
  permission: PermissionKey
): Promise<boolean> {
  const perms = await resolveUserPermissions(ctx);
  return perms.includes(permission);
}

/**
 * Check if a user has ALL of the specified permissions.
 */
export async function userHasAllPermissions(
  ctx: TrpcContext,
  required: PermissionKey[]
): Promise<boolean> {
  const perms = await resolveUserPermissions(ctx);
  return required.every(p => perms.includes(p));
}

/**
 * Check if a user has ANY of the specified permissions.
 */
export async function userHasAnyPermission(
  ctx: TrpcContext,
  required: PermissionKey[]
): Promise<boolean> {
  const perms = await resolveUserPermissions(ctx);
  return required.some(p => perms.includes(p));
}

// ─── Error Messages ──────────────────────────────────────────────

export const PERMISSION_DENIED_MSG = "ليس لديك صلاحية لتنفيذ هذا الإجراء";
export const ADMIN_REQUIRED_MSG = "هذا الإجراء متاح للمديرين فقط";

// ─── Quick Role Checks ───────────────────────────────────────────

export function isOwnerOrAdmin(ctx: TrpcContext): boolean {
  if (ctx.isSuperAdmin) return true;
  if (!ctx.user) return false;
  return ctx.user.role === "admin" || ctx.user.role === "owner";
}

export function isAdmin(ctx: TrpcContext): boolean {
  if (ctx.isSuperAdmin) return true;
  if (!ctx.user) return false;
  return ctx.user.role === "admin";
}

export function isAccountant(ctx: TrpcContext): boolean {
  if (!ctx.user) return false;
  const role = ctx.user.role as RoleCode;
  return role === "accountant" || role === "admin" || ctx.isSuperAdmin;
}

export function isAuditor(ctx: TrpcContext): boolean {
  if (!ctx.user) return false;
  return ctx.user.role === "auditor";
}
