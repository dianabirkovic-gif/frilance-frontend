import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentPlan, Post } from "../../api/contentPlan";
import { getContentPlan } from "../../api/contentPlan";
import { useContentPlan } from "./useContentPlan";

vi.mock("../../api/contentPlan", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/contentPlan")>()),
  getContentPlan: vi.fn(),
}));

const getContentPlanMock = vi.mocked(getContentPlan);

function post(id: string, scheduledDate: string): Post {
  return {
    id,
    clientId: "client-1",
    clientName: "MUSE'23",
    type: "REELS",
    title: `Пост ${id}`,
    scheduledDate,
    status: "DRAFT",
    rating: null,
    authorId: null,
    authorName: null,
    note: null,
  };
}

function plan(month: string, posts: Post[]): ContentPlan {
  return {
    month,
    selectedClientId: null,
    clients: [{ id: "client-1", name: "MUSE'23", archived: false }],
    totalPosts: posts.length,
    publishedPosts: 0,
    posts,
  };
}

/** Resolves/rejects on command, so a two-month range can be half-answered. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  getContentPlanMock.mockReset();
});

describe("useContentPlan", () => {
  it("merges the posts of every month the range touches", async () => {
    getContentPlanMock.mockImplementation((month) =>
      Promise.resolve(
        month === "2026-08" ? plan(month, [post("aug", "2026-08-31")]) : plan(month, [post("sep", "2026-09-01")]),
      ),
    );

    const { result } = renderHook(() => useContentPlan(["2026-08", "2026-09"], null), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.posts).toHaveLength(2));
    expect(result.current.posts.map((p) => p.id)).toEqual(["aug", "sep"]);
    expect(result.current.clients).toHaveLength(1);
  });

  // Regression: this used to be `results.some(isPending)`, which blanked the
  // whole page — toolbar included — whenever one month of a straddling week
  // was uncached, even though the other was loaded and fresh.
  it("does not report loading while one month is answered and the other is still in flight", async () => {
    const september = deferred<ContentPlan>();
    getContentPlanMock.mockImplementation((month) =>
      month === "2026-08" ? Promise.resolve(plan(month, [post("aug", "2026-08-31")])) : september.promise,
    );

    const { result } = renderHook(() => useContentPlan(["2026-08", "2026-09"], null), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(true);

    september.resolve(plan("2026-09", [post("sep", "2026-09-01")]));
    await waitFor(() => expect(result.current.posts).toHaveLength(2));
    expect(result.current.isFetching).toBe(false);
  });

  it("reports loading only until the first month answers", async () => {
    const august = deferred<ContentPlan>();
    getContentPlanMock.mockReturnValue(august.promise);

    const { result } = renderHook(() => useContentPlan(["2026-08"], null), { wrapper: wrapper() });

    expect(result.current.isLoading).toBe(true);

    august.resolve(plan("2026-08", []));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  // Regression: `isError: results.some(isError)` discarded the days that did
  // load, along with the toolbar needed to navigate away from the bad month.
  it("keeps the month that loaded when its neighbour fails, and flags it as partial", async () => {
    getContentPlanMock.mockImplementation((month) =>
      month === "2026-08"
        ? Promise.resolve(plan(month, [post("aug", "2026-08-31")]))
        : Promise.reject(new Error("boom")),
    );

    const { result } = renderHook(() => useContentPlan(["2026-08", "2026-09"], null), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isPartialError).toBe(true));
    expect(result.current.isError).toBe(false);
    expect(result.current.posts.map((p) => p.id)).toEqual(["aug"]);
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("reports a hard error only when nothing at all loaded", async () => {
    getContentPlanMock.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useContentPlan(["2026-08"], null), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isPartialError).toBe(false);
    expect(result.current.posts).toEqual([]);
  });

  // Regression: a changed client filter misses every key at once, which used
  // to unmount the <select> the user had just opened.
  it("keeps the previous client's plan on screen while a new filter loads", async () => {
    getContentPlanMock.mockResolvedValue(plan("2026-08", [post("aug", "2026-08-31")]));

    const { result, rerender } = renderHook(({ clientId }) => useContentPlan(["2026-08"], clientId), {
      wrapper: wrapper(),
      initialProps: { clientId: null as string | null },
    });

    await waitFor(() => expect(result.current.posts).toHaveLength(1));

    const pending = deferred<ContentPlan>();
    getContentPlanMock.mockReturnValue(pending.promise);
    rerender({ clientId: "client-1" });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.posts).toHaveLength(1);
    expect(result.current.clients).toHaveLength(1);

    pending.resolve(plan("2026-08", []));
    await waitFor(() => expect(result.current.posts).toHaveLength(0));
  });
});
