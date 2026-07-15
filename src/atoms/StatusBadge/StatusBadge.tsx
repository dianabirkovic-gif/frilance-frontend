import type { ClientStatus } from "../../api/clients";
import styles from "./StatusBadge.module.css";

const TONE_LABEL: Record<ClientStatus, string> = {
  ACTIVE: "Активний",
  ATTENTION: "Потребує уваги",
  NEW: "Новий",
  ARCHIVED: "Архів",
};

const TONE_CLASS: Record<ClientStatus, string> = {
  ACTIVE: styles.active,
  ATTENTION: styles.attention,
  NEW: styles.new,
  ARCHIVED: styles.archived,
};

/** Client status taxonomy — dot + text, not color alone (DESIGN_SYSTEM.md §12). */
export function StatusBadge({ status }: { status: ClientStatus }) {
  return (
    <span className={`${styles.badge} ${TONE_CLASS[status]}`}>
      <span className={styles.dot} />
      {TONE_LABEL[status]}
    </span>
  );
}
