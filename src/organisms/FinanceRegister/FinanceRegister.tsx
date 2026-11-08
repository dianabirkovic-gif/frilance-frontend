import type { FinanceEntry } from "../../api/finance";
import { PaymentStatusBadge } from "../../atoms/PaymentStatusBadge/PaymentStatusBadge";
import { useLocale } from "../../i18n/useLocale";
import { Panel } from "../../molecules/Panel/Panel";
import { formatDayMonth } from "../../utils/calendarDays";
import { formatSignedMoney } from "../../utils/money";
import styles from "./FinanceRegister.module.css";

/** Money in / money out, as the arrow in the row's icon. */
function DirectionIcon({ direction }: { direction: "IN" | "OUT" }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      {direction === "IN" ? <path d="M12 5v14M19 12l-7 7-7-7" /> : <path d="M12 19V5M5 12l7-7 7 7" />}
    </svg>
  );
}

interface FinanceRegisterProps {
  entries: FinanceEntry[];
  onSelectEntry: (entry: FinanceEntry) => void;
}

/**
 * Incomes, expenses, payouts and tax in one register, which is how the money
 * actually moved and how DESIGN_SYSTEM.md 12.7 asks for it: filter chips
 * exist, but the default view is everything together, because the owner's
 * first question is the net movement of the month rather than one category of
 * it. Direction is carried by the arrow in the row's icon, not by splitting
 * the table in two.
 *
 * One markup, two renderings: a real `<table>` above 900px and a stacked list
 * below, both in the DOM with CSS choosing — the responsive rule in the
 * frontend CLAUDE.md, and the same shape `ClientTable` uses.
 */
export function FinanceRegister({ entries, onSelectEntry }: FinanceRegisterProps) {
  const { t } = useLocale();

  if (entries.length === 0) {
    return (
      <Panel flush className={styles.panel}>
        <div className={styles.empty}>{t.financeRegister.empty}</div>
      </Panel>
    );
  }

  const monthsShort = t.calendar.monthsShort;

  return (
    <>
      <Panel flush className={styles.panel}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.financeRegister.headers.operation}</th>
              <th>{t.financeRegister.headers.date}</th>
              <th>{t.financeRegister.headers.method}</th>
              <th>{t.financeRegister.headers.status}</th>
              <th className={styles.amountHeader}>{t.financeRegister.headers.amount}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} onClick={() => onSelectEntry(entry)}>
                <td>
                  <div className={styles.operationCell}>
                    <div className={entry.direction === "IN" ? `${styles.icon} ${styles.in}` : `${styles.icon} ${styles.out}`}>
                      <DirectionIcon direction={entry.direction} />
                    </div>
                    <div className={styles.operationText}>
                      <div className={styles.operationTitle}>{entry.title}</div>
                      {(entry.description || entry.counterparty) && (
                        <div className={styles.operationSub}>{entry.description ?? entry.counterparty}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className={styles.mutedCell}>
                  {formatDayMonth(entry.entryDate, monthsShort)}
                  {/* Says why a row dated before this month is in it, rather
                      than leaving the date looking like a mistake. */}
                  {entry.carriedOver && (
                    <span className={styles.carriedOver}>{t.financeRegister.carriedOverLabel}</span>
                  )}
                </td>
                <td className={styles.mutedCell}>{t.paymentMethod[entry.paymentMethod]}</td>
                <td>
                  <PaymentStatusBadge status={entry.paymentStatus} overdue={entry.overdue} />
                </td>
                <td
                  className={
                    entry.direction === "IN" ? `${styles.amountCell} ${styles.amountIn}` : styles.amountCell
                  }
                >
                  {formatSignedMoney(entry.amount, entry.direction)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel flush className={styles.cardPanel}>
        <ul className={styles.cardList}>
          {entries.map((entry) => (
            <li key={entry.id} className={styles.card} onClick={() => onSelectEntry(entry)}>
              <div className={entry.direction === "IN" ? `${styles.icon} ${styles.in}` : `${styles.icon} ${styles.out}`}>
                <DirectionIcon direction={entry.direction} />
              </div>
              <div className={styles.cardBody}>
                <div className={styles.operationTitle}>{entry.title}</div>
                <div className={styles.cardMeta}>
                  <PaymentStatusBadge status={entry.paymentStatus} overdue={entry.overdue} />
                  <span className={styles.mutedCell}>{formatDayMonth(entry.entryDate, monthsShort)}</span>
                  {/* The date needs the same explanation it gets in the table —
                      more so here, where it sits next to nothing else. */}
                  {entry.carriedOver && (
                    <span className={styles.carriedOverInline}>{t.financeRegister.carriedOverLabel}</span>
                  )}
                </div>
              </div>
              <div
                className={
                  entry.direction === "IN" ? `${styles.amountCell} ${styles.amountIn}` : styles.amountCell
                }
              >
                {formatSignedMoney(entry.amount, entry.direction)}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
