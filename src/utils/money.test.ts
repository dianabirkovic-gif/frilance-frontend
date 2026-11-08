import { describe, expect, it } from "vitest";
import { formatMoney, formatSignedMoney } from "./money";

/** `uk-UA` groups with U+00A0, which is what these assertions compare against. */
const NBSP = " ";

describe("formatMoney", () => {
  it("writes whole hryvnia with grouped thousands", () => {
    expect(formatMoney(184200)).toBe(`₴184${NBSP}200`);
    expect(formatMoney(0)).toBe("₴0");
  });

  it("rounds kopiykas away — a register is read by scanning, not by auditing", () => {
    expect(formatMoney(3400.49)).toBe(`₴3${NBSP}400`);
  });
});

describe("formatSignedMoney", () => {
  it("takes its sign from the direction, not from the amount", () => {
    expect(formatSignedMoney(32000, "IN")).toBe(`+ ₴32${NBSP}000`);
    expect(formatSignedMoney(14000, "OUT")).toBe(`− ₴14${NBSP}000`);
  });

  /**
   * The backend stores every amount positive so there is one representation of
   * "money out". A negative slipping through must not print a double minus.
   */
  it("never doubles the sign if an amount arrives negative anyway", () => {
    expect(formatSignedMoney(-14000, "OUT")).toBe(`− ₴14${NBSP}000`);
  });

  it("uses a real minus sign, not a hyphen", () => {
    expect(formatSignedMoney(1, "OUT").startsWith("−")).toBe(true);
    expect(formatSignedMoney(1, "OUT").startsWith("-")).toBe(false);
  });
});
