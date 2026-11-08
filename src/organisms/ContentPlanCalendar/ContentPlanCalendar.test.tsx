import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Post } from "../../api/contentPlan";
import { interpolate } from "../../i18n/interpolate";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { ContentPlanCalendar } from "./ContentPlanCalendar";

type CalendarProps = Parameters<typeof ContentPlanCalendar>[0];

const rateLabel = (rating: number) => interpolate(uk.ratingStars.rateTemplate, { rating });
const ratingLabel = (rating: number) => interpolate(uk.ratingStars.currentTemplate, { rating });

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

function renderCalendar(props: Partial<CalendarProps> = {}) {
  const handlers = {
    onAddPost: vi.fn(),
    onEditPost: vi.fn(),
    onCycleStatus: vi.fn(),
    onRatePost: vi.fn(),
    onDeletePost: vi.fn(),
  };
  const view = render(
    <LocaleProvider>
      <ContentPlanCalendar
        month="2026-08"
        posts={[post()]}
        canEdit
        showClientName={false}
        {...handlers}
        {...props}
      />
    </LocaleProvider>,
  );
  return { ...handlers, ...view };
}

describe("ContentPlanCalendar", () => {
  it("shows the scheduled post with its type and status", () => {
    renderCalendar();

    expect(screen.getAllByText("Reels про догляд").length).toBeGreaterThan(0);
    expect(screen.getAllByText(uk.postType.REELS).length).toBeGreaterThan(0);
    expect(screen.getAllByText(uk.postStatus.DRAFT).length).toBeGreaterThan(0);
  });

  it("offers every empty day of the month as a way to plan a post", () => {
    const { onAddPost } = renderCalendar({ posts: [] });

    const addButtons = screen.getAllByRole("button", { name: uk.contentPlanCalendar.addOnDay });
    expect(addButtons).toHaveLength(31);

    fireEvent.click(addButtons[0]);
    expect(onAddPost).toHaveBeenCalledWith("2026-08-01");
  });

  it("shows the empty state when the month has nothing planned", () => {
    renderCalendar({ posts: [] });

    expect(screen.getByText(uk.contentPlanCalendar.empty)).toBeInTheDocument();
  });

  it("advances the status when the chip is clicked", () => {
    const { onCycleStatus } = renderCalendar();

    fireEvent.click(screen.getAllByRole("button", { name: uk.postStatus.DRAFT })[0]);

    expect(onCycleStatus).toHaveBeenCalledWith(expect.objectContaining({ id: "post-1" }));
  });

  it("rates a published post, and clicking the current rating clears it", () => {
    const { onRatePost } = renderCalendar({ posts: [post({ status: "PUBLISHED", rating: 1 })] });

    fireEvent.click(screen.getAllByRole("button", { name: rateLabel(3) })[0]);
    expect(onRatePost).toHaveBeenCalledWith(expect.objectContaining({ id: "post-1" }), 3);

    fireEvent.click(screen.getAllByRole("button", { name: rateLabel(1) })[0]);
    expect(onRatePost).toHaveBeenLastCalledWith(expect.objectContaining({ id: "post-1" }), null);
  });

  it("offers no rating control on a post that isn't published yet", () => {
    renderCalendar();

    expect(screen.queryByRole("button", { name: rateLabel(1) })).not.toBeInTheDocument();
  });

  it("hides every write affordance under a read-only grant", () => {
    renderCalendar({ canEdit: false, posts: [post({ status: "PUBLISHED", rating: 2 })] });

    expect(screen.queryByRole("button", { name: uk.contentPlanCalendar.addOnDay })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: uk.contentPlanCalendar.deleteAriaLabel })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: uk.postStatus.PUBLISHED })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: rateLabel(1) })).not.toBeInTheDocument();
    // The plan itself stays readable, ratings included.
    expect(screen.getAllByText("Reels про догляд").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(ratingLabel(2)).length).toBeGreaterThan(0);
  });

  it("names the client only when several clients are in view", () => {
    const { unmount } = renderCalendar({ showClientName: false });
    expect(screen.queryByText("MUSE'23")).not.toBeInTheDocument();
    unmount();

    renderCalendar({ showClientName: true });
    expect(screen.getAllByText("MUSE'23").length).toBeGreaterThan(0);
  });

  it("groups two posts on one day under a single date cell", () => {
    renderCalendar({
      posts: [post(), post({ id: "post-2", title: "Карусель з кейсом", type: "CAROUSEL" })],
    });

    const table = screen.getByRole("table");
    expect(within(table).getAllByText("13 сер")).toHaveLength(1);
    expect(within(table).getAllByText("Карусель з кейсом")).toHaveLength(1);
  });

  it("gives the author their own column, and an em dash when there is none", () => {
    renderCalendar({
      posts: [post(), post({ id: "post-2", title: "Без автора", authorId: null, authorName: null })],
    });

    const table = screen.getByRole("table");
    expect(within(table).getByText(uk.contentPlanCalendar.headers.author)).toBeInTheDocument();
    expect(within(table).getAllByText("Оксана Коваль").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("—").length).toBeGreaterThan(0);
  });

  it("asks to delete a post through its trash action", () => {
    const { onDeletePost } = renderCalendar();

    fireEvent.click(screen.getAllByRole("button", { name: uk.contentPlanCalendar.deleteAriaLabel })[0]);

    expect(onDeletePost).toHaveBeenCalledWith(expect.objectContaining({ id: "post-1" }));
  });
});
