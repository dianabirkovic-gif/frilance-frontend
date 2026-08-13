import { useState } from "react";
import { APP_SECTIONS } from "../../api/auth";
import { ApiError } from "../../api/client";
import type { TeamMember } from "../../api/team";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { Panel } from "../../molecules/Panel/Panel";
import { ConfirmationDialog } from "../ConfirmationDialog/ConfirmationDialog";
import { initials } from "../../utils/initials";
import styles from "./TeamTable.module.css";

const ROLE_CLASS: Record<TeamMember["role"], string> = {
  OWNER: styles.owner,
  PROJECT_MANAGER: styles.pm,
  SMM: styles.smm,
  TARGETOLOGIST: styles.target,
  FREELANCER: styles.pm,
};

function RoleBadge({ role }: { role: TeamMember["role"] }) {
  const { t } = useLocale();
  return (
    <span className={`${styles.roleBadge} ${ROLE_CLASS[role]}`}>
      <span className={styles.dot} />
      {t.role[role]}
    </span>
  );
}

function MemberStatus({ status }: { status: TeamMember["status"] }) {
  const { t } = useLocale();
  return (
    <span className={status === "INVITED" ? `${styles.statusPill} ${styles.invited}` : styles.statusPill}>
      <span className={styles.dot} />
      {t.teamTable.status[status]}
    </span>
  );
}

/**
 * The sections this member can actually open, as a short list — the roster
 * only needs to answer "what do they have?" at a glance; changing it is the
 * edit-access drawer's job. A member granted nothing reads as an em dash
 * rather than an empty cell.
 */
function AccessSummary({ member }: { member: TeamMember }) {
  const { t } = useLocale();
  const granted = APP_SECTIONS.filter((section) => member.access[section] !== "NONE");

  if (granted.length === 0) {
    return <span className={styles.accessNone}>—</span>;
  }

  return (
    <span className={styles.accessList}>
      {granted
        .map((section) => `${t.appSection[section]} · ${t.accessLevel[member.access[section]]}`)
        .join(", ")}
    </span>
  );
}

interface TeamTableProps {
  members: TeamMember[];
  canManageTeam: boolean;
  onRevoke: (id: string) => Promise<unknown>;
  onEditAccess: (member: TeamMember) => void;
  revokingId: string | null;
}

/**
 * Same data as a real `<table>` on desktop and stacked cards on mobile —
 * mirrors ClientTable's responsive pattern (DESIGN_SYSTEM.md §10). The
 * revoke action only appears for still-INVITED rows, owner-only: it's the
 * recovery path for a bad or hijacked invite (see
 * freelance-all/new-requirements.md), not a general "remove member" feature.
 */
export function TeamTable({ members, canManageTeam, onRevoke, onEditAccess, revokingId }: TeamTableProps) {
  const { t } = useLocale();
  const [revokeTarget, setRevokeTarget] = useState<TeamMember | null>(null);

  async function handleConfirmRevoke() {
    if (!revokeTarget) return;
    try {
      await onRevoke(revokeTarget.id);
      setRevokeTarget(null);
    } catch (err) {
      setRevokeTarget(null);
      window.alert(err instanceof ApiError ? err.message : t.teamTable.revokeErrorFallback);
    }
  }

  if (members.length === 0) {
    return (
      <Panel flush className={styles.panel}>
        <div className={styles.empty}>{t.teamTable.empty}</div>
      </Panel>
    );
  }

  return (
    <>
      <Panel flush className={styles.panel}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.teamTable.headers.member}</th>
              <th>{t.teamTable.headers.role}</th>
              <th>{t.teamTable.headers.load}</th>
              <th>{t.teamTable.headers.clients}</th>
              <th>{t.teamTable.accessColumn}</th>
              <th>{t.teamTable.headers.status}</th>
              {canManageTeam && <th></th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>
                  <div className={styles.memberCell}>
                    <div className={styles.avatar}>{initials(member.fullName)}</div>
                    <div>
                      <div className={styles.memberName}>{member.fullName}</div>
                      <div className={styles.memberEmail}>{member.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <RoleBadge role={member.role} />
                </td>
                <td className={styles.loadCell}>
                  <div className={styles.loadTrack}>
                    <div className={styles.loadFill} style={{ width: `${member.loadPercent}%` }} />
                  </div>
                  <span className={styles.loadText}>{member.loadPercent}%</span>
                </td>
                <td className={styles.mutedCell}>{member.clientCount}</td>
                <td className={styles.accessCell}>
                  <AccessSummary member={member} />
                </td>
                <td>
                  <MemberStatus status={member.status} />
                </td>
                {canManageTeam && (
                  <td className={styles.actionCell}>
                    {/* The owner's own row has no stored grants to edit — owning the
                        tenant is the grant (backend RoleAccessPolicy.ownsTenant). */}
                    {member.role !== "OWNER" && (
                      <button type="button" className={styles.accessBtn} onClick={() => onEditAccess(member)}>
                        {t.teamTable.editAccessAction}
                      </button>
                    )}
                    {member.status === "INVITED" && (
                      <button type="button" className={styles.revokeBtn} onClick={() => setRevokeTarget(member)}>
                        {t.teamTable.revokeAction}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <ul className={styles.cardList}>
        {members.map((member) => (
          <li key={member.id} className={styles.card}>
            <div className={styles.cardAvatar}>{initials(member.fullName)}</div>
            <div className={styles.cardBody}>
              <div className={styles.cardName}>{member.fullName}</div>
              <div className={styles.cardMeta}>
                <RoleBadge role={member.role} />
                <MemberStatus status={member.status} />
              </div>
              <div className={styles.cardAccess}>
                <AccessSummary member={member} />
              </div>
            </div>
            <div className={styles.cardRight}>
              <div className={styles.cardClients}>{member.clientCount}</div>
              {canManageTeam && member.role !== "OWNER" && (
                <button type="button" className={styles.accessBtn} onClick={() => onEditAccess(member)}>
                  {t.teamTable.editAccessAction}
                </button>
              )}
              {canManageTeam && member.status === "INVITED" && (
                <button type="button" className={styles.revokeBtn} onClick={() => setRevokeTarget(member)}>
                  {t.teamTable.revokeAction}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <ConfirmationDialog
        open={revokeTarget !== null}
        title={t.teamTable.revokeConfirmTitle}
        message={revokeTarget ? interpolate(t.teamTable.revokeConfirmMessageTemplate, { name: revokeTarget.fullName }) : ""}
        confirmLabel={t.teamTable.revokeAction}
        isConfirming={revokeTarget !== null && revokingId === revokeTarget.id}
        onConfirm={handleConfirmRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </>
  );
}
