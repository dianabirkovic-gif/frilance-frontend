import { describe, expect, it } from "vitest";
import { NO_FIGURE, formatBytes, formatCount, formatPercent, formatRoas, formatUnitMoney } from "./adMetrics";

describe("adMetrics", () => {
  /** "No figure" is a dash, never 0 — a CPL of ₴0 would read as the best result there is. */
  it("writes a missing ratio as a dash, never as zero", () => {
    expect(formatUnitMoney(null)).toBe(NO_FIGURE);
    expect(formatPercent(null)).toBe(NO_FIGURE);
    expect(formatRoas(null)).toBe(NO_FIGURE);
  });

  it("keeps the kopiykas of a per-unit price", () => {
    expect(formatUnitMoney(0.45)).toContain("0,45");
    expect(formatUnitMoney(12)).toContain("12,00");
  });

  it("writes a real zero as zero", () => {
    expect(formatPercent(0)).toBe("0,00%");
    expect(formatCount(0)).toBe("0");
  });

  it("writes ROAS as a multiple", () => {
    expect(formatRoas(4)).toBe("4,00×");
  });

  it("sizes files", () => {
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
