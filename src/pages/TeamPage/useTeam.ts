import { useQuery } from "@tanstack/react-query";
import { getTeam } from "../../api/team";

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: getTeam,
  });
}
