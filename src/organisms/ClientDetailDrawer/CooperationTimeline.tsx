import type { ClientStage, ClientStatus } from "../../api/clients";
import { timelineNodeX } from "./timelineLayout";
import styles from "./ClientDetailDrawer.module.css";

const STAGE_ORDER: ClientStage[] = ["BRIEF", "ESTIMATE", "PAYMENT", "WORK_STARTED", "REPORT"];
const STAGE_LABELS = ["Бріф", "Кошторис", "Оплата", "Старт робіт", "Звіт"];

/**
 * The Ledger Line motif reused as a cooperation-stage timeline
 * (DESIGN_SYSTEM.md §12) — line + nodes + labels, ported from clients.html's
 * `renderTimeline`. Archived clients show "Завершено" on the last node
 * instead of "Звіт" — presentational only, no separate backend field.
 */
export function CooperationTimeline({ stage, status }: { stage: ClientStage; status: ClientStatus }) {
  const step = Math.max(0, STAGE_ORDER.indexOf(stage));
  const count = STAGE_LABELS.length;
  const labels = status === "ARCHIVED" ? [...STAGE_LABELS.slice(0, -1), "Завершено"] : STAGE_LABELS;
  const progressX = timelineNodeX(step, count);

  return (
    <svg viewBox="0 0 396 60" className={styles.timelineSvg}>
      <line x1={10} y1={30} x2={386} y2={30} stroke="var(--line)" strokeWidth={2} />
      <line x1={10} y1={30} x2={progressX} y2={30} stroke="var(--brand-400)" strokeWidth={2} />
      {labels.map((label, index) => {
        const cx = timelineNodeX(index, count);
        const done = index <= step;
        const isCurrent = index === step;
        return (
          <g key={label}>
            <circle
              cx={cx}
              cy={30}
              r={isCurrent ? 6 : 4.5}
              fill={done ? (isCurrent ? "var(--ink-900)" : "var(--brand-400)") : "var(--ink-800)"}
              stroke={isCurrent ? "var(--gold-500)" : done ? "var(--brand-400)" : "var(--line-strong)"}
              strokeWidth={isCurrent ? 2.5 : 1.5}
            />
            <text
              x={cx}
              y={48}
              textAnchor={index === 0 ? "start" : index === count - 1 ? "end" : "middle"}
              fontFamily="Public Sans"
              fontSize={9.5}
              fill={isCurrent ? "var(--text-1)" : "var(--text-3)"}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
