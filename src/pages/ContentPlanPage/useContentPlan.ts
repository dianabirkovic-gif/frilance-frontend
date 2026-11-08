import { useQueries } from "@tanstack/react-query";
import { useRef } from "react";
import { contentPlanQueryKey, getContentPlan, type ContentPlanClient, type Post } from "../../api/contentPlan";

interface ContentPlanRange {
  posts: Post[];
  /** The section's own client picker — the same list whichever month answered. */
  clients: ContentPlanClient[];
  /** True only until the first answer arrives; a reload over existing data is `isFetching`. */
  isLoading: boolean;
  /** A read is in flight over data already on screen — dim it, don't replace it. */
  isFetching: boolean;
  /** Nothing loaded at all. The screen has only the error to show. */
  isError: boolean;
  /** Some of the range loaded and some didn't — show what there is, say the rest failed. */
  isPartialError: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * The plan for every month the visible range touches. The endpoint serves one
 * month per call and a week straddles two of them five times a year, so the
 * page asks for one query per month and merges — keyed per month, so switching
 * between the week and month views reuses whatever is already cached rather
 * than refetching the same days under a range key.
 *
 * <p>The merge deliberately does not collapse to "any query is pending → the
 * screen is loading". A month the user has already seen stays on screen while
 * its neighbour loads, and a month that fails does not take the rest of the
 * range down with it: the page's toolbar is how you navigate away from a bad
 * month, so blanking the page is the one response that traps the user.
 *
 * <p>Changing the client filter misses every key at once, so there is nothing
 * to keep by cache alone — hence the retained snapshot. It cannot be
 * `placeholderData: keepPreviousData`: `useQueries` rebuilds its observers
 * when the key array changes, so the previous data is gone by the time the
 * placeholder is consulted (proven in this hook's test).
 */
export function useContentPlan(months: string[], clientId: string | null): ContentPlanRange {
  const results = useQueries({
    queries: months.map((month) => ({
      queryKey: contentPlanQueryKey(month, clientId),
      queryFn: () => getContentPlan(month, clientId),
    })),
  });

  const loaded = results.filter((result) => result.data);
  const failed = results.filter((result) => result.isError);

  // The last answer that arrived, kept so a refetch under a new key dims the
  // plan instead of unmounting it. Assigning during render is safe: it is
  // derived from this render's own data and touches nothing outside the hook.
  const previous = useRef<Pick<ContentPlanRange, "posts" | "clients"> | null>(null);
  if (loaded.length > 0) {
    previous.current = {
      posts: results.flatMap((result) => result.data?.posts ?? []),
      clients: loaded[0].data?.clients ?? [],
    };
  }

  const shown = previous.current;
  const hasData = shown !== null;

  return {
    posts: shown?.posts ?? [],
    clients: shown?.clients ?? [],
    isLoading: !hasData && results.some((result) => result.isPending),
    isFetching: results.some((result) => result.isFetching),
    isError: !hasData && failed.length > 0,
    isPartialError: hasData && failed.length > 0,
    error: failed[0]?.error,
    refetch: () => {
      for (const result of results) {
        void result.refetch();
      }
    },
  };
}
