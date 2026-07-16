import { CLIENT_STAGE_ORDER, type ClientStage, type ClientStatus } from "../../api/clients";
import { useLocale } from "../../i18n/useLocale";
import { timelineNodeX } from "./timelineLayout";
import styles from "./ClientDetailDrawer.module.css";

/**
 * The Ledger Line motif reused as a cooperation-stage timeline
 * (DESIGN_SYSTEM.md §12) — line + nodes + labels, ported from clients.html's
 * `renderTimeline`. Archived clients show the "completed" override on the
 * last node instead of the final stage label — presentational only, no
 * separate backend field.
 */
export function CooperationTimeline({ stage, status }: { stage: ClientStage; status: ClientStatus }) {
  const { t } = useLocale();
  const step = Math.max(0, CLIENT_STAGE_ORDER.indexOf(stage));
  const stageLabels = CLIENT_STAGE_ORDER.map((value) => t.clientStage[value]);
  const count = stageLabels.length;
  const labels =
    status === "ARCHIVED" ? [...stageLabels.slice(0, -1), t.cooperationTimeline.completedOverride] : stageLabels;
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
