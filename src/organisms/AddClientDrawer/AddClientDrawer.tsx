import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ClientStage, ClientStatus, CreateClientPayload } from "../../api/clients";
import { CLIENT_STAGE_ORDER } from "../../api/clients";
import { ApiError } from "../../api/client";
import { CloseIcon } from "../../atoms/icons/icons";
import { useLocale } from "../../i18n/useLocale";
import styles from "./AddClientDrawer.module.css";

const STATUS_VALUES: ClientStatus[] = ["NEW", "ACTIVE", "ATTENTION", "ARCHIVED"];

const EMPTY_FORM = {
  name: "",
  niche: "",
  tariffPlan: "",
  cooperationStartDate: "",
  serviceCost: "",
  status: "NEW" as ClientStatus,
  contactName: "",
  contactRole: "",
  contactPhone: "",
  contactEmail: "",
  stage: "BRIEF" as ClientStage,
};

interface AddClientDrawerProps {
  open: boolean;
  isSubmitting: boolean;
  onSubmit: (payload: CreateClientPayload) => Promise<unknown>;
  onClose: () => void;
}

/**
 * Right-side drawer (desktop) / bottom sheet (mobile) for FR-05 client
 * creation — same backdrop/panel pattern as ClientDetailDrawer so the two
 * drawers feel like one system rather than two competing shapes.
 */
export function AddClientDrawer({ open, isSubmitting, onSubmit, onClose }: AddClientDrawerProps) {
  const { t } = useLocale();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const statusOptions = useMemo(
    () => STATUS_VALUES.map((value) => ({ value, label: t.clientStatus[value] })),
    [t],
  );
  const stageOptions = useMemo(
    () => CLIENT_STAGE_ORDER.map((value) => ({ value, label: t.clientStage[value] })),
    [t],
  );

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setError(null);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({
        name: form.name.trim(),
        niche: form.niche.trim() || null,
        tariffPlan: form.tariffPlan.trim() || null,
        cooperationStartDate: form.cooperationStartDate || null,
        serviceCost: form.serviceCost === "" ? null : Number(form.serviceCost),
        status: form.status,
        contactName: form.contactName.trim(),
        contactRole: form.contactRole.trim() || null,
        contactPhone: form.contactPhone.trim(),
        contactEmail: form.contactEmail.trim(),
        stage: form.stage,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.addClientDrawer.genericError);
    }
  }

  return (
    <>
      <div className={open ? `${styles.backdrop} ${styles.open}` : styles.backdrop} onClick={onClose} />
      <div className={open ? `${styles.panel} ${styles.open}` : styles.panel}>
        <div className={styles.handle} />
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.header}>
            <div className={styles.title}>{t.addClientDrawer.title}</div>
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t.addClientDrawer.close}>
              <CloseIcon width={14} height={14} />
            </button>
          </div>

          <div className={styles.body}>
            <label className={styles.field}>
              <span>{t.addClientDrawer.fields.name}</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                autoFocus
              />
            </label>

            <label className={styles.field}>
              <span>{t.addClientDrawer.fields.niche}</span>
              <input
                type="text"
                value={form.niche}
                onChange={(event) => setForm({ ...form, niche: event.target.value })}
              />
            </label>

            <div className={styles.row}>
              <label className={styles.field}>
                <span>{t.addClientDrawer.fields.status}</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value as ClientStatus })}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>{t.addClientDrawer.fields.stage}</span>
                <select
                  value={form.stage}
                  onChange={(event) => setForm({ ...form, stage: event.target.value as ClientStage })}
                >
                  {stageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.row}>
              <label className={styles.field}>
                <span>{t.addClientDrawer.fields.tariffPlan}</span>
                <input
                  type="text"
                  value={form.tariffPlan}
                  onChange={(event) => setForm({ ...form, tariffPlan: event.target.value })}
                />
              </label>

              <label className={styles.field}>
                <span>{t.addClientDrawer.fields.revenue}</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.serviceCost}
                  onChange={(event) => setForm({ ...form, serviceCost: event.target.value })}
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>{t.addClientDrawer.fields.startDate}</span>
              <input
                type="date"
                value={form.cooperationStartDate}
                onChange={(event) => setForm({ ...form, cooperationStartDate: event.target.value })}
              />
            </label>

            <div className={styles.sectionTitle}>{t.addClientDrawer.fields.contactSectionTitle}</div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>{t.addClientDrawer.fields.contactName}</span>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(event) => setForm({ ...form, contactName: event.target.value })}
                  required
                />
              </label>

              <label className={styles.field}>
                <span>{t.addClientDrawer.fields.contactRole}</span>
                <input
                  type="text"
                  value={form.contactRole}
                  onChange={(event) => setForm({ ...form, contactRole: event.target.value })}
                />
              </label>
            </div>

            <div className={styles.row}>
              <label className={styles.field}>
                <span>{t.addClientDrawer.fields.contactPhone}</span>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(event) => setForm({ ...form, contactPhone: event.target.value })}
                  required
                />
              </label>

              <label className={styles.field}>
                <span>{t.addClientDrawer.fields.contactEmail}</span>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
                  required
                />
              </label>
            </div>

            {error && <div className={styles.error}>{error}</div>}
          </div>

          <div className={styles.footer}>
            <button type="submit" className={styles.submit} disabled={isSubmitting}>
              {isSubmitting ? t.addClientDrawer.submitLoading : t.addClientDrawer.submitIdle}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
