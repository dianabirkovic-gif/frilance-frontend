import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { emptyTrash, getTrash, purgeClient, restoreClient } from "../../api/clients";

export const TRASH_QUERY_KEY = ["clients", "trash"] as const;

/**
 * What the trash holds. Only the owner may see it — the backend 403s anyone else — so the page
 * asks only when it will show the tab at all.
 */
export function useClientTrash(enabled: boolean) {
  return useQuery({ queryKey: TRASH_QUERY_KEY, queryFn: getTrash, enabled });
}

/**
 * Restoring brings back a client *and* everything that hangs off it, so every cache that could
 * now show any of it is refreshed — not just the clients list.
 */
export function useRestoreClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clientId: string) => restoreClient(clientId),
    onSuccess: () => {
      for (const key of ["clients", "contentPlan", "target", "finance", "dashboard"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}

/** Deleting for good only changes the trash: the client was already out of every other view. */
export function usePurgeClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clientId: string) => purgeClient(clientId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TRASH_QUERY_KEY }),
  });
}

export function useEmptyTrash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => emptyTrash(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TRASH_QUERY_KEY }),
  });
}
