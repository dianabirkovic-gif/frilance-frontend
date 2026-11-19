import { useRef, useState, type ChangeEvent } from "react";
import { CLIENT_FILE_EXTENSIONS, MAX_CLIENT_FILE_BYTES, type ClientFile } from "../../api/clients";
import { useAuth } from "../../hooks/useAuth";
import { apiErrorMessage } from "../../i18n/apiErrorMessage";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { ConfirmationDialog } from "../../organisms/ConfirmationDialog/ConfirmationDialog";
import styles from "./ClientAttachmentsTab.module.css";
import { useClientFileMutations, useClientFiles } from "./useClientFiles";

const SIZE_FORMAT = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 });

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${SIZE_FORMAT.format(bytes / 1024)} KB`;
  return `${SIZE_FORMAT.format(bytes / (1024 * 1024))} MB`;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

/**
 * The client drawer's «Файли» tab: briefs, contracts and materials shared with
 * everyone who can see the client. The size and type checks here only spare the
 * user an upload that is bound to fail — the server enforces both itself.
 */
export function ClientFilesTab({ clientId }: { clientId: string }) {
  const { t, locale } = useLocale();
  const canUpload = useAuth().canEdit("CLIENTS");
  const { data: files, isLoading, isError, refetch } = useClientFiles(clientId);
  const { upload, remove, download } = useClientFileMutations(clientId);

  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ClientFile | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(apiErrorMessage(err, t));
    }
  }

  async function handleChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again after a failure still fires `change`.
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_CLIENT_FILE_BYTES) {
      setError(t.clientFilesTab.tooLarge);
      return;
    }
    if (!CLIENT_FILE_EXTENSIONS.includes(extensionOf(file.name))) {
      setError(t.clientFilesTab.unsupportedType);
      return;
    }
    await run(() => upload.mutateAsync(file));
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    const file = pendingDelete;
    setPendingDelete(null);
    await run(() => remove.mutateAsync(file.id));
  }

  return (
    <div className={styles.tab}>
      <p className={styles.info}>
        {interpolate(t.clientFilesTab.hintTemplate, { limit: MAX_CLIENT_FILE_BYTES / (1024 * 1024) })}
      </p>

      {canUpload ? (
        <div className={styles.actions}>
          <input
            ref={input}
            type="file"
            className={styles.hiddenInput}
            accept={CLIENT_FILE_EXTENSIONS.map((extension) => `.${extension}`).join(",")}
            aria-label={t.clientFilesTab.upload}
            onChange={handleChosen}
          />
          <button type="button" className={styles.primary} disabled={upload.isPending} onClick={() => input.current?.click()}>
            {upload.isPending ? t.clientFilesTab.uploading : t.clientFilesTab.upload}
          </button>
        </div>
      ) : (
        <p className={styles.info}>{t.clientFilesTab.readOnly}</p>
      )}

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {isLoading && <p className={styles.state}>…</p>}
      {isError && (
        <p className={styles.state} role="alert">
          {t.clientFilesTab.loadError}{" "}
          <button type="button" className={styles.retry} onClick={() => refetch()}>
            {t.clientFilesTab.retry}
          </button>
        </p>
      )}
      {files && files.length === 0 && <p className={styles.state}>{t.clientFilesTab.empty}</p>}

      {files && files.length > 0 && (
        <ul className={styles.list}>
          {files.map((file) => (
            <li key={file.id} className={styles.item}>
              <div className={styles.itemRow}>
                <span className={styles.fileName} title={file.name}>
                  {file.name}
                </span>
                <span className={styles.meta}>{formatSize(file.sizeBytes)}</span>
              </div>
              <div className={styles.itemRow}>
                <span className={styles.meta}>
                  {interpolate(t.clientFilesTab.uploadedByTemplate, {
                    name: file.uploadedByName,
                    date: new Date(file.createdAt).toLocaleDateString(locale),
                  })}
                </span>
                <span className={styles.itemActions}>
                  <button
                    type="button"
                    className={styles.link}
                    disabled={download.isPending}
                    onClick={() => run(() => download.mutateAsync(file))}
                  >
                    {t.clientFilesTab.download}
                  </button>
                  {file.canDelete && canUpload && (
                    <button type="button" className={`${styles.link} ${styles.danger}`} onClick={() => setPendingDelete(file)}>
                      {t.clientFilesTab.delete}
                    </button>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmationDialog
        open={pendingDelete !== null}
        title={t.clientFilesTab.deleteConfirmTitle}
        message={interpolate(t.clientFilesTab.deleteConfirmMessageTemplate, { name: pendingDelete?.name ?? "" })}
        confirmLabel={t.clientFilesTab.delete}
        isConfirming={remove.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
