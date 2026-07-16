import { useEffect, useState } from "react";
import type { ClientDetail } from "../../api/clients";
import { ApiError } from "../../api/client";
import { CloseIcon, LockIcon, MessageIcon, PhoneIcon } from "../../atoms/icons/icons";
import { ConfirmationDialog } from "../ConfirmationDialog/ConfirmationDialog";
import type { ClientDetailTab } from "../../i18n/dictionary";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { initials } from "../../utils/initials";
import { CooperationTimeline } from "./CooperationTimeline";
import styles from "./ClientDetailDrawer.module.css";

const TAB_ORDER: ClientDetailTab[] = ["overview", "content", "finance", "files", "notes"];

const REVENUE_FORMAT = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });

interface ClientDetailDrawerProps {
  open: boolean;
  detail: ClientDetail | undefined;
  isLoading: boolean;
  isArchiving: boolean;
  onClose: () => void;
  onArchive: (clientId: string) => Promise<unknown>;
}

/**
 * Right-side drawer (desktop) / bottom sheet (mobile) — one markup, two
 * behaviors via CSS media query at 900px (DESIGN_SYSTEM.md §12). Only the
 * overview tab has real content; content/finance/files/notes stay the
 * mockup's own empty-state copy — FR-06's encrypted notes are explicitly
 * out of scope, so notes never becomes more than the lock-note warning.
 */
export function ClientDetailDrawer({
  open,
  detail,
  isLoading,
  isArchiving,
  onClose,
  onArchive,
}: ClientDetailDrawerProps) {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<ClientDetailTab>("overview");

  useEffect(() => {
    if (open) {
      setActiveTab("overview");
    }
  }, [open, detail?.id]);

  return (
    <>
      <div className={open ? `${styles.backdrop} ${styles.open}` : styles.backdrop} onClick={onClose} />
      <div className={open ? `${styles.panel} ${styles.open}` : styles.panel}>
        <div className={styles.handle} />
        {isLoading || !detail ? (
          <div className={styles.empty}>{t.clientDetailDrawer.loading}</div>
        ) : (
          <ClientDetailContent
            detail={detail}
            activeTab={activeTab}
            isArchiving={isArchiving}
            onSelectTab={setActiveTab}
            onClose={onClose}
            onArchive={onArchive}
          />
        )}
      </div>
    </>
  );
}

function ClientDetailContent({
  detail,
  activeTab,
  isArchiving,
  onSelectTab,
  onClose,
  onArchive,
}: {
  detail: ClientDetail;
  activeTab: ClientDetailTab;
  isArchiving: boolean;
  onSelectTab: (tab: ClientDetailTab) => void;
  onClose: () => void;
  onArchive: (clientId: string) => Promise<unknown>;
}) {
  const { t } = useLocale();
  const subtitle = [detail.niche, detail.assigneeName].filter(Boolean).join(" · ");
  const isArchived = detail.status === "ARCHIVED";
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);

  async function handleConfirmArchive() {
    try {
      await onArchive(detail.id);
      setConfirmArchiveOpen(false);
    } catch (err) {
      setConfirmArchiveOpen(false);
      window.alert(err instanceof ApiError ? err.message : t.clientDetailDrawer.archiveErrorFallback);
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
          <button
            className={styles.qaBtn}
            disabled={isArchived || isArchiving}
            onClick={() => setConfirmArchiveOpen(true)}
          >
            {isArchived ? t.clientDetailDrawer.archiveDone : isArchiving ? t.clientDetailDrawer.archiving : t.clientDetailDrawer.archiveIdle}
          </button>
        </div>
      </div>

      <div className={styles.tabs}>
        {TAB_ORDER.map((tab) => (
          <div
            key={tab}
            className={tab === activeTab ? `${styles.tab} ${styles.active}` : styles.tab}
            onClick={() => onSelectTab(tab)}
          >
            {tab === "notes" && <LockIcon width={12} height={12} />}
            {t.clientDetailDrawer.tabs[tab]}
          </div>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab detail={detail} />}
      {activeTab === "content" && (
        <div className={styles.body}>
          <div className={styles.empty}>{t.clientDetailDrawer.contentEmpty}</div>
        </div>
      )}
      {activeTab === "finance" && (
        <div className={styles.body}>
          <div className={styles.empty}>{t.clientDetailDrawer.financeEmpty}</div>
        </div>
      )}
      {activeTab === "files" && (
        <div className={styles.body}>
          <div className={styles.empty}>{t.clientDetailDrawer.filesEmpty}</div>
        </div>
      )}
      {activeTab === "notes" && (
        <div className={styles.body}>
          <div className={styles.lockNote}>
            <LockIcon width={16} height={16} />
            {t.clientDetailDrawer.notesLockNote}
          </div>
          <div className={styles.empty}>{t.clientDetailDrawer.notesEmpty}</div>
        </div>
      )}

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
    </>
  );
}

function OverviewTab({ detail }: { detail: ClientDetail }) {
  const { t } = useLocale();
  return (
    <div className={styles.body}>
      <div className={styles.sectionTitle}>{t.clientDetailDrawer.sectionStage}</div>
      <div className={styles.timeline}>
        <CooperationTimeline stage={detail.stage} status={detail.status} />
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>{t.clientDetailDrawer.statRevenueLabel}</div>
          <div className={styles.statValue}>
            {detail.monthlyRevenue === null ? "—" : `₴${REVENUE_FORMAT.format(detail.monthlyRevenue)}`}
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>{t.clientDetailDrawer.statDurationLabel}</div>
          <div className={styles.statValue}>{detail.cooperationDurationLabel}</div>
        </div>
      </div>

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
