import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import type { TargetClient } from "../../api/target";
import { analyticsQueryKey, getAnalytics } from "../../api/targetAds";
import { CloseIcon } from "../../atoms/icons/icons";
import { useLocale } from "../../i18n/useLocale";
import {
  adReportPdfFilename,
  buildAdReportPdf,
  hasAdReportData,
} from "../../utils/adReportPdf/buildAdReportPdf";
import { shiftDays, shiftMonth, toIsoDate } from "../../utils/calendarDays";
import { downloadPdf } from "../../utils/downloadPdf";
// The same dialog shell as the content plan's export, so the two feel like one feature.
import styles from "../ContentPlanExportDialog/ContentPlanExportDialog.module.css";

/** The server refuses a longer window; saying so here spares a round trip. */
const MAX_RANGE_DAYS = 366;

interface AdReportDialogProps {
  open: boolean;
  clients: TargetClient[];
  /** The client the Аналітика tab is filtered to, if any — the most likely one to send. */
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
 * «Звіт у PDF»: pick a client and a period, get a document to send them.
 *
 * A report is always about one client — a document that mixes clients' spend
 * cannot be sent to any of them — so unlike the tab's filter there is no «all».
 * It reads the analysis fresh rather than from what the tab has cached: a file
 * leaving the building should reflect the numbers as they are now.
 *
 * Portals to `document.body` for the reason `ConfirmationDialog` does.
 */
export function AdReportDialog({
  open,
  clients,
  defaultClientId,
  defaultFrom,
  defaultTo,
  onClose,
}: AdReportDialogProps) {
  const { t } = useLocale();
  const queryClient = useQueryClient();

  const [clientId, setClientId] = useState("");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Reset on every open so the dialog never shows the previous export's choices.
  useEffect(() => {
    if (!open) return;
    setClientId(defaultClientId ?? "");
    setFrom(defaultFrom);
    setTo(defaultTo);
    setError(null);
  }, [open, defaultClientId, defaultFrom, defaultTo]);

  function applyLast30() {
    const today = toIsoDate(new Date());
    setTo(today);
    setFrom(shiftDays(today, -29));
  }

  function applyLastMonth() {
    const bounds = monthBounds(shiftMonth(toIsoDate(new Date()).slice(0, 7), -1));
    setFrom(bounds.from);
    setTo(bounds.to);
  }

  function validate(): string | null {
    if (!from || !to || to < from) return t.adReport.rangeInvalid;
    const days = (new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000;
    if (days >= MAX_RANGE_DAYS) return t.adReport.rangeTooLong;
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
      const analytics = await queryClient.fetchQuery({
        queryKey: analyticsQueryKey(client.id, from, to),
        queryFn: () => getAnalytics(client.id, from, to),
        staleTime: 0,
      });

      if (!hasAdReportData(analytics)) {
        setError(t.adReport.noData);
        return;
      }

      await downloadPdf(
        buildAdReportPdf({ clientName: client.name, analytics, generatedAt: new Date(), t }),
        adReportPdfFilename(client.name, analytics.from, analytics.to),
      );
      onClose();
    } catch {
      setError(t.adReport.loadError);
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
        aria-labelledby="ad-report-title"
        onSubmit={handleSubmit}
        // Validated in `validate`, so the message is ours and in the right language.
        noValidate
      >
        <div className={styles.header}>
          <div id="ad-report-title" className={styles.title}>
            {t.adReport.dialogTitle}
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label={t.adReport.cancel}>
            <CloseIcon width={14} height={14} />
          </button>
        </div>

        <p className={styles.hint}>{t.adReport.hint}</p>

        <label className={styles.field}>
          <span>{t.adReport.clientLabel}</span>
          <select value={clientId} onChange={(event) => setClientId(event.target.value)} required>
            <option value="" disabled>
              {t.adReport.clientPlaceholder}
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
            <span>{t.adReport.fromLabel}</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} required />
          </label>
          <label className={styles.field}>
            <span>{t.adReport.toLabel}</span>
            <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} required />
          </label>
        </div>

        <div className={styles.presets}>
          <button type="button" className={styles.preset} onClick={applyLast30}>
            {t.adReport.last30}
          </button>
          <button type="button" className={styles.preset} onClick={applyLastMonth}>
            {t.adReport.lastMonth}
          </button>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isGenerating}>
            {t.adReport.cancel}
          </button>
          <button type="submit" className={styles.submitBtn} disabled={isGenerating || !clientId}>
            {isGenerating ? t.adReport.submitLoading : t.adReport.submitIdle}
          </button>
        </div>
      </form>
    </>,
    document.body,
  );
}
