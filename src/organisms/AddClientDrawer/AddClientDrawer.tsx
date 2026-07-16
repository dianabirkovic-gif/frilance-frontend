import { useEffect, useState, type FormEvent } from "react";
import type { ClientStage, ClientStatus, CreateClientPayload } from "../../api/clients";
import { ApiError } from "../../api/client";
import { CloseIcon } from "../../atoms/icons/icons";
import styles from "./AddClientDrawer.module.css";

const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: "NEW", label: "Новий" },
  { value: "ACTIVE", label: "Активний" },
  { value: "ATTENTION", label: "Потребує уваги" },
  { value: "ARCHIVED", label: "Архів" },
];

const STAGE_OPTIONS: { value: ClientStage; label: string }[] = [
  { value: "BRIEF", label: "Бріф" },
  { value: "ESTIMATE", label: "Кошторис" },
  { value: "PAYMENT", label: "Оплата" },
  { value: "WORK_STARTED", label: "Старт робіт" },
  { value: "REPORT", label: "Звіт" },
];

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
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

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
      setError(err instanceof ApiError ? err.message : "Не вдалося створити клієнта. Спробуйте ще раз.");
    }
  }

  return (
    <>
      <div className={open ? `${styles.backdrop} ${styles.open}` : styles.backdrop} onClick={onClose} />
      <div className={open ? `${styles.panel} ${styles.open}` : styles.panel}>
        <div className={styles.handle} />
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.header}>
            <div className={styles.title}>Новий клієнт</div>
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
              <CloseIcon width={14} height={14} />
            </button>
          </div>

          <div className={styles.body}>
            <label className={styles.field}>
              <span>Назва клієнта *</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                autoFocus
              />
            </label>

            <label className={styles.field}>
              <span>Ніша</span>
              <input
                type="text"
                value={form.niche}
                onChange={(event) => setForm({ ...form, niche: event.target.value })}
              />
            </label>

            <div className={styles.row}>
              <label className={styles.field}>
                <span>Статус</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value as ClientStatus })}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Етап співпраці</span>
                <select
                  value={form.stage}
                  onChange={(event) => setForm({ ...form, stage: event.target.value as ClientStage })}
                >
                  {STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.row}>
              <label className={styles.field}>
                <span>Тарифний план</span>
                <input
                  type="text"
                  value={form.tariffPlan}
                  onChange={(event) => setForm({ ...form, tariffPlan: event.target.value })}
                />
              </label>

              <label className={styles.field}>
                <span>Дохід/міс, ₴</span>
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
              <span>Початок співпраці</span>
              <input
                type="date"
                value={form.cooperationStartDate}
                onChange={(event) => setForm({ ...form, cooperationStartDate: event.target.value })}
              />
            </label>

            <div className={styles.sectionTitle}>Контактна особа</div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>Ім'я *</span>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(event) => setForm({ ...form, contactName: event.target.value })}
                  required
                />
              </label>

              <label className={styles.field}>
                <span>Роль</span>
                <input
                  type="text"
                  value={form.contactRole}
                  onChange={(event) => setForm({ ...form, contactRole: event.target.value })}
                />
              </label>
            </div>

            <div className={styles.row}>
              <label className={styles.field}>
                <span>Мобільний телефон *</span>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(event) => setForm({ ...form, contactPhone: event.target.value })}
                  required
                />
              </label>

              <label className={styles.field}>
                <span>Email *</span>
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
              {isSubmitting ? "Створюємо..." : "Створити клієнта"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
