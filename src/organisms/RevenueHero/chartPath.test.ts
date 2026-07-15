import { describe, expect, it } from "vitest";
import { buildAreaPath, buildSmoothLinePath, scaleToViewBox } from "./chartPath";

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
