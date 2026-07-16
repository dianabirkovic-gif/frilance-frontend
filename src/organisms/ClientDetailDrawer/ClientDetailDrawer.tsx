import { useEffect, useState } from "react";
import type { ClientDetail } from "../../api/clients";
import { ApiError } from "../../api/client";
import { CloseIcon, LockIcon, MessageIcon, PhoneIcon } from "../../atoms/icons/icons";
import { ConfirmationDialog } from "../ConfirmationDialog/ConfirmationDialog";
import { initials } from "../../utils/initials";
import { CooperationTimeline } from "./CooperationTimeline";
import styles from "./ClientDetailDrawer.module.css";

type Tab = "overview" | "content" | "finance" | "files" | "notes";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Огляд" },
  { id: "content", label: "Контент-план" },
  { id: "finance", label: "Фінанси" },
  { id: "files", label: "Файли" },
  { id: "notes", label: "Нотатки" },
];

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
 * Огляд tab has real content; Контент-план/Фінанси/Файли/Нотатки stay the
 * mockup's own empty-state copy — FR-06's encrypted notes are explicitly
 * out of scope, so Нотатки never becomes more than the lock-note warning.
 */
export function ClientDetailDrawer({
  open,
  detail,
  isLoading,
  isArchiving,
  onClose,
  onArchive,
}: ClientDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

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
          <div className={styles.empty}>Завантаження…</div>
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
  activeTab: Tab;
  isArchiving: boolean;
  onSelectTab: (tab: Tab) => void;
  onClose: () => void;
  onArchive: (clientId: string) => Promise<unknown>;
}) {
  const subtitle = [detail.niche, detail.assigneeName].filter(Boolean).join(" · ");
  const isArchived = detail.status === "ARCHIVED";
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);

  async function handleConfirmArchive() {
    try {
      await onArchive(detail.id);
      setConfirmArchiveOpen(false);
    } catch (err) {
      setConfirmArchiveOpen(false);
      window.alert(err instanceof ApiError ? err.message : "Не вдалося заархівувати клієнта. Спробуйте ще раз.");
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
          <button className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <CloseIcon width={14} height={14} />
          </button>
        </div>
        <div className={styles.quickActions}>
          <button className={`${styles.qaBtn} ${styles.primary}`} disabled title="Ще не реалізовано">
            Написати
          </button>
          <button className={styles.qaBtn} disabled title="Ще не реалізовано">
            Виставити рахунок
          </button>
          <button
            className={styles.qaBtn}
            disabled={isArchived || isArchiving}
            onClick={() => setConfirmArchiveOpen(true)}
          >
            {isArchived ? "Заархівовано" : isArchiving ? "Архівуємо..." : "Архівувати"}
          </button>
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <div
            key={tab.id}
            className={tab.id === activeTab ? `${styles.tab} ${styles.active}` : styles.tab}
            onClick={() => onSelectTab(tab.id)}
          >
            {tab.id === "notes" && <LockIcon width={12} height={12} />}
            {tab.label}
          </div>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab detail={detail} />}
      {activeTab === "content" && (
        <div className={styles.body}>
          <div className={styles.empty}>
            Контент-план клієнта відкриється тут — той самий календар, що й у модулі «Контент-план»,
            відфільтрований по цьому клієнту.
          </div>
        </div>
      )}
      {activeTab === "finance" && (
        <div className={styles.body}>
          <div className={styles.empty}>Історія оплат, рахунки та заборгованість клієнта.</div>
        </div>
      )}
      {activeTab === "files" && (
        <div className={styles.body}>
          <div className={styles.empty}>Брифи, контракти та матеріали клієнта.</div>
        </div>
      )}
      {activeTab === "notes" && (
        <div className={styles.body}>
          <div className={styles.lockNote}>
            <LockIcon width={16} height={16} />
            Захищена «База проєкту» — нотатки зашифровано на пристрої, доступ лише з паролем акаунта.
          </div>
          <div className={styles.empty}>Нотатки клієнта з'являться тут після розшифрування.</div>
        </div>
      )}

      <ConfirmationDialog
        open={confirmArchiveOpen}
        title="Архівувати клієнта"
        message={`Заархівувати клієнта «${detail.name}»?`}
        confirmLabel="Архівувати"
        cancelLabel="Скасувати"
        isConfirming={isArchiving}
        onConfirm={handleConfirmArchive}
        onCancel={() => setConfirmArchiveOpen(false)}
      />
    </>
  );
}

function OverviewTab({ detail }: { detail: ClientDetail }) {
  return (
    <div className={styles.body}>
      <div className={styles.sectionTitle}>Етап співпраці</div>
      <div className={styles.timeline}>
        <CooperationTimeline stage={detail.stage} status={detail.status} />
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Дохід із клієнта</div>
          <div className={styles.statValue}>
            {detail.monthlyRevenue === null ? "—" : `₴${REVENUE_FORMAT.format(detail.monthlyRevenue)}`}
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>У співпраці</div>
          <div className={styles.statValue}>{detail.cooperationDurationLabel}</div>
        </div>
      </div>

      {detail.contactName && (
        <>
          <div className={styles.sectionTitle}>Контактна особа</div>
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
              <button disabled title="Ще не реалізовано" aria-label="Подзвонити">
                <PhoneIcon width={13} height={13} />
              </button>
              <button disabled title="Ще не реалізовано" aria-label="Написати повідомлення">
                <MessageIcon width={13} height={13} />
              </button>
            </div>
          </div>
        </>
      )}

      <div className={styles.sectionTitle}>Останні події</div>
      {detail.activity.length === 0 ? (
        <div className={styles.empty}>Ще немає подій.</div>
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
