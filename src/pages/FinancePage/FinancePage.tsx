import { useCallback, useMemo, useState } from "react";
import {
  FINANCE_ENTRY_TYPE_ORDER,
  type FinanceEntry,
  type FinanceEntryType,
  type UpdateFinanceEntryPayload,
} from "../../api/finance";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "../../atoms/icons/icons";
import { useAuth } from "../../hooks/useAuth";
import { useToday } from "../../hooks/useToday";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { CashFlowChart } from "../../organisms/CashFlowChart/CashFlowChart";
import { ConfirmationDialog } from "../../organisms/ConfirmationDialog/ConfirmationDialog";
import { FinanceEntryDrawer } from "../../organisms/FinanceEntryDrawer/FinanceEntryDrawer";
import { FinanceRegister } from "../../organisms/FinanceRegister/FinanceRegister";
import { FinanceStatCards } from "../../organisms/FinanceStatCards/FinanceStatCards";
import { usePageFab } from "../../templates/AppShell/PageFabContext";
import { usePageHeader } from "../../templates/AppShell/PageHeaderContext";
import { monthOf, monthTitle, shiftMonth } from "../../utils/calendarDays";
import { formatMoney } from "../../utils/money";
import { defaultDateFor } from "./entryDefaults";
import styles from "./FinancePage.module.css";
import { useFinance } from "./useFinance";
import {
  useCreateFinanceEntry,
  useDeleteFinanceEntry,
  useUpdateFinanceEntry,
  useUpdatePaymentStatus,
} from "./useFinanceMutations";

export function FinancePage() {
  const { t, locale } = useLocale();
  // READ opens the register but not its writes — the backend rejects them
  // either way (FinanceService); this just doesn't offer buttons that would 403.
  const canEdit = useAuth().canEdit("FINANCE");
  const today = useToday();

  const [month, setMonth] = useState(() => monthOf(new Date()));
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<FinanceEntryType | null>(null);
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [entryPendingDeletion, setEntryPendingDeletion] = useState<FinanceEntry | null>(null);

  const { data, isLoading, isError, error, refetch } = useFinance(month, selectedClientId, selectedType);

  usePageHeader({
    title: t.financePage.title,
    subtitle: data
      ? interpolate(t.financePage.subtitleTemplate, { profit: formatMoney(data.summary.netProfit) })
      : "",
  });

  const openCreateDrawer = useCallback(() => {
    setEditingEntry(null);
    setIsDrawerOpen(true);
  }, []);

  usePageFab(canEdit ? { label: t.financePage.newEntryButton, onClick: openCreateDrawer } : null);

  const createEntry = useCreateFinanceEntry();
  const updateEntry = useUpdateFinanceEntry();
  const markPaid = useUpdatePaymentStatus();
  const deleteEntry = useDeleteFinanceEntry();

  const clients = data?.clients ?? [];
  const selectedClientName = clients.find((client) => client.id === selectedClientId)?.name;
  const clientFilterLabel = interpolate(t.financePage.clientFilterLabelTemplate, {
    name: selectedClientName ?? t.financePage.allClients,
  });

  const typeChips = useMemo(
    () => FINANCE_ENTRY_TYPE_ORDER.map((value) => ({ value, label: t.financeEntryType[value] })),
    [t],
  );

  function openEntry(entry: FinanceEntry) {
    setEditingEntry(entry);
    setIsDrawerOpen(true);
  }

  async function handleSubmit(payload: UpdateFinanceEntryPayload) {
    if (editingEntry) {
      await updateEntry.mutateAsync({ id: editingEntry.id, payload });
    } else {
      await createEntry.mutateAsync(payload);
    }
    setIsDrawerOpen(false);
  }

  async function handleMarkPaid(entry: FinanceEntry) {
    await markPaid.mutateAsync({ id: entry.id, paymentStatus: "PAID" });
    setIsDrawerOpen(false);
  }

  async function handleConfirmDeletion() {
    if (!entryPendingDeletion) return;
    await deleteEntry.mutateAsync(entryPendingDeletion.id);
    setEntryPendingDeletion(null);
    setIsDrawerOpen(false);
  }

  return (
    <div className={styles.page}>
      {/* The toolbar renders in every state below — loading, empty and failed
          alike. Navigating away is how somebody leaves a month that would not
          load, so a state that replaces its own navigation traps them. */}
      <div className={styles.toolbar}>
        <div className={styles.monthNav}>
          <button
            type="button"
            className={styles.navBtn}
            aria-label={t.financePage.previousMonth}
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            <ChevronLeftIcon width={14} height={14} />
          </button>
          <span className={styles.monthLabel}>{monthTitle(month, locale)}</span>
          <button
            type="button"
            className={styles.navBtn}
            aria-label={t.financePage.nextMonth}
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            <ChevronRightIcon width={14} height={14} />
          </button>
        </div>

        {/* «Усі операції» is the absence of a filter, not a value of one —
            hence null rather than a fifth enum member. */}
        <div className={styles.chips}>
          <button
            type="button"
            className={selectedType === null ? styles.chipActive : styles.chip}
            aria-pressed={selectedType === null}
            onClick={() => setSelectedType(null)}
          >
            {t.financePage.typeFilterAll}
          </button>
          {typeChips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={selectedType === chip.value ? styles.chipActive : styles.chip}
              aria-pressed={selectedType === chip.value}
              onClick={() => setSelectedType(chip.value)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className={styles.spacer} />

        <label className={styles.clientFilter}>
          <span className={styles.clientFilterText}>{clientFilterLabel}</span>
          <ChevronDownIcon width={12} height={12} />
          <select
            value={selectedClientId ?? ""}
            onChange={(event) => setSelectedClientId(event.target.value || null)}
            aria-label={clientFilterLabel}
          >
            <option value="">{t.financePage.allClients}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>

        {canEdit && (
          <button type="button" className={styles.newEntryBtn} onClick={openCreateDrawer}>
            <PlusIcon width={15} height={15} />
            {t.financePage.newEntryButton}
          </button>
        )}
      </div>

      {isLoading && <div className={styles.state}>{t.financePage.loading}</div>}

      {isError && (
        <div className={styles.state}>
          <p>
            {t.financePage.loadErrorPrefix}
            {error instanceof Error ? `: ${error.message}` : ""}
          </p>
          <button type="button" onClick={() => refetch()} className={styles.retry}>
            {t.financePage.retry}
          </button>
        </div>
      )}

      {data && (
        <>
          <FinanceStatCards summary={data.summary} />
          <CashFlowChart flow={data.flow} />
          <FinanceRegister entries={data.entries} onSelectEntry={openEntry} />
        </>
      )}

      {/* Mounted only for a member who may write: the drawer is a form, and an
          unreachable form is still a form somebody can tab into. */}
      {canEdit && (
        <FinanceEntryDrawer
          open={isDrawerOpen}
          entry={editingEntry}
          clients={clients}
          members={data?.members ?? []}
          defaultClientId={selectedClientId}
          defaultDate={defaultDateFor(month, today)}
          isSubmitting={createEntry.isPending || updateEntry.isPending}
          isMarkingPaid={markPaid.isPending}
          onSubmit={handleSubmit}
          onMarkPaid={handleMarkPaid}
          onDelete={setEntryPendingDeletion}
          onClose={() => setIsDrawerOpen(false)}
        />
      )}

      <ConfirmationDialog
        open={entryPendingDeletion !== null}
        title={t.financePage.deleteConfirmTitle}
        message={interpolate(t.financePage.deleteConfirmMessageTemplate, {
          title: entryPendingDeletion?.title ?? "",
        })}
        isConfirming={deleteEntry.isPending}
        onConfirm={handleConfirmDeletion}
        onCancel={() => setEntryPendingDeletion(null)}
      />
    </div>
  );
}
