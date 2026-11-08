import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateClientAssignees } from "../../api/clients";

/**
 * Restaffing a client changes who may *see* it (FR-05 row scoping), not just
 * a label — so it invalidates every screen scoped by that rule, not only the
 * client list. Removing yourself from a client drops it out of your own
 * clients list and its posts out of your content plan; both have to catch up.
 */
export function useUpdateClientAssignees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assigneeIds }: { id: string; assigneeIds: string[] }) =>
      updateClientAssignees(id, assigneeIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["contentPlan"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
    },
  });
}
