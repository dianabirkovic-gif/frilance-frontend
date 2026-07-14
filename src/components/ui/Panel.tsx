import type { ReactNode } from "react";
import styles from "./Panel.module.css";

interface PanelProps {
  children: ReactNode;
  flush?: boolean;
  className?: string;
}

/** The one card surface in the design system — DESIGN_SYSTEM.md section 6 ("no boxes-in-boxes"). */
export function Panel({ children, flush, className }: PanelProps) {
  const classes = [styles.panel, flush ? styles.flush : "", className ?? ""].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
}
