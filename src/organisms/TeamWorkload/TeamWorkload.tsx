import { Panel } from "../../molecules/Panel/Panel";
import type { TeamMember } from "../../api/dashboard";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { initials } from "../../utils/initials";
import styles from "./TeamWorkload.module.css";

export function TeamWorkload({ members }: { members: TeamMember[] }) {
  const { t } = useLocale();
  return (
    <Panel className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.title}>{t.teamWorkload.title}</div>
      </div>
      {members.length === 0 ? (
        <div className={styles.empty}>{t.teamWorkload.empty}</div>
      ) : (
        members.map((member) => (
          <div className={styles.row} key={member.name}>
            <div className={styles.avatar}>{initials(member.name)}</div>
            <div className={styles.name}>{member.name}</div>
            <div className={styles.track}>
              <div className={styles.fill} style={{ width: `${member.loadPercent}%` }} />
            </div>
            <div className={styles.count}>{interpolate(t.teamWorkload.clientCountTemplate, { count: member.clientCount })}</div>
          </div>
        ))
      )}
    </Panel>
  );
}
