import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { TargetClient } from "../../api/target";
import {
  CAMPAIGN_PLATFORM_ORDER,
  CAMPAIGN_STATUS_ORDER,
  type Campaign,
  type CampaignPayload,
  type CampaignPlatform,
  type CampaignStatus,
} from "../../api/targetAds";
import { CloseIcon } from "../../atoms/icons/icons";
import { apiErrorMessage } from "../../i18n/apiErrorMessage";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { toIsoDate } from "../../utils/calendarDays";
// Same drawer / bottom-sheet shell as the post and task forms.
import styles from "../PostDrawer/PostDrawer.module.css";

interface CampaignDrawerProps {
  open: boolean;
  /** The campaign being edited, or null when creating. */
  campaign: Campaign | null;
  clients: TargetClient[];
  defaultClientId: string | null;
  isSubmitting: boolean;
  onSubmit: (payload: CampaignPayload) => Promise<unknown>;
  onClose: () => void;
}

function emptyForm() {
  return {
    clientId: "",
    name: "",
    platform: "META" as CampaignPlatform,
    status: "ACTIVE" as CampaignStatus,
    startDate: toIsoDate(new Date()),
    endDate: "",
    budget: "",
  };
}

/** The client a new campaign starts on: the filtered one unless completed, else the first open one. */
function firstOpenClientId(defaultClientId: string | null, clients: TargetClient[]): string {
  const preferred = clients.find((client) => client.id === defaultClientId);
  if (preferred && !preferred.archived) return preferred.id;
  return clients.find((client) => !client.archived)?.id ?? "";
}

/** Create and edit are the same fields over the same endpoint shape: one component with a `campaign` prop. */
export function CampaignDrawer({
  open,
  campaign,
  clients,
  defaultClientId,
  isSubmitting,
  onSubmit,
  onClose,
}: CampaignDrawerProps) {
  const { t } = useLocale();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const isCreating = campaign === null;
  // A completed client takes no new campaign; editing still lists it so an existing one can show whose it is.
  const selectableClients = useMemo(
    () => (isCreating ? clients.filter((client) => !client.archived) : clients),
    [clients, isCreating],
  );

  // Reset on every open. `clients` is not a dependency: it changes whenever the team edits a
  // client, and re-running the reset would wipe what the member has typed.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      campaign
        ? {
            clientId: campaign.clientId,
            name: campaign.name,
            platform: campaign.platform,
            status: campaign.status,
            startDate: campaign.startDate,
            endDate: campaign.endDate ?? "",
            budget: campaign.budget === null ? "" : String(campaign.budget),
          }
        : emptyForm(),
    );
  }, [open, campaign]);

  // Fills a blank client once the roster is there; never overrides a pick.
  useEffect(() => {
    if (!open || campaign) return;
    setForm((current) =>
      current.clientId ? current : { ...current, clientId: firstOpenClientId(defaultClientId, clients) },
    );
  }, [open, campaign, defaultClientId, clients]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({
        clientId: form.clientId,
        name: form.name.trim(),
        platform: form.platform,
        status: form.status,
        startDate: form.startDate,
        endDate: form.endDate === "" ? null : form.endDate,
        budget: form.budget.trim() === "" ? null : Number(form.budget),
      });
    } catch (err) {
      setError(apiErrorMessage(err, t));
    }
  }

  return (
    <>
      <div className={open ? `${styles.backdrop} ${styles.open}` : styles.backdrop} onClick={onClose} />
      <div className={open ? `${styles.panel} ${styles.open}` : styles.panel}>
        <div className={styles.handle} />
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.header}>
            <div className={styles.title}>{campaign ? t.campaignDrawer.editTitle : t.campaignDrawer.createTitle}</div>
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t.campaignDrawer.close}>
              <CloseIcon width={14} height={14} />
            </button>
          </div>

          <div className={styles.body}>
            <label className={styles.field}>
              <span>{t.campaignDrawer.fields.client}</span>
              <select
                value={form.clientId}
                onChange={(event) => setForm({ ...form, clientId: event.target.value })}
                required
              >
                {selectableClients.length === 0 && <option value="">{t.campaignDrawer.noClients}</option>}
                {selectableClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.archived
                      ? interpolate(t.campaignDrawer.completedClientOptionTemplate, { name: client.name })
                      : client.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>{t.campaignDrawer.fields.name}</span>
              <input
                type="text"
                value={form.name}
                maxLength={255}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                autoFocus
              />
            </label>

            <div className={styles.row}>
              <label className={styles.field}>
                <span>{t.campaignDrawer.fields.platform}</span>
                <select
                  value={form.platform}
                  onChange={(event) => setForm({ ...form, platform: event.target.value as CampaignPlatform })}
                >
                  {CAMPAIGN_PLATFORM_ORDER.map((platform) => (
                    <option key={platform} value={platform}>
                      {t.campaignPlatform[platform]}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>{t.campaignDrawer.fields.status}</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value as CampaignStatus })}
                >
                  {CAMPAIGN_STATUS_ORDER.map((status) => (
                    <option key={status} value={status}>
                      {t.campaignStatus[status]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.row}>
              <label className={styles.field}>
                <span>{t.campaignDrawer.fields.startDate}</span>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                  required
                />
              </label>

              <label className={styles.field}>
                <span>{t.campaignDrawer.fields.endDate}</span>
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>{t.campaignDrawer.fields.budget}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.budget}
                onChange={(event) => setForm({ ...form, budget: event.target.value })}
              />
            </label>

            {error && <div className={styles.error}>{error}</div>}
          </div>

          <div className={styles.footer}>
            <button
              type="submit"
              className={styles.submit}
              disabled={isSubmitting || selectableClients.length === 0}
            >
              {isSubmitting ? t.campaignDrawer.submitLoading : t.campaignDrawer.submitIdle}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
