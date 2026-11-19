import { useState, type ReactNode } from "react";
import type { ClientAssignee, ClientDetail } from "../../api/clients";
import { ApiError } from "../../api/client";
import { CloseIcon, MessageIcon, PhoneIcon } from "../../atoms/icons/icons";
import { ConfirmationDialog } from "../ConfirmationDialog/ConfirmationDialog";
import type { ClientDetailTab } from "../../i18n/dictionary";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { AssigneePicker } from "../../molecules/AssigneePicker/AssigneePicker";
import { initials } from "../../utils/initials";
import { CooperationTimeline } from "./CooperationTimeline";
import styles from "./ClientDetailDrawer.module.css";

const TAB_ORDER: ClientDetailTab[] = ["overview", "content", "finance", "files", "notes"];

const REVENUE_FORMAT = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });

interface ClientDetailDrawerProps {
  open: boolean;
  detail: ClientDetail | undefined;
  isLoading: boolean;
  /**
   * The detail fetch failed — most often a 404 after the member removed
   * themselves from the client's staffing, which is exactly when TanStack
   * Query keeps the last good `detail` around. Rendering it anyway would show
   * a client the user can no longer open, with staffing contradicting the
   * save they just made.
   */
  isError: boolean;
  isArchiving: boolean;
  isDeleting: boolean;
  /** How long a deleted client stays recoverable — the delete confirmation says so. */
  trashRetentionDays?: number;
  /** False under a READ grant on Clients — the archive action is hidden rather than offered and 403'd. */
  canEdit: boolean;
  /** The tenant's members, for restaffing. Empty when the caller may not edit. */
  assignableMembers: ClientAssignee[];
  /**
   * What the «Контент-план» tab shows. It is passed in as an element rather
   * than built here because it reads the CONTENT section — another module's
   * data, with its own access grant and its own query keys — and because an
   * element only mounts (and only fetches) once its tab is actually selected.
   * Omitted, the tab keeps the mockup's placeholder copy.
   */
  contentTab?: ReactNode;
  /** The «Файли» and «Нотатки» tabs, passed as elements for the same reason as `contentTab`. */
  filesTab?: ReactNode;
  notesTab?: ReactNode;
  /**
   * Owns the tenant — the only one who may edit a client's terms or archive it.
   * Distinct from `canEdit`, which is the Clients grant and still decides who
   * may restaff and who may add notes and files.
   */
  canManageClient: boolean;
  onEdit: () => void;
  onSaveAssignees: (assigneeIds: string[]) => Promise<unknown>;
  onClose: () => void;
  onArchive: (clientId: string) => Promise<unknown>;
  /** Removes the client for good. Only offered when `canManageClient` — the backend refuses anyone else. */
  onDelete: (clientId: string) => Promise<unknown>;
}

/**
 * Right-side drawer (desktop) / bottom sheet (mobile) — one markup, two
 * behaviors via CSS media query at 900px (DESIGN_SYSTEM.md §12). The overview
 * tab is this component's own; the content tab is whatever `contentTab` was
 * given (`ClientsPage` fills it with the client's own content plan); finance and
 * files stay the mockup's empty-state copy — and FR-06's encrypted notes are
 * explicitly out of scope, so notes never becomes more than the lock-note
 * warning.
 */
export function ClientDetailDrawer({
  open,
  detail,
  isLoading,
  isError,
  isArchiving,
  isDeleting,
  trashRetentionDays = 30,
  canEdit,
  assignableMembers,
  contentTab,
  filesTab,
  notesTab,
  canManageClient,
  onEdit,
  onSaveAssignees,
  onClose,
  onArchive,
  onDelete,
}: ClientDetailDrawerProps) {
  const { t } = useLocale();

  return (
    <>
      <div className={open ? `${styles.backdrop} ${styles.open}` : styles.backdrop} onClick={onClose} />
      <div className={open ? `${styles.panel} ${styles.open}` : styles.panel}>
        <div className={styles.handle} />
        {isError && !isLoading ? (
          <div className={styles.empty}>{t.clientDetailDrawer.unavailable}</div>
        ) : isLoading || !detail ? (
          <div className={styles.empty}>{t.clientDetailDrawer.loading}</div>
        ) : (
          /* Keyed, and holding the selected tab itself: closing the drawer
             drops `detail`, which unmounts this and resets the tab to Огляд
             for free. It used to be an effect up here that reset on open —
             but an effect runs after the commit, so reopening a client whose
             detail was still cached rendered one frame on the tab last left
             open, and anything living behind that tab (the content plan) got
             mounted and fetched for a tab nobody asked for. */
          <ClientDetailContent
            key={detail.id}
            detail={detail}
            isArchiving={isArchiving}
            isDeleting={isDeleting}
            trashRetentionDays={trashRetentionDays}
            canEdit={canEdit}
            assignableMembers={assignableMembers}
            contentTab={contentTab}
            filesTab={filesTab}
            notesTab={notesTab}
            canManageClient={canManageClient}
            onEdit={onEdit}
            onSaveAssignees={onSaveAssignees}
            onClose={onClose}
            onArchive={onArchive}
            onDelete={onDelete}
          />
        )}
      </div>
    </>
  );
}

function ClientDetailContent({
  detail,
  isArchiving,
  isDeleting,
  trashRetentionDays,
  canEdit,
  assignableMembers,
  contentTab,
  filesTab,
  notesTab,
  canManageClient,
  onEdit,
  onSaveAssignees,
  onClose,
  onArchive,
  onDelete,
}: {
  detail: ClientDetail;
  isArchiving: boolean;
  isDeleting: boolean;
  trashRetentionDays: number;
  canEdit: boolean;
  assignableMembers: ClientAssignee[];
  contentTab?: ReactNode;
  filesTab?: ReactNode;
  notesTab?: ReactNode;
  canManageClient: boolean;
  onEdit: () => void;
  onSaveAssignees: (assigneeIds: string[]) => Promise<unknown>;
  onClose: () => void;
  onArchive: (clientId: string) => Promise<unknown>;
  onDelete: (clientId: string) => Promise<unknown>;
}) {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<ClientDetailTab>("overview");
  const subtitle = [detail.niche, detail.assignees.map((member) => member.name).join(", ")]
    .filter(Boolean)
    .join(" · ");
  const isArchived = detail.status === "ARCHIVED";
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  async function handleConfirmArchive() {
    try {
      await onArchive(detail.id);
      setConfirmArchiveOpen(false);
    } catch (err) {
      setConfirmArchiveOpen(false);
      window.alert(err instanceof ApiError ? err.message : t.clientDetailDrawer.archiveErrorFallback);
    }
  }

  async function handleConfirmDelete() {
    try {
      await onDelete(detail.id);
      // The client is gone: there is nothing left to show in this drawer.
      setConfirmDeleteOpen(false);
      onClose();
    } catch (err) {
      setConfirmDeleteOpen(false);
      window.alert(err instanceof ApiError ? err.message : t.clientDetailDrawer.deleteErrorFallback);
    }
  }

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.client}>
            <div className={styles.avatar}>{initials(detail.name)}</div>
            <div>
              <div className={styles.name}>{detail.name}</div>
              {subtitle && <div className={styles.niche}>{subtitle}</div>}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label={t.clientDetailDrawer.close}>
            <CloseIcon width={14} height={14} />
          </button>
        </div>
        <div className={styles.quickActions}>
          <button className={`${styles.qaBtn} ${styles.primary}`} disabled title={t.clientDetailDrawer.notImplemented}>
            {t.clientDetailDrawer.writeAction}
          </button>
          <button className={styles.qaBtn} disabled title={t.clientDetailDrawer.notImplemented}>
            {t.clientDetailDrawer.invoiceAction}
          </button>
          {canManageClient && (
            <button className={styles.qaBtn} onClick={onEdit}>
              {t.clientDetailDrawer.editClient}
            </button>
          )}
          {canManageClient && (
            <button
              className={styles.qaBtn}
              disabled={isArchived || isArchiving}
              onClick={() => setConfirmArchiveOpen(true)}
            >
              {isArchived ? t.clientDetailDrawer.archiveDone : isArchiving ? t.clientDetailDrawer.archiving : t.clientDetailDrawer.archiveIdle}
            </button>
          )}
          {canManageClient && (
            <button
              className={`${styles.qaBtn} ${styles.dangerBtn}`}
              disabled={isDeleting}
              onClick={() => setConfirmDeleteOpen(true)}
            >
              {t.clientDetailDrawer.deleteIdle}
            </button>
          )}
        </div>
      </div>

      <div className={styles.tabs}>
        {TAB_ORDER.map((tab) => (
          <div
            key={tab}
            className={tab === activeTab ? `${styles.tab} ${styles.active}` : styles.tab}
            onClick={() => setActiveTab(tab)}
          >
            {t.clientDetailDrawer.tabs[tab]}
          </div>
        ))}
      </div>

      {activeTab === "overview" && (
        <OverviewTab
          detail={detail}
          canEdit={canEdit}
          assignableMembers={assignableMembers}
          onSaveAssignees={onSaveAssignees}
        />
      )}
      {activeTab === "content" &&
        (contentTab ?? (
          <div className={styles.body}>
            <div className={styles.empty}>{t.clientDetailDrawer.contentEmpty}</div>
          </div>
        ))}
      {activeTab === "finance" && (
        <div className={styles.body}>
          <div className={styles.empty}>{t.clientDetailDrawer.financeEmpty}</div>
        </div>
      )}
      {activeTab === "files" &&
        (filesTab ?? (
          <div className={styles.body}>
            <div className={styles.empty}>{t.clientDetailDrawer.filesEmpty}</div>
          </div>
        ))}
      {activeTab === "notes" &&
        (notesTab ?? (
          <div className={styles.body}>
            <div className={styles.empty}>{t.clientDetailDrawer.notesEmpty}</div>
          </div>
        ))}

      <ConfirmationDialog
        open={confirmArchiveOpen}
        title={t.clientDetailDrawer.archiveConfirmTitle}
        message={interpolate(t.clientDetailDrawer.archiveConfirmMessageTemplate, { name: detail.name })}
        confirmLabel={t.clientDetailDrawer.archiveIdle}
        cancelLabel={t.confirmationDialog.cancelLabel}
        isConfirming={isArchiving}
        onConfirm={handleConfirmArchive}
        onCancel={() => setConfirmArchiveOpen(false)}
      />

      <ConfirmationDialog
        open={confirmDeleteOpen}
        tone="danger"
        title={t.clientDetailDrawer.deleteConfirmTitle}
        message={interpolate(t.clientDetailDrawer.deleteConfirmMessageTemplate, { name: detail.name, days: trashRetentionDays })}
        confirmLabel={t.clientDetailDrawer.deleteConfirmLabel}
        cancelLabel={t.confirmationDialog.cancelLabel}
        isConfirming={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}

function OverviewTab({
  detail,
  canEdit,
  assignableMembers,
  onSaveAssignees,
}: {
  detail: ClientDetail;
  canEdit: boolean;
  assignableMembers: ClientAssignee[];
  onSaveAssignees: (assigneeIds: string[]) => Promise<unknown>;
}) {
  const { t } = useLocale();
  const [isEditingAssignees, setIsEditingAssignees] = useState(false);
  const [draftAssigneeIds, setDraftAssigneeIds] = useState<string[]>([]);
  const [isSavingAssignees, setIsSavingAssignees] = useState(false);
  const [assigneeError, setAssigneeError] = useState<string | null>(null);

  function startEditing() {
    // Seed from what is actually staffed right now, not from the last draft —
    // reopening after a cancel should not resurrect the abandoned edit.
    setDraftAssigneeIds(detail.assignees.map((member) => member.id));
    setAssigneeError(null);
    setIsEditingAssignees(true);
  }

  function toggleAssignee(id: string) {
    setDraftAssigneeIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id],
    );
  }

  async function handleSaveAssignees() {
    setIsSavingAssignees(true);
    setAssigneeError(null);
    try {
      await onSaveAssignees(draftAssigneeIds);
      setIsEditingAssignees(false);
    } catch (err) {
      setAssigneeError(err instanceof ApiError ? err.message : t.clientDetailDrawer.assigneesErrorFallback);
    } finally {
      setIsSavingAssignees(false);
    }
  }

  return (
    <div className={styles.body}>
      <div className={styles.sectionTitle}>{t.clientDetailDrawer.sectionStage}</div>
      <div className={styles.timeline}>
        <CooperationTimeline stage={detail.stage} status={detail.status} />
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>
            {detail.revenueScope === "PERSONAL"
              ? t.clientDetailDrawer.statRevenueLabelPersonal
              : t.clientDetailDrawer.statRevenueLabel}
          </div>
          <div className={styles.statValue}>
            {detail.monthlyRevenue === null ? "—" : `₴${REVENUE_FORMAT.format(detail.monthlyRevenue)}`}
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>{t.clientDetailDrawer.statDurationLabel}</div>
          <div className={styles.statValue}>{detail.cooperationDurationLabel}</div>
        </div>
      </div>

      <div className={styles.sectionTitleRow}>
        <span className={styles.sectionTitle}>{t.clientDetailDrawer.sectionAssignees}</span>
        {canEdit && !isEditingAssignees && (
          <button type="button" className={styles.sectionAction} onClick={startEditing}>
            {t.clientDetailDrawer.editAssignees}
          </button>
        )}
      </div>

      {isEditingAssignees ? (
        <div className={styles.assigneeEditor}>
          <AssigneePicker
            members={assignableMembers}
            selectedIds={draftAssigneeIds}
            onToggle={toggleAssignee}
            disabled={isSavingAssignees}
          />
          {assigneeError && <div className={styles.assigneeError}>{assigneeError}</div>}
          <div className={styles.assigneeActions}>
            <button
              type="button"
              className={styles.assigneeCancel}
              onClick={() => setIsEditingAssignees(false)}
              disabled={isSavingAssignees}
            >
              {t.clientDetailDrawer.cancelAssignees}
            </button>
            <button
              type="button"
              className={styles.assigneeSave}
              onClick={handleSaveAssignees}
              disabled={isSavingAssignees}
            >
              {isSavingAssignees ? t.clientDetailDrawer.savingAssignees : t.clientDetailDrawer.saveAssignees}
            </button>
          </div>
        </div>
      ) : detail.assignees.length === 0 ? (
        <p className={styles.assigneesEmpty}>{t.clientDetailDrawer.assigneesEmpty}</p>
      ) : (
        <ul className={styles.assigneeList}>
          {detail.assignees.map((member) => (
            <li key={member.id} className={styles.assigneeRow}>
              <span className={styles.assigneeAvatar} aria-hidden>
                {member.initials}
              </span>
              <span className={styles.assigneeName}>{member.name}</span>
              <span className={styles.assigneeRole}>{t.role[member.role]}</span>
            </li>
          ))}
        </ul>
      )}

      {detail.contactName && (
        <>
          <div className={styles.sectionTitle}>{t.clientDetailDrawer.sectionContact}</div>
          <div className={styles.contact}>
            <div className={styles.contactAvatar}>{initials(detail.contactName)}</div>
            <div>
              <div className={styles.contactName}>{detail.contactName}</div>
              {detail.contactRole && <div className={styles.contactRole}>{detail.contactRole}</div>}
              {(detail.contactPhone || detail.contactEmail) && (
                <div className={styles.contactMeta}>
                  {[detail.contactPhone, detail.contactEmail].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
            <div className={styles.contactActions}>
              <button disabled title={t.clientDetailDrawer.notImplemented} aria-label={t.clientDetailDrawer.callAriaLabel}>
                <PhoneIcon width={13} height={13} />
              </button>
              <button disabled title={t.clientDetailDrawer.notImplemented} aria-label={t.clientDetailDrawer.messageAriaLabel}>
                <MessageIcon width={13} height={13} />
              </button>
            </div>
          </div>
        </>
      )}

      <div className={styles.sectionTitle}>{t.clientDetailDrawer.sectionActivity}</div>
      {detail.activity.length === 0 ? (
        <div className={styles.empty}>{t.clientDetailDrawer.activityEmpty}</div>
      ) : (
        detail.activity.map((entry, index) => (
          <div className={styles.activityRow} key={index}>
            <div className={styles.activityDot} />
            <div className={styles.activityText}>
              <b>{entry.actorName}</b> {entry.description}
            </div>
            <div className={styles.activityTime}>{entry.timeLabel}</div>
          </div>
        ))
      )}
    </div>
  );
}
