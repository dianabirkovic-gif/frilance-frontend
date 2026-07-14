import { Panel } from "../../components/ui/Panel";
import type { FinanceSummary } from "../../api/dashboard";
import styles from "./FinanceStrip.module.css";

const CURRENCY_FORMAT = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });

const COLOR_VAR: Record<string, string> = {
  brand: "var(--brand-400)",
  info: "var(--info)",
  gold: "var(--gold-500)",
};

/** Empty `rows` means the current role has no finance access — FR-09/FR-03 RBAC, enforced server-side. */
export function FinanceStrip({ summary }: { summary: FinanceSummary }) {
  return (
    <Panel className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.title}>Фінансовий стан</div>
      </div>
      {summary.rows.length === 0 ? (
        <div className={styles.empty}>Немає доступу до фінансів агентства.</div>
      ) : (
        summary.rows.map((row) => (
          <div className={styles.row} key={row.label}>
            <div className={styles.label}>
              <span>{row.label}</span>
              <b>₴{CURRENCY_FORMAT.format(row.amount)}</b>
            </div>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{ width: `${row.percentOfGoal}%`, background: COLOR_VAR[row.colorRole] }}
              />
            </div>
          </div>
        ))
      )}
    </Panel>
  );
}
