import { Panel } from "../../molecules/Panel/Panel";
import type { LedgerEntry } from "../../api/dashboard";
import styles from "./EventLedger.module.css";

const CURRENCY_FORMAT = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0, signDisplay: "always" });

const TAG_LABEL: Record<LedgerEntry["tag"], string> = {
  MONEY: "Фінанси",
  CONTENT: "Контент",
  CLIENT: "Клієнти",
};

function AmountCell({ entry }: { entry: LedgerEntry }) {
  if (entry.amount === null) return <span className={styles.amount}>—</span>;
  return <span className={styles.amount}>{CURRENCY_FORMAT.format(entry.amount)} ₴</span>;
}

/**
 * Same data rendered as a real `<table>` on desktop and a stacked row list
 * on mobile (DESIGN_SYSTEM.md 6: "real tables, not a card per row" applies
 * at desktop width; the mobile stack is the documented exception for small
 * screens). One component, CSS decides which markup variant shows.
 */
export function EventLedger({ entries }: { entries: LedgerEntry[] }) {
  return (
    <Panel flush className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.title}>Реєстр подій</div>
        <a className={styles.link} href="#">
          Повний журнал →
        </a>
      </div>

      {entries.length === 0 ? (
        <div className={styles.empty}>Ще немає подій.</div>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Час</th>
                <th>Хто</th>
                <th>Дія</th>
                <th>Тип</th>
                <th className={styles.amountHeader}>Сума</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={index}>
                  <td className={styles.time}>{entry.time}</td>
                  <td className={styles.actor}>
                    <span className={styles.actorAvatar}>{entry.actorInitials}</span>
                    {entry.actorName}
                  </td>
                  <td>{entry.description}</td>
                  <td>
                    <span className={`${styles.tag} ${styles[entry.tag.toLowerCase()]}`}>
                      {TAG_LABEL[entry.tag]}
                    </span>
                  </td>
                  <td className={styles.amountCell}>
                    <AmountCell entry={entry} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className={styles.mobileList}>
            {entries.map((entry, index) => (
              <li className={styles.mobileRow} key={index}>
                <span className={styles.actorAvatar}>{entry.actorInitials}</span>
                <div className={styles.mobileBody}>
                  <div className={styles.mobileLine1}>
                    <b>{entry.actorName}</b> {entry.description}
                  </div>
                  <div className={styles.mobileLine2}>
                    <span className={styles.time}>{entry.time}</span>
                    <span className={`${styles.tag} ${styles[entry.tag.toLowerCase()]}`}>
                      {TAG_LABEL[entry.tag]}
                    </span>
                  </div>
                </div>
                <AmountCell entry={entry} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
