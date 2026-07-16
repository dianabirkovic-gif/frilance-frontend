import type { ClientListItem } from "../../api/clients";
import { StatusBadge } from "../../atoms/StatusBadge/StatusBadge";
import { useLocale } from "../../i18n/useLocale";
import { Panel } from "../../molecules/Panel/Panel";
import { initials } from "../../utils/initials";
import styles from "./ClientTable.module.css";

const REVENUE_FORMAT = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });

function Revenue({ amount }: { amount: number | null }) {
  if (amount === null) return <>—</>;
  return <>₴{REVENUE_FORMAT.format(amount)}</>;
}

interface ClientTableProps {
  clients: ClientListItem[];
  onSelectClient: (id: string) => void;
}

/**
 * Same data as a real `<table>` on desktop and stacked cards on mobile —
 * clients.html's `.client-table` / `.m-client-card`. The mobile card-per-row
 * layout is the documented mobile adaptation (DESIGN_SYSTEM.md §10), not a
 * "boxes-in-boxes" desktop pattern — the desktop view stays a real table.
 */
export function ClientTable({ clients, onSelectClient }: ClientTableProps) {
  const { t } = useLocale();

  if (clients.length === 0) {
    return (
      <Panel flush className={styles.panel}>
        <div className={styles.empty}>{t.clientTable.empty}</div>
      </Panel>
    );
  }

  return (
    <>
      <Panel flush className={styles.panel}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.clientTable.headers.client}</th>
              <th>{t.clientTable.headers.specialist}</th>
              <th>{t.clientTable.headers.status}</th>
              <th>{t.clientTable.headers.nextPost}</th>
              <th>{t.clientTable.headers.revenue}</th>
              <th>{t.clientTable.headers.activity}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} onClick={() => onSelectClient(client.id)}>
                <td>
                  <div className={styles.clientCell}>
                    <div className={styles.avatar}>{initials(client.name)}</div>
                    <div>
                      <div className={styles.clientName}>{client.name}</div>
                      {client.niche && <div className={styles.clientNiche}>{client.niche}</div>}
                    </div>
                  </div>
                </td>
                <td>
                  {client.assigneeName ? (
                    <div className={styles.specCell}>
                      <div className={styles.specAvatar}>{client.assigneeInitials}</div>
                      {client.assigneeName}
                    </div>
                  ) : (
                    <span className={styles.mutedCell}>—</span>
                  )}
                </td>
                <td>
                  <StatusBadge status={client.status} />
                </td>
                <td className={styles.mutedCell}>{client.nextPostLabel}</td>
                <td className={styles.revenueCell}>
                  <Revenue amount={client.monthlyRevenue} />
                </td>
                <td className={styles.mutedCell}>{client.lastActivityLabel}</td>
                <td className={styles.chevronCell}>→</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <ul className={styles.cardList}>
        {clients.map((client) => (
          <li key={client.id} className={styles.card} onClick={() => onSelectClient(client.id)}>
            <div className={styles.cardAvatar}>{initials(client.name)}</div>
            <div className={styles.cardBody}>
              <div className={styles.cardName}>{client.name}</div>
              <div className={styles.cardMeta}>
                <StatusBadge status={client.status} />
                {client.assigneeName}
              </div>
            </div>
            <div className={styles.cardRight}>
              <div className={styles.cardRevenue}>
                <Revenue amount={client.monthlyRevenue} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
