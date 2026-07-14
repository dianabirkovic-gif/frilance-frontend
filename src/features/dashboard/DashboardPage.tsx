import { AttentionList } from "./AttentionList";
import { ContentPlanStrip } from "./ContentPlanStrip";
import { EventLedger } from "./EventLedger";
import { FinanceStrip } from "./FinanceStrip";
import { RevenueHero } from "./RevenueHero";
import { TeamWorkload } from "./TeamWorkload";
import styles from "./DashboardPage.module.css";
import { useDashboardOverview } from "./useDashboardOverview";

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboardOverview();

  if (isLoading) {
    return <div className={styles.state}>Завантаження…</div>;
  }

  if (isError || !data) {
    return (
      <div className={styles.state}>
        <p>Не вдалося завантажити дані. {error instanceof Error ? error.message : ""}</p>
        <button type="button" onClick={() => refetch()} className={styles.retry}>
          Спробувати ще раз
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
