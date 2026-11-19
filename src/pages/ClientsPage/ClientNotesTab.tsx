import { useState } from "react";
import type { ClientNote } from "../../api/clients";
import { useAuth } from "../../hooks/useAuth";
import { apiErrorMessage } from "../../i18n/apiErrorMessage";
import { useLocale } from "../../i18n/useLocale";
import { ConfirmationDialog } from "../../organisms/ConfirmationDialog/ConfirmationDialog";
import styles from "./ClientAttachmentsTab.module.css";
import { useClientNoteMutations, useClientNotes } from "./useClientNotes";

/**
 * The client drawer's «Нотатки» tab: notes shared by everyone who can see the
 * client. Whether a given note may be edited or deleted is the server's call
 * (`canModify` — its author, or the agency owner), so this never works it out
 * from a name or a role.
 */
export function ClientNotesTab({ clientId }: { clientId: string }) {
  const { t, locale } = useLocale();
  const canAdd = useAuth().canEdit("CLIENTS");
  const { data: notes, isLoading, isError, refetch } = useClientNotes(clientId);
  const { add, edit, remove } = useClientNoteMutations(clientId);

  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ClientNote | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(apiErrorMessage(err, t));
    }
  }

  async function handleAdd() {
    const body = draft.trim();
    if (!body) return;
    await run(async () => {
      await add.mutateAsync(body);
      setDraft("");
    });
  }

  async function handleSaveEdit(note: ClientNote) {
    const body = editDraft.trim();
    if (!body) return;
    await run(async () => {
      await edit.mutateAsync({ id: note.id, body });
      setEditingId(null);
    });
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    const note = pendingDelete;
    setPendingDelete(null);
    await run(() => remove.mutateAsync(note.id));
  }

  return (
    <div className={styles.tab}>
      <p className={styles.info}>{t.clientNotesTab.sharedNote}</p>

      {canAdd ? (
        <div className={styles.composer}>
          <textarea
            value={draft}
            maxLength={5000}
            placeholder={t.clientNotesTab.placeholder}
            aria-label={t.clientNotesTab.placeholder}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className={styles.actions}>
            <button type="button" className={styles.primary} disabled={add.isPending || !draft.trim()} onClick={handleAdd}>
              {add.isPending ? t.clientNotesTab.adding : t.clientNotesTab.add}
            </button>
          </div>
        </div>
      ) : (
        <p className={styles.info}>{t.clientNotesTab.readOnly}</p>
      )}

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {isLoading && <p className={styles.state}>…</p>}
      {isError && (
        <p className={styles.state} role="alert">
          {t.clientNotesTab.loadError}{" "}
          <button type="button" className={styles.retry} onClick={() => refetch()}>
            {t.clientNotesTab.retry}
          </button>
        </p>
      )}
      {notes && notes.length === 0 && <p className={styles.state}>{t.clientNotesTab.empty}</p>}

      {notes && notes.length > 0 && (
        <ul className={styles.list}>
          {notes.map((note) => (
            <li key={note.id} className={styles.item}>
              {editingId === note.id ? (
                <div className={styles.editor}>
                  <textarea
                    value={editDraft}
                    maxLength={5000}
                    aria-label={t.clientNotesTab.edit}
                    onChange={(event) => setEditDraft(event.target.value)}
                  />
                  <div className={styles.actions}>
                    <button type="button" className={styles.secondary} onClick={() => setEditingId(null)}>
                      {t.clientNotesTab.cancel}
                    </button>
                    <button
                      type="button"
                      className={styles.primary}
                      disabled={edit.isPending || !editDraft.trim()}
                      onClick={() => handleSaveEdit(note)}
                    >
                      {t.clientNotesTab.save}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Rendered as text — a note is plain text, never markup. */}
                  <p className={styles.noteBody}>{note.body}</p>
                  <div className={styles.itemRow}>
                    <span className={styles.meta}>
                      {note.authorName} · {new Date(note.createdAt).toLocaleDateString(locale)}
                      {note.updatedAt !== note.createdAt && ` · ${t.clientNotesTab.editedSuffix}`}
                    </span>
                    {note.canModify && canAdd && (
                      <span className={styles.itemActions}>
                        <button
                          type="button"
                          className={styles.link}
                          onClick={() => {
                            setEditingId(note.id);
                            setEditDraft(note.body);
                          }}
                        >
                          {t.clientNotesTab.edit}
                        </button>
                        <button type="button" className={`${styles.link} ${styles.danger}`} onClick={() => setPendingDelete(note)}>
                          {t.clientNotesTab.delete}
                        </button>
                      </span>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmationDialog
        open={pendingDelete !== null}
        title={t.clientNotesTab.deleteConfirmTitle}
        message={t.clientNotesTab.deleteConfirmMessage}
        confirmLabel={t.clientNotesTab.delete}
        isConfirming={remove.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
