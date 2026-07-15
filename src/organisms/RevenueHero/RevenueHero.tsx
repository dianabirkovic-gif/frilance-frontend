import { useMemo, useState } from "react";
import { Panel } from "../../molecules/Panel/Panel";
import type { Revenue } from "../../api/dashboard";
import { buildAreaPath, buildSmoothLinePath, scaleToViewBox } from "./chartPath";
import styles from "./RevenueHero.module.css";

const CURRENCY_FORMAT = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });
const MONTH_FORMAT = new Intl.DateTimeFormat("uk-UA", { month: "long" });
const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 200;
const BASELINE_Y = 150;

type Range = "week" | "month" | "year";

const RANGE_LABEL: Record<Range, string> = { week: "Тиждень", month: "Місяць", year: "Рік" };

export function RevenueHero({ revenue }: { revenue: Revenue }) {
  // Backend only serves the current month today (DashboardService.buildRevenue) —
  // this only switches the visual selection until the API accepts a range param.
  const [range, setRange] = useState<Range>("month");

  const points = useMemo(() => {
    const values = revenue.series.map((point) => point.cumulativeAmount);
    return scaleToViewBox(values, VIEW_WIDTH, BASELINE_Y - 10, 10);
  }, [revenue.series]);

  const linePath = buildSmoothLinePath(points);
  const areaPath = buildAreaPath(points, BASELINE_Y);
  const lastPoint = points[points.length - 1];
  const isPositive = revenue.deltaPercent >= 0;

  return (
    <Panel className={styles.panel}>
      <div className={styles.top}>
        <div>
          <div className={styles.kicker}>Дохід агентства · {MONTH_FORMAT.format(new Date())}</div>
          <div className={styles.number}>
            ₴{CURRENCY_FORMAT.format(revenue.amount)}
            <span className={isPositive ? styles.delta : `${styles.delta} ${styles.deltaNegative}`}>
              {isPositive ? "↑" : "↓"} {Math.abs(revenue.deltaPercent).toFixed(1)}%
            </span>
          </div>
        </div>
        <div className={styles.rangeTabs}>
          {(Object.keys(RANGE_LABEL) as Range[]).map((key) => (
            <button
              key={key}
              type="button"
              className={key === range ? `${styles.rangeButton} ${styles.active}` : styles.rangeButton}
              onClick={() => setRange(key)}
            >
              {RANGE_LABEL[key]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.chart}>
        {points.length > 0 ? (
          <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-fill-0)" />
                <stop offset="100%" stopColor="var(--chart-fill-1)" />
              </linearGradient>
            </defs>
            <line x1="0" y1={BASELINE_Y} x2={VIEW_WIDTH} y2={BASELINE_Y} stroke="var(--line)" strokeWidth={1} />
            <path d={areaPath} fill="url(#revenueFill)" />
            <path d={linePath} fill="none" stroke="var(--brand-400)" strokeWidth={2.5} strokeLinecap="round" />
            {lastPoint && (
              <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={4.5}
                fill="var(--ink-900)"
                stroke="var(--gold-500)"
                strokeWidth={2.5}
              />
            )}
          </svg>
        ) : (
          <div className={styles.empty}>Ще немає доходів за цей місяць</div>
        )}
      </div>
    </Panel>
  );
}
