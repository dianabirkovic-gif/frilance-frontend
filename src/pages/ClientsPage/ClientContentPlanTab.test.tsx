import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentPlan, Post } from "../../api/contentPlan";
import { getContentPlan } from "../../api/contentPlan";
import { interpolate } from "../../i18n/interpolate";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { ClientContentPlanTab } from "./ClientContentPlanTab";

vi.mock("../../api/contentPlan", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/contentPlan")>()),
  getContentPlan: vi.fn(),
}));

const canView = vi.fn(() => true);
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ canView, canEdit: () => false }),
}));

const getContentPlanMock = vi.mocked(getContentPlan);

// A Thursday in August, so the tab opens on 2026-08.
const TODAY = new Date(2026, 7, 20, 10, 0);

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
    publishedPosts: posts.filter((p) => p.status === "PUBLISHED").length,
    posts,
  };
}

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>{children}</LocaleProvider>
    </QueryClientProvider>
  );
  return render(<ClientContentPlanTab clientId="client-1" />, { wrapper });
}

const previousMonth = () => screen.getByRole("button", { name: uk.clientContentPlanTab.previousMonth });
const nextMonth = () => screen.getByRole("button", { name: uk.clientContentPlanTab.nextMonth });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(TODAY);
  canView.mockReturnValue(true);
  getContentPlanMock.mockReset();
  getContentPlanMock.mockImplementation((month) => Promise.resolve(plan(month)));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ClientContentPlanTab", () => {
  it("opens on the current month and shows the whole of it, earliest first", async () => {
    getContentPlanMock.mockImplementation((month) =>
      Promise.resolve(
        plan(month, [
          post({ id: "late", title: "Карусель про склад", scheduledDate: "2026-08-25" }),
          // Earlier in the month than today: a whole month, not just what is left of it.
          post({ id: "early", title: "Пост на початку", scheduledDate: "2026-08-03" }),
        ]),
      ),
    );

    renderTab();

    expect(await screen.findByText("Серпень 2026 р.")).toBeInTheDocument();
    const items = await screen.findAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Пост на початку"),
      expect.stringContaining("Карусель про склад"),
    ]);
    expect(getContentPlanMock).toHaveBeenCalledWith("2026-08", "client-1");
  });

  it("asks for one month only, for this client alone", async () => {
    renderTab();

    await waitFor(() => expect(getContentPlanMock).toHaveBeenCalledTimes(1));
    expect(getContentPlanMock).toHaveBeenCalledWith("2026-08", "client-1");
  });

  it("walks to the next month and reads it", async () => {
    getContentPlanMock.mockImplementation((month) =>
      Promise.resolve(
        month === "2026-09"
          ? plan(month, [post({ id: "sep", title: "Вересневий пост", scheduledDate: "2026-09-02" })])
          : plan(month),
      ),
    );

    renderTab();
    await screen.findByText(uk.clientContentPlanTab.empty);

    fireEvent.click(nextMonth());

    expect(await screen.findByText("Вересень 2026 р.")).toBeInTheDocument();
    expect(await screen.findByText("Вересневий пост")).toBeInTheDocument();
    expect(getContentPlanMock).toHaveBeenCalledWith("2026-09", "client-1");
  });

  /**
   * The title comes from local state and flips the instant an arrow is
   * clicked; the rows come from the query. Anything that keeps the old
   * month's data across that key change puts August's posts under
   * September's heading — every other content-plan surface is immune
   * because it buckets posts into `buildMonthDays(month, ...)`, and this
   * list does not.
   */
  it("never shows one month's posts under another month's title", async () => {
    getContentPlanMock.mockImplementation((month) =>
      month === "2026-08"
        ? Promise.resolve(plan(month, [post({ title: "Серпневий пост" })]))
        : // Still in flight: this is the frame the bug lived in.
          new Promise<ContentPlan>(() => {}),
    );

    renderTab();
    await screen.findByText("Серпневий пост");

    fireEvent.click(nextMonth());

    expect(screen.getByText("Вересень 2026 р.")).toBeInTheDocument();
    expect(screen.queryByText("Серпневий пост")).not.toBeInTheDocument();
    expect(screen.getByText(uk.clientContentPlanTab.loading)).toBeInTheDocument();
  });

  it("walks back past the start of the year", async () => {
    renderTab();
    await screen.findByText("Серпень 2026 р.");

    for (let step = 0; step < 8; step += 1) {
      fireEvent.click(previousMonth());
    }

    expect(await screen.findByText("Грудень 2025 р.")).toBeInTheDocument();
    expect(getContentPlanMock).toHaveBeenCalledWith("2025-12", "client-1");
  });

  // The navigator is the only way off a month with nothing in it.
  it("keeps the month navigation reachable in every state", async () => {
    getContentPlanMock.mockRejectedValue(new Error("boom"));

    renderTab();

    expect(await screen.findByText(uk.clientContentPlanTab.loadError)).toBeInTheDocument();
    expect(previousMonth()).toBeInTheDocument();
    expect(nextMonth()).toBeInTheDocument();
  });

  it("names the day, the type, the member who wrote it and the status", async () => {
    getContentPlanMock.mockImplementation((month) =>
      Promise.resolve(
        plan(month, [post({ status: "REVIEW", type: "CAROUSEL", authorName: "Оксана Коваль" })]),
      ),
    );

    renderTab();

    const row = await screen.findByRole("listitem");
    expect(row).toHaveTextContent("21 сер");
    expect(row).toHaveTextContent(uk.postType.CAROUSEL);
    expect(row).toHaveTextContent(
      interpolate(uk.clientContentPlanTab.authorTemplate, { name: "Оксана Коваль" }),
    );
    expect(row).toHaveTextContent(uk.postStatusShort.REVIEW);
  });

  // #21: null on posts that predate the column. The board card shows nothing
  // there and so does this row — only the table's cell needs an em dash.
  it("shows the type alone on a post with no recorded author", async () => {
    getContentPlanMock.mockImplementation((month) =>
      Promise.resolve(plan(month, [post({ type: "CAROUSEL", authorName: null })])),
    );

    renderTab();

    const row = await screen.findByRole("listitem");
    expect(row).toHaveTextContent(uk.postType.CAROUSEL);
    expect(row).not.toHaveTextContent("·");
    expect(row).not.toHaveTextContent("—");
  });

  it("marks a post scheduled for today instead of naming its weekday", async () => {
    getContentPlanMock.mockImplementation((month) =>
      Promise.resolve(plan(month, [post({ scheduledDate: "2026-08-20" })])),
    );

    renderTab();

    expect(await screen.findByText(uk.clientContentPlanTab.todaySuffix)).toBeInTheDocument();
  });

  it("says the month is empty, scoped to the month it is showing", async () => {
    renderTab();

    expect(await screen.findByText(uk.clientContentPlanTab.empty)).toBeInTheDocument();
  });

  // The plan is the CONTENT section's data, even though the drawer is Clients'.
  it("shows a no-access state, and asks for nothing, without the CONTENT grant", async () => {
    canView.mockReturnValue(false);

    renderTab();

    expect(screen.getByText(uk.clientContentPlanTab.noAccess)).toBeInTheDocument();
    // Flush pending microtasks first: `waitFor` on a negative assertion passes
    // on its first synchronous check, so without this a request fired a tick
    // later would sail straight through the test.
    await act(async () => {});
    expect(getContentPlanMock).not.toHaveBeenCalled();
  });

  it("offers a retry when the month failed, and the retry actually reads again", async () => {
    getContentPlanMock.mockRejectedValue(new Error("boom"));

    renderTab();

    expect(await screen.findByText(uk.clientContentPlanTab.loadError)).toBeInTheDocument();
    const callsBeforeRetry = getContentPlanMock.mock.calls.length;

    getContentPlanMock.mockImplementation((month) =>
      Promise.resolve(plan(month, [post({ title: "Reels про догляд" })])),
    );
    fireEvent.click(screen.getByRole("button", { name: uk.clientContentPlanTab.retry }));

    expect(await screen.findByText("Reels про догляд")).toBeInTheDocument();
    expect(getContentPlanMock.mock.calls.length).toBeGreaterThan(callsBeforeRetry);
  });
});
