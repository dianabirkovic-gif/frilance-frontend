import type { ContentPlanView } from "../../i18n/dictionary";
import {
  fromIsoDate,
  monthOfIso,
  shiftDays,
  shiftMonthKeepingDay,
  startOfWeek,
  toIsoDate,
} from "../../utils/calendarDays";

/** The inclusive span of days a view is showing, as `YYYY-MM-DD`. */
export interface PlanRange {
  from: string;
  to: string;
}

/**
 * The page keeps one `anchor` date for all three views and derives everything
 * from it, so switching views leaves the user where they were. That only holds
 * if every navigation preserves the anchor's *day* — see `stepAnchor`.
 */
export function rangeFor(view: ContentPlanView, anchor: string): PlanRange {
  if (view === "week") {
    const from = toIsoDate(startOfWeek(fromIsoDate(anchor)));
    return { from, to: shiftDays(from, 6) };
  }
  const month = monthOfIso(anchor);
  return { from: `${month}-01`, to: `${month}-${String(daysInMonth(month)).padStart(2, "0")}` };
}

/**
 * One step forward or back, in whatever unit the current view reads in.
 *
 * Both branches move the anchor itself rather than the start of the range it
 * produces. Snapping it to the week's Monday, or to the month's 1st, would
 * make the anchor mean something different depending on how the user got
 * there: paging a month and back would land them in a different week (the week
 * holding the 1st begins in the *previous* month in 41 of 48 months), and
 * paging a week and back would move the month the ruler draws.
 */
export function stepAnchor(view: ContentPlanView, anchor: string, direction: 1 | -1): string {
  return view === "week" ? shiftDays(anchor, direction * 7) : shiftMonthKeepingDay(anchor, direction);
}

/**
 * The month the ruler draws under a week view: the one holding the week's
 * midpoint, so a week split across two months belongs to whichever owns most
 * of it. Following the anchor instead would draw a one-day sliver at the edge
 * of a month the user is barely looking at.
 */
export function rulerMonth(range: PlanRange): string {
  return monthOfIso(shiftDays(range.from, 3));
}

/** How many days `month` (`YYYY-MM`) has. */
export function daysInMonth(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

/**
 * `iso`'s day of the month, or `fallback` when `iso` falls outside `month` —
 * the ruler draws one month, so the half of a straddling week on the far side
 * of the boundary is pinned to this month's edge instead of off the end.
 */
export function clampToMonth(iso: string, month: string, fallback: number): number {
  return monthOfIso(iso) === month ? Number(iso.slice(8)) : fallback;
}

/** Whether `iso` falls inside the range, inclusive. */
export function rangeContains(range: PlanRange, iso: string): boolean {
  return iso >= range.from && iso <= range.to;
}
