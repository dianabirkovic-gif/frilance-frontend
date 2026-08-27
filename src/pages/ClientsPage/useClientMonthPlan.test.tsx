import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentPlan, Post } from "../../api/contentPlan";
import { contentPlanQueryKey, getContentPlan } from "../../api/contentPlan";
import { useClientMonthPlan } from "./useClientMonthPlan";

vi.mock("../../api/contentPlan", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/contentPlan")>()),
  getContentPlan: vi.fn(),
}));

const getContentPlanMock = vi.mocked(getContentPlan);

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: "post-1",
    clientId: "client-1",
    clientName: "MUSE'23",
    type: "REELS",
    title: "Reels про догляд",
    scheduledDate: "2026-08-21",
    status: "DRAFT",
    rating: null,
    authorId: null,
    authorName: null,
    note: null,
    ...overrides,
  };
}

function plan(month: string, posts: Post[] = []): ContentPlan {
  return {
    month,
    selectedClientId: "client-1",
    clients: [{ id: "client-1", name: "MUSE'23", archived: false }],
    totalPosts: posts.length,
    publishedPosts: 0,
    posts,
  };
}

function renderMonthPlan(
  month = "2026-08",
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(({ month: m }: { month: string }) => useClientMonthPlan("client-1", m), {
    wrapper,
    initialProps: { month },
  });
}

beforeEach(() => {
  getContentPlanMock.mockReset();
  getContentPlanMock.mockImplementation((month) => Promise.resolve(plan(month)));
});

describe("useClientMonthPlan", () => {
  it("orders the month by date, then title", async () => {
    getContentPlanMock.mockResolvedValue(
      plan("2026-08", [
        post({ id: "late", scheduledDate: "2026-08-25", title: "A" }),
        post({ id: "early-b", scheduledDate: "2026-08-21", title: "B" }),
        post({ id: "early-a", scheduledDate: "2026-08-21", title: "A" }),
      ]),
    );

    const { result } = renderMonthPlan();

    await waitFor(() => expect(result.current.posts).toHaveLength(3));
    expect(result.current.posts.map((p) => p.id)).toEqual(["early-a", "early-b", "late"]);
  });

  it("reads the month under the content plan's own cache key", async () => {
    // `staleTime` mirrors `api/queryClient.ts`: it is what decides whether a
    // month the module already fetched is reused or read again, and the point
    // of sharing the key is exactly that reuse.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });
    queryClient.setQueryData(
      contentPlanQueryKey("2026-08", "client-1"),
      plan("2026-08", [post({ id: "from-cache" })]),
    );

    const { result } = renderMonthPlan("2026-08", queryClient);

    expect(result.current.posts.map((p) => p.id)).toEqual(["from-cache"]);
    expect(getContentPlanMock).not.toHaveBeenCalled();
  });

  /**
   * `placeholderData: keepPreviousData` was here once. It works on a single
   * query where it cannot on the module's `useQueries` — but the tab's month
   * label is separate state that flips on the click, so retained data means
   * one month's posts under another month's heading.
   */
  it("carries no posts across a month change", async () => {
    getContentPlanMock.mockImplementation((month) =>
      month === "2026-08"
        ? Promise.resolve(plan(month, [post({ id: "aug" })]))
        : new Promise<ContentPlan>(() => {}),
    );

    const { result, rerender } = renderMonthPlan();
    await waitFor(() => expect(result.current.posts.map((p) => p.id)).toEqual(["aug"]));

    rerender({ month: "2026-09" });

    expect(result.current.posts).toHaveLength(0);
    expect(result.current.isLoading).toBe(true);
  });

  /**
   * `refetch` puts an errored query back into `pending`, which is exactly what
   * re-armed the placeholder: the previous month reappeared under the failed
   * month's title, reading as though the retry had succeeded.
   */
  it("brings back no earlier month when a failed month is retried", async () => {
    getContentPlanMock.mockImplementation((month) =>
      month === "2026-08" ? Promise.resolve(plan(month, [post({ id: "aug" })])) : Promise.reject(new Error("boom")),
    );

    const { result, rerender } = renderMonthPlan();
    await waitFor(() => expect(result.current.posts.map((p) => p.id)).toEqual(["aug"]));

    rerender({ month: "2026-09" });
    await waitFor(() => expect(result.current.isError).toBe(true));

    getContentPlanMock.mockImplementation(() => new Promise<ContentPlan>(() => {}));
    result.current.refetch();

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(result.current.posts).toHaveLength(0);
  });

  it("reports the month as failed, with nothing to show", async () => {
    getContentPlanMock.mockRejectedValue(new Error("boom"));

    const { result } = renderMonthPlan();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.posts).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
  });

  it("reads again on refetch", async () => {
    getContentPlanMock.mockRejectedValue(new Error("boom"));

    const { result } = renderMonthPlan();
    await waitFor(() => expect(result.current.isError).toBe(true));

    getContentPlanMock.mockImplementation((month) => Promise.resolve(plan(month, [post({ id: "after-retry" })])));
    result.current.refetch();

    await waitFor(() => expect(result.current.posts.map((p) => p.id)).toEqual(["after-retry"]));
  });
});
