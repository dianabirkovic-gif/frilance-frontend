import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../../api/clients";

/** FR-05 client creation — invalidates the clients list so the new row shows up. */
export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
