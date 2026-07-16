import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateClientStatus } from "../../api/clients";

/** "Архівувати" quick action on the client card — sets status to ARCHIVED. */
export function useArchiveClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clientId: string) => updateClientStatus(clientId, "ARCHIVED"),
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.setQueryData(["clients", detail.id], detail);
    },
  });
}
