import type { PaymentStatus } from "../../api/finance";
import { useLocale } from "../../i18n/useLocale";
import styles from "./PaymentStatusBadge.module.css";

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  /** Derived server-side: PENDING past its due date. It replaces the label, it is not a fourth state. */
  overdue?: boolean;
}

/**
 * The register's payment taxonomy — the third in this product, after the
 * client statuses (`StatusBadge`) and the content statuses (`Chip`), and
 * deliberately not sharing their colours: DESIGN_SYSTEM.md 12.7 puts «Очікує»
 * on informational blue rather than the gold that means "needs attention"
 * elsewhere, because an invoice waiting inside its terms is a normal state and
 * not an alarm. Gold would have made every unpaid invoice look late.
 *
 * Dot plus text, never colour alone — the same rule the other two follow.
 */
export function PaymentStatusBadge({ status, overdue = false }: PaymentStatusBadgeProps) {
  const { t } = useLocale();
  const tone = overdue ? styles.overdue : status === "PAID" ? styles.paid : styles.pending;
  return (
    <span className={`${styles.badge} ${tone}`}>
      <span className={styles.dot} />
      {overdue ? t.financeRegister.overdueBadge : t.paymentStatus[status]}
    </span>
  );
}
