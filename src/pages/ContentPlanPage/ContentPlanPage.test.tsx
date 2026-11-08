import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentPlan, Post } from "../../api/contentPlan";
import { getContentPlan } from "../../api/contentPlan";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { PageFabProvider } from "../../templates/AppShell/PageFabContext";
import { PageHeaderProvider } from "../../templates/AppShell/PageHeaderContext";
import { ContentPlanPage } from "./ContentPlanPage";

vi.mock("../../api/contentPlan", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/contentPlan")>()),
  getContentPlan: vi.fn(),
}));

const canEdit = vi.fn(() => true);
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ canEdit, canView: () => true }),
}));

const getContentPlanMock = vi.mocked(getContentPlan);

// A Thursday, so the week under test is Mon 17 – Sun 23 August 2026.
const TODAY = new Date(2026, 7, 20, 10, 0);

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: "post-1",
    clientId: "client-1",
    clientName: "MUSE'23",
    type: "REELS",
    title: "Reels про догляд",
    scheduledDate: "2026-08-20",
    status: "DRAFT",
    rating: null,
    authorId: "author-1",
    authorName: "Оксана Коваль",
    note: null,
    ...overrides,
  };
}

function plan(month: string, posts: Post[] = []): ContentPlan {
  return {
    month,
    selectedClientId: null,
    clients: [
      { id: "client-1", name: "MUSE'23", archived: false },
      { id: "client-2", name: "Brookside", archived: false },
    ],
    totalPosts: posts.length,
    publishedPosts: posts.filter((p) => p.status === "PUBLISHED").length,
    posts,
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <PageHeaderProvider>
          <PageFabProvider>{children}</PageFabProvider>
        </PageHeaderProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
  return render(<ContentPlanPage />, { wrapper });
}

/** The board and the table both render, so scope assertions to the toolbar. */
function toggle(label: string) {
  return screen.getByRole("button", { name: label });
}

/** The closed PostDrawer is still in the DOM, and its stepper repeats the
 *  status names — so legend assertions have to be scoped to the legend. */
function legend() {
  return screen.queryByRole("group", { name: uk.contentPlanPage.legendLabel });
}

/** Same reason: the drawer owns two more comboboxes, one of them labelled
 *  "Клієнт *". The toolbar's is the one whose label carries the current
 *  selection, i.e. "Клієнт: <name>". */
function clientFilter() {
  return screen.getByRole("combobox", { name: /^Клієнт: / });
}

async function renderLoaded() {
  const view = renderPage();
  await waitFor(() => expect(screen.getByText(uk.contentPlanPage.views.week)).toBeInTheDocument());
  return view;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(TODAY);
  canEdit.mockReturnValue(true);
  getContentPlanMock.mockReset();
  getContentPlanMock.mockImplementation((month) =>
    Promise.resolve(plan(month, month === "2026-08" ? [post()] : [])),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ContentPlanPage", () => {
  it("opens on the week around today", async () => {
    await renderLoaded();

    expect(screen.getByText("17 сер — 23 сер")).toBeInTheDocument();
    expect(toggle(uk.contentPlanPage.views.week)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("Reels про догляд").length).toBeGreaterThan(0);
  });

  it("keeps the toolbar mounted once anything has loaded", async () => {
    await renderLoaded();

    expect(screen.queryByText(uk.contentPlanPage.loading)).not.toBeInTheDocument();
    expect(toggle(uk.contentPlanPage.views.month)).toBeInTheDocument();
    expect(toggle(uk.contentPlanPage.today)).toBeInTheDocument();
  });

  // The condition flagged as untested when this feature was audited.
  describe("the status legend", () => {
    it("is shown over the week and month views, which are colour-coded", async () => {
      await renderLoaded();

      expect(within(legend()!).getByText(uk.postStatusShort.READY)).toBeInTheDocument();
      expect(within(legend()!).getByText(uk.postStatusShort.PUBLISHED)).toBeInTheDocument();

      fireEvent.click(toggle(uk.contentPlanPage.views.month));
      expect(within(legend()!).getByText(uk.postStatusShort.READY)).toBeInTheDocument();
    });

    it("is hidden over the list view, which names every status in its own column", async () => {
      await renderLoaded();

      fireEvent.click(toggle(uk.contentPlanPage.views.list));

      expect(legend()).not.toBeInTheDocument();
      // The table still names the status in its own column.
      expect(screen.getAllByText(uk.postStatus.DRAFT).length).toBeGreaterThan(0);
    });
  });

  describe("navigation", () => {
    it("steps the week by seven days", async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole("button", { name: uk.contentPlanPage.nextPeriod }));

      expect(screen.getByText("24 сер — 30 сер")).toBeInTheDocument();
    });

    // Regression: paging the month view used to rebuild the anchor as the 1st,
    // which moved the week view to the week holding that 1st.
    it("leaves the week where it was after the month is paged forward and back", async () => {
      await renderLoaded();
      expect(screen.getByText("17 сер — 23 сер")).toBeInTheDocument();

      fireEvent.click(toggle(uk.contentPlanPage.views.month));
      fireEvent.click(screen.getByRole("button", { name: uk.contentPlanPage.nextPeriod }));
      await waitFor(() => expect(screen.getByText("Вересень 2026 р.")).toBeInTheDocument());
      fireEvent.click(screen.getByRole("button", { name: uk.contentPlanPage.previousPeriod }));
      fireEvent.click(toggle(uk.contentPlanPage.views.week));

      expect(screen.getByText("17 сер — 23 сер")).toBeInTheDocument();
    });

    it("disables Сьогодні while today is on screen and re-enables it once it isn't", async () => {
      await renderLoaded();

      expect(toggle(uk.contentPlanPage.today)).toBeDisabled();

      fireEvent.click(screen.getByRole("button", { name: uk.contentPlanPage.nextPeriod }));
      expect(toggle(uk.contentPlanPage.today)).toBeEnabled();

      fireEvent.click(toggle(uk.contentPlanPage.today));
      expect(screen.getByText("17 сер — 23 сер")).toBeInTheDocument();
      expect(toggle(uk.contentPlanPage.today)).toBeDisabled();
    });

    it("asks for both months of a week that straddles one", async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole("button", { name: uk.contentPlanPage.nextPeriod }));
      fireEvent.click(screen.getByRole("button", { name: uk.contentPlanPage.nextPeriod }));

      await waitFor(() => expect(screen.getByText("31 сер — 6 вер")).toBeInTheDocument());
      const months = getContentPlanMock.mock.calls.map(([month]) => month);
      expect(months).toContain("2026-08");
      expect(months).toContain("2026-09");
    });
  });

  describe("failure handling", () => {
    // Regression: one failing month used to replace the whole page, toolbar
    // included, so there was no way to navigate back out of it.
    it("shows the days that loaded plus a banner when one month of the range fails", async () => {
      getContentPlanMock.mockImplementation((month) =>
        month === "2026-09" ? Promise.reject(new Error("boom")) : Promise.resolve(plan(month, [post()])),
      );
      await renderLoaded();

      fireEvent.click(screen.getByRole("button", { name: uk.contentPlanPage.nextPeriod }));
      fireEvent.click(screen.getByRole("button", { name: uk.contentPlanPage.nextPeriod }));

      await waitFor(() => expect(screen.getByText(uk.contentPlanPage.partialLoadError)).toBeInTheDocument());
      expect(screen.queryByText(/Не вдалося завантажити контент-план/)).not.toBeInTheDocument();
      expect(screen.getByText("31 сер — 6 вер")).toBeInTheDocument();
      expect(toggle(uk.contentPlanPage.views.month)).toBeInTheDocument();
    });

    it("shows the full-page error only when nothing loaded at all", async () => {
      getContentPlanMock.mockRejectedValue(new Error("boom"));
      renderPage();

      await waitFor(() =>
        expect(screen.getByText(/Не вдалося завантажити контент-план/)).toBeInTheDocument(),
      );
      expect(screen.queryByText(uk.contentPlanPage.views.week)).not.toBeInTheDocument();
    });
  });

  describe("access", () => {
    it("offers no way to add a post under a read-only grant", async () => {
      canEdit.mockReturnValue(false);
      await renderLoaded();

      expect(screen.queryByRole("button", { name: uk.contentPlanPage.newPostButton })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: uk.contentPlanBoard.addOnDay })).not.toBeInTheDocument();
      // The plan itself is still readable.
      expect(screen.getAllByText("Reels про догляд").length).toBeGreaterThan(0);
    });
  });

  describe("the client filter", () => {
    it("lists the clients the plan itself returned", async () => {
      await renderLoaded();

      const select = clientFilter();
      expect(within(select).getByRole("option", { name: "MUSE'23" })).toBeInTheDocument();
      expect(within(select).getByRole("option", { name: uk.contentPlanPage.allClients })).toBeInTheDocument();
    });

    it("refetches for the chosen client without blanking the page", async () => {
      await renderLoaded();

      fireEvent.change(clientFilter(), { target: { value: "client-2" } });

      // Regression: every key misses at once here, which used to unmount the
      // <select> the user had just used.
      expect(screen.queryByText(uk.contentPlanPage.loading)).not.toBeInTheDocument();
      expect(clientFilter()).toBeInTheDocument();
      await waitFor(() =>
        expect(getContentPlanMock).toHaveBeenCalledWith(expect.any(String), "client-2"),
      );
    });
  });
});
