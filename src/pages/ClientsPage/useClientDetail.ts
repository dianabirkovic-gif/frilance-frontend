import { useQuery } from "@tanstack/react-query";
import { getClient } from "../../api/clients";

/** Fetched on demand when a table row/card is selected — see ClientDetailDrawer. */
export function useClientDetail(clientId: string | null) {
  return useQuery({
    queryKey: ["clients", clientId],
    queryFn: () => getClient(clientId as string),
    enabled: clientId !== null,
  });
}
