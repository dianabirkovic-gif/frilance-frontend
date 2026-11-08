import styles from "./MonthRuler.module.css";
import { dayToX, highlightBox } from "./rulerGeometry";

/** The tick marks the mockup labels — start, every fifth day, end of month. */
const TICK_DAYS = [1, 5, 10, 15, 20, 25];

interface MonthRulerProps {
  /** How many days the month has — the ruler's right edge. */
  daysInMonth: number;
  /** The 1-based day range currently on screen, clamped to this month. */
  highlightFrom: number;
  highlightTo: number;
}

/**
 * The Ledger Line reused as a "where in the month are we" indicator: the month
 * as one horizontal rule, with the days currently on screen boxed on it. It
 * says nothing the calendar below doesn't, which is the point — it's the
 * orientation cue for a view that only ever shows a slice.
 */
export function MonthRuler({ daysInMonth, highlightFrom, highlightTo }: MonthRulerProps) {
  const ticks = [...TICK_DAYS.filter((day) => day < daysInMonth), daysInMonth];
  const box = highlightBox(highlightFrom, highlightTo, daysInMonth);

  return (
    <div className={styles.ruler}>
      <svg viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden>
        <line x1="10" y1="24" x2="990" y2="24" stroke="var(--line-strong)" strokeWidth="2" />
        <rect
          x={box.x}
          y="10"
          width={box.width}
          height="28"
          rx="8"
          fill="var(--brand-50)"
          stroke="var(--brand-400)"
          strokeWidth="1.5"
        />
        {/* The font comes from the stylesheet, not a presentation attribute:
            `var()` does not resolve inside an SVG attribute value. */}
        <g className={styles.ticks} fontSize="10" fill="var(--text-3)">
          {ticks.map((day, index) => (
            <text
              key={day}
              x={dayToX(day, daysInMonth)}
              y="14"
              textAnchor={index === 0 ? "start" : index === ticks.length - 1 ? "end" : "middle"}
            >
              {String(day).padStart(2, "0")}
            </text>
          ))}
        </g>
        <g stroke="var(--line-strong)" strokeWidth="1.5">
          {ticks.map((day) => (
            <line key={day} x1={dayToX(day, daysInMonth)} y1="24" x2={dayToX(day, daysInMonth)} y2="30" />
          ))}
        </g>
      </svg>
    </div>
  );
}
