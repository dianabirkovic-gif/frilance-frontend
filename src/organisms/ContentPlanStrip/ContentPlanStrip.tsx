import { Panel } from "../../molecules/Panel/Panel";
import { Chip, type ChipTone } from "../../atoms/Chip/Chip";
import type { ContentPlanDay, PostStatus } from "../../api/dashboard";
import styles from "./ContentPlanStrip.module.css";

const STATUS_TONE: Record<PostStatus, ChipTone> = {
  READY: "ready",
  DRAFT: "draft",
  REVIEW: "review",
  PUBLISHED: "ready",
};

export function ContentPlanStrip({ days }: { days: ContentPlanDay[] }) {
  return (
    <Panel className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.title}>Контент-план · цей тиждень</div>
      </div>
      {days.length === 0 ? (
        <div className={styles.empty}>На цей тиждень ще нічого не заплановано.</div>
      ) : (
        days.map((day, index) => (
          <div className={styles.row} key={index}>
            <span className={styles.day}>{day.dayLabel}</span>
            <span className={styles.client}>{day.clientLabel}</span>
            <Chip tone={STATUS_TONE[day.status]} />
          </div>
        ))
      )}
    </Panel>
  );
}
