import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./ConfirmationDialog.module.css";

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Centered modal confirming a consequential action — used in place of the
 * browser's native `window.confirm()` so the prompt matches the app's
 * design system instead of the OS chrome.
 *
 * Portals to `document.body`: a caller like ClientDetailDrawer renders this
 * inside a panel that has its own CSS `transform` (for the slide-in
 * animation), and a `transform` on an ancestor turns it into the containing
 * block for `position: fixed` descendants — without the portal, the dialog
 * would center on that panel instead of the actual viewport.
 */
export function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel = "Підтвердити",
  cancelLabel = "Скасувати",
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return createPortal(
    <>
      <div className={open ? `${styles.backdrop} ${styles.open}` : styles.backdrop} onClick={onCancel} />
      <div
        className={open ? `${styles.dialog} ${styles.open}` : styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-labelledby="confirmation-dialog-title"
      >
        <div id="confirmation-dialog-title" className={styles.title}>
          {title}
        </div>
        <div className={styles.message}>{message}</div>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={isConfirming}>
            {cancelLabel}
          </button>
          <button type="button" className={styles.confirmBtn} onClick={onConfirm} disabled={isConfirming}>
            {isConfirming ? "Зачекайте..." : confirmLabel}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
