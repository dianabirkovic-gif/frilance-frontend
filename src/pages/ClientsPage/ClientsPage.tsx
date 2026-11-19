import { useCallback, useMemo, useState } from "react";
import type { ClientListItem, ClientStatus, CreateClientPayload, TrashedClient } from "../../api/clients";
import { PlusIcon } from "../../atoms/icons/icons";
import { useAuth } from "../../hooks/useAuth";
import type { FilterId } from "../../i18n/dictionary";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { AddClientDrawer } from "../../organisms/AddClientDrawer/AddClientDrawer";
import { ClientDetailDrawer } from "../../organisms/ClientDetailDrawer/ClientDetailDrawer";
import { ClientTable } from "../../organisms/ClientTable/ClientTable";
import { ClientTrashTable } from "../../organisms/ClientTrashTable/ClientTrashTable";
import { ConfirmationDialog } from "../../organisms/ConfirmationDialog/ConfirmationDialog";
import { usePageFab } from "../../templates/AppShell/PageFabContext";
import { usePageHeader } from "../../templates/AppShell/PageHeaderContext";
import { ClientContentPlanTab } from "./ClientContentPlanTab";
import { ClientFilesTab } from "./ClientFilesTab";
import { ClientNotesTab } from "./ClientNotesTab";
import styles from "./ClientsPage.module.css";
import { useArchiveClient } from "./useArchiveClient";
import { useDeleteClient } from "./useDeleteClient";
import { useClientTrash, useEmptyTrash, usePurgeClient, useRestoreClient } from "./useClientTrash";
import { useAssignableMembers } from "./useAssignableMembers";
import { useUpdateClientAssignees } from "./useUpdateClientAssignees";
import { useClientDetail } from "./useClientDetail";
import { useClients } from "./useClients";
import { useCreateClient } from "./useCreateClient";
import { useUpdateClient } from "./useUpdateClient";

const FILTER_STATUS: { id: FilterId; status: ClientStatus | null }[] = [
  { id: "all", status: null },
  { id: "active", status: "ACTIVE" },
  { id: "attention", status: "ATTENTION" },
  { id: "archived", status: "ARCHIVED" },
];

function countFor(clients: ClientListItem[], status: ClientStatus | null): number {
  return status === null ? clients.length : clients.filter((c) => c.status === status).length;
}

export function ClientsPage() {
  const { data, isLoading, isError, error, refetch } = useClients();
  const { t } = useLocale();
  // READ opens this page but not its writes — the backend rejects them either
  // way (ClientService), this just doesn't offer buttons that would only 403.
  const { canEdit, ownsTenant } = useAuth();
  const canEditClients = canEdit("CLIENTS");
  // Editing what a client *is* — terms, contact, status — is the owner's, whatever the grant says.
  const canManageClient = ownsTenant && canEditClients;
  const { data: assignableMembers = [] } = useAssignableMembers(canEditClients);
  const updateAssignees = useUpdateClientAssignees();
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const clientDetail = useClientDetail(selectedClientId);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const archiveClient = useArchiveClient();
  const deleteClient = useDeleteClient();

  // The trash is the owner's: the tab, its count and its requests exist only for them.
  const [view, setView] = useState<"clients" | "trash">("clients");
  const trash = useClientTrash(canManageClient);
  const restoreClient = useRestoreClient();
  const purgeClient = usePurgeClient();
  const emptyTrash = useEmptyTrash();
  const [purgeTarget, setPurgeTarget] = useState<TrashedClient | null>(null);
  const [isEmptyConfirmOpen, setIsEmptyConfirmOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [trashNotice, setTrashNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const trashCount = trash.data?.clients.length ?? 0;
  const trashRetentionDays = trash.data?.retentionDays ?? 30;

  const filters = useMemo(
    () => FILTER_STATUS.map((filter) => ({ ...filter, label: t.clientsPage.filters[filter.id] })),
    [t],
  );

  const attentionCount = data ? countFor(data, "ATTENTION") : 0;
  usePageHeader({
    title: t.clientsPage.title,
    subtitle:
      view === "trash"
        ? interpolate(t.clientsPage.trash.subtitleTemplate, { count: trashCount, days: trashRetentionDays })
        : data
          ? interpolate(t.clientsPage.subtitleTemplate, { count: data.length, attentionCount })
          : "",
  });

  const openAddClient = useCallback(() => setIsAddClientOpen(true), []);
  const handleSaveAssignees = useCallback(
    (assigneeIds: string[]) => {
      if (!selectedClientId) return Promise.resolve();
      return updateAssignees.mutateAsync({ id: selectedClientId, assigneeIds });
    },
    [selectedClientId, updateAssignees],
  );

  usePageFab(canEditClients ? { label: t.clientsPage.newClientButton, onClick: openAddClient } : null);

  async function handleCreateClient(payload: CreateClientPayload) {
    await createClient.mutateAsync(payload);
    setIsAddClientOpen(false);
  }

  async function handleUpdateClient(payload: CreateClientPayload) {
    if (!selectedClientId) return;
    await updateClient.mutateAsync({ id: selectedClientId, payload });
    setIsEditClientOpen(false);
  }

  async function handleRestore(client: TrashedClient) {
    setTrashNotice(null);
    setRestoringId(client.id);
    try {
      await restoreClient.mutateAsync(client.id);
      setTrashNotice({ kind: "ok", text: interpolate(t.clientsPage.trash.restoredTemplate, { name: client.name }) });
    } catch {
      setTrashNotice({ kind: "error", text: t.clientsPage.trash.restoreError });
    } finally {
      setRestoringId(null);
    }
  }

  async function handleConfirmPurge() {
    if (!purgeTarget) return;
    setTrashNotice(null);
    try {
      await purgeClient.mutateAsync(purgeTarget.id);
    } catch {
      setTrashNotice({ kind: "error", text: t.clientsPage.trash.purgeError });
    } finally {
      setPurgeTarget(null);
    }
  }

  async function handleConfirmEmptyTrash() {
    setTrashNotice(null);
    try {
      await emptyTrash.mutateAsync();
    } catch {
      setTrashNotice({ kind: "error", text: t.clientsPage.trash.purgeError });
    } finally {
      setIsEmptyConfirmOpen(false);
    }
  }

  const activeFilterStatus = filters.find((f) => f.id === activeFilter)?.status ?? null;
  const filteredClients = useMemo(() => {
    if (!data) return [];
    return activeFilterStatus === null ? data : data.filter((c) => c.status === activeFilterStatus);
  }, [data, activeFilterStatus]);

  if (isLoading) {
    return <div className={styles.state}>{t.clientsPage.loading}</div>;
  }

  if (isError || !data) {
    return (
      <div className={styles.state}>
        <p>
          {t.clientsPage.loadErrorPrefix}
          {error instanceof Error ? error.message : ""}
        </p>
        <button type="button" onClick={() => refetch()} className={styles.retry}>
          {t.clientsPage.retry}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.filtersRow}>
        <div className={styles.filterChips}>
          {filters.map((filter) => (
            <button
              key={filter.id}
              className={
                view === "clients" && filter.id === activeFilter ? `${styles.filterChip} ${styles.active}` : styles.filterChip
              }
              onClick={() => {
                setActiveFilter(filter.id);
                setView("clients");
              }}
            >
              {filter.label} <span className={styles.count}>{countFor(data, filter.status)}</span>
            </button>
          ))}
          {canManageClient && (
            <button
              className={view === "trash" ? `${styles.filterChip} ${styles.active}` : styles.filterChip}
              onClick={() => setView("trash")}
            >
              {t.clientsPage.trash.chip} <span className={styles.count}>{trashCount}</span>
            </button>
          )}
        </div>
        <div className={styles.spacer} />
        {canEditClients && (
          <button type="button" className={styles.newClientBtn} onClick={openAddClient}>
            <PlusIcon width={15} height={15} />
            {t.clientsPage.newClientButton}
          </button>
        )}
      </div>

      {view === "clients" ? (
        <ClientTable clients={filteredClients} onSelectClient={setSelectedClientId} />
      ) : (
        <>
          <p className={styles.trashHint}>
            {interpolate(t.clientsPage.trash.hintTemplate, { days: trashRetentionDays })}
          </p>

          {trashNotice && (
            <div
              className={trashNotice.kind === "ok" ? styles.noticeOk : styles.noticeError}
              role={trashNotice.kind === "ok" ? "status" : "alert"}
            >
              {trashNotice.text}
            </div>
          )}

          {trash.isLoading && <div className={styles.state}>{t.clientsPage.trash.loading}</div>}
          {trash.isError && (
            <div className={styles.state} role="alert">
              {t.clientsPage.trash.loadErrorPrefix}
              <button type="button" onClick={() => trash.refetch()} className={styles.retry}>
                {t.clientsPage.trash.retry}
              </button>
            </div>
          )}
          {trash.data && (
            <>
              <ClientTrashTable
                clients={trash.data.clients}
                restoringId={restoringId}
                onRestore={handleRestore}
                onPurge={setPurgeTarget}
              />
              {trash.data.clients.length > 0 && (
                <div className={styles.trashFooter}>
                  <button type="button" className={styles.emptyTrashBtn} onClick={() => setIsEmptyConfirmOpen(true)}>
                    {t.clientsPage.trash.emptyTrash}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      <ClientDetailDrawer
        assignableMembers={assignableMembers}
        /* Built as an element, not mounted here: the drawer renders it only
           while its «Контент-план» tab is selected, so opening a client — which
           always lands on Огляд — costs the content plan no request. */
        contentTab={selectedClientId ? <ClientContentPlanTab clientId={selectedClientId} /> : undefined}
        filesTab={selectedClientId ? <ClientFilesTab clientId={selectedClientId} /> : undefined}
        notesTab={selectedClientId ? <ClientNotesTab clientId={selectedClientId} /> : undefined}
        canManageClient={canManageClient}
        onEdit={() => setIsEditClientOpen(true)}
        onSaveAssignees={handleSaveAssignees}
        open={selectedClientId !== null}
        detail={clientDetail.data}
        isLoading={clientDetail.isLoading}
        isError={clientDetail.isError}
        isArchiving={archiveClient.isPending}
        isDeleting={deleteClient.isPending}
        trashRetentionDays={trashRetentionDays}
        canEdit={canEditClients}
        onClose={() => setSelectedClientId(null)}
        onArchive={(clientId) => archiveClient.mutateAsync(clientId)}
        onDelete={(clientId) => deleteClient.mutateAsync(clientId)}
      />

      <ConfirmationDialog
        open={purgeTarget !== null}
        tone="danger"
        title={t.clientsPage.trash.purgeConfirmTitle}
        message={interpolate(t.clientsPage.trash.purgeConfirmMessageTemplate, { name: purgeTarget?.name ?? "" })}
        confirmLabel={t.clientsPage.trash.purgeConfirmLabel}
        cancelLabel={t.confirmationDialog.cancelLabel}
        isConfirming={purgeClient.isPending}
        onConfirm={handleConfirmPurge}
        onCancel={() => setPurgeTarget(null)}
      />

      <ConfirmationDialog
        open={isEmptyConfirmOpen}
        tone="danger"
        title={t.clientsPage.trash.emptyConfirmTitle}
        message={interpolate(t.clientsPage.trash.emptyConfirmMessageTemplate, { count: trashCount })}
        confirmLabel={t.clientsPage.trash.emptyConfirmLabel}
        cancelLabel={t.confirmationDialog.cancelLabel}
        isConfirming={emptyTrash.isPending}
        onConfirm={handleConfirmEmptyTrash}
        onCancel={() => setIsEmptyConfirmOpen(false)}
      />

      {canManageClient && (
        <AddClientDrawer
          assignableMembers={assignableMembers}
          client={clientDetail.data ?? null}
          open={isEditClientOpen}
          isSubmitting={updateClient.isPending}
          onSubmit={handleUpdateClient}
          onClose={() => setIsEditClientOpen(false)}
        />
      )}

      {canEditClients && (
        <AddClientDrawer
          assignableMembers={assignableMembers}
          open={isAddClientOpen}
          isSubmitting={createClient.isPending}
          onSubmit={handleCreateClient}
          onClose={() => setIsAddClientOpen(false)}
        />
      )}
    </div>
  );
}
