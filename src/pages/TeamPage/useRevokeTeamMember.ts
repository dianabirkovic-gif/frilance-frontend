import { useMutation, useQueryClient } from "@tanstack/react-query";
import { revokeTeamMember } from "../../api/team";

/** Owner-only revoke (see backend TeamService#revoke) — invalidates the roster so the row disappears. */
export function useRevokeTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeTeamMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}
