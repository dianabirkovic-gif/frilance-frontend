import { describe, expect, it } from "vitest";
import { dayToX, highlightBox } from "./rulerGeometry";

describe("dayToX", () => {
  it("pins the first and last day of the month to the rule's ends", () => {
    expect(dayToX(1, 31)).toBe(10);
    expect(dayToX(31, 31)).toBe(990);
  });

  it("places a mid-month day proportionally", () => {
    expect(dayToX(16, 31)).toBe(500);
  });
});

describe("highlightBox", () => {
  it("pads the highlighted range on both sides", () => {
    const { x, width } = highlightBox(11, 17, 31);

    expect(x).toBeCloseTo(dayToX(11, 31) - 8);
    expect(width).toBeCloseTo(dayToX(17, 31) - dayToX(11, 31) + 16);
  });

  it("gives a single day a visible width instead of a hairline", () => {
    expect(highlightBox(15, 15, 31).width).toBe(20);
  });

  it("keeps a highlight that ends on the last day inside the viewBox", () => {
    const { x, width } = highlightBox(31, 31, 31);

    expect(x + width).toBeLessThanOrEqual(998);
    expect(width).toBe(20);
  });

  it("keeps a highlight that starts on the first day inside the viewBox", () => {
    expect(highlightBox(1, 1, 31).x).toBeGreaterThanOrEqual(2);
  });
});
