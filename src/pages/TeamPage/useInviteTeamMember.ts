import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inviteTeamMember } from "../../api/team";

/** Owner-only invite (see backend TeamService#invite) — invalidates the roster so the new row shows up. */
export function useInviteTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inviteTeamMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}
