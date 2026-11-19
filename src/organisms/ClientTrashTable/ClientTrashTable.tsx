import type { TrashedClient } from "../../api/clients";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { Panel } from "../../molecules/Panel/Panel";
import { initials } from "../../utils/initials";
import styles from "./ClientTrashTable.module.css";

const DAY_MS = 24 * 60 * 60 * 1000;

interface ClientTrashTableProps {
  clients: TrashedClient[];
  /** The client being restored right now — its button says so and nothing else can be clicked meanwhile. */
  restoringId: string | null;
  onRestore: (client: TrashedClient) => void;
  onPurge: (client: TrashedClient) => void;
  /** Injected so a test (or a screen left open overnight) is not at the mercy of the real clock. */
  now?: number;
}

/**
 * The trash: each deleted client with when it went, who deleted it, and how long until it is
 * deleted for good. One list for desktop and mobile — a trash is a handful of rows, not a
 * register, so a table that collapses into cards would be machinery for nothing.
 */
export function ClientTrashTable({ clients, restoringId, onRestore, onPurge, now = Date.now() }: ClientTrashTableProps) {
  const { t, locale } = useLocale();
  const text = t.clientsPage.trash;

  if (clients.length === 0) {
    return (
      <Panel flush>
        <div className={styles.empty}>{text.empty}</div>
      </Panel>
    );
  }

  return (
    <Panel flush>
      <ul className={styles.list}>
        {clients.map((client) => {
          // Whole days, rounded up: "in 1 day" until the last hour, never "in 0 days" while it still exists.
          const daysLeft = Math.ceil((new Date(client.purgeAt).getTime() - now) / DAY_MS);
          const isRestoring = restoringId === client.id;
          return (
            <li key={client.id} className={styles.row}>
              <div className={styles.client}>
                <div className={styles.avatar}>{initials(client.name)}</div>
                <div className={styles.clientText}>
                  <div className={styles.name}>{client.name}</div>
                  {client.niche && <div className={styles.niche}>{client.niche}</div>}
                </div>
              </div>

              <div className={styles.meta}>
                <span className={styles.metaLabel}>{text.headers.deleted}</span>
                <span>
                  {new Date(client.deletedAt).toLocaleDateString(locale)}
                  {client.deletedByName && ` · ${interpolate(text.deletedByTemplate, { name: client.deletedByName })}`}
                </span>
              </div>

              <div className={styles.meta}>
                <span className={styles.metaLabel}>{text.headers.purge}</span>
                <span className={daysLeft <= 3 ? styles.soon : undefined}>
                  {daysLeft > 0 ? interpolate(text.purgeInTemplate, { days: daysLeft }) : text.purgeToday}
                </span>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.restoreBtn}
                  disabled={restoringId !== null}
                  onClick={() => onRestore(client)}
                >
                  {isRestoring ? text.restoring : text.restore}
                </button>
                <button
                  type="button"
                  className={styles.foreverBtn}
                  disabled={restoringId !== null}
                  onClick={() => onPurge(client)}
                >
                  {text.deleteForever}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
