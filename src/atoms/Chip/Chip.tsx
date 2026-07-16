import type { ReactNode } from "react";
import { useLocale } from "../../i18n/useLocale";
import styles from "./Chip.module.css";

export type ChipTone = "ready" | "draft" | "review";

/** Content-plan status chip — DESIGN_SYSTEM.md 12.5 (status coded by color + text, not color alone). */
export function Chip({ tone, children }: { tone: ChipTone; children?: ReactNode }) {
  const { t } = useLocale();
  return <span className={`${styles.chip} ${styles[tone]}`}>{children ?? t.chip.tone[tone]}</span>;
}
