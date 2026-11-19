import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  FINANCE_ENTRY_TYPE_ORDER,
  PAYMENT_METHOD_ORDER,
  PAYMENT_STATUS_ORDER,
  type FinanceClient,
  type FinanceEntry,
  type FinanceEntryType,
  type FinanceMember,
  type PaymentMethod,
  type PaymentStatus,
  type UpdateFinanceEntryPayload,
} from "../../api/finance";
import { CloseIcon, TrashIcon } from "../../atoms/icons/icons";
import { apiErrorMessage } from "../../i18n/apiErrorMessage";
import { useLocale } from "../../i18n/useLocale";
import { formatSignedMoney } from "../../utils/money";
import styles from "./FinanceEntryDrawer.module.css";

interface FinanceEntryDrawerProps {
  open: boolean;
  /** The operation being edited, or null when creating a new one. */
  entry: FinanceEntry | null;
  clients: FinanceClient[];
  /** Active team members a payout can be addressed to. */
  members: FinanceMember[];
  /** Pre-selected when the page has a client filter on. */
  defaultClientId: string | null;
  /** The month on screen — a new operation lands in it rather than in today's, if they differ. */
  defaultDate: string;
  isSubmitting: boolean;
  isMarkingPaid: boolean;
  onSubmit: (payload: UpdateFinanceEntryPayload) => Promise<unknown>;
  onMarkPaid: (entry: FinanceEntry) => Promise<unknown>;
  onDelete: (entry: FinanceEntry) => void;
  onClose: () => void;
}

/**
 * FR-09's operation form, and the mockup's detail panel in one component —
 * they are the same fields over the same endpoint shape, so splitting them
 * would be two things to keep in step.
 *
 * The header follows DESIGN_SYSTEM.md 12.7: where the client drawer puts an
 * avatar, this puts the amount at display size, because in a financial context
 * the sum matters more than the name attached to it. Creating has no amount
 * yet, so it gets a plain title instead.
 *
 * Two of the mockup's actions are deliberately absent. «Завантажити PDF» is
 * FR-17 (invoice generation, the unbuilt `reports` module) and «Надіслати
 * нагадування» needs outbound notifications, which nothing in this product has
 * yet. A button that silently does nothing is worse than one that isn't there.
 */
export function FinanceEntryDrawer({
  open,
  entry,
  clients,
  members,
  defaultClientId,
  defaultDate,
  isSubmitting,
  isMarkingPaid,
  onSubmit,
  onMarkPaid,
  onDelete,
  onClose,
}: FinanceEntryDrawerProps) {
  const { t } = useLocale();
  const [form, setForm] = useState({
    type: "INCOME" as FinanceEntryType,
    title: "",
    description: "",
    amount: "",
    clientId: "",
    counterparty: "",
    recipientUserId: "",
    entryDate: defaultDate,
    dueDate: "",
    paymentStatus: "PAID" as PaymentStatus,
    paymentMethod: "INVOICE" as PaymentMethod,
    invoiceNumber: "",
  });
  const [error, setError] = useState<string | null>(null);

  const typeOptions = useMemo(
    () => FINANCE_ENTRY_TYPE_ORDER.map((value) => ({ value, label: t.financeEntryType[value] })),
    [t],
  );
  const methodOptions = useMemo(
    () => PAYMENT_METHOD_ORDER.map((value) => ({ value, label: t.paymentMethod[value] })),
    [t],
  );

  // Reset on every open, so a drawer reopened for a different operation never
  // shows the previous one's values.
  //
  // `clients` is deliberately not a dependency — the same trap PostDrawer
  // documents: the picker's rows arrive with the register and change whenever
  // anybody adds or renames a client, and a refetch re-running this reset
  // would throw away whatever the member had typed. `defaultClientId` is left
  // out for the same reason; the effect below fills it, and only into a blank.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      entry
        ? {
            type: entry.type,
            title: entry.title,
            description: entry.description ?? "",
            amount: String(entry.amount),
            clientId: entry.clientId ?? "",
            counterparty: entry.counterparty ?? "",
            recipientUserId: entry.recipientUserId ?? "",
            entryDate: entry.entryDate,
            dueDate: entry.dueDate ?? "",
            paymentStatus: entry.paymentStatus,
            paymentMethod: entry.paymentMethod,
            invoiceNumber: entry.invoiceNumber ?? "",
          }
        : {
            type: "INCOME",
            title: "",
            description: "",
            amount: "",
            clientId: "",
            counterparty: "",
            recipientUserId: "",
            entryDate: defaultDate,
            dueDate: "",
            paymentStatus: "PAID",
            paymentMethod: "INVOICE",
            invoiceNumber: "",
          },
    );
  }, [open, entry, defaultDate]);

  // The client a new operation starts on. Only ever fills a blank, so a member
  // who has already chosen keeps their choice when the roster changes under
  // them — and "Без клієнта" stays reachable, because an operation genuinely
  // about no client is the common case for tax and payouts.
  useEffect(() => {
    if (!open || entry || !defaultClientId) return;
    setForm((current) => (current.clientId ? current : { ...current, clientId: defaultClientId }));
  }, [open, entry, defaultClientId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({
        type: form.type,
        amount: Number(form.amount),
        entryDate: form.entryDate,
        title: form.title.trim(),
        description: form.description.trim() || null,
        clientId: form.clientId || null,
        counterparty: form.counterparty.trim() || null,
        // Sent for a payout only — the backend refuses a recipient on any
        // other type, and a stale pick must not survive a change of type.
        recipientUserId: form.type === "PAYOUT" && form.recipientUserId ? form.recipientUserId : null,
        paymentStatus: form.paymentStatus,
        paymentMethod: form.paymentMethod,
        dueDate: form.dueDate || null,
        invoiceNumber: form.invoiceNumber.trim() || null,
      });
    } catch (err) {
      // Never `err.message` — that is the backend's English, and a validation
      // failure's message is the bare literal "Validation failed".
      setError(apiErrorMessage(err, t));
    }
  }

  async function handleMarkPaid() {
    if (!entry) return;
    setError(null);
    try {
      await onMarkPaid(entry);
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
            <div>
              {entry ? (
                <>
                  <div className={entry.direction === "IN" ? `${styles.amount} ${styles.in}` : styles.amount}>
                    {formatSignedMoney(entry.amount, entry.direction)}
                  </div>
                  <div className={styles.headerTitle}>{entry.title}</div>
                </>
              ) : (
                <div className={styles.createTitle}>{t.financeEntryDrawer.createTitle}</div>
              )}
            </div>
            <div className={styles.headerActions}>
              {entry && (
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => onDelete(entry)}
                  aria-label={t.financeEntryDrawer.deleteLabel}
                >
                  <TrashIcon width={14} height={14} />
                </button>
              )}
              <button
                type="button"
                className={styles.iconBtn}
                onClick={onClose}
                aria-label={t.financeEntryDrawer.close}
              >
                <CloseIcon width={14} height={14} />
              </button>
            </div>
          </div>

          <div className={styles.body}>
            {/* The mockup's stepper, with two buttons rather than three:
                «Прострочено» is not a state anybody sets, it is what an unpaid
                operation becomes when its deadline passes. Paying it is what
                clears it, which is what the notice above says. */}
            <fieldset className={styles.field}>
              <legend>{t.financeEntryDrawer.paymentStatusSection}</legend>
              <div className={styles.stepper}>
                {PAYMENT_STATUS_ORDER.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={
                      status === form.paymentStatus
                        ? `${styles.step} ${styles.stepActive} ${styles[status.toLowerCase()]}`
                        : styles.step
                    }
                    aria-pressed={status === form.paymentStatus}
                    onClick={() => setForm({ ...form, paymentStatus: status })}
                  >
                    {t.paymentStatus[status]}
                  </button>
                ))}
              </div>
            </fieldset>
            {entry?.overdue && (
              <p className={styles.notice} role="status">
                {t.financeEntryDrawer.overdueNotice}
              </p>
            )}

            <div className={styles.row}>
              <label className={styles.field}>
                <span>{t.financeEntryDrawer.fields.type}</span>
                <select
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value as FinanceEntryType })}
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>{t.financeEntryDrawer.fields.amount}</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                  required
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>{t.financeEntryDrawer.fields.title}</span>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
              />
            </label>

            <label className={styles.field}>
              <span>{t.financeEntryDrawer.fields.description}</span>
              <input
                type="text"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>

            <label className={styles.field}>
              <span>{t.financeEntryDrawer.fields.client}</span>
              <select
                value={form.clientId}
                onChange={(event) => setForm({ ...form, clientId: event.target.value })}
              >
                {/* Not a placeholder: a tax reserve or a team payout is about
                    no client, and that is the honest answer for those rows. */}
                <option value="">{t.financeEntryDrawer.noClient}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            {/* A payout to a team member is the one thing that puts a row on
                somebody's «Моя зп», so it is a pick from the roster rather
                than free text. Choosing a member makes the name field moot —
                the server writes their name into «Отримувач» itself. */}
            {form.type === "PAYOUT" && (
              <label className={styles.field}>
                <span>{t.financeEntryDrawer.fields.recipient}</span>
                <select
                  value={form.recipientUserId}
                  onChange={(event) => setForm({ ...form, recipientUserId: event.target.value })}
                >
                  <option value="">{t.financeEntryDrawer.recipientNone}</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <span className={styles.hint}>{t.financeEntryDrawer.recipientHint}</span>
              </label>
            )}

            {!(form.type === "PAYOUT" && form.recipientUserId) && (
              <label className={styles.field}>
                <span>{t.financeEntryDrawer.fields.counterparty}</span>
                <input
                  type="text"
                  value={form.counterparty}
                  onChange={(event) => setForm({ ...form, counterparty: event.target.value })}
                />
                <span className={styles.hint}>{t.financeEntryDrawer.counterpartyHint}</span>
              </label>
            )}

            <div className={styles.row}>
              <label className={styles.field}>
                <span>{t.financeEntryDrawer.fields.entryDate}</span>
                <input
                  type="date"
                  value={form.entryDate}
                  onChange={(event) => setForm({ ...form, entryDate: event.target.value })}
                  required
                />
              </label>

              <label className={styles.field}>
                <span>{t.financeEntryDrawer.fields.dueDate}</span>
                <input
                  type="date"
                  value={form.dueDate}
                  min={form.entryDate}
                  onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                />
              </label>
            </div>
            <p className={styles.hint}>{t.financeEntryDrawer.dueDateHint}</p>

            <div className={styles.row}>
              <label className={styles.field}>
                <span>{t.financeEntryDrawer.fields.method}</span>
                <select
                  value={form.paymentMethod}
                  onChange={(event) =>
                    setForm({ ...form, paymentMethod: event.target.value as PaymentMethod })
                  }
                >
                  {methodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>{t.financeEntryDrawer.fields.invoiceNumber}</span>
                <input
                  type="text"
                  value={form.invoiceNumber}
                  onChange={(event) => setForm({ ...form, invoiceNumber: event.target.value })}
                />
              </label>
            </div>

            {error && <div className={styles.error}>{error}</div>}
          </div>

          <div className={styles.footer}>
            {/* One click for the write this module does most often, in the
                slot the mockup gave to a reminder nothing can send yet. It
                goes through the narrow PATCH, so it cannot blank a field the
                form has half-edited. */}
            {entry && entry.paymentStatus === "PENDING" && (
              <button
                type="button"
                className={styles.secondary}
                onClick={handleMarkPaid}
                disabled={isMarkingPaid || isSubmitting}
              >
                {t.financeEntryDrawer.markPaid}
              </button>
            )}
            <button type="submit" className={styles.submit} disabled={isSubmitting || isMarkingPaid}>
              {isSubmitting ? t.financeEntryDrawer.submitLoading : t.financeEntryDrawer.submitIdle}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
