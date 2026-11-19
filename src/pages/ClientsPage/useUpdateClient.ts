import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateClient, type CreateClientPayload } from "../../api/clients";

/** Owner-only full edit of a client. Refreshes the list and every cached detail. */
export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateClientPayload }) => updateClient(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
