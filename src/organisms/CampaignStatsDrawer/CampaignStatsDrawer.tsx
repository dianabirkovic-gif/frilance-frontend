import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { StatRow } from "../../api/targetAds";
import { CloseIcon } from "../../atoms/icons/icons";
import { apiErrorMessage } from "../../i18n/apiErrorMessage";
import { useLocale } from "../../i18n/useLocale";
import { useCampaignStats, useDeleteCampaignStat, useSaveCampaignStat } from "../../pages/TargetPage/useTargetAds";
import { StatsImportDialog } from "../StatsImportDialog/StatsImportDialog";
import { toIsoDate } from "../../utils/calendarDays";
import { formatCount, formatPercent, formatRoas, formatUnitMoney } from "../../utils/adMetrics";
import { formatMoney } from "../../utils/money";
import styles from "./CampaignStatsDrawer.module.css";

interface CampaignStatsDrawerProps {
  /** The campaign whose days are shown; null keeps the drawer closed. */
  campaignId: string | null;
  canEdit: boolean;
  onClose: () => void;
}

function emptyForm(date: string) {
  return { statDate: date, spend: "", impressions: "", reach: "", clicks: "", leads: "", revenue: "" };
}

/**
 * Hand-entered daily statistics for one campaign: a form for a day and the table
 * of days entered. Saving a date that already has a row replaces it, so
 * correcting a typo is the same action as entering the day — the form says so
 * when the date it holds is one that already exists.
 */
export function CampaignStatsDrawer({ campaignId, canEdit, onClose }: CampaignStatsDrawerProps) {
  const { t, locale } = useLocale();
  const open = campaignId !== null;
  const { data, isLoading, isError, error: loadError } = useCampaignStats(campaignId);
  const save = useSaveCampaignStat();
  const remove = useDeleteCampaignStat();

  const [form, setForm] = useState(() => emptyForm(toIsoDate(new Date())));
  const [error, setError] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const existingDates = useMemo(() => new Set(data?.rows.map((row) => row.date) ?? []), [data]);

  // A fresh form for every campaign opened — never the previous campaign's half-typed day.
  useEffect(() => {
    if (open) {
      setForm(emptyForm(toIsoDate(new Date())));
      setError(null);
    }
  }, [campaignId, open]);

  const replacesExisting = data?.rows.some((row) => row.date === form.statDate) ?? false;

  function loadRow(row: StatRow) {
    const m = row.metrics;
    setForm({
      statDate: row.date,
      spend: String(m.spend),
      impressions: String(m.impressions),
      reach: String(m.reach),
      clicks: String(m.clicks),
      leads: String(m.leads),
      revenue: m.revenue > 0 ? String(m.revenue) : "",
    });
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!campaignId) return;
    setError(null);
    try {
      await save.mutateAsync({
        id: campaignId,
        payload: {
          statDate: form.statDate,
          spend: Number(form.spend || 0),
          impressions: Number(form.impressions || 0),
          reach: Number(form.reach || 0),
          clicks: Number(form.clicks || 0),
          leads: Number(form.leads || 0),
          revenue: form.revenue.trim() === "" ? null : Number(form.revenue),
        },
      });
      // Keep the date (the next field to correct is usually the same day) but clear the figures.
      setForm(emptyForm(form.statDate));
    } catch (err) {
      setError(apiErrorMessage(err, t));
    }
  }

  async function handleDelete(row: StatRow) {
    if (!campaignId || !window.confirm(t.statsDrawer.deleteRowConfirm)) return;
    setError(null);
    try {
      await remove.mutateAsync({ campaignId, statId: row.id });
    } catch (err) {
      setError(apiErrorMessage(err, t));
    }
  }

  function numberField(key: "spend" | "impressions" | "reach" | "clicks" | "leads" | "revenue", whole: boolean) {
    return (
      <label className={styles.field}>
        <span>{t.statsDrawer.fields[key]}</span>
        <input
          type="number"
          min="0"
          step={whole ? "1" : "0.01"}
          inputMode={whole ? "numeric" : "decimal"}
          value={form[key]}
          onChange={(event) => setForm({ ...form, [key]: event.target.value })}
          required={key !== "revenue"}
        />
      </label>
    );
  }

  const totals = data?.campaign.totals;

  return (
    <>
      <div className={open ? `${styles.backdrop} ${styles.open}` : styles.backdrop} onClick={onClose} />
      <aside className={open ? `${styles.panel} ${styles.open}` : styles.panel} aria-label={t.statsDrawer.title}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>{data?.campaign.name ?? t.statsDrawer.title}</div>
            {data && <div className={styles.subtitle}>{data.campaign.clientName}</div>}
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t.statsDrawer.close}>
            <CloseIcon width={14} height={14} />
          </button>
        </div>

        <div className={styles.body}>
          {isLoading && <p className={styles.state}>{t.statsDrawer.loading}</p>}
          {isError && (
            <p className={styles.state} role="alert">
              {t.statsDrawer.loadErrorPrefix}
              {loadError instanceof Error ? loadError.message : ""}
            </p>
          )}

          {totals && (
            <div className={styles.totals}>
              <Tile label={t.metrics.spend} value={formatMoney(totals.spend)} />
              <Tile label={t.metrics.leads} value={formatCount(totals.leads)} />
              <Tile label={t.metrics.cpl} value={formatUnitMoney(totals.cpl)} />
              <Tile label={t.metrics.ctr} value={formatPercent(totals.ctr)} />
              <Tile label={t.metrics.cpc} value={formatUnitMoney(totals.cpc)} />
              <Tile label={t.metrics.roas} value={formatRoas(totals.roas)} />
            </div>
          )}

          {canEdit && data && (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formHeader}>
                <div className={styles.sectionTitle}>{t.statsDrawer.formTitle}</div>
                <button type="button" className={styles.linkBtn} onClick={() => setIsImportOpen(true)}>
                  {t.statsImport.button}
                </button>
              </div>
              <label className={styles.field}>
                <span>{t.statsDrawer.fields.date}</span>
                <input
                  type="date"
                  value={form.statDate}
                  onChange={(event) => setForm({ ...form, statDate: event.target.value })}
                  required
                />
              </label>
              {replacesExisting && (
                <p className={styles.notice} role="status">
                  {t.statsDrawer.replaceNote}
                </p>
              )}
              <div className={styles.grid}>
                {numberField("spend", false)}
                {numberField("impressions", true)}
                {numberField("reach", true)}
                {numberField("clicks", true)}
                {numberField("leads", true)}
                {numberField("revenue", false)}
              </div>
              <p className={styles.hint}>{t.statsDrawer.revenueHint}</p>
              {error && <div className={styles.error}>{error}</div>}
              <button type="submit" className={styles.submit} disabled={save.isPending}>
                {save.isPending ? t.statsDrawer.saving : t.statsDrawer.save}
              </button>
            </form>
          )}
          {!canEdit && error && <div className={styles.error}>{error}</div>}

          {data && (
            <div>
              <div className={styles.sectionTitle}>{t.statsDrawer.tableTitle}</div>
              {data.rows.length === 0 ? (
                <p className={styles.state}>{t.statsDrawer.noRows}</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{t.statsDrawer.dateColumn}</th>
                        <th>{t.metrics.spend}</th>
                        <th>{t.metrics.impressions}</th>
                        <th>{t.metrics.clicks}</th>
                        <th>{t.metrics.leads}</th>
                        <th>{t.metrics.cpl}</th>
                        {canEdit && <th />}
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((row) => (
                        <tr key={row.id}>
                          <td>{new Date(`${row.date}T00:00:00`).toLocaleDateString(locale)}</td>
                          <td>{formatMoney(row.metrics.spend)}</td>
                          <td>{formatCount(row.metrics.impressions)}</td>
                          <td>{formatCount(row.metrics.clicks)}</td>
                          <td>{formatCount(row.metrics.leads)}</td>
                          <td>{formatUnitMoney(row.metrics.cpl)}</td>
                          {canEdit && (
                            <td className={styles.rowActions}>
                              <button type="button" className={styles.linkBtn} onClick={() => loadRow(row)}>
                                {t.statsDrawer.editRow}
                              </button>
                              <button type="button" className={styles.linkBtn} onClick={() => handleDelete(row)}>
                                {t.statsDrawer.deleteRow}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {canEdit && data && (
        <StatsImportDialog
          open={isImportOpen}
          campaignId={campaignId}
          campaignName={data.campaign.name}
          existingDates={existingDates}
          onClose={() => setIsImportOpen(false)}
        />
      )}
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.tile}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.tileValue}>{value}</span>
    </div>
  );
}
