import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "../../atoms/icons/icons";
import { PaymentStatusBadge } from "../../atoms/PaymentStatusBadge/PaymentStatusBadge";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { usePageHeader } from "../../templates/AppShell/PageHeaderContext";
import { monthOf, monthTitle, shiftMonth } from "../../utils/calendarDays";
import { formatMoney } from "../../utils/money";
import styles from "./MySalaryPage.module.css";
import { useMySalary } from "./useMySalary";

/**
 * «Моя зп»: the signed-in member's own payouts, one month at a time.
 *
 * It asks for no member id — the server takes it from the token — so this
 * screen has nothing to get wrong about whose pay it shows. The toolbar renders
 * in every state for the same reason the register's does: leaving a month that
 * would not load is what the navigation is for.
 */
export function MySalaryPage() {
  const { t, locale } = useLocale();
  const [month, setMonth] = useState(() => monthOf(new Date()));
  const { data, isLoading, isError, error, refetch } = useMySalary(month);

  usePageHeader({
    title: t.mySalaryPage.title,
    subtitle: data ? interpolate(t.mySalaryPage.subtitleTemplate, { paid: formatMoney(data.paidTotal) }) : "",
  });

  return (
    <div className={styles.page}>
      <div className={styles.monthNav}>
        <button
          type="button"
          className={styles.navBtn}
          aria-label={t.mySalaryPage.previousMonth}
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <ChevronLeftIcon width={14} height={14} />
        </button>
        <span className={styles.monthLabel}>{monthTitle(month, locale)}</span>
        <button
          type="button"
          className={styles.navBtn}
          aria-label={t.mySalaryPage.nextMonth}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <ChevronRightIcon width={14} height={14} />
        </button>
      </div>

      <p className={styles.privacy}>{t.mySalaryPage.privacyNote}</p>

      {isLoading && <p className={styles.state}>{t.mySalaryPage.loading}</p>}

      {isError && (
        <div className={styles.state} role="alert">
          {t.mySalaryPage.loadErrorPrefix}: {error instanceof Error ? error.message : ""}{" "}
          <button type="button" className={styles.retry} onClick={() => refetch()}>
            {t.mySalaryPage.retry}
          </button>
        </div>
      )}

      {data && (
        <>
          <div className={styles.cards}>
            <div className={styles.card}>
              <span className={styles.cardLabel}>{t.mySalaryPage.paidLabel}</span>
              <span className={styles.cardValue}>{formatMoney(data.paidTotal)}</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardLabel}>{t.mySalaryPage.pendingLabel}</span>
              <span className={styles.cardValue}>{formatMoney(data.pendingTotal)}</span>
            </div>
          </div>

          {data.payments.length === 0 ? (
            <p className={styles.state}>{t.mySalaryPage.empty}</p>
          ) : (
            <ul className={styles.list}>
              {data.payments.map((payment) => (
                <li key={payment.id} className={styles.row}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>{payment.title}</span>
                    {payment.description && <span className={styles.rowMeta}>{payment.description}</span>}
                    <span className={styles.rowMeta}>
                      {new Date(payment.entryDate).toLocaleDateString(locale)} · {t.paymentMethod[payment.paymentMethod]}
                    </span>
                  </div>
                  <PaymentStatusBadge status={payment.paymentStatus} overdue={payment.overdue} />
                  <span className={styles.amount}>{formatMoney(payment.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
