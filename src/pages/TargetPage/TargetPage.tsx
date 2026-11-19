import { useState } from "react";
import { useLocale } from "../../i18n/useLocale";
import { AnalyticsTab } from "./AnalyticsTab";
import { CampaignsTab } from "./CampaignsTab";
import { CreativesTab } from "./CreativesTab";
import styles from "./TargetPage.module.css";
import { TargetTasksTab } from "./TargetTasksTab";

const TABS = ["tasks", "campaigns", "analytics", "creatives"] as const;
type TargetTab = (typeof TABS)[number];

/**
 * The Таргет section. One tab is mounted at a time, and each owns its page
 * header and its FAB, so switching tabs never leaves the previous tab's
 * subtitle or "new" button behind.
 */
export function TargetPage() {
  const { t } = useLocale();
  const [tab, setTab] = useState<TargetTab>("tasks");

  return (
    <div className={styles.shell}>
      <div className={styles.tabs} role="tablist" aria-label={t.targetTabs.label}>
        {TABS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            role="tab"
            aria-selected={candidate === tab}
            className={candidate === tab ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => setTab(candidate)}
          >
            {t.targetTabs[candidate]}
          </button>
        ))}
      </div>

      {tab === "tasks" && <TargetTasksTab />}
      {tab === "campaigns" && <CampaignsTab />}
      {tab === "analytics" && <AnalyticsTab />}
      {tab === "creatives" && <CreativesTab />}
    </div>
  );
}
