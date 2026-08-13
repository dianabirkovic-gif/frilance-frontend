import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AccessMatrix } from "../../api/auth";
import { updateTeamMemberAccess } from "../../api/team";

/** Owner-only access change (see backend TeamService#updateAccess) — invalidates the roster so the new matrix shows up. */
export function useUpdateMemberAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, access }: { id: string; access: AccessMatrix }) => updateTeamMemberAccess(id, access),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}
