import { trpc } from "@/lib/trpc";
import { PERMISSIONS } from "../../../shared/permissions";

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Client-side permission gate. The server remains the source of truth
 * (every write procedure is protected by adminProcedure), but this hook
 * lets the UI hide/disable admin-only controls for a cleaner UX.
 */
export function usePermissions() {
  const { data } = trpc.auth.me.useQuery(undefined, {
    staleTime: 60_000,
    placeholderData: previous => previous,
  });
  const role = data?.role;
  const isAdmin = role === "owner" || role === "admin";

  const can = (permission: PermissionKey | string) => {
    // Admins/owners bypass granular checks on the client (server enforces too).
    if (isAdmin) return true;
    return false;
  };

  const canAll = (permissions: PermissionKey[] | string[]) =>
    permissions.every(p => can(p));

  const canAny = (permissions: PermissionKey[] | string[]) =>
    permissions.some(p => can(p));

  return { role, isAdmin, ready: data !== undefined, can, canAll, canAny };
}
