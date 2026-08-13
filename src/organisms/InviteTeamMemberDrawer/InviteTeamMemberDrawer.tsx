import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { AccessMatrix, Role } from "../../api/auth";
import { ApiError } from "../../api/client";
import type { InviteTeamMemberPayload, InviteTeamMemberResult } from "../../api/team";
import { CloseIcon } from "../../atoms/icons/icons";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { AccessMatrixFields, defaultAccessForRole } from "../../molecules/AccessMatrixFields/AccessMatrixFields";
import styles from "./InviteTeamMemberDrawer.module.css";

const INVITABLE_ROLES: Role[] = ["PROJECT_MANAGER", "SMM", "TARGETOLOGIST"];

const DEFAULT_ROLE: Role = "PROJECT_MANAGER";

const EMPTY_FORM: { fullName: string; email: string; role: Role; access: AccessMatrix } = {
  fullName: "",
  email: "",
  role: DEFAULT_ROLE,
  access: defaultAccessForRole(DEFAULT_ROLE),
};

interface InviteTeamMemberDrawerProps {
  open: boolean;
  isSubmitting: boolean;
  onSubmit: (payload: InviteTeamMemberPayload) => Promise<InviteTeamMemberResult>;
  onClose: () => void;
}

function claimInviteLink(email: string, token: string): string {
  const params = new URLSearchParams({ email, token });
  return `${window.location.origin}/claim-invite?${params.toString()}`;
}

/**
 * Right-side drawer (desktop) / bottom sheet (mobile) — same pattern as
 * AddClientDrawer, with the owner choosing this member's per-section access
 * before sending (requirement #10 — the matrix used to be a read-only
 * preview of the role's fixed access), plus a one-time success step: the invite response's
 * token is shown here exactly once (see api/team.ts's InviteTeamMemberResult
 * doc) since there's no email/SMTP infrastructure to deliver it — the owner
 * copies the link and relays it to the invitee out-of-band.
 */
export function InviteTeamMemberDrawer({ open, isSubmitting, onSubmit, onClose }: InviteTeamMemberDrawerProps) {
  const { t } = useLocale();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteTeamMemberResult | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const roleOptions = useMemo(() => INVITABLE_ROLES.map((value) => ({ value, label: t.role[value] })), [t]);

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setError(null);
      setResult(null);
      setIsCopied(false);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const created = await onSubmit({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        role: form.role,
        access: form.access,
      });
      setResult(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.inviteTeamMemberDrawer.genericError);
    }
  }

  async function handleCopy(link: string) {
    await navigator.clipboard.writeText(link);
    setIsCopied(true);
  }

  return (
    <>
      <div className={open ? `${styles.backdrop} ${styles.open}` : styles.backdrop} onClick={onClose} />
      <div className={open ? `${styles.panel} ${styles.open}` : styles.panel}>
        <div className={styles.handle} />
        {result ? (
          <div className={styles.form}>
            <div className={styles.header}>
              <div className={styles.title}>{t.inviteTeamMemberDrawer.successTitle}</div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                aria-label={t.inviteTeamMemberDrawer.close}
              >
                <CloseIcon width={14} height={14} />
              </button>
            </div>
            <div className={styles.body}>
              <p>{interpolate(t.inviteTeamMemberDrawer.successIntroTemplate, { name: result.member.fullName })}</p>
              <label className={styles.field}>
                <span>{t.inviteTeamMemberDrawer.linkLabel}</span>
                <input type="text" readOnly value={claimInviteLink(result.member.email, result.inviteToken)} />
              </label>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => handleCopy(claimInviteLink(result.member.email, result.inviteToken))}
              >
                {isCopied ? t.inviteTeamMemberDrawer.copiedButton : t.inviteTeamMemberDrawer.copyButton}
              </button>
            </div>
            <div className={styles.footer}>
              <button type="button" className={styles.submit} onClick={onClose}>
                {t.inviteTeamMemberDrawer.doneButton}
              </button>
            </div>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.header}>
              <div className={styles.title}>{t.inviteTeamMemberDrawer.title}</div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                aria-label={t.inviteTeamMemberDrawer.close}
              >
                <CloseIcon width={14} height={14} />
              </button>
            </div>

            <div className={styles.body}>
              <label className={styles.field}>
                <span>{t.inviteTeamMemberDrawer.fields.fullName}</span>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                  required
                  autoFocus
                />
              </label>

              <label className={styles.field}>
                <span>{t.inviteTeamMemberDrawer.fields.email}</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  required
                />
              </label>

              <label className={styles.field}>
                <span>{t.inviteTeamMemberDrawer.fields.role}</span>
                <select
                  value={form.role}
                  onChange={(event) => {
                    // Switching role re-fills the matrix with that role's defaults; the
                    // owner is free to change any of it afterwards, and what they leave
                    // is what gets stored.
                    const role = event.target.value as Role;
                    setForm({ ...form, role, access: defaultAccessForRole(role) });
                  }}
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.sectionTitle}>{t.inviteTeamMemberDrawer.accessTitle}</div>
              <AccessMatrixFields
                value={form.access}
                onChange={(access) => setForm({ ...form, access })}
              />
              <div className={styles.accessNote}>{t.inviteTeamMemberDrawer.accessNote}</div>

              {error && <div className={styles.error}>{error}</div>}
            </div>

            <div className={styles.footer}>
              <button type="submit" className={styles.submit} disabled={isSubmitting}>
                {isSubmitting ? t.inviteTeamMemberDrawer.submitLoading : t.inviteTeamMemberDrawer.submitIdle}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
