import { useCallback, useMemo, useState } from "react";
import { getCreativeContent, type Creative } from "../../api/targetAds";
import { PlusIcon } from "../../atoms/icons/icons";
import { useAuth } from "../../hooks/useAuth";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { ConfirmationDialog } from "../../organisms/ConfirmationDialog/ConfirmationDialog";
import { CreativeUploadDrawer } from "../../organisms/CreativeUploadDrawer/CreativeUploadDrawer";
import { usePageFab } from "../../templates/AppShell/PageFabContext";
import { usePageHeader } from "../../templates/AppShell/PageHeaderContext";
import { formatBytes } from "../../utils/adMetrics";
import { ClientFilter } from "./ClientFilter";
import { CreativePreview } from "./CreativePreview";
import styles from "./TargetPage.module.css";
import { useCreatives, useDeleteCreative, useUploadCreative } from "./useTargetAds";

/**
 * The Креативи tab: the client's ad images and videos, optionally grouped by the
 * campaign they run in. Files go through the bearer token both ways, so previews
 * and downloads are fetched, not linked.
 */
export function CreativesTab() {
  const { t, locale } = useLocale();
  const canEdit = useAuth().canEdit("TARGET");

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  // "" = all campaigns, "none" = not tied to any, otherwise a campaign id.
  const [campaignFilter, setCampaignFilter] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<Creative | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useCreatives(selectedClientId);
  const upload = useUploadCreative();
  const remove = useDeleteCreative();

  const visible = useMemo(() => {
    const creatives = data?.creatives ?? [];
    if (campaignFilter === "") return creatives;
    if (campaignFilter === "none") return creatives.filter((creative) => creative.campaignId === null);
    return creatives.filter((creative) => creative.campaignId === campaignFilter);
  }, [data, campaignFilter]);

  const campaignName = (id: string | null) =>
    id === null ? t.creativesTab.noCampaign : (data?.campaigns.find((campaign) => campaign.id === id)?.name ?? "");
  const clientName = (id: string) => data?.clients.find((client) => client.id === id)?.name ?? "";

  usePageHeader({
    title: t.targetPage.title,
    subtitle: data ? interpolate(t.creativesTab.subtitleTemplate, { count: visible.length }) : "",
  });

  const openUpload = useCallback(() => setIsUploadOpen(true), []);
  usePageFab(canEdit ? { label: t.creativesTab.uploadButton, onClick: openUpload } : null);

  async function handleUpload(input: Parameters<typeof upload.mutateAsync>[0]) {
    await upload.mutateAsync(input);
    setIsUploadOpen(false);
  }

  async function handleDownload(creative: Creative) {
    const blob = await getCreativeContent(creative.id);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = creative.originalName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function handleConfirmDeletion() {
    if (!pendingDeletion) return;
    await remove.mutateAsync(pendingDeletion.id);
    setPendingDeletion(null);
  }

  if (isLoading) {
    return <div className={styles.state}>{t.creativesTab.loading}</div>;
  }

  if (isError || !data) {
    return (
      <div className={styles.state}>
        <p>
          {t.creativesTab.loadErrorPrefix}
          {error instanceof Error ? error.message : ""}
        </p>
        <button type="button" onClick={() => refetch()} className={styles.retry}>
          {t.creativesTab.retry}
        </button>
      </div>
    );
  }

  const shownCampaigns = data.campaigns.filter(
    (campaign) => selectedClientId === null || campaign.clientId === selectedClientId,
  );

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <ClientFilter
          clients={data.clients}
          selectedClientId={selectedClientId}
          onChange={(clientId) => {
            setSelectedClientId(clientId);
            setCampaignFilter("");
          }}
          allLabel={t.targetPage.allClients}
          labelTemplate={t.targetPage.clientFilterLabelTemplate}
        />
        <select
          className={styles.selectPill}
          value={campaignFilter}
          onChange={(event) => setCampaignFilter(event.target.value)}
          aria-label={t.creativesTab.campaignFilterAll}
        >
          <option value="">{t.creativesTab.campaignFilterAll}</option>
          <option value="none">{t.creativesTab.noCampaign}</option>
          {shownCampaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>
        <div className={styles.spacer} />
        {canEdit && (
          <button type="button" className={styles.newTaskBtn} onClick={openUpload}>
            <PlusIcon width={15} height={15} />
            {t.creativesTab.uploadButton}
          </button>
        )}
      </div>

      {visible.length === 0 && <p className={styles.emptyBoard}>{t.creativesTab.empty}</p>}

      <ul className={isFetching ? `${styles.creativeGrid} ${styles.busy}` : styles.creativeGrid} aria-busy={isFetching}>
        {visible.map((creative) => (
          <li key={creative.id} className={styles.creativeCard}>
            <CreativePreview creative={creative} />
            <div className={styles.creativeInfo}>
              <div className={styles.creativeName}>{creative.name}</div>
              <div className={styles.creativeMeta}>
                {t.creativesTab.kind[creative.kind]} · {formatBytes(creative.sizeBytes)}
              </div>
              <div className={styles.creativeMeta}>
                {selectedClientId === null && <span>{clientName(creative.clientId)} · </span>}
                {campaignName(creative.campaignId)}
              </div>
              <div className={styles.creativeMeta}>
                {creative.uploadedByName
                  ? `${interpolate(t.creativesTab.uploadedByTemplate, { name: creative.uploadedByName })} · `
                  : ""}
                {new Date(creative.createdAt).toLocaleDateString(locale)}
              </div>
              <div className={styles.cardActions}>
                <button type="button" className={styles.actionBtn} onClick={() => void handleDownload(creative)}>
                  {t.creativesTab.download}
                </button>
                {creative.canModify && canEdit && (
                  <button type="button" className={styles.actionBtn} onClick={() => setPendingDeletion(creative)}>
                    {t.creativesTab.delete}
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {canEdit && (
        <CreativeUploadDrawer
          open={isUploadOpen}
          clients={data.clients}
          campaigns={data.campaigns}
          defaultClientId={selectedClientId}
          isSubmitting={upload.isPending}
          onSubmit={handleUpload}
          onClose={() => setIsUploadOpen(false)}
        />
      )}

      <ConfirmationDialog
        open={pendingDeletion !== null}
        title={t.creativesTab.deleteConfirmTitle}
        message={interpolate(t.creativesTab.deleteConfirmMessageTemplate, { name: pendingDeletion?.name ?? "" })}
        isConfirming={remove.isPending}
        onConfirm={handleConfirmDeletion}
        onCancel={() => setPendingDeletion(null)}
      />
    </div>
  );
}
