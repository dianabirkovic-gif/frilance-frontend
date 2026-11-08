import { useQuery } from "@tanstack/react-query";
import { getAssignableMembers } from "../../api/clients";

/**
 * The team roster the client's staffing picker offers. Fetched only when the
 * member may actually edit clients — the endpoint is guarded on that grant, so
 * asking without it is a guaranteed 403 and a red line in the console.
 */
export function useAssignableMembers(enabled: boolean) {
  return useQuery({
    queryKey: ["clients", "assignableMembers"],
    queryFn: getAssignableMembers,
    enabled,
    // The roster changes when somebody is invited or revoked, not while a
    // drawer is open; a page-lifetime cache is plenty.
    staleTime: 5 * 60 * 1000,
  });
}
