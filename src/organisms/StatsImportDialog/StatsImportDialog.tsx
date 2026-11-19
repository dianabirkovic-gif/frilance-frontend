import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "../../atoms/icons/icons";
import { apiErrorMessage } from "../../i18n/apiErrorMessage";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { useImportCampaignStats } from "../../pages/TargetPage/useTargetAds";
import {
  IMPORT_FIELDS,
  autoMap,
  buildStatRows,
  distinctValues,
  findCampaignColumn,
  findTable,
  type ColumnMapping,
  type CsvTable,
  type DateFormat,
} from "../../utils/csvImport/adStatsImport";
import { MAX_IMPORT_FILE_BYTES } from "../../utils/csvImport/limits";
import { decodeCsvBytes, parseCsv } from "../../utils/csvImport/parseCsv";
import { formatCount } from "../../utils/adMetrics";
import { formatMoney } from "../../utils/money";
import styles from "./StatsImportDialog.module.css";

const PREVIEW_ROWS = 6;
const MAX_LISTED_PROBLEMS = 5;

interface StatsImportDialogProps {
  open: boolean;
  campaignId: string | null;
  campaignName: string;
  /** Dates the campaign already has, `YYYY-MM-DD` — to say how many days an import would replace. */
  existingDates: ReadonlySet<string>;
  onClose: () => void;
}

/**
 * «Імпорт CSV»: fill many days of one campaign from an ad cabinet's export.
 *
 * Everything up to the button happens in the browser — read, recognise the
 * columns, build one row per day — so the member sees exactly what will be
 * written (and what will not, and why) before anything is sent. The server then
 * re-validates every row and saves all of them or none.
 *
 * Portals to `document.body` for the reason `ConfirmationDialog` does.
 */
export function StatsImportDialog({ open, campaignId, campaignName, existingDates, onClose }: StatsImportDialogProps) {
  const { t } = useLocale();
  const importStats = useImportCampaignStats();

  const [table, setTable] = useState<CsvTable | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [dateFormat, setDateFormat] = useState<DateFormat>("auto");
  const [campaignColumn, setCampaignColumn] = useState<number | null>(null);
  const [campaignValues, setCampaignValues] = useState<string[]>([]);
  const [campaignValue, setCampaignValue] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ created: number; updated: number } | null>(null);

  // A fresh dialog every time: never the previous file's mapping or its success message.
  useEffect(() => {
    if (!open) return;
    setTable(null);
    setMapping(null);
    setDateFormat("auto");
    setCampaignColumn(null);
    setCampaignValues([]);
    setCampaignValue("");
    setFileError(null);
    setError(null);
    setDone(null);
  }, [open, campaignId]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setTable(null);
    setMapping(null);
    setError(null);
    setDone(null);
    if (!file) {
      setFileError(null);
      return;
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setFileError(t.statsImport.fileTooLarge);
      return;
    }
    try {
      const parsed = findTable(parseCsv(decodeCsvBytes(await file.arrayBuffer())));
      if (!parsed) {
        setFileError(t.statsImport.noTable);
        return;
      }
      setFileError(null);
      setTable(parsed);
      setMapping(autoMap(parsed.headers));

      // A file of several campaigns must be narrowed to one, or their days would be added together.
      const column = findCampaignColumn(parsed.headers);
      const values = column === null ? [] : distinctValues(parsed, column);
      setCampaignColumn(values.length > 1 ? column : null);
      setCampaignValues(values.length > 1 ? values : []);
      const sameName = values.find((value) => value.toLowerCase() === campaignName.trim().toLowerCase());
      setCampaignValue(values.length > 1 ? (sameName ?? "") : "");
    } catch {
      setFileError(t.statsImport.fileUnreadable);
    }
  }

  const needsCampaignChoice = campaignColumn !== null && campaignValue === "";

  const result = useMemo(
    () =>
      table && mapping && !needsCampaignChoice
        ? buildStatRows(table, {
            mapping,
            dateFormat,
            campaignColumn,
            campaignValue: campaignColumn === null ? null : campaignValue,
          })
        : null,
    [table, mapping, dateFormat, campaignColumn, campaignValue, needsCampaignChoice],
  );

  const replaced = result ? result.rows.filter((row) => existingDates.has(row.statDate)).length : 0;
  const canImport = !!result && result.rows.length > 0 && !result.tooMany && !importStats.isPending && !done;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!campaignId || !result || !canImport) return;
    setError(null);
    try {
      setDone(await importStats.mutateAsync({ id: campaignId, rows: result.rows }));
    } catch (err) {
      setError(apiErrorMessage(err, t));
    }
  }

  const headerOptions = table?.headers.map((header, index) => ({ index, label: header.trim() || `#${index + 1}` })) ?? [];

  return createPortal(
    <>
      <div className={open ? `${styles.backdrop} ${styles.open}` : styles.backdrop} onClick={onClose} />
      <form
        className={open ? `${styles.dialog} ${styles.open}` : styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-labelledby="stats-import-title"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className={styles.header}>
          <div id="stats-import-title" className={styles.title}>
            {t.statsImport.title} · {campaignName}
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label={t.statsImport.close}>
            <CloseIcon width={14} height={14} />
          </button>
        </div>

        <p className={styles.hint}>{t.statsImport.hint}</p>

        <label className={styles.field}>
          <span>{t.statsImport.fileLabel}</span>
          <input type="file" accept=".csv,.tsv,.txt,text/csv" onChange={handleFile} />
        </label>
        {fileError && (
          <div className={styles.error} role="alert">
            {fileError}
          </div>
        )}

        {table && mapping && (
          <>
            <div>
              <div className={styles.sectionTitle}>{t.statsImport.mappingTitle}</div>
              <p className={styles.muted}>{t.statsImport.mappingHint}</p>
            </div>
            <div className={styles.mapGrid}>
              {IMPORT_FIELDS.map((field) => (
                <label key={field} className={styles.field}>
                  <span>
                    {t.statsImport.fields[field]}
                    {field === "date" && <span className={styles.required}> *</span>}
                  </span>
                  <select
                    value={mapping[field] ?? ""}
                    onChange={(event) =>
                      setMapping({ ...mapping, [field]: event.target.value === "" ? null : Number(event.target.value) })
                    }
                  >
                    <option value="">{t.statsImport.notMapped}</option>
                    {headerOptions.map((option) => (
                      <option key={option.index} value={option.index}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label className={styles.field}>
                <span>{t.statsImport.dateFormatLabel}</span>
                <select value={dateFormat} onChange={(event) => setDateFormat(event.target.value as DateFormat)}>
                  <option value="auto">{t.statsImport.dateFormatAuto}</option>
                  <option value="us">{t.statsImport.dateFormatUs}</option>
                </select>
              </label>
            </div>

            {campaignColumn !== null && (
              <>
                <label className={styles.field}>
                  <span>{t.statsImport.campaignFilterLabel}</span>
                  <select value={campaignValue} onChange={(event) => setCampaignValue(event.target.value)}>
                    <option value="" disabled>
                      {t.statsImport.campaignFilterPlaceholder}
                    </option>
                    {campaignValues.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <p className={styles.notice}>{t.statsImport.campaignFilterHint}</p>
              </>
            )}

            {result && (
              <>
                <div className={styles.sectionTitle}>{t.statsImport.previewTitle}</div>

                {result.rows.length === 0 ? (
                  <p className={styles.error} role="alert">
                    {t.statsImport.noRows}
                  </p>
                ) : (
                  <>
                    <p className={styles.summary}>
                      {interpolate(t.statsImport.summaryTemplate, {
                        count: result.rows.length,
                        created: result.rows.length - replaced,
                        updated: replaced,
                      })}
                    </p>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>{t.statsImport.fields.date}</th>
                            <th>{t.statsImport.fields.spend}</th>
                            <th>{t.statsImport.fields.impressions}</th>
                            <th>{t.statsImport.fields.clicks}</th>
                            <th>{t.statsImport.fields.leads}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.rows.slice(0, PREVIEW_ROWS).map((row) => (
                            <tr key={row.statDate}>
                              <td>{row.statDate}</td>
                              <td>{formatMoney(row.spend)}</td>
                              <td>{formatCount(row.impressions)}</td>
                              <td>{formatCount(row.clicks)}</td>
                              <td>{formatCount(row.leads)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {result.rows.length > PREVIEW_ROWS && (
                      <p className={styles.muted}>
                        {interpolate(t.statsImport.problemsMoreTemplate, { count: result.rows.length - PREVIEW_ROWS })}
                      </p>
                    )}
                  </>
                )}

                {result.skipped > 0 && (
                  <p className={styles.muted}>{interpolate(t.statsImport.skippedTemplate, { count: result.skipped })}</p>
                )}

                {result.problems.length > 0 && (
                  <div role="alert">
                    <div className={styles.sectionTitle}>{t.statsImport.problemsTitle}</div>
                    <ul className={styles.problems}>
                      {result.problems.slice(0, MAX_LISTED_PROBLEMS).map((problem) => (
                        <li key={`${problem.line}-${problem.reason}`}>
                          {interpolate(t.statsImport.problemTemplate, {
                            line: problem.line,
                            date: problem.date ?? "—",
                            reason: t.statsImport.problemReason[problem.reason],
                          })}
                        </li>
                      ))}
                      {result.problems.length > MAX_LISTED_PROBLEMS && (
                        <li>
                          {interpolate(t.statsImport.problemsMoreTemplate, {
                            count: result.problems.length - MAX_LISTED_PROBLEMS,
                          })}
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {result.tooMany && (
                  <p className={styles.error} role="alert">
                    {t.statsImport.tooMany}
                  </p>
                )}
              </>
            )}
          </>
        )}

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
        {done && (
          <p className={styles.success} role="status">
            {interpolate(t.statsImport.doneTemplate, { created: done.created, updated: done.updated })}
          </p>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={importStats.isPending}>
            {done ? t.statsImport.close : t.statsImport.cancel}
          </button>
          <button type="submit" className={styles.submitBtn} disabled={!canImport}>
            {importStats.isPending ? t.statsImport.submitLoading : t.statsImport.submitIdle}
          </button>
        </div>
      </form>
    </>,
    document.body,
  );
}

