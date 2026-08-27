import { useQuery } from "@tanstack/react-query";
import { contentPlanQueryKey, getContentPlan, type Post } from "../../api/contentPlan";

interface ClientMonthPlan {
  /** Everything scheduled for this client in this month, earliest first. */
  posts: Post[];
  /** No month on screen yet — the first load, or a month change, or a retry. */
  isLoading: boolean;
  /** A read is in flight over the month already on screen: dim it, don't replace it. */
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * One month of one client's plan, for the client drawer's «Контент-план» tab —
 * read from the same endpoint, and under the same cache key, as the
 * content-plan module itself (`contentPlanQueryKey`). Sharing the key is what
 * keeps the two honest: `usePostMutations` invalidates the whole `contentPlan`
 * prefix, so a post edited in the module is already correct here.
 *
 * <p>Unlike the module's `useContentPlan` this is a single `useQuery`, because
 * the tab shows exactly one calendar month and the endpoint serves exactly
 * one — there is no range to straddle and so nothing to merge.
 *
 * <p>**No `placeholderData: keepPreviousData` here, deliberately.** It works
 * on a single query where it cannot on the module's `useQueries`, and it was
 * tried — but the tab's month *label* is local state that flips the instant an
 * arrow is clicked, while retained data still belongs to the month before it.
 * The result was August's posts sitting under September's heading (and, after
 * a failed month, the previous month reappearing when the user pressed
 * "retry", reading as if the retry had worked — `refetch` puts an errored
 * query back into `pending`, which re-arms the placeholder). The module never
 * had this class of bug because it pours posts into
 * `buildMonthDays(month, ...)`, which drops anything dated outside the month;
 * this list renders the array as it comes. Showing the loading line for a beat
 * is the honest version, and the navigator stays mounted throughout, so
 * nobody is stranded. Any future attempt to keep the previous month on screen
 * has to carry the label with it — `ContentPlanDto.month` is echoed by the
 * server for exactly that.
 *
 * <p>The hook is only ever mounted with the tab open (`ClientsPage` passes the
 * tab to the drawer as an element, and the drawer renders it only while that
 * tab is selected), so opening a client on the Огляд tab — which is where it
 * always opens — fires nothing.
 */
export function useClientMonthPlan(clientId: string, month: string): ClientMonthPlan {
  const query = useQuery({
    queryKey: contentPlanQueryKey(month, clientId),
    queryFn: () => getContentPlan(month, clientId),
  });

  // The server orders by date then title, but the tab renders one flat list in
  // that order and would reshuffle silently if that ever changed — cheap to
  // state the ordering the UI depends on rather than inherit it.
  const posts = [...(query.data?.posts ?? [])].sort(
    (a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.title.localeCompare(b.title),
  );

  return {
    posts,
    isLoading: query.isPending,
    // True on a background revalidation too (`staleTime` is 30s): that dims a
    // month already on screen, which is the intended "don't blank it" case.
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}
