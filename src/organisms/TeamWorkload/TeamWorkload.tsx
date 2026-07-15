import { Panel } from "../../molecules/Panel/Panel";
import type { TeamMember } from "../../api/dashboard";
import { initials } from "../../utils/initials";
import styles from "./TeamWorkload.module.css";

export function TeamWorkload({ members }: { members: TeamMember[] }) {
  return (
    <Panel className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.title}>Завантаженість команди</div>
      </div>
      {members.length === 0 ? (
        <div className={styles.empty}>Немає даних про команду.</div>
      ) : (
        members.map((member) => (
          <div className={styles.row} key={member.name}>
            <div className={styles.avatar}>{initials(member.name)}</div>
            <div className={styles.name}>{member.name}</div>
            <div className={styles.track}>
              <div className={styles.fill} style={{ width: `${member.loadPercent}%` }} />
            </div>
            <div className={styles.count}>{member.clientCount} кл.</div>
          </div>
        ))
      )}
    </Panel>
  );
}
