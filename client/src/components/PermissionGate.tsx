import { type ReactNode } from "react";
import { usePermissions, type PermissionKey } from "@/hooks/usePermissions";
import { DeniedScreen } from "@/components/DeniedScreen";

/**
 * Conditionally renders children based on the user's permissions.
 *
 * Two modes:
 *  1. `page` mode (default): Shows DeniedScreen if permission is missing.
 *     Use this at the top of a page component.
 *  2. `element` mode: Renders nothing (or `fallback`) if permission is missing.
 *     Use this for individual buttons/sections within a page.
 *
 * @example
 * // Page-level gate
 * <PermissionGate require="settings.view">
 *   <SettingsPage />
 * </PermissionGate>
 *
 * @example
 * // Element-level gate
 * <PermissionGate require="settings.edit" element>
 *   <SaveButton />
 * </PermissionGate>
 */
export function PermissionGate({
  require,
  requireAll,
  requireAny,
  element,
  fallback,
  children,
}: {
  /** Single required permission */
  require?: PermissionKey;
  /** All of these permissions are required */
  requireAll?: PermissionKey[];
  /** Any one of these permissions is required */
  requireAny?: PermissionKey[];
  /** If true, renders nothing instead of DeniedScreen for page-level gates */
  element?: boolean;
  /** Content to render when permission is denied (element mode only) */
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { can, canAll, canAny, ready } = usePermissions();

  // Still loading permissions — render nothing to avoid flicker
  if (!ready) return null;

  // No permission specified — always allow
  const permitted = require
    ? can(require)
    : requireAll
      ? canAll(requireAll ?? [])
      : requireAny
        ? canAny(requireAny ?? [])
        : true;

  if (permitted) return <>{children}</>;

  if (element) return <>{fallback ?? null}</>;

  return <DeniedScreen />;
}
