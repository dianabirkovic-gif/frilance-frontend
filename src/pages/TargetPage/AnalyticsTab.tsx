import { useMemo, useState } from "react";
import type { Metrics } from "../../api/targetAds";
import { useLocale } from "../../i18n/useLocale";
import { interpolate } from "../../i18n/interpolate";
import { usePageFab } from "../../templates/AppShell/PageFabContext";
import { usePageHeader } from "../../templates/AppShell/PageHeaderContext";
import { formatCount, formatPercent, formatRoas, formatUnitMoney } from "../../utils/adMetrics";
import { shiftDays, toIsoDate } from "../../utils/calendarDays";
import { formatMoney } from "../../utils/money";
import { AdReportDialog } from "../../organisms/AdReportDialog/AdReportDialog";
import { DownloadIcon } from "../../atoms/icons/icons";
import { ClientFilter } from "./ClientFilter";
import styles from "./TargetPage.module.css";
import { useAnalytics } from "./useTargetAds";

/**
 * The Аналітика tab: how the ad campaigns performed over a period — totals,
 * campaign against campaign, platform against platform, and the day-by-day
 * spend. Everything is read from the statistics entered by hand; ratios come
 * from the sums on the server, so a quiet day cannot skew a period's CTR.
 */
export function AnalyticsTab() {
  const { t, locale } = useLocale();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [to, setTo] = useState(() => toIsoDate(new Date()));
  const [from, setFrom] = useState(() => shiftDays(toIsoDate(new Date()), -29));
  const [isReportOpen, setIsReportOpen] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useAnalytics(selectedClientId, from, to);

  usePageFab(null);
  usePageHeader({
    title: t.targetPage.title,
    subtitle: data ? interpolate(t.analyticsTab.subtitleTemplate, { from: fmt(data.from, locale), to: fmt(data.to, locale) }) : "",
  });

  function applyPreset(days: number) {
    const today = toIsoDate(new Date());
    setTo(today);
    setFrom(shiftDays(today, -(days - 1)));
  }

  // The best price per lead among campaigns that have leads — only meaningful as a comparison,
  // so it is flagged only when at least two campaigns have a CPL to compare.
  const bestCampaignId = useMemo(() => {
    const withCpl = (data?.byCampaign ?? []).filter((row) => row.metrics.cpl !== null);
    if (withCpl.length < 2) return null;
    return withCpl.reduce((best, row) => (row.metrics.cpl! < best.metrics.cpl! ? row : best)).campaignId;
  }, [data]);

  const maxDailySpend = Math.max(0, ...(data?.daily ?? []).map((day) => day.metrics.spend));

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        {data && (
          <ClientFilter
            clients={data.clients}
            selectedClientId={selectedClientId}
            onChange={setSelectedClientId}
            allLabel={t.targetPage.allClients}
            labelTemplate={t.targetPage.clientFilterLabelTemplate}
          />
        )}
        <div className={styles.periodBar}>
          <label className={styles.dateField}>
            {t.analyticsTab.periodFrom}
            <input type="date" value={from} max={to} onChange={(event) => event.target.value && setFrom(event.target.value)} />
          </label>
          <label className={styles.dateField}>
            {t.analyticsTab.periodTo}
            <input type="date" value={to} min={from} onChange={(event) => event.target.value && setTo(event.target.value)} />
          </label>
          <button type="button" className={styles.presetBtn} onClick={() => applyPreset(7)}>
            {t.analyticsTab.last7}
          </button>
          <button type="button" className={styles.presetBtn} onClick={() => applyPreset(30)}>
            {t.analyticsTab.last30}
          </button>
          <button type="button" className={styles.presetBtn} onClick={() => applyPreset(90)}>
            {t.analyticsTab.last90}
          </button>
        </div>
        <div className={styles.spacer} />
        {/* Open to anyone who can open the analysis — exporting writes nothing; it reads what the
            member is already allowed to see. */}
        {data && (
          <button type="button" className={styles.reportBtn} onClick={() => setIsReportOpen(true)}>
            <DownloadIcon width={14} height={14} />
            {t.adReport.button}
          </button>
        )}
      </div>

      {data && (
        <AdReportDialog
          open={isReportOpen}
          clients={data.clients}
          defaultClientId={selectedClientId}
          defaultFrom={from}
          defaultTo={to}
          onClose={() => setIsReportOpen(false)}
        />
      )}

      {isLoading && <div className={styles.state}>{t.analyticsTab.loading}</div>}

      {isError && (
        <div className={styles.state} role="alert">
          <p>
            {t.analyticsTab.loadErrorPrefix}
            {error instanceof Error ? error.message : ""}
          </p>
          <button type="button" onClick={() => refetch()} className={styles.retry}>
            {t.analyticsTab.retry}
          </button>
        </div>
      )}

      {data && data.byCampaign.length === 0 && <p className={styles.emptyBoard}>{t.analyticsTab.empty}</p>}

      {data && data.byCampaign.length > 0 && (
        <div className={isFetching ? styles.busy : undefined} aria-busy={isFetching}>
          <div className={styles.shell}>
            <section className={styles.panel} aria-label={t.analyticsTab.totalsTitle}>
              <div className={styles.panelTitle}>{t.analyticsTab.totalsTitle}</div>
              <div className={styles.statCards}>
                <Card label={t.metrics.spend} value={formatMoney(data.totals.spend)} />
                <Card label={t.metrics.impressions} value={formatCount(data.totals.impressions)} />
                <Card label={t.metrics.reach} value={formatCount(data.totals.reach)} />
                <Card label={t.metrics.clicks} value={formatCount(data.totals.clicks)} />
                <Card label={t.metrics.leads} value={formatCount(data.totals.leads)} />
                <Card label={t.metrics.ctr} value={formatPercent(data.totals.ctr)} />
                <Card label={t.metrics.cpc} value={formatUnitMoney(data.totals.cpc)} />
                <Card label={t.metrics.cpl} value={formatUnitMoney(data.totals.cpl)} />
                <Card label={t.metrics.cpm} value={formatUnitMoney(data.totals.cpm)} />
                <Card label={t.metrics.roas} value={formatRoas(data.totals.roas)} />
              </div>
              <p className={styles.note}>{t.metrics.reachNote}</p>
            </section>

            <section className={styles.panel} aria-label={t.analyticsTab.byCampaignTitle}>
              <div className={styles.panelTitle}>{t.analyticsTab.byCampaignTitle}</div>
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>{t.analyticsTab.campaignColumn}</th>
                      <th>{t.analyticsTab.platformColumn}</th>
                      <MetricHeaders />
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCampaign.map((row) => (
                      <tr key={row.campaignId}>
                        <td>
                          {row.name}
                          {selectedClientId === null && <span className={styles.creativeMeta}> · {row.clientName}</span>}
                          {row.campaignId === bestCampaignId && (
                            <span className={styles.bestBadge}>{t.analyticsTab.bestBadge}</span>
                          )}
                        </td>
                        <td>{t.campaignPlatform[row.platform]}</td>
                        <MetricCells metrics={row.metrics} highlightCpl={row.campaignId === bestCampaignId} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {bestCampaignId && <p className={styles.note}>{t.analyticsTab.bestHint}</p>}
            </section>

            <section className={styles.panel} aria-label={t.analyticsTab.byPlatformTitle}>
              <div className={styles.panelTitle}>{t.analyticsTab.byPlatformTitle}</div>
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>{t.analyticsTab.platformColumn}</th>
                      <MetricHeaders />
                    </tr>
                  </thead>
                  <tbody>
                    {data.byPlatform.map((row) => (
                      <tr key={row.platform}>
                        <td>{t.campaignPlatform[row.platform]}</td>
                        <MetricCells metrics={row.metrics} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.panel} aria-label={t.analyticsTab.dailyTitle}>
              <div className={styles.panelTitle}>
                {t.analyticsTab.dailyTitle} · {t.analyticsTab.dailySpendLabel}
              </div>
              <div className={styles.chart} role="img" aria-label={t.analyticsTab.dailyTitle}>
                {data.daily.map((day) => (
                  <div
                    key={day.date}
                    className={styles.barCol}
                    title={`${fmt(day.date, locale)} · ${t.analyticsTab.dailySpendLabel}: ${formatMoney(day.metrics.spend)} · ${t.analyticsTab.dailyLeadsLabel}: ${formatCount(day.metrics.leads)}`}
                  >
                    <div
                      className={styles.bar}
                      style={{ height: `${maxDailySpend > 0 ? (day.metrics.spend / maxDailySpend) * 100 : 0}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className={styles.chartAxis}>
                <span>{fmt(data.daily[0].date, locale)}</span>
                <span>{fmt(data.daily[data.daily.length - 1].date, locale)}</span>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricHeaders() {
  const { t } = useLocale();
  return (
    <>
      <th>{t.metrics.spend}</th>
      <th>{t.metrics.leads}</th>
      <th>{t.metrics.cpl}</th>
      <th>{t.metrics.ctr}</th>
      <th>{t.metrics.cpc}</th>
      <th>{t.metrics.roas}</th>
    </>
  );
}

function MetricCells({ metrics, highlightCpl = false }: { metrics: Metrics; highlightCpl?: boolean }) {
  return (
    <>
      <td>{formatMoney(metrics.spend)}</td>
      <td>{formatCount(metrics.leads)}</td>
      <td className={highlightCpl ? styles.bestCell : undefined}>{formatUnitMoney(metrics.cpl)}</td>
      <td>{formatPercent(metrics.ctr)}</td>
      <td>{formatUnitMoney(metrics.cpc)}</td>
      <td>{formatRoas(metrics.roas)}</td>
    </>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value}</span>
    </div>
  );
}

function fmt(iso: string, locale: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale);
}
