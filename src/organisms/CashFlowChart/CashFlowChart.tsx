import { useMemo } from "react";
import type { FinanceFlowPoint } from "../../api/finance";
import { useLocale } from "../../i18n/useLocale";
import { Panel } from "../../molecules/Panel/Panel";
import { buildAreaPath, buildSmoothLinePath, scaleSeriesToViewBox } from "../../utils/chartPath";
import { fromIsoDate } from "../../utils/calendarDays";
import { formatMoney } from "../../utils/money";
import styles from "./CashFlowChart.module.css";

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 200;
const BASELINE_Y = 160;

/** The mockup's axis labels: the 1st, every fifth day, and the last day drawn. */
function tickDays(count: number): number[] {
  if (count === 0) return [];
  const ticks = [1, 6, 11, 16, 21, 26].filter((day) => day < count);
  return [...ticks, count];
}

/**
 * The Ledger Line in its fourth role (DESIGN_SYSTEM.md 12.7): a dual-series
 * cash-flow chart, cumulative from the 1st of the month.
 *
 * Income is the solid brand line with a fill; expenses are a dashed neutral
 * line with none. That asymmetry is the point and not an oversight — in a
 * financial context the one saturated colour on screen should mean one thing,
 * money coming in, rather than competing with a second bright line for the
 * same attention. The legend names both rather than trusting anyone to
 * remember which is which.
 *
 * Both series are scaled against one shared maximum, so their heights are
 * comparable. Scaling each to its own would draw a losing month as two level
 * lines.
 */
export function CashFlowChart({ flow }: { flow: FinanceFlowPoint[] }) {
  const { t } = useLocale();

  const [incomePoints, expensePoints] = useMemo(
    () =>
      scaleSeriesToViewBox(
        [flow.map((point) => point.cumulativeIncome), flow.map((point) => point.cumulativeExpense)],
        VIEW_WIDTH,
        BASELINE_Y - 10,
        10,
      ),
    [flow],
  );

  const last = flow[flow.length - 1];
  const ticks = tickDays(flow.length);

  return (
    <Panel className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendLine} ${styles.incomeLine}`} />
            {t.cashFlowChart.incomeLegend}
            {last && <b className={styles.legendValue}>{formatMoney(last.cumulativeIncome)}</b>}
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendLine} ${styles.expenseLine}`} />
            {t.cashFlowChart.expensesLegend}
            {last && <b className={styles.legendValue}>{formatMoney(last.cumulativeExpense)}</b>}
          </div>
        </div>
        <div className={styles.title}>{t.cashFlowChart.title}</div>
      </div>

      {flow.length === 0 ? (
        <div className={styles.empty}>{t.cashFlowChart.empty}</div>
      ) : (
        <div className={styles.chart}>
          <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} preserveAspectRatio="none" role="img">
            <defs>
              <linearGradient id="cashFlowFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-fill-0)" />
                <stop offset="100%" stopColor="var(--chart-fill-1)" />
              </linearGradient>
            </defs>
            <line x1="0" y1={BASELINE_Y} x2={VIEW_WIDTH} y2={BASELINE_Y} stroke="var(--line)" strokeWidth={1} />
            <path d={buildAreaPath(incomePoints, BASELINE_Y)} fill="url(#cashFlowFill)" />
            <path
              d={buildSmoothLinePath(incomePoints)}
              fill="none"
              stroke="var(--brand-400)"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <path
              d={buildSmoothLinePath(expensePoints)}
              fill="none"
              stroke="var(--text-3)"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
            {/* The Ledger Line's own tick marks — the signature element, the
                same rule that runs under the content plan's month. */}
            <g stroke="var(--line-strong)" strokeWidth={1}>
              {ticks.map((day) => (
                <line
                  key={day}
                  x1={((day - 1) / Math.max(flow.length - 1, 1)) * VIEW_WIDTH}
                  y1={BASELINE_Y}
                  x2={((day - 1) / Math.max(flow.length - 1, 1)) * VIEW_WIDTH}
                  y2={BASELINE_Y + 8}
                />
              ))}
            </g>
            <g className={styles.tickLabels} fontSize={11} fill="var(--text-3)">
              {ticks.map((day, index) => (
                <text
                  key={day}
                  x={((day - 1) / Math.max(flow.length - 1, 1)) * VIEW_WIDTH}
                  y={BASELINE_Y + 26}
                  textAnchor={index === 0 ? "start" : index === ticks.length - 1 ? "end" : "middle"}
                >
                  {String(fromIsoDate(flow[day - 1].date).getDate()).padStart(2, "0")}
                </text>
              ))}
            </g>
          </svg>
        </div>
      )}
    </Panel>
  );
}
