import type { Post } from "../api/contentPlan";

export interface CalendarDay {
  /** `YYYY-MM-DD` — what the "add a post here" action passes back. */
  date: string;
  dayOfMonth: number;
  /** 0 = Sunday, matching `Date#getDay`. */
  weekday: number;
  isWeekend: boolean;
  isToday: boolean;
  posts: Post[];
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `YYYY-MM-DD` for a local date — `toISOString` would shift it by the timezone offset. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The local `Date` a `YYYY-MM-DD` names — `new Date(iso)` would parse it as UTC midnight. */
export function fromIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function buildDays(start: Date, count: number, posts: Post[], today: Date): CalendarDay[] {
  const todayIso = toIsoDate(today);

  const postsByDate = new Map<string, Post[]>();
  for (const post of posts) {
    const existing = postsByDate.get(post.scheduledDate);
    if (existing) {
      existing.push(post);
    } else {
      postsByDate.set(post.scheduledDate, [post]);
    }
  }

  const days: CalendarDay[] = [];
  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
    const iso = toIsoDate(date);
    const weekday = date.getDay();
    days.push({
      date: iso,
      dayOfMonth: date.getDate(),
      weekday,
      isWeekend: weekday === 0 || weekday === 6,
      isToday: iso === todayIso,
      posts: postsByDate.get(iso) ?? [],
    });
  }
  return days;
}

/**
 * Every day of `month` (`YYYY-MM`), each carrying the posts scheduled on it —
 * FR-08's "публікація відображається в календарі відповідного місяця". Every
 * day is present whether or not anything is planned: an empty day is a slot
 * the user clicks to plan one, so it can't be dropped.
 *
 * Posts dated outside the month are ignored rather than clamped into it —
 * that would silently move someone's publication in the only view they have
 * of it.
 */
export function buildMonthDays(month: string, posts: Post[], today: Date): CalendarDay[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  return buildDays(new Date(year, monthNumber - 1, 1), daysInMonth, posts, today);
}

/** The seven days of the week starting at `weekStart` (`YYYY-MM-DD`, a Monday). */
export function buildWeekDays(weekStart: string, posts: Post[], today: Date): CalendarDay[] {
  return buildDays(fromIsoDate(weekStart), 7, posts, today);
}

/**
 * The Monday on or before `date`. The plan is read Monday-first (the mockup's
 * week column order), so every week boundary in this module is a Monday, not
 * `Date#getDay`'s Sunday.
 */
export function startOfWeek(date: Date): Date {
  const mondayIndex = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - mondayIndex);
}

/** `YYYY-MM-DD` for the day `offset` days away — the week/day navigation step. */
export function shiftDays(iso: string, offset: number): string {
  const date = fromIsoDate(iso);
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset));
}

/**
 * The same day of the month, `offset` months away — the month-at-a-time step
 * that still remembers which day you were on. Rebuilding the date as the 1st
 * instead loses that, and the day is what every other view is derived from.
 *
 * Clamped to the target month's length, so the 31st of January steps to the
 * 28th of February rather than overflowing into March. That clamp is lossy:
 * stepping back returns the 28th, not the 31st.
 */
export function shiftMonthKeepingDay(iso: string, offset: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const target = new Date(year, month - 1 + offset, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return toIsoDate(new Date(target.getFullYear(), target.getMonth(), Math.min(day, lastDay)));
}

/** `YYYY-MM` for the month `offset` months away from `month`. */
export function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(year, monthNumber - 1 + offset, 1);
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}`;
}

/** `YYYY-MM` for the month containing `date`. */
export function monthOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** `YYYY-MM` of a `YYYY-MM-DD`. */
export function monthOfIso(iso: string): string {
  return iso.slice(0, 7);
}

/**
 * Every `YYYY-MM` the inclusive `from`..`to` range touches, in order. A week
 * straddles two months five times a year, and the plan endpoint serves one
 * month per call — this is what tells the page how many to ask for so the
 * days on the far side of the boundary aren't silently empty.
 */
export function monthsInRange(from: string, to: string): string[] {
  const months: string[] = [];
  let month = monthOfIso(from);
  const last = monthOfIso(to);
  while (month <= last) {
    months.push(month);
    month = shiftMonth(month, 1);
  }
  return months;
}

/**
 * "Серпень 2026" — the server sends `YYYY-MM`, never a label, so every screen
 * showing a month by name builds it here. Read by the content-plan module's
 * toolbar and by the client drawer's month navigator.
 */
export function monthTitle(month: string, locale: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const formatted = new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** "13 сер" — the compact day label used by the calendar's date column and range title. */
export function formatDayMonth(iso: string, monthsShort: string[]): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${monthsShort[month - 1]}`;
}

/** "30 чер — 6 лип" — the week navigator's title. */
export function formatRangeLabel(from: string, to: string, monthsShort: string[]): string {
  return `${formatDayMonth(from, monthsShort)} — ${formatDayMonth(to, monthsShort)}`;
}
