import { useQuery } from "@tanstack/react-query";
import { financeQueryKey, getFinance, type FinanceEntryType } from "../../api/finance";

/**
 * One month of the register. The endpoint serves a single month, so this is a
 * single `useQuery` — no range to merge and no partial-failure state, unlike
 * the content plan's `useContentPlan`.
 *
 * It deliberately does **not** set `placeholderData: keepPreviousData`, even
 * though a single query would allow it. The month heading is local state on
 * the page and flips the instant an arrow is clicked, so retained rows would
 * appear under the next month's title — and a retry on a failed month brings
 * the old one back looking like a success, because `refetch` returns an
 * errored query to `pending` and re-arms the placeholder. The content plan is
 * structurally immune to that (it pours posts into a month grid that drops
 * anything dated outside it); a flat register is not. This is the same
 * decision, and the same reasoning, as `useClientMonthPlan` — see
 * `../freelance-all/new-requirements.md` #25.
 */
export function useFinance(month: string, clientId: string | null, type: FinanceEntryType | null) {
  return useQuery({
    queryKey: financeQueryKey(month, clientId, type),
    queryFn: () => getFinance(month, clientId, type),
  });
}
