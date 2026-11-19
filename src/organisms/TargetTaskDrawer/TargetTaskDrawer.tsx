import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  TARGET_KIND_ORDER,
  TARGET_STATUS_ORDER,
  type TargetClient,
  type TargetTask,
  type TargetTaskKind,
  type TargetTaskStatus,
  type UpdateTargetTaskPayload,
} from "../../api/target";
import { CloseIcon } from "../../atoms/icons/icons";
import { apiErrorMessage } from "../../i18n/apiErrorMessage";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
// Same drawer / bottom-sheet shell as the post form, so the two read as one system.
import styles from "../PostDrawer/PostDrawer.module.css";

/** The client a new task starts on: the filtered one unless completed, else the first open one. */
function firstOpenClientId(defaultClientId: string | null, clients: TargetClient[]): string {
  const preferred = clients.find((client) => client.id === defaultClientId);
  if (preferred && !preferred.archived) {
    return preferred.id;
  }
  return clients.find((client) => !client.archived)?.id ?? "";
}

interface TargetTaskDrawerProps {
  open: boolean;
  /** The task being edited, or null when creating. */
  task: TargetTask | null;
  clients: TargetClient[];
  defaultClientId: string | null;
  isSubmitting: boolean;
  onSubmit: (payload: UpdateTargetTaskPayload) => Promise<unknown>;
  onClose: () => void;
}

const EMPTY_FORM = {
  clientId: "",
  kind: "CREATIVE" as TargetTaskKind,
  title: "",
  description: "",
  dueDate: "",
  status: "TODO" as TargetTaskStatus,
};

/**
 * The targetologist's task form. Creating and editing are the same fields over
 * the same endpoint shape, so it is one component with a `task` prop.
 */
export function TargetTaskDrawer({
  open,
  task,
  clients,
  defaultClientId,
  isSubmitting,
  onSubmit,
  onClose,
}: TargetTaskDrawerProps) {
  const { t } = useLocale();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const isCreating = task === null;
  // A completed client takes no new task, so it is not offered while creating;
  // editing still lists it so an existing task can show whose it is.
  const selectableClients = useMemo(
    () => (isCreating ? clients.filter((client) => !client.archived) : clients),
    [clients, isCreating],
  );

  // Reset on every open. `clients` is deliberately not a dependency: it changes
  // whenever the team edits a client, and re-running the reset would wipe what
  // the member has typed. Choosing the default client is the next effect's job.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      task
        ? {
            clientId: task.clientId,
            kind: task.kind,
            title: task.title,
            description: task.description ?? "",
            dueDate: task.dueDate ?? "",
            status: task.status,
          }
        : EMPTY_FORM,
    );
  }, [open, task]);

  // Fills a blank client once the roster is there; never overrides a pick.
  useEffect(() => {
    if (!open || task) return;
    setForm((current) =>
      current.clientId ? current : { ...current, clientId: firstOpenClientId(defaultClientId, clients) },
    );
  }, [open, task, defaultClientId, clients]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({
        clientId: form.clientId,
        kind: form.kind,
        title: form.title.trim(),
        description: form.description.trim() === "" ? null : form.description.trim(),
        dueDate: form.dueDate === "" ? null : form.dueDate,
        status: form.status,
      });
    } catch (err) {
      // Never `err.message` — that is the backend's English.
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
            <div className={styles.title}>{task ? t.targetTaskDrawer.editTitle : t.targetTaskDrawer.createTitle}</div>
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t.targetTaskDrawer.close}>
              <CloseIcon width={14} height={14} />
            </button>
          </div>

          <div className={styles.body}>
            {task && (
              <div className={styles.authorRow}>
                <span>{t.targetTaskDrawer.authorLabel}</span>
                <strong>{task.authorName ?? t.targetTaskDrawer.unknownAuthor}</strong>
              </div>
            )}

            <label className={styles.field}>
              <span>{t.targetTaskDrawer.fields.client}</span>
              <select
                value={form.clientId}
                onChange={(event) => setForm({ ...form, clientId: event.target.value })}
                required
              >
                {selectableClients.length === 0 && <option value="">{t.targetTaskDrawer.noClients}</option>}
                {selectableClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.archived
                      ? interpolate(t.targetTaskDrawer.completedClientOptionTemplate, { name: client.name })
                      : client.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>{t.targetTaskDrawer.fields.title}</span>
              <input
                type="text"
                value={form.title}
                maxLength={255}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
                autoFocus
              />
            </label>

            <div className={styles.row}>
              <label className={styles.field}>
                <span>{t.targetTaskDrawer.fields.kind}</span>
                <select
                  value={form.kind}
                  onChange={(event) => setForm({ ...form, kind: event.target.value as TargetTaskKind })}
                >
                  {TARGET_KIND_ORDER.map((kind) => (
                    <option key={kind} value={kind}>
                      {t.targetKind[kind]}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>{t.targetTaskDrawer.fields.dueDate}</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                />
              </label>
            </div>

            <fieldset className={styles.field}>
              <legend>{t.targetTaskDrawer.fields.status}</legend>
              <div className={styles.stepper}>
                {TARGET_STATUS_ORDER.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={status === form.status ? `${styles.step} ${styles.stepActive}` : styles.step}
                    aria-pressed={status === form.status}
                    onClick={() => setForm({ ...form, status })}
                  >
                    {t.targetStatus[status]}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className={styles.field}>
              <span>{t.targetTaskDrawer.fields.description}</span>
              <textarea
                value={form.description}
                maxLength={2000}
                rows={5}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
              <span className={styles.hint}>{t.targetTaskDrawer.descriptionHint}</span>
            </label>

            {error && <div className={styles.error}>{error}</div>}
          </div>

          <div className={styles.footer}>
            <button
              type="submit"
              className={styles.submit}
              disabled={isSubmitting || selectableClients.length === 0}
            >
              {isSubmitting ? t.targetTaskDrawer.submitLoading : t.targetTaskDrawer.submitIdle}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
