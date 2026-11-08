import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  POST_STATUS_ORDER,
  POST_TYPE_ORDER,
  type ContentPlanClient,
  type Post,
  type PostStatus,
  type PostType,
  type UpdatePostPayload,
} from "../../api/contentPlan";
import { CloseIcon } from "../../atoms/icons/icons";
import { RichTextEditor } from "../../molecules/RichTextEditor/RichTextEditor";
import { interpolate } from "../../i18n/interpolate";
import { apiErrorMessage } from "../../i18n/apiErrorMessage";
import { useLocale } from "../../i18n/useLocale";
import styles from "./PostDrawer.module.css";

/**
 * What a new post starts on: the client the page is filtered to, unless that
 * client is completed — one that takes no new posts (#23) is not in the picker
 * to start on, so the form falls to the first that is. The notice above the
 * picker is what keeps that substitution from being silent.
 */
function firstPlannableClientId(defaultClientId: string | null, clients: ContentPlanClient[]): string {
  const preferred = clients.find((client) => client.id === defaultClientId);
  if (preferred && !preferred.archived) {
    return preferred.id;
  }
  return clients.find((client) => !client.archived)?.id ?? "";
}

interface PostDrawerProps {
  open: boolean;
  /** The post being edited, or null when creating a new one. */
  post: Post | null;
  clients: ContentPlanClient[];
  /** Pre-selected when the page has a client filter on, or the day the user clicked. */
  defaultClientId: string | null;
  defaultDate: string;
  isSubmitting: boolean;
  onSubmit: (payload: UpdatePostPayload) => Promise<unknown>;
  onClose: () => void;
}

/**
 * FR-08's post form — the mockup's "+ Пост" modal (client, type, тема, date)
 * plus the status, which the mockup only exposes after the fact through the
 * calendar's chip. Same drawer/bottom-sheet shape as AddClientDrawer so the
 * two feel like one system.
 *
 * Creating and editing are the same fields over the same endpoint shape, so
 * this is one component with a `post` prop rather than two that would drift.
 */
export function PostDrawer({
  open,
  post,
  clients,
  defaultClientId,
  defaultDate,
  isSubmitting,
  onSubmit,
  onClose,
}: PostDrawerProps) {
  const { t } = useLocale();
  const [form, setForm] = useState({
    clientId: "",
    type: "REELS" as PostType,
    title: "",
    scheduledDate: defaultDate,
    status: "DRAFT" as PostStatus,
    note: null as string | null,
  });
  const [error, setError] = useState<string | null>(null);

  const typeOptions = useMemo(() => POST_TYPE_ORDER.map((value) => ({ value, label: t.postType[value] })), [t]);

  // Requirement #23: a completed client takes no new posts, so it is not in
  // the picker at all while creating. Editing still lists it — a post already
  // on one has to be able to show whose it is, and stays editable.
  const isCreating = post === null;
  const selectableClients = useMemo(
    () => (isCreating ? clients.filter((client) => !client.archived) : clients),
    [clients, isCreating],
  );

  // The one case worth a word: the page is filtered to a completed client and
  // the user asked to plan on it. The picker cannot offer it, so the drawer
  // names it rather than quietly starting on somebody else's plan.
  const completedDefaultClient = isCreating
    ? (clients.find((client) => client.id === defaultClientId && client.archived) ?? null)
    : null;

  // Reset on every open so a drawer reopened for a different post (or for a
  // new one right after an edit) never shows the previous post's values.
  //
  // `clients` is deliberately NOT a dependency here, and neither is
  // `defaultClientId`. The picker's rows arrive with the plan and change
  // whenever anyone on the team adds, renames or archives a client; with them
  // in this list, that refetch re-ran this reset and wiped whatever the member
  // had typed — a half-written note included. Choosing the default client is a
  // separate concern, handled by the effect below, which only ever fills a
  // blank.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      post
        ? {
            clientId: post.clientId,
            type: post.type,
            title: post.title,
            scheduledDate: post.scheduledDate,
            status: post.status,
            note: post.note,
          }
        : {
            clientId: "",
            type: "REELS",
            title: "",
            scheduledDate: defaultDate,
            status: "DRAFT",
            note: null,
          },
    );
  }, [open, post, defaultDate]);

  // The client a new post starts on, filled in once there is something to fill
  // it with — the plan's rows may still be loading when the drawer mounts.
  // It only ever replaces a blank, so a member who has already picked somebody
  // keeps their choice when the roster changes underneath them.
  useEffect(() => {
    if (!open || post) return;
    setForm((current) =>
      current.clientId ? current : { ...current, clientId: firstPlannableClientId(defaultClientId, clients) },
    );
  }, [open, post, defaultClientId, clients]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({
        clientId: form.clientId,
        type: form.type,
        title: form.title.trim(),
        scheduledDate: form.scheduledDate,
        status: form.status,
        note: form.note,
      });
    } catch (err) {
      // Never `err.message` — that is the backend's English, and a validation
      // failure's message is the bare literal "Validation failed".
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
            <div className={styles.title}>{post ? t.postDrawer.editTitle : t.postDrawer.createTitle}</div>
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t.postDrawer.close}>
              <CloseIcon width={14} height={14} />
            </button>
          </div>

          <div className={styles.body}>
            {/* Read-only: authorship is stamped server-side at creation and
                never transfers to whoever edits next. A new post has no
                author yet, so the row only appears when editing. */}
            {post && (
              <div className={styles.authorRow}>
                <span>{t.postDrawer.authorLabel}</span>
                <strong>{post.authorName ?? t.postDrawer.unknownAuthor}</strong>
              </div>
            )}
            <label className={styles.field}>
              <span>{t.postDrawer.fields.client}</span>
              <select
                value={form.clientId}
                onChange={(event) => setForm({ ...form, clientId: event.target.value })}
                required
              >
                {selectableClients.length === 0 && <option value="">{t.postDrawer.noClients}</option>}
                {selectableClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {/* Only reachable while editing, where naming the state
                        explains why this client is in a list it is otherwise
                        absent from. */}
                    {client.archived
                      ? interpolate(t.postDrawer.completedClientOptionTemplate, { name: client.name })
                      : client.name}
                  </option>
                ))}
              </select>
            </label>
            {/* Outside the <label>: text inside it joins the select's
                accessible name, and the notice is about the form's state, not
                what the field is called. */}
            {completedDefaultClient && (
              <p className={styles.notice} role="status">
                {interpolate(t.postDrawer.completedClientNoticeTemplate, { name: completedDefaultClient.name })}
              </p>
            )}

            <label className={styles.field}>
              <span>{t.postDrawer.fields.title}</span>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
                autoFocus
              />
            </label>

            <div className={styles.row}>
              <label className={styles.field}>
                <span>{t.postDrawer.fields.type}</span>
                <select
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value as PostType })}
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>{t.postDrawer.fields.date}</span>
                <input
                  type="date"
                  value={form.scheduledDate}
                  onChange={(event) => setForm({ ...form, scheduledDate: event.target.value })}
                  required
                />
              </label>
            </div>

            {/* The mockup's stepper: the lifecycle laid out in order, so the
                next state is a click away rather than a dropdown away. */}
            <fieldset className={styles.field}>
              <legend>{t.postDrawer.fields.status}</legend>
              <div className={styles.stepper}>
                {POST_STATUS_ORDER.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={
                      status === form.status
                        ? `${styles.step} ${styles.stepActive} ${styles[status.toLowerCase()]}`
                        : styles.step
                    }
                    aria-pressed={status === form.status}
                    onClick={() => setForm({ ...form, status })}
                  >
                    {t.postStatusShort[status]}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* The note is last and largest: it is the one field somebody
                writes paragraphs into, and putting it above the date would
                push the short answers off screen. */}
            <div className={styles.field}>
              <span>{t.postDrawer.fields.note}</span>
              <RichTextEditor
                value={form.note}
                onChange={(note) => setForm({ ...form, note })}
                ariaLabel={t.postDrawer.fields.note}
              />
              <span className={styles.hint}>{t.postDrawer.noteHint}</span>
            </div>

            {error && <div className={styles.error}>{error}</div>}
          </div>

          <div className={styles.footer}>
            <button
              type="submit"
              className={styles.submit}
              disabled={isSubmitting || selectableClients.length === 0}
            >
              {isSubmitting ? t.postDrawer.submitLoading : t.postDrawer.submitIdle}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
