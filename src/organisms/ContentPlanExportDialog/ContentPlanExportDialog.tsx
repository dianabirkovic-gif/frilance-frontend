import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { contentPlanQueryKey, getContentPlan, type ContentPlanClient, type Post } from "../../api/contentPlan";
import { CloseIcon } from "../../atoms/icons/icons";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { monthsInRange, shiftMonth, toIsoDate } from "../../utils/calendarDays";
import {
  buildContentPlanPdf,
  contentPlanPdfFilename,
} from "../../utils/contentPlanPdf/buildContentPlanPdf";
import { downloadContentPlanPdf } from "../../utils/contentPlanPdf/downloadContentPlanPdf";
import styles from "./ContentPlanExportDialog.module.css";

/** Each month is a request, so an unbounded range would be an unbounded burst of them. */
const MAX_RANGE_MONTHS = 12;

interface ContentPlanExportDialogProps {
  open: boolean;
  clients: ContentPlanClient[];
  /** The client the page is filtered to, if any — the most likely one to send. */
  defaultClientId: string | null;
  /** The period on screen, `YYYY-MM-DD` inclusive. */
  defaultFrom: string;
  defaultTo: string;
  onClose: () => void;
}

/** First and last day of a `YYYY-MM`. */
function monthBounds(month: string): { from: string; to: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  return { from: `${month}-01`, to: toIsoDate(new Date(year, monthNumber, 0)) };
}

/**
 * «Експорт у PDF»: pick a client and a period, get a document to send them.
 *
 * It always reads the plan fresh rather than from what the page has cached — a
 * file leaving the building should reflect the plan as it is now, not as it was
 * when the tab last refetched.
 *
 * Portals to `document.body` for the reason `ConfirmationDialog` does: a
 * caller inside a transformed panel would otherwise centre it on the panel.
 */
export function ContentPlanExportDialog({
  open,
  clients,
  defaultClientId,
  defaultFrom,
  defaultTo,
  onClose,
}: ContentPlanExportDialogProps) {
  const { t } = useLocale();
  const queryClient = useQueryClient();

  const [clientId, setClientId] = useState("");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Reset on every open so the dialog never shows the previous export's choices.
  useEffect(() => {
    if (!open) return;
    setClientId(defaultClientId ?? "");
    setFrom(defaultFrom);
    setTo(defaultTo);
    setIncludeDrafts(false);
    setError(null);
  }, [open, defaultClientId, defaultFrom, defaultTo]);

  function applyMonth(offset: number) {
    const current = toIsoDate(new Date()).slice(0, 7);
    const bounds = monthBounds(shiftMonth(current, offset));
    setFrom(bounds.from);
    setTo(bounds.to);
  }

  function validate(): string | null {
    if (!from || !to || to < from) return t.contentPlanExport.rangeInvalid;
    if (monthsInRange(from, to).length > MAX_RANGE_MONTHS) return t.contentPlanExport.rangeTooLong;
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    const client = clients.find((candidate) => candidate.id === clientId);
    if (!client) return;

    setError(null);
    setIsGenerating(true);
    try {
      const plans = await Promise.all(
        monthsInRange(from, to).map((month) =>
          queryClient.fetchQuery({
            queryKey: contentPlanQueryKey(month, client.id),
            queryFn: () => getContentPlan(month, client.id),
            staleTime: 0,
          }),
        ),
      );
      const posts: Post[] = plans
        .flatMap((plan) => plan.posts)
        .filter((post) => post.clientId === client.id)
        .filter((post) => post.scheduledDate >= from && post.scheduledDate <= to)
        .filter((post) => includeDrafts || post.status !== "DRAFT");

      if (posts.length === 0) {
        setError(t.contentPlanExport.noPosts);
        return;
      }

      await downloadContentPlanPdf(
        buildContentPlanPdf({ clientName: client.name, from, to, posts, generatedAt: new Date(), t }),
        contentPlanPdfFilename(client.name, from, to),
      );
      onClose();
    } catch {
      setError(t.contentPlanExport.loadError);
    } finally {
      setIsGenerating(false);
    }
  }

  return createPortal(
    <>
      <div className={open ? `${styles.backdrop} ${styles.open}` : styles.backdrop} onClick={onClose} />
      <form
        className={open ? `${styles.dialog} ${styles.open}` : styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-labelledby="content-plan-export-title"
        onSubmit={handleSubmit}
        // Validated in `validate`, so the message is ours and in the right language
        // rather than the browser's native bubble.
        noValidate
      >
        <div className={styles.header}>
          <div id="content-plan-export-title" className={styles.title}>
            {t.contentPlanExport.dialogTitle}
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label={t.contentPlanExport.cancel}>
            <CloseIcon width={14} height={14} />
          </button>
        </div>

        <p className={styles.hint}>{t.contentPlanExport.hint}</p>

        <label className={styles.field}>
          <span>{t.contentPlanExport.clientLabel}</span>
          <select value={clientId} onChange={(event) => setClientId(event.target.value)} required>
            <option value="" disabled>
              {t.contentPlanExport.clientPlaceholder}
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.row}>
          <label className={styles.field}>
            <span>{t.contentPlanExport.fromLabel}</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} required />
          </label>
          <label className={styles.field}>
            <span>{t.contentPlanExport.toLabel}</span>
            <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} required />
          </label>
        </div>

        <div className={styles.presets}>
          <button type="button" className={styles.preset} onClick={() => applyMonth(0)}>
            {t.contentPlanExport.thisMonth}
          </button>
          <button type="button" className={styles.preset} onClick={() => applyMonth(1)}>
            {t.contentPlanExport.nextMonth}
          </button>
        </div>

        <label className={styles.check}>
          <input
            type="checkbox"
            checked={includeDrafts}
            onChange={(event) => setIncludeDrafts(event.target.checked)}
          />
          <span>{interpolate(t.contentPlanExport.includeDraftsTemplate, { status: t.postStatus.DRAFT })}</span>
        </label>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isGenerating}>
            {t.contentPlanExport.cancel}
          </button>
          <button type="submit" className={styles.submitBtn} disabled={isGenerating || !clientId}>
            {isGenerating ? t.contentPlanExport.submitLoading : t.contentPlanExport.submitIdle}
          </button>
        </div>
      </form>
    </>,
    document.body,
  );
}
