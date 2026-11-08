import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Post } from "../../api/contentPlan";
import { interpolate } from "../../i18n/interpolate";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { buildMonthDays, buildWeekDays } from "../../utils/calendarDays";
import { ContentPlanBoard } from "./ContentPlanBoard";

type BoardProps = Parameters<typeof ContentPlanBoard>[0];

const rateLabel = (rating: number) => interpolate(uk.ratingStars.rateTemplate, { rating });
const ratingLabel = (rating: number) => interpolate(uk.ratingStars.currentTemplate, { rating });

// 2026-08-10 is the Monday of the week holding Thursday the 13th.
const WEEK_START = "2026-08-10";
const TODAY = new Date(2026, 7, 13);

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: "post-1",
    clientId: "client-1",
    clientName: "MUSE'23",
    type: "REELS",
    title: "Reels про догляд",
    scheduledDate: "2026-08-13",
    status: "DRAFT",
    rating: null,
    authorId: "author-1",
    authorName: "Оксана Коваль",
    note: null,
    ...overrides,
  };
}

function week(posts: Post[]) {
  return buildWeekDays(WEEK_START, posts, TODAY);
}

function renderBoard(props: Partial<BoardProps> = {}) {
  const handlers = {
    onAddPost: vi.fn(),
    onEditPost: vi.fn(),
    onCycleStatus: vi.fn(),
    onRatePost: vi.fn(),
    onDeletePost: vi.fn(),
  };
  const view = render(
    <LocaleProvider>
      <ContentPlanBoard
        days={week([post()])}
        variant="week"
        canEdit
        showClientName={false}
        {...handlers}
        {...props}
      />
    </LocaleProvider>,
  );
  return { ...handlers, ...view };
}

describe("ContentPlanBoard", () => {
  it("shows the scheduled post with its type and title under its day", () => {
    renderBoard();

    expect(screen.getAllByText("Reels про догляд").length).toBeGreaterThan(0);
    expect(screen.getAllByText(uk.postType.REELS).length).toBeGreaterThan(0);
    // Monday through Sunday, each column headed by its weekday name.
    expect(screen.getAllByText(uk.calendar.weekdaysLong[1]).length).toBeGreaterThan(0);
    expect(screen.getAllByText(uk.calendar.weekdaysLong[0]).length).toBeGreaterThan(0);
  });

  it("marks the day that is today", () => {
    renderBoard();

    expect(screen.getAllByText(`${uk.calendar.weekdaysLong[4]} · ${uk.contentPlanBoard.todaySuffix}`).length).toBe(2);
  });

  it("offers every day of the week as a way to plan a post", () => {
    const { onAddPost } = renderBoard({ days: week([]) });

    const addButtons = screen.getAllByRole("button", { name: uk.contentPlanBoard.addOnDay });
    expect(addButtons).toHaveLength(7);

    fireEvent.click(addButtons[0]);
    expect(onAddPost).toHaveBeenCalledWith("2026-08-10");
  });

  it("shows an empty day as such in the stacked layout", () => {
    renderBoard({ days: week([]) });

    expect(screen.getAllByText(uk.contentPlanBoard.emptyDay)).toHaveLength(7);
  });

  it("shows the empty state when a month view has nothing planned at all", () => {
    renderBoard({ days: [], variant: "month" });

    expect(screen.getByText(uk.contentPlanBoard.empty)).toBeInTheDocument();
  });

  describe("month variant", () => {
    // 2026-08-01 is a Saturday, so the month grid needs five blank cells
    // before the 1st for it to land under СБ.
    const august = () => buildMonthDays("2026-08", [post({ scheduledDate: "2026-08-13" })], TODAY);

    it("names the weekdays once above the grid instead of on every cell", () => {
      const { container } = renderBoard({ days: august(), variant: "month" });

      for (const weekday of uk.calendar.weekdaysShort) {
        expect(screen.getAllByText(weekday).length).toBeGreaterThan(0);
      }
      // The per-column weekday name is the week view's affordance, not this one.
      expect(screen.queryByText(uk.calendar.weekdaysLong[1])).not.toBeInTheDocument();
      expect(container.querySelectorAll("[class*=weekdayHead]")).toHaveLength(7);
    });

    it("pads the grid so the 1st falls under its own weekday", () => {
      const { container } = renderBoard({ days: august(), variant: "month" });

      // Saturday is the sixth Monday-first column, so five cells come before it.
      expect(container.querySelectorAll("[class*=blankCol]")).toHaveLength(5);
    });

    it("pads a month that starts on a Sunday by a full six cells", () => {
      // 2026-11-01 is a Sunday — the last Monday-first column.
      const { container } = renderBoard({ days: buildMonthDays("2026-11", [], TODAY), variant: "month" });

      expect(container.querySelectorAll("[class*=blankCol]")).toHaveLength(6);
    });

    it("pads nothing when the month starts on a Monday", () => {
      // 2026-06-01 is a Monday.
      const { container } = renderBoard({ days: buildMonthDays("2026-06", [], TODAY), variant: "month" });

      expect(container.querySelectorAll("[class*=blankCol]")).toHaveLength(0);
    });

    it("drops the empty days from the stacked layout, unlike the week view", () => {
      renderBoard({ days: august(), variant: "month" });

      // 31 days, one of which has the post — the stacked list shows only that one.
      expect(screen.queryByText(uk.contentPlanBoard.emptyDay)).not.toBeInTheDocument();
      expect(screen.getAllByText("Reels про догляд")).toHaveLength(2);
    });
  });

  it("opens a post for editing from its card", () => {
    const { onEditPost } = renderBoard();

    fireEvent.click(screen.getAllByText("Reels про догляд")[0]);

    expect(onEditPost).toHaveBeenCalledWith(expect.objectContaining({ id: "post-1" }));
  });

  it("names who wrote the post on its card", () => {
    renderBoard();

    const label = interpolate(uk.contentPlanBoard.authorTemplate, { name: "Оксана Коваль" });
    // Once in the grid, once in the stacked layout.
    expect(screen.getAllByText(label)).toHaveLength(2);
  });

  it("says nothing about the author on a post that predates authorship", () => {
    renderBoard({ days: week([post({ authorId: null, authorName: null })]) });

    expect(screen.queryByText(/Автор/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Reels про догляд").length).toBeGreaterThan(0);
  });

  it("names the status on the card rather than only colouring it", () => {
    renderBoard();

    expect(screen.getAllByText(uk.postStatusShort.DRAFT).length).toBeGreaterThan(0);
  });

  it("advances the status when the status chip is clicked", () => {
    const { onCycleStatus } = renderBoard();

    fireEvent.click(screen.getAllByRole("button", { name: uk.postStatusShort.DRAFT })[0]);

    expect(onCycleStatus).toHaveBeenCalledWith(expect.objectContaining({ id: "post-1" }));
  });

  it("rates a published post, and clicking the current rating clears it", () => {
    const { onRatePost } = renderBoard({
      days: week([post({ status: "PUBLISHED", rating: 1 })]),
    });

    fireEvent.click(screen.getAllByRole("button", { name: rateLabel(3) })[0]);
    expect(onRatePost).toHaveBeenCalledWith(expect.objectContaining({ id: "post-1" }), 3);

    fireEvent.click(screen.getAllByRole("button", { name: rateLabel(1) })[0]);
    expect(onRatePost).toHaveBeenLastCalledWith(expect.objectContaining({ id: "post-1" }), null);
  });

  it("offers no rating control on a post that isn't published yet", () => {
    renderBoard();

    expect(screen.queryByRole("button", { name: rateLabel(1) })).not.toBeInTheDocument();
  });

  it("asks to delete a post through its trash action", () => {
    const { onDeletePost } = renderBoard();

    fireEvent.click(screen.getAllByRole("button", { name: uk.contentPlanBoard.deleteAriaLabel })[0]);

    expect(onDeletePost).toHaveBeenCalledWith(expect.objectContaining({ id: "post-1" }));
  });

  it("hides every write affordance under a read-only grant", () => {
    renderBoard({
      canEdit: false,
      days: week([post({ status: "PUBLISHED", rating: 2 })]),
    });

    expect(screen.queryByRole("button", { name: uk.contentPlanBoard.addOnDay })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: uk.contentPlanBoard.deleteAriaLabel })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: uk.postStatusShort.PUBLISHED })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: rateLabel(1) })).not.toBeInTheDocument();
    // The plan itself stays readable, ratings and statuses included.
    expect(screen.getAllByText("Reels про догляд").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(ratingLabel(2)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(uk.postStatusShort.PUBLISHED).length).toBeGreaterThan(0);
  });

  it("names the client only when several clients are in view", () => {
    const { unmount } = renderBoard({ showClientName: false });
    expect(screen.queryByText("MUSE'23")).not.toBeInTheDocument();
    unmount();

    renderBoard({ showClientName: true });
    expect(screen.getAllByText("MUSE'23").length).toBeGreaterThan(0);
  });

  it("keeps both posts of a day in that day's column", () => {
    renderBoard({
      days: week([post(), post({ id: "post-2", title: "Карусель з кейсом", type: "CAROUSEL" })]),
    });

    // Once in the grid, once in the stacked layout.
    expect(screen.getAllByText("Карусель з кейсом")).toHaveLength(2);
  });
});
