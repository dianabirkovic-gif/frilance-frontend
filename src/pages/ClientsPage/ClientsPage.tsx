import { useCallback, useMemo, useState } from "react";
import type { ClientListItem, ClientStatus, CreateClientPayload } from "../../api/clients";
import { PlusIcon } from "../../atoms/icons/icons";
import type { FilterId } from "../../i18n/dictionary";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { AddClientDrawer } from "../../organisms/AddClientDrawer/AddClientDrawer";
import { ClientDetailDrawer } from "../../organisms/ClientDetailDrawer/ClientDetailDrawer";
import { ClientTable } from "../../organisms/ClientTable/ClientTable";
import { usePageFab } from "../../templates/AppShell/PageFabContext";
import { usePageHeader } from "../../templates/AppShell/PageHeaderContext";
import styles from "./ClientsPage.module.css";
import { useArchiveClient } from "./useArchiveClient";
import { useClientDetail } from "./useClientDetail";
import { useClients } from "./useClients";
import { useCreateClient } from "./useCreateClient";

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
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const clientDetail = useClientDetail(selectedClientId);
  const createClient = useCreateClient();
  const archiveClient = useArchiveClient();

  const filters = useMemo(
    () => FILTER_STATUS.map((filter) => ({ ...filter, label: t.clientsPage.filters[filter.id] })),
    [t],
  );

  const attentionCount = data ? countFor(data, "ATTENTION") : 0;
  usePageHeader({
    title: t.clientsPage.title,
    subtitle: data ? interpolate(t.clientsPage.subtitleTemplate, { count: data.length, attentionCount }) : "",
  });

  const openAddClient = useCallback(() => setIsAddClientOpen(true), []);
  usePageFab({ label: t.clientsPage.newClientButton, onClick: openAddClient });

  async function handleCreateClient(payload: CreateClientPayload) {
    await createClient.mutateAsync(payload);
    setIsAddClientOpen(false);
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
              className={filter.id === activeFilter ? `${styles.filterChip} ${styles.active}` : styles.filterChip}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label} <span className={styles.count}>{countFor(data, filter.status)}</span>
            </button>
          ))}
        </div>
        <div className={styles.spacer} />
        <button type="button" className={styles.newClientBtn} onClick={openAddClient}>
          <PlusIcon width={15} height={15} />
          {t.clientsPage.newClientButton}
        </button>
      </div>

      <ClientTable clients={filteredClients} onSelectClient={setSelectedClientId} />

      <ClientDetailDrawer
        open={selectedClientId !== null}
        detail={clientDetail.data}
        isLoading={clientDetail.isLoading}
        isArchiving={archiveClient.isPending}
        onClose={() => setSelectedClientId(null)}
        onArchive={(clientId) => archiveClient.mutateAsync(clientId)}
      />

      <AddClientDrawer
        open={isAddClientOpen}
        isSubmitting={createClient.isPending}
        onSubmit={handleCreateClient}
        onClose={() => setIsAddClientOpen(false)}
      />
    </div>
  );
}
