import { useLocale } from "../../i18n/useLocale";
import { AttentionList } from "../../organisms/AttentionList/AttentionList";
import { ContentPlanStrip } from "../../organisms/ContentPlanStrip/ContentPlanStrip";
import { EventLedger } from "../../organisms/EventLedger/EventLedger";
import { FinanceStrip } from "../../organisms/FinanceStrip/FinanceStrip";
import { RevenueHero } from "../../organisms/RevenueHero/RevenueHero";
import { TeamWorkload } from "../../organisms/TeamWorkload/TeamWorkload";
import { usePageHeader } from "../../templates/AppShell/PageHeaderContext";
import styles from "./DashboardPage.module.css";
import { useDashboardOverview } from "./useDashboardOverview";

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboardOverview();
  const { t } = useLocale();
  usePageHeader({ title: t.dashboardPage.title, subtitle: data ? `${data.dateLabel} · ${data.greeting}` : "" });

  if (isLoading) {
    return <div className={styles.state}>{t.dashboardPage.loading}</div>;
  }

  if (isError || !data) {
    return (
      <div className={styles.state}>
        <p>
          {t.dashboardPage.loadErrorPrefix}
          {error instanceof Error ? error.message : ""}
        </p>
        <button type="button" onClick={() => refetch()} className={styles.retry}>
          {t.dashboardPage.retry}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.gridHero}>
        <RevenueHero revenue={data.revenue} />
        <AttentionList items={data.attentionItems} />
      </div>

      <div className={styles.gridStrip}>
        <ContentPlanStrip days={data.contentPlanWeek} />
        <FinanceStrip summary={data.financeSummary} />
        <TeamWorkload members={data.teamWorkload} />
      </div>

      <EventLedger entries={data.eventLedger} />
    </div>
  );
}
