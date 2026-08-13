import { useCallback, useState } from "react";
import type { AccessMatrix } from "../../api/auth";
import type { InviteTeamMemberPayload, TeamMember } from "../../api/team";
import { PlusIcon } from "../../atoms/icons/icons";
import { useAuth } from "../../hooks/useAuth";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { EditMemberAccessDrawer } from "../../organisms/EditMemberAccessDrawer/EditMemberAccessDrawer";
import { InviteTeamMemberDrawer } from "../../organisms/InviteTeamMemberDrawer/InviteTeamMemberDrawer";
import { TeamTable } from "../../organisms/TeamTable/TeamTable";
import { usePageFab } from "../../templates/AppShell/PageFabContext";
import { usePageHeader } from "../../templates/AppShell/PageHeaderContext";
import styles from "./TeamPage.module.css";
import { useInviteTeamMember } from "./useInviteTeamMember";
import { useRevokeTeamMember } from "./useRevokeTeamMember";
import { useTeam } from "./useTeam";
import { useUpdateMemberAccess } from "./useUpdateMemberAccess";

export function TeamPage() {
  const { data, isLoading, isError, error, refetch } = useTeam();
  const { t } = useLocale();
  const { user } = useAuth();
  const canManageTeam = user?.role === "OWNER";
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [accessTarget, setAccessTarget] = useState<TeamMember | null>(null);
  const inviteTeamMember = useInviteTeamMember();
  const revokeTeamMember = useRevokeTeamMember();
  const updateMemberAccess = useUpdateMemberAccess();

  usePageHeader({
    title: t.teamPage.title,
    subtitle: data ? interpolate(t.teamPage.subtitleTemplate, { count: data.length }) : "",
  });

  const openInvite = useCallback(() => setIsInviteOpen(true), []);
  usePageFab(canManageTeam ? { label: t.teamPage.inviteButton, onClick: openInvite } : null);

  function handleInvite(payload: InviteTeamMemberPayload) {
    return inviteTeamMember.mutateAsync(payload);
  }

  function handleUpdateAccess(id: string, access: AccessMatrix) {
    return updateMemberAccess.mutateAsync({ id, access });
  }

  if (isLoading) {
    return <div className={styles.state}>{t.teamPage.loading}</div>;
  }

  if (isError || !data) {
    return (
      <div className={styles.state}>
        <p>
          {t.teamPage.loadErrorPrefix}
          {error instanceof Error ? error.message : ""}
        </p>
        <button type="button" onClick={() => refetch()} className={styles.retry}>
          {t.teamPage.retry}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {canManageTeam && (
        <div className={styles.headerRow}>
          <div className={styles.spacer} />
          <button type="button" className={styles.inviteBtn} onClick={openInvite}>
            <PlusIcon width={15} height={15} />
            {t.teamPage.inviteButton}
          </button>
        </div>
      )}

      <TeamTable
        members={data}
        canManageTeam={canManageTeam}
        onRevoke={(id) => revokeTeamMember.mutateAsync(id)}
        onEditAccess={setAccessTarget}
        revokingId={revokeTeamMember.isPending ? revokeTeamMember.variables : null}
      />

      {canManageTeam && (
        <>
          <InviteTeamMemberDrawer
            open={isInviteOpen}
            isSubmitting={inviteTeamMember.isPending}
            onSubmit={handleInvite}
            onClose={() => setIsInviteOpen(false)}
          />

          <EditMemberAccessDrawer
            member={accessTarget}
            isSubmitting={updateMemberAccess.isPending}
            onSubmit={handleUpdateAccess}
            onClose={() => setAccessTarget(null)}
          />
        </>
      )}
    </div>
  );
}
