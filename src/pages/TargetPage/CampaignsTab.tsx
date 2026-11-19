import { useCallback, useState } from "react";
import type { Campaign, CampaignPayload } from "../../api/targetAds";
import { PlusIcon } from "../../atoms/icons/icons";
import { useAuth } from "../../hooks/useAuth";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { CampaignDrawer } from "../../organisms/CampaignDrawer/CampaignDrawer";
import { CampaignStatsDrawer } from "../../organisms/CampaignStatsDrawer/CampaignStatsDrawer";
import { ConfirmationDialog } from "../../organisms/ConfirmationDialog/ConfirmationDialog";
import { usePageFab } from "../../templates/AppShell/PageFabContext";
import { usePageHeader } from "../../templates/AppShell/PageHeaderContext";
import { formatCount, formatPercent, formatUnitMoney } from "../../utils/adMetrics";
import { formatMoney } from "../../utils/money";
import { ClientFilter } from "./ClientFilter";
import styles from "./TargetPage.module.css";
import { useCampaigns, useCreateCampaign, useDeleteCampaign, useUpdateCampaign } from "./useTargetAds";

/**
 * The Кампанії tab: the client's ad campaigns with their all-time figures, and
 * the door to entering a campaign's statistics day by day. READ opens the list
 * and the stats; the writes are only offered with edit access (the backend
 * rejects them either way).
 */
export function CampaignsTab() {
  const { t, locale } = useLocale();
  const canEdit = useAuth().canEdit("TARGET");

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [statsCampaignId, setStatsCampaignId] = useState<string | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<Campaign | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useCampaigns(selectedClientId);
  const create = useCreateCampaign();
  const update = useUpdateCampaign();
  const remove = useDeleteCampaign();

  const totalSpend = data?.campaigns.reduce((sum, campaign) => sum + campaign.totals.spend, 0) ?? 0;
  usePageHeader({
    title: t.targetPage.title,
    subtitle: data
      ? interpolate(t.campaignsTab.subtitleTemplate, { count: data.campaigns.length, spend: formatMoney(totalSpend) })
      : "",
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    setIsDrawerOpen(true);
  }, []);

  usePageFab(canEdit ? { label: t.campaignsTab.newButton, onClick: openCreate } : null);

  async function handleSubmit(payload: CampaignPayload) {
    if (editing) {
      await update.mutateAsync({ id: editing.id, payload });
    } else {
      await create.mutateAsync(payload);
    }
    setIsDrawerOpen(false);
  }

  async function handleConfirmDeletion() {
    if (!pendingDeletion) return;
    await remove.mutateAsync(pendingDeletion.id);
    setPendingDeletion(null);
  }

  if (isLoading) {
    return <div className={styles.state}>{t.campaignsTab.loading}</div>;
  }

  if (isError || !data) {
    return (
      <div className={styles.state}>
        <p>
          {t.campaignsTab.loadErrorPrefix}
          {error instanceof Error ? error.message : ""}
        </p>
        <button type="button" onClick={() => refetch()} className={styles.retry}>
          {t.campaignsTab.retry}
        </button>
      </div>
    );
  }

  const date = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale);

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <ClientFilter
          clients={data.clients}
          selectedClientId={selectedClientId}
          onChange={setSelectedClientId}
          allLabel={t.targetPage.allClients}
          labelTemplate={t.targetPage.clientFilterLabelTemplate}
        />
        <div className={styles.spacer} />
        {canEdit && (
          <button type="button" className={styles.newTaskBtn} onClick={openCreate}>
            <PlusIcon width={15} height={15} />
            {t.campaignsTab.newButton}
          </button>
        )}
      </div>

      {data.campaigns.length === 0 && <p className={styles.emptyBoard}>{t.campaignsTab.empty}</p>}

      <ul className={isFetching ? `${styles.campaignGrid} ${styles.busy}` : styles.campaignGrid} aria-busy={isFetching}>
        {data.campaigns.map((campaign) => (
          <li key={campaign.id} className={styles.campaignCard}>
            <div className={styles.chips}>
              <span className={styles.chip}>{t.campaignPlatform[campaign.platform]}</span>
              <span
                className={
                  campaign.status === "ACTIVE" ? `${styles.chip} ${styles.chipActive}` : styles.chip
                }
              >
                {t.campaignStatus[campaign.status]}
              </span>
            </div>
            <div className={styles.campaignName}>{campaign.name}</div>
            <div className={styles.creativeMeta}>
              {selectedClientId === null && <span>{campaign.clientName} · </span>}
              {campaign.endDate
                ? interpolate(t.campaignsTab.periodTemplate, {
                    from: date(campaign.startDate),
                    to: date(campaign.endDate),
                  })
                : interpolate(t.campaignsTab.periodOpenTemplate, { from: date(campaign.startDate) })}
              {campaign.budget !== null && (
                <span> · {interpolate(t.campaignsTab.budgetTemplate, { budget: formatMoney(campaign.budget) })}</span>
              )}
            </div>

            {campaign.statDays === 0 ? (
              <p className={styles.note}>{t.campaignsTab.noStats}</p>
            ) : (
              <>
                <div className={styles.metricRow}>
                  <Metric label={t.metrics.spend} value={formatMoney(campaign.totals.spend)} />
                  <Metric label={t.metrics.leads} value={formatCount(campaign.totals.leads)} />
                  <Metric label={t.metrics.cpl} value={formatUnitMoney(campaign.totals.cpl)} />
                  <Metric label={t.metrics.ctr} value={formatPercent(campaign.totals.ctr)} />
                </div>
                <p className={styles.note}>
                  {interpolate(t.campaignsTab.statDaysTemplate, { count: campaign.statDays })}
                </p>
              </>
            )}

            <div className={styles.cardActions}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.advanceBtn}`}
                onClick={() => setStatsCampaignId(campaign.id)}
              >
                {t.campaignsTab.enterStats}
              </button>
              {canEdit && (
                <>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => {
                      setEditing(campaign);
                      setIsDrawerOpen(true);
                    }}
                  >
                    {t.campaignsTab.edit}
                  </button>
                  <button type="button" className={styles.actionBtn} onClick={() => setPendingDeletion(campaign)}>
                    {t.campaignsTab.delete}
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canEdit && (
        <CampaignDrawer
          open={isDrawerOpen}
          campaign={editing}
          clients={data.clients}
          defaultClientId={selectedClientId}
          isSubmitting={create.isPending || update.isPending}
          onSubmit={handleSubmit}
          onClose={() => setIsDrawerOpen(false)}
        />
      )}

      <CampaignStatsDrawer campaignId={statsCampaignId} canEdit={canEdit} onClose={() => setStatsCampaignId(null)} />

      <ConfirmationDialog
        open={pendingDeletion !== null}
        title={t.campaignsTab.deleteConfirmTitle}
        message={interpolate(t.campaignsTab.deleteConfirmMessageTemplate, { name: pendingDeletion?.name ?? "" })}
        isConfirming={remove.isPending}
        onConfirm={handleConfirmDeletion}
        onCancel={() => setPendingDeletion(null)}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value}</span>
    </div>
  );
}
