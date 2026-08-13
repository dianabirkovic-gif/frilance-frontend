import { useEffect, useState, type FormEvent } from "react";
import type { AccessMatrix } from "../../api/auth";
import { ApiError } from "../../api/client";
import type { TeamMember } from "../../api/team";
import { CloseIcon } from "../../atoms/icons/icons";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { AccessMatrixFields } from "../../molecules/AccessMatrixFields/AccessMatrixFields";
import styles from "./EditMemberAccessDrawer.module.css";

interface EditMemberAccessDrawerProps {
  /** The member being edited; null closes the drawer. */
  member: TeamMember | null;
  isSubmitting: boolean;
  onSubmit: (memberId: string, access: AccessMatrix) => Promise<unknown>;
  onClose: () => void;
}

/**
 * Owner-only: changes an existing member's section access without having to
 * revoke and re-invite them. Same drawer/sheet shape as
 * InviteTeamMemberDrawer and reuses its matrix fields, so the owner edits
 * access in exactly the form they granted it.
 */
export function EditMemberAccessDrawer({ member, isSubmitting, onSubmit, onClose }: EditMemberAccessDrawerProps) {
  const { t } = useLocale();
  const [access, setAccess] = useState<AccessMatrix | null>(member?.access ?? null);
  const [error, setError] = useState<string | null>(null);

  // Re-seed from whichever member was just opened, so the form never shows the
  // previous member's grants.
  useEffect(() => {
    setAccess(member?.access ?? null);
    setError(null);
  }, [member]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!member || !access) return;
    setError(null);
    try {
      await onSubmit(member.id, access);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.editMemberAccessDrawer.genericError);
    }
  }

  const open = member !== null;

  return (
    <>
      <div className={open ? `${styles.backdrop} ${styles.open}` : styles.backdrop} onClick={onClose} />
      <div className={open ? `${styles.panel} ${styles.open}` : styles.panel}>
        <div className={styles.handle} />
        {member && access && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.header}>
              <div className={styles.title}>
                {interpolate(t.editMemberAccessDrawer.titleTemplate, { name: member.fullName })}
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                aria-label={t.editMemberAccessDrawer.close}
              >
                <CloseIcon width={14} height={14} />
              </button>
            </div>

            <div className={styles.body}>
              <p className={styles.intro}>{t.editMemberAccessDrawer.intro}</p>
              <AccessMatrixFields value={access} disabled={isSubmitting} onChange={setAccess} />
              {error && <div className={styles.error}>{error}</div>}
            </div>

            <div className={styles.footer}>
              <button type="submit" className={styles.submit} disabled={isSubmitting}>
                {isSubmitting ? t.editMemberAccessDrawer.submitLoading : t.editMemberAccessDrawer.submitIdle}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
