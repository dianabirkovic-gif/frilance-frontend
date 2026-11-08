/** The ruler's drawing area inside its 0..1000 viewBox. */
const LEFT_EDGE = 10;
const RIGHT_EDGE = 990;
/** Kept clear of the viewBox edge so the highlight's stroke isn't clipped. */
const MARGIN = 2;
/** A single-day highlight would otherwise be a hairline. */
const MIN_WIDTH = 20;
/** Breathing room either side of the highlighted days. */
const PADDING = 8;

/** Maps a 1-based day of the month onto the ruler's viewBox. */
export function dayToX(day: number, daysInMonth: number): number {
  return LEFT_EDGE + ((day - 1) / (daysInMonth - 1)) * (RIGHT_EDGE - LEFT_EDGE);
}

/**
 * The `x`/`width` of the box drawn over the days currently on screen, padded
 * for legibility and kept inside the viewBox — a week ending on the 31st would
 * otherwise have half its highlight clipped off the right edge.
 */
export function highlightBox(
  from: number,
  to: number,
  daysInMonth: number,
): { x: number; width: number } {
  let start = dayToX(from, daysInMonth) - PADDING;
  let end = dayToX(to, daysInMonth) + PADDING;

  if (end - start < MIN_WIDTH) {
    const middle = (start + end) / 2;
    start = middle - MIN_WIDTH / 2;
    end = middle + MIN_WIDTH / 2;
  }

  const shift = Math.max(MARGIN - start, 0) - Math.max(end - (1000 - MARGIN), 0);
  return { x: start + shift, width: end - start };
}
