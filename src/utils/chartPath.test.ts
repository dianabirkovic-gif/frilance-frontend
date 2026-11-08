import { describe, expect, it } from "vitest";
import { buildAreaPath, buildSmoothLinePath, scaleSeriesToViewBox, scaleToViewBox } from "./chartPath";

describe("scaleToViewBox", () => {
  it("maps the largest value to the smallest y (top of the chart)", () => {
    const points = scaleToViewBox([10, 50, 30], 100, 100, 0);

    expect(points).toHaveLength(3);
    const highestValueIndex = 1;
    const lowestY = Math.min(...points.map((p) => p.y));
    expect(points[highestValueIndex].y).toBe(lowestY);
  });

  it("spaces points evenly across the width", () => {
    const points = scaleToViewBox([1, 2, 3, 4], 300, 100);
    expect(points.map((p) => p.x)).toEqual([0, 100, 200, 300]);
  });

  it("returns an empty array for no data", () => {
    expect(scaleToViewBox([], 100, 100)).toEqual([]);
  });
});

describe("buildSmoothLinePath", () => {
  it("starts with an absolute moveto at the first point", () => {
    const path = buildSmoothLinePath([
      { x: 0, y: 10 },
      { x: 5, y: 5 },
      { x: 10, y: 0 },
    ]);
    expect(path.startsWith("M0,10")).toBe(true);
  });

  it("handles a single point without curve commands", () => {
    expect(buildSmoothLinePath([{ x: 1, y: 2 }])).toBe("M1,2");
  });
});

describe("buildAreaPath", () => {
  it("closes the shape down to the baseline on both ends", () => {
    const path = buildAreaPath(
      [
        { x: 0, y: 10 },
        { x: 10, y: 0 },
      ],
      50,
    );
    expect(path).toContain("L10,50");
    expect(path).toContain("L0,50");
    expect(path.endsWith("Z")).toBe(true);
  });
});

describe("scaleSeriesToViewBox", () => {
  /**
   * The property the cash-flow chart depends on: two series measured against
   * one domain. Scaled separately, a month of ₴50 000 in expenses under
   * ₴100 000 of income would draw both lines at the same height.
   */
  it("scales every series against one shared maximum", () => {
    const [income, expense] = scaleSeriesToViewBox([[0, 100], [0, 50]], 100, 100, 0);

    expect(income[0].y).toBe(100);
    expect(income[1].y).toBe(0);
    // Half the income's value, so half its height off the baseline.
    expect(expense[1].y).toBe(50);
  });

  it("gives each series its own x-step so a shorter one stops early", () => {
    const [long, short] = scaleSeriesToViewBox([[1, 2, 3], [1, 2]], 100, 100, 0);

    expect(long.map((point) => point.x)).toEqual([0, 50, 100]);
    expect(short.map((point) => point.x)).toEqual([0, 100]);
  });

  it("returns an empty series for each input when there is nothing to draw", () => {
    expect(scaleSeriesToViewBox([[], []], 100, 100)).toEqual([[], []]);
  });

  it("does not divide by zero on a single-point series", () => {
    const [only] = scaleSeriesToViewBox([[42]], 100, 100, 0);

    expect(only).toHaveLength(1);
    expect(Number.isNaN(only[0].x)).toBe(false);
    expect(Number.isNaN(only[0].y)).toBe(false);
  });
});
