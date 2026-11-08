import { describe, expect, it } from "vitest";
import { clampToMonth, daysInMonth, rangeContains, rangeFor, rulerMonth, stepAnchor } from "./planRange";

describe("rangeFor", () => {
  it("gives the week view the Monday-to-Sunday week around the anchor", () => {
    // 2026-08-20 is a Thursday.
    expect(rangeFor("week", "2026-08-20")).toEqual({ from: "2026-08-17", to: "2026-08-23" });
  });

  it("keeps a week that straddles two months whole", () => {
    expect(rangeFor("week", "2026-09-02")).toEqual({ from: "2026-08-31", to: "2026-09-06" });
  });

  it("gives the month and list views the whole month, however long it is", () => {
    expect(rangeFor("month", "2026-08-20")).toEqual({ from: "2026-08-01", to: "2026-08-31" });
    expect(rangeFor("list", "2026-02-10")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(rangeFor("month", "2028-02-10")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });
});

describe("stepAnchor", () => {
  it("moves the week view seven days without disturbing the day of the week", () => {
    expect(stepAnchor("week", "2026-08-20", 1)).toBe("2026-08-27");
    expect(stepAnchor("week", "2026-08-20", -1)).toBe("2026-08-13");
  });

  it("moves the month view a month, keeping the day", () => {
    expect(stepAnchor("month", "2026-08-20", 1)).toBe("2026-09-20");
    expect(stepAnchor("month", "2026-08-20", -1)).toBe("2026-07-20");
  });

  it("clamps to the target month's length rather than overflowing", () => {
    expect(stepAnchor("month", "2026-01-31", 1)).toBe("2026-02-28");
    expect(stepAnchor("month", "2028-01-31", 1)).toBe("2028-02-29");
    expect(stepAnchor("month", "2026-03-31", -1)).toBe("2026-02-28");
  });

  it("crosses the year boundary in both views", () => {
    expect(stepAnchor("month", "2026-12-15", 1)).toBe("2027-01-15");
    expect(stepAnchor("week", "2026-01-01", -1)).toBe("2025-12-25");
  });

  // Regression: `step()` used to rebuild the anchor as the 1st of the month,
  // so a month paged forward and back moved the *week* view onto the week
  // holding the 1st — which begins in the previous month 41 months out of 48.
  it("leaves the week view where it was after a month is paged forward and back", () => {
    const anchor = "2026-08-20";
    const roundTrip = stepAnchor("month", stepAnchor("month", anchor, 1), -1);

    expect(roundTrip).toBe(anchor);
    expect(rangeFor("week", roundTrip)).toEqual(rangeFor("week", anchor));
  });

  // Regression: the week branch used to step from the range's Monday, so the
  // anchor was rewritten to a Monday on the first click and the month the
  // ruler draws depended on whether the user had paged at all.
  it("leaves the ruler alone after a week is paged back and forward", () => {
    const anchor = "2026-09-02";
    const roundTrip = stepAnchor("week", stepAnchor("week", anchor, -1), 1);

    expect(roundTrip).toBe(anchor);
    expect(rulerMonth(rangeFor("week", roundTrip))).toBe(rulerMonth(rangeFor("week", anchor)));
  });

  it("survives a long walk in either direction without drifting off the weekday", () => {
    let anchor = "2026-08-20";
    for (let i = 0; i < 30; i += 1) anchor = stepAnchor("week", anchor, 1);
    for (let i = 0; i < 30; i += 1) anchor = stepAnchor("week", anchor, -1);

    expect(anchor).toBe("2026-08-20");
  });
});

describe("rulerMonth", () => {
  it("follows the month holding most of the week, not the one it starts in", () => {
    expect(rulerMonth({ from: "2026-08-31", to: "2026-09-06" })).toBe("2026-09");
    expect(rulerMonth({ from: "2026-08-24", to: "2026-08-30" })).toBe("2026-08");
  });

  it("stays with the starting month when that month owns most of the week", () => {
    // 30 Sep – 4 Oct is in September's half; 1–3 Oct are not enough to claim it.
    expect(rulerMonth({ from: "2026-09-28", to: "2026-10-04" })).toBe("2026-10");
    expect(rulerMonth({ from: "2026-09-21", to: "2026-09-27" })).toBe("2026-09");
  });

  it("always leaves the highlight at least four days wide", () => {
    const range = { from: "2026-08-31", to: "2026-09-06" };
    const month = rulerMonth(range);
    const from = clampToMonth(range.from, month, 1);
    const to = clampToMonth(range.to, month, daysInMonth(month));

    expect(to - from).toBeGreaterThanOrEqual(3);
  });
});

describe("daysInMonth", () => {
  it("knows the short months and the leap day", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
    expect(daysInMonth("2026-04")).toBe(30);
    expect(daysInMonth("2026-12")).toBe(31);
  });
});

describe("clampToMonth", () => {
  it("reads the day when the date is in the month", () => {
    expect(clampToMonth("2026-08-31", "2026-08", 1)).toBe(31);
    expect(clampToMonth("2026-08-01", "2026-08", 31)).toBe(1);
  });

  it("falls back when the date is outside it", () => {
    expect(clampToMonth("2026-07-27", "2026-08", 1)).toBe(1);
    expect(clampToMonth("2026-09-02", "2026-08", 31)).toBe(31);
  });
});

describe("rangeContains", () => {
  it("is inclusive at both ends", () => {
    const range = { from: "2026-08-17", to: "2026-08-23" };

    expect(rangeContains(range, "2026-08-17")).toBe(true);
    expect(rangeContains(range, "2026-08-23")).toBe(true);
    expect(rangeContains(range, "2026-08-16")).toBe(false);
    expect(rangeContains(range, "2026-08-24")).toBe(false);
  });
});
