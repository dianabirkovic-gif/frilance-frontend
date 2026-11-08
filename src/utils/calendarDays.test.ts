import { describe, expect, it } from "vitest";
import type { Post } from "../api/contentPlan";
import {
  buildMonthDays,
  buildWeekDays,
  formatDayMonth,
  formatRangeLabel,
  fromIsoDate,
  monthOf,
  monthOfIso,
  monthsInRange,
  monthTitle,
  shiftDays,
  shiftMonth,
  shiftMonthKeepingDay,
  startOfWeek,
  toIsoDate,
} from "./calendarDays";

const MONTHS_SHORT = ["січ", "лют", "бер", "кві", "тра", "чер", "лип", "сер", "вер", "жов", "лис", "гру"];

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

describe("buildMonthDays", () => {
  it("returns every day of the month, including the ones with nothing planned", () => {
    const days = buildMonthDays("2026-02", [], new Date(2026, 1, 10));

    expect(days).toHaveLength(28);
    expect(days[0]).toMatchObject({ date: "2026-02-01", dayOfMonth: 1 });
    expect(days[27]).toMatchObject({ date: "2026-02-28", dayOfMonth: 28 });
    expect(days.every((day) => day.posts.length === 0)).toBe(true);
  });

  it("counts a leap day", () => {
    expect(buildMonthDays("2028-02", [], new Date(2028, 1, 1))).toHaveLength(29);
  });

  it("buckets posts onto their scheduled day, keeping several on one date", () => {
    const days = buildMonthDays(
      "2026-08",
      [post("a", "2026-08-13"), post("b", "2026-08-13"), post("c", "2026-08-01")],
      new Date(2026, 7, 13),
    );

    expect(days[0].posts.map((p) => p.id)).toEqual(["c"]);
    expect(days[12].posts.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("ignores posts dated outside the month rather than clamping them into it", () => {
    const days = buildMonthDays("2026-08", [post("previous", "2026-07-31")], new Date(2026, 7, 1));

    expect(days.flatMap((day) => day.posts)).toEqual([]);
  });

  it("marks today and the weekend", () => {
    // 2026-08-13 is a Thursday; the 15th/16th are Saturday/Sunday.
    const days = buildMonthDays("2026-08", [], new Date(2026, 7, 13));

    expect(days[12]).toMatchObject({ isToday: true, isWeekend: false });
    expect(days[14].isWeekend).toBe(true);
    expect(days[15].isWeekend).toBe(true);
    expect(days.filter((day) => day.isToday)).toHaveLength(1);
  });

  it("marks no day as today when the month isn't the current one", () => {
    const days = buildMonthDays("2026-09", [], new Date(2026, 7, 13));

    expect(days.some((day) => day.isToday)).toBe(false);
  });
});

describe("buildWeekDays", () => {
  it("returns the seven days from the given Monday", () => {
    const days = buildWeekDays("2026-08-10", [], new Date(2026, 7, 13));

    expect(days.map((day) => day.date)).toEqual([
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
      "2026-08-15",
      "2026-08-16",
    ]);
    expect(days[3].isToday).toBe(true);
  });

  it("carries posts across a month boundary the week straddles", () => {
    const days = buildWeekDays(
      "2026-06-29",
      [post("june", "2026-06-30"), post("july", "2026-07-01")],
      new Date(2026, 6, 2),
    );

    expect(days[1].posts.map((p) => p.id)).toEqual(["june"]);
    expect(days[2]).toMatchObject({ date: "2026-07-01", dayOfMonth: 1 });
    expect(days[2].posts.map((p) => p.id)).toEqual(["july"]);
  });
});

describe("startOfWeek", () => {
  it("returns the Monday on or before the date", () => {
    // 2026-08-13 is a Thursday, 2026-08-10 the Monday of that week.
    expect(toIsoDate(startOfWeek(new Date(2026, 7, 13)))).toBe("2026-08-10");
    expect(toIsoDate(startOfWeek(new Date(2026, 7, 10)))).toBe("2026-08-10");
  });

  it("treats Sunday as the last day of the week, not the first", () => {
    // 2026-08-16 is a Sunday — its week still starts on the 10th.
    expect(toIsoDate(startOfWeek(new Date(2026, 7, 16)))).toBe("2026-08-10");
  });
});

describe("shiftDays", () => {
  it("moves across month and year boundaries", () => {
    expect(shiftDays("2026-06-29", 7)).toBe("2026-07-06");
    expect(shiftDays("2026-01-01", -7)).toBe("2025-12-25");
  });
});

describe("toIsoDate / fromIsoDate", () => {
  it("formats the local date, not the UTC one", () => {
    // 23:30 local on the 13th is already the 14th in UTC east of Greenwich —
    // `toISOString().slice(0, 10)` would put the post on the wrong day.
    expect(toIsoDate(new Date(2026, 7, 13, 23, 30))).toBe("2026-08-13");
  });

  it("round-trips through a local Date", () => {
    expect(toIsoDate(fromIsoDate("2026-08-13"))).toBe("2026-08-13");
  });
});

describe("shiftMonth", () => {
  it("moves within a year", () => {
    expect(shiftMonth("2026-08", 1)).toBe("2026-09");
    expect(shiftMonth("2026-08", -1)).toBe("2026-07");
  });

  it("crosses the year boundary in both directions", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("shiftMonthKeepingDay", () => {
  it("keeps the day of the month", () => {
    expect(shiftMonthKeepingDay("2026-08-20", 1)).toBe("2026-09-20");
    expect(shiftMonthKeepingDay("2026-08-20", -1)).toBe("2026-07-20");
  });

  it("clamps to the target month's length instead of overflowing into the next one", () => {
    // `new Date(2026, 1, 31)` would be 3 March, silently skipping February.
    expect(shiftMonthKeepingDay("2026-01-31", 1)).toBe("2026-02-28");
    expect(shiftMonthKeepingDay("2028-01-31", 1)).toBe("2028-02-29");
    expect(shiftMonthKeepingDay("2026-05-31", -1)).toBe("2026-04-30");
  });

  it("crosses the year boundary", () => {
    expect(shiftMonthKeepingDay("2026-12-15", 1)).toBe("2027-01-15");
    expect(shiftMonthKeepingDay("2026-01-15", -1)).toBe("2025-12-15");
  });
});

describe("monthOf", () => {
  it("pads single-digit months", () => {
    expect(monthOf(new Date(2026, 0, 5))).toBe("2026-01");
  });

  it("reads the month off an ISO date", () => {
    expect(monthOfIso("2026-01-05")).toBe("2026-01");
  });
});

describe("monthsInRange", () => {
  it("is one month when the range stays inside it", () => {
    expect(monthsInRange("2026-08-10", "2026-08-16")).toEqual(["2026-08"]);
  });

  it("names both months a week straddles", () => {
    expect(monthsInRange("2026-06-29", "2026-07-05")).toEqual(["2026-06", "2026-07"]);
  });

  it("crosses the year boundary", () => {
    expect(monthsInRange("2026-12-28", "2027-01-03")).toEqual(["2026-12", "2027-01"]);
  });
});

describe("formatDayMonth / formatRangeLabel", () => {
  it("drops the leading zero of the day", () => {
    expect(formatDayMonth("2026-08-01", MONTHS_SHORT)).toBe("1 сер");
  });

  it("joins the two ends of a week that straddles a month", () => {
    expect(formatRangeLabel("2026-06-29", "2026-07-05", MONTHS_SHORT)).toBe("29 чер — 5 лип");
  });
});

describe("monthTitle", () => {
  it("names the month and year in Ukrainian, capitalised", () => {
    expect(monthTitle("2026-08", "uk")).toBe("Серпень 2026 р.");
  });

  it("names it in English for any other locale", () => {
    expect(monthTitle("2026-08", "en")).toBe("August 2026");
  });

  // `YYYY-MM` is parsed by hand: `new Date("2026-01")` would be UTC midnight,
  // which is the previous December west of Greenwich.
  it("keeps January in its own year", () => {
    expect(monthTitle("2026-01", "en")).toBe("January 2026");
    expect(monthTitle("2026-12", "en")).toBe("December 2026");
  });
});
