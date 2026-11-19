import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteClient } from "../../api/clients";

/**
 * «Видалити» on the client card. A client is the root of a lot of data — its
 * posts, campaigns, tasks and creatives go with it, and finance entries lose
 * their client link — so every cache that could still show any of it is dropped,
 * not just the clients list.
 */
export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clientId: string) => deleteClient(clientId),
    onSuccess: (_result, clientId) => {
      // The deleted client's own queries must not refetch (they would 404): drop them first.
      queryClient.removeQueries({ queryKey: ["clients", clientId] });
      for (const key of ["clients", "contentPlan", "target", "finance", "dashboard"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}
