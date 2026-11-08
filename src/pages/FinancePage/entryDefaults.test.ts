import { describe, expect, it } from "vitest";
import { defaultDateFor } from "./entryDefaults";

describe("defaultDateFor", () => {
  it("uses today when today is inside the month on screen", () => {
    expect(defaultDateFor("2026-08", new Date(2026, 7, 20))).toBe("2026-08-20");
  });

  it("falls to the 1st when the user has paged away from the current month", () => {
    expect(defaultDateFor("2026-06", new Date(2026, 7, 20))).toBe("2026-06-01");
    expect(defaultDateFor("2026-12", new Date(2026, 7, 20))).toBe("2026-12-01");
  });

  /** Same month number, different year — the guard is on the whole key, not the month. */
  it("does not mistake the same month of another year for the current one", () => {
    expect(defaultDateFor("2025-08", new Date(2026, 7, 20))).toBe("2025-08-01");
  });
});
