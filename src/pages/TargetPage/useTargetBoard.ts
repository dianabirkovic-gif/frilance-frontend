import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getTargetBoard, targetBoardQueryKey } from "../../api/target";

/**
 * The board for one client, or for every client the member may see. Unlike the
 * month-walked screens nothing in the heading flips on a click, so keeping the
 * previous board on screen while another client's loads is safe and avoids a
 * flash of the loading state on every filter change.
 */
export function useTargetBoard(clientId: string | null) {
  return useQuery({
    queryKey: targetBoardQueryKey(clientId),
    queryFn: () => getTargetBoard(clientId),
    placeholderData: keepPreviousData,
  });
}
