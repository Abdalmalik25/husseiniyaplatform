import { trpc } from "@/lib/trpc";

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
  return { role, isAdmin, ready: data !== undefined };
}

