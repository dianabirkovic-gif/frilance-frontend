import { useEffect, useState } from "react";

/** Milliseconds from `now` until the next local midnight, plus a second of slack. */
function untilMidnight(now: Date): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime() + 1000;
}

/**
 * Today's date, re-read when the day actually turns over.
 *
 * Calendars call `new Date()` while deciding which column is today, and a
 * screen that is open past midnight otherwise keeps that mark on yesterday —
 * the "· сьогодні" label and the highlighted column are then confidently
 * wrong, which is worse than not marking anything. The returned `Date` is
 * reference-stable within a day, so it is safe in a `useMemo` dependency list
 * (which is the point: the memo recomputes exactly once, at midnight).
 *
 * The timer is rescheduled from the real clock each time rather than set to a
 * fixed 24h interval, so a laptop that slept through midnight corrects itself
 * on the next tick instead of drifting.
 */
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timer = setTimeout(() => {
        setToday((previous) => {
          const now = new Date();
          // Same day after all (a clock change, or an early wake-up): keep the
          // existing reference so dependents don't recompute for nothing.
          return now.toDateString() === previous.toDateString() ? previous : now;
        });
        schedule();
      }, untilMidnight(new Date()));
    };

    schedule();
    return () => clearTimeout(timer);
  }, []);

  return today;
}
