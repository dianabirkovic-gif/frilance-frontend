import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { TargetClient } from "../../api/target";
import {
  CREATIVE_ACCEPT,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  creativeKindOf,
} from "../../api/targetAds";
import { CloseIcon } from "../../atoms/icons/icons";
import { apiErrorMessage } from "../../i18n/apiErrorMessage";
import { useLocale } from "../../i18n/useLocale";
import { formatBytes } from "../../utils/adMetrics";
import styles from "../PostDrawer/PostDrawer.module.css";

interface CreativeUploadDrawerProps {
  open: boolean;
  clients: TargetClient[];
  campaigns: { id: string; clientId: string; name: string }[];
  defaultClientId: string | null;
  isSubmitting: boolean;
  onSubmit: (input: { clientId: string; campaignId: string | null; name: string; file: File }) => Promise<unknown>;
  onClose: () => void;
}

function firstOpenClientId(defaultClientId: string | null, clients: TargetClient[]): string {
  const preferred = clients.find((client) => client.id === defaultClientId);
  if (preferred && !preferred.archived) return preferred.id;
  return clients.find((client) => !client.archived)?.id ?? "";
}

/**
 * Uploads one image or video, optionally tied to a campaign of the chosen client.
 * The type and size are checked here so the member hears about a wrong file
 * before a 100 MB upload, but the server re-checks both — and the bytes — so
 * this is only a courtesy, never the guard.
 */
export function CreativeUploadDrawer({
  open,
  clients,
  campaigns,
  defaultClientId,
  isSubmitting,
  onSubmit,
  onClose,
}: CreativeUploadDrawerProps) {
  const { t } = useLocale();
  const [form, setForm] = useState({ clientId: "", campaignId: "", name: "" });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectableClients = useMemo(() => clients.filter((client) => !client.archived), [clients]);
  const clientCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.clientId === form.clientId),
    [campaigns, form.clientId],
  );

  useEffect(() => {
    if (!open) return;
    setForm({ clientId: "", campaignId: "", name: "" });
    setFile(null);
    setFileError(null);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setForm((current) =>
      current.clientId ? current : { ...current, clientId: firstOpenClientId(defaultClientId, clients) },
    );
  }, [open, defaultClientId, clients]);

  function handleFile(next: File | null) {
    setError(null);
    setFile(next);
    if (!next) {
      setFileError(null);
      return;
    }
    const kind = creativeKindOf(next.name);
    if (kind === null) {
      setFileError(t.creativeDrawer.unsupported);
    } else if (kind === "IMAGE" && next.size > MAX_IMAGE_BYTES) {
      setFileError(t.creativeDrawer.tooLargeImage);
    } else if (kind === "VIDEO" && next.size > MAX_VIDEO_BYTES) {
      setFileError(t.creativeDrawer.tooLargeVideo);
    } else {
      setFileError(null);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file || fileError) return;
    setError(null);
    try {
      await onSubmit({
        clientId: form.clientId,
        campaignId: form.campaignId === "" ? null : form.campaignId,
        name: form.name,
        file,
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
            <div className={styles.title}>{t.creativeDrawer.title}</div>
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t.creativeDrawer.close}>
              <CloseIcon width={14} height={14} />
            </button>
          </div>

          <div className={styles.body}>
            <label className={styles.field}>
              <span>{t.creativeDrawer.fields.client}</span>
              <select
                value={form.clientId}
                onChange={(event) => setForm({ ...form, clientId: event.target.value, campaignId: "" })}
                required
              >
                {selectableClients.length === 0 && <option value="">{t.creativeDrawer.noClients}</option>}
                {selectableClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>{t.creativeDrawer.fields.campaign}</span>
              <select
                value={form.campaignId}
                onChange={(event) => setForm({ ...form, campaignId: event.target.value })}
              >
                <option value="">{t.creativeDrawer.noCampaign}</option>
                {clientCampaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>{t.creativeDrawer.fields.file}</span>
              <input
                type="file"
                accept={CREATIVE_ACCEPT}
                onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
                required
              />
              <span className={styles.hint}>
                {file ? `${file.name} · ${formatBytes(file.size)}` : t.creativeDrawer.formatsHint}
              </span>
            </label>
            {fileError && (
              <div className={styles.error} role="alert">
                {fileError}
              </div>
            )}

            <label className={styles.field}>
              <span>{t.creativeDrawer.fields.name}</span>
              <input
                type="text"
                value={form.name}
                maxLength={255}
                placeholder={file ? file.name : undefined}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
              <span className={styles.hint}>{t.creativeDrawer.nameHint}</span>
            </label>

            {error && <div className={styles.error}>{error}</div>}
          </div>

          <div className={styles.footer}>
            <button
              type="submit"
              className={styles.submit}
              disabled={isSubmitting || !file || fileError !== null || selectableClients.length === 0}
            >
              {isSubmitting ? t.creativeDrawer.submitLoading : t.creativeDrawer.submitIdle}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

