import { describe, expect, it } from "vitest";
import { timelineNodeX } from "./timelineLayout";

describe("timelineNodeX", () => {
  it("places the first and last node at the viewBox edges", () => {
    expect(timelineNodeX(0, 5)).toBe(10);
    expect(timelineNodeX(4, 5)).toBe(386);
  });

  it("spaces nodes evenly in between", () => {
    expect(timelineNodeX(2, 5)).toBe(198);
  });

  it("handles a single node without dividing by zero", () => {
    expect(timelineNodeX(0, 1)).toBe(10);
  });
});
