import { Link } from "react-router-dom";
import { Panel } from "../../molecules/Panel/Panel";
import type { AttentionItem } from "../../api/dashboard";
import styles from "./AttentionList.module.css";

/**
 * Desktop: vertical list inside one panel. Mobile: horizontal scroll-snap
 * cards. Both from the same markup/data via CSS media queries — see
 * frontend CLAUDE.md "Responsive strategy" for why this isn't two components.
 */
export function AttentionList({ items }: { items: AttentionItem[] }) {
  return (
    <Panel className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.title}>Потребують уваги</div>
        <Link className={styles.link} to="/clients">
          Усі →
        </Link>
      </div>
      {items.length === 0 ? (
        <div className={styles.empty}>Немає сигналів, що потребують уваги.</div>
      ) : (
        <div className={styles.row}>
          {items.map((item, index) => (
            <div className={styles.item} key={index}>
              <div className={styles.itemTop}>
                <span className={item.severity === "HIGH" ? `${styles.sev} ${styles.high}` : `${styles.sev} ${styles.mid}`} />
                <span className={styles.itemTitle}>{item.title}</span>
              </div>
              <div className={styles.subtitle}>{item.subtitle}</div>
              <div className={item.metaIsDanger ? `${styles.meta} ${styles.danger}` : styles.meta}>
                {item.metaLabel}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
