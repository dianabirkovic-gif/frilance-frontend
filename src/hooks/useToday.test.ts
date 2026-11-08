import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToday } from "./useToday";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useToday", () => {
  it("starts on the current date", () => {
    vi.setSystemTime(new Date(2026, 7, 20, 14, 30));

    const { result } = renderHook(() => useToday());

    expect(result.current.toDateString()).toBe(new Date(2026, 7, 20).toDateString());
  });

  it("keeps the same reference while the day lasts", () => {
    vi.setSystemTime(new Date(2026, 7, 20, 14, 30));

    const { result, rerender } = renderHook(() => useToday());
    const first = result.current;

    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1000); // an hour later, same day
    });
    rerender();

    expect(result.current).toBe(first);
  });

  // The bug this exists for: a screen left open past midnight kept marking
  // yesterday's column as today.
  it("moves to the new date once midnight passes", () => {
    vi.setSystemTime(new Date(2026, 7, 20, 23, 30));

    const { result } = renderHook(() => useToday());
    expect(result.current.toDateString()).toBe(new Date(2026, 7, 20).toDateString());

    act(() => {
      vi.advanceTimersByTime(31 * 60 * 1000); // 00:01 the next day
    });

    expect(result.current.toDateString()).toBe(new Date(2026, 7, 21).toDateString());
  });

  it("keeps rolling over on later days, not just the first", () => {
    vi.setSystemTime(new Date(2026, 7, 20, 23, 59));

    const { result } = renderHook(() => useToday());

    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000); // into the 21st
    });
    act(() => {
      vi.advanceTimersByTime(24 * 60 * 60 * 1000); // into the 22nd
    });

    expect(result.current.toDateString()).toBe(new Date(2026, 7, 22).toDateString());
  });

  it("crosses a month boundary", () => {
    vi.setSystemTime(new Date(2026, 7, 31, 23, 50));

    const { result } = renderHook(() => useToday());

    act(() => {
      vi.advanceTimersByTime(15 * 60 * 1000);
    });

    expect(result.current.toDateString()).toBe(new Date(2026, 8, 1).toDateString());
  });

  it("stops its timer when unmounted", () => {
    vi.setSystemTime(new Date(2026, 7, 20, 23, 59));
    const { unmount } = renderHook(() => useToday());

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
