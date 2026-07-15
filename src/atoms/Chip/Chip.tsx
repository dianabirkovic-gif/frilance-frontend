import type { ReactNode } from "react";
import styles from "./Chip.module.css";

export type ChipTone = "ready" | "draft" | "review";

const TONE_LABEL: Record<ChipTone, string> = {
  ready: "Готово",
  draft: "Чернетка",
  review: "На перевірці",
};

/** Content-plan status chip — DESIGN_SYSTEM.md 12.5 (status coded by color + text, not color alone). */
export function Chip({ tone, children }: { tone: ChipTone; children?: ReactNode }) {
  return <span className={`${styles.chip} ${styles[tone]}`}>{children ?? TONE_LABEL[tone]}</span>;
}
