import type { FinanceSummary } from "../../api/finance";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { formatMoney } from "../../utils/money";
import styles from "./FinanceStatCards.module.css";

/**
 * A month-on-month change, or nothing at all. The backend sends null when the
 * previous month has nothing to compare against, and null renders as an
 * absence rather than "↑ 0%" — a delta against an empty month is a number
 * neither side can stand behind.
 *
 * The arrow always points the way the number moved; only the *colour* knows
 * whether that is good news, which is why `risingIsGood` exists rather than a
 * negated percentage. Flipping the sign to get a red arrow would also flip the
 * sentence a screen reader hears, and tell it expenses fell in the month they
 * rose.
 */
function Delta({ percent, risingIsGood = true }: { percent: number | null; risingIsGood?: boolean }) {
  const { t } = useLocale();
  if (percent === null) return null;

  const up = percent >= 0;
  const good = up === risingIsGood;
  const label = interpolate(up ? t.financeStatCards.deltaUpTemplate : t.financeStatCards.deltaDownTemplate, {
    percent: Math.abs(percent),
  });
  return (
    <div className={good ? `${styles.delta} ${styles.good}` : `${styles.delta} ${styles.bad}`}>
      {/* The arrow is decorative; the sentence beside it is what a screen
          reader reads, so the direction is never carried by the glyph alone. */}
      <span aria-hidden>{up ? "↑" : "↓"}</span>
      <span className={styles.deltaNumber}>{Math.abs(percent)}%</span>
      <span className={styles.srOnly}>{label}</span>
    </div>
  );
}

/**
 * The four cards above the register. Three are a total with a delta; the
 * fourth is deliberately a different shape — DESIGN_SYSTEM.md 12.7 gives the
 * tax reserve a progress bar toward a goal instead, because a reserve is a
 * target to fill rather than a figure that grows on its own, and unifying it
 * with the other three would have been a lie about what it measures.
 *
 * Every total counts settled money only. An invoice that has been sent sits in
 * the register below and not in these numbers.
 */
export function FinanceStatCards({ summary }: { summary: FinanceSummary }) {
  const { t } = useLocale();

  return (
    <div className={styles.row}>
      <div className={styles.card}>
        <div className={styles.label}>{t.financeStatCards.income}</div>
        <div className={styles.value}>{formatMoney(summary.income)}</div>
        <Delta percent={summary.incomeDeltaPercent} />
      </div>

      <div className={styles.card}>
        <div className={styles.label}>{t.financeStatCards.expenses}</div>
        <div className={styles.value}>{formatMoney(summary.expenses)}</div>
        {/* The one card where growth is bad news. */}
        <Delta percent={summary.expensesDeltaPercent} risingIsGood={false} />
      </div>

      <div className={styles.card}>
        <div className={styles.label}>{t.financeStatCards.netProfit}</div>
        <div className={styles.value}>{formatMoney(summary.netProfit)}</div>
        <Delta percent={summary.netProfitDeltaPercent} />
      </div>

      <div className={styles.card}>
        <div className={styles.label}>{t.financeStatCards.taxReserve}</div>
        <div className={styles.value}>{formatMoney(summary.taxReserve)}</div>
        {summary.taxReserveGoal > 0 ? (
          <>
            <div className={styles.track}>
              <div className={styles.fill} style={{ width: `${summary.taxReservePercentOfGoal}%` }} />
            </div>
            <div className={styles.sub}>
              {interpolate(t.financeStatCards.taxReserveGoalTemplate, {
                percent: summary.taxReservePercentOfGoal,
                goal: formatMoney(summary.taxReserveGoal),
              })}
            </div>
          </>
        ) : (
          // No goal means no bar: an empty track at 0% would read as a reserve
          // that is behind, when nothing has been asked of it.
          <div className={styles.sub}>{t.financeStatCards.taxReserveNoGoal}</div>
        )}
      </div>

      {/* Outside the cards on purpose. It is not a fifth measure of the month —
          it is what the month is still owed, and it belongs next to the
          register rows it points at. */}
      {summary.overdueCount > 0 && (
        <p className={styles.overdue} role="status">
          {interpolate(t.financeStatCards.overdueTemplate, {
            amount: formatMoney(summary.overdueReceivable),
            count: summary.overdueCount,
          })}
        </p>
      )}
    </div>
  );
}
