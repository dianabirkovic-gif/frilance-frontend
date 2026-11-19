import { useAuth } from "../../hooks/useAuth";
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
  const { user } = useAuth();
  // Team load is for the people who balance it. The backend already sends an
  // empty list to everyone else; this keeps the panel from rendering as an
  // empty box in the layout.
  const showTeamWorkload = user?.role === "OWNER" || user?.role === "PROJECT_MANAGER";
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
      {/* The agency's income is the owner's. A team member has no revenue to show,
          so the panel is absent rather than an empty box, and the attention list
          takes the full row. */}
      <div className={data.revenue ? styles.gridHero : styles.gridHeroSingle}>
        {data.revenue && <RevenueHero revenue={data.revenue} />}
        <AttentionList items={data.attentionItems} />
      </div>

      <div className={showTeamWorkload ? styles.gridStrip : styles.gridStripPair}>
        <ContentPlanStrip days={data.contentPlanWeek} />
        <FinanceStrip summary={data.financeSummary} />
        {showTeamWorkload && <TeamWorkload members={data.teamWorkload} />}
      </div>

      <EventLedger entries={data.eventLedger} />
    </div>
  );
}
