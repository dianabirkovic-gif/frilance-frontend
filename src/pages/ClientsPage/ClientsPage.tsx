import { useCallback, useMemo, useState } from "react";
import type { ClientListItem, ClientStatus, CreateClientPayload } from "../../api/clients";
import { PlusIcon } from "../../atoms/icons/icons";
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

type FilterId = "all" | "active" | "attention" | "archived";

const FILTERS: { id: FilterId; label: string; status: ClientStatus | null }[] = [
  { id: "all", label: "Усі", status: null },
  { id: "active", label: "Активні", status: "ACTIVE" },
  { id: "attention", label: "Потребують уваги", status: "ATTENTION" },
  { id: "archived", label: "Архів", status: "ARCHIVED" },
];

function countFor(clients: ClientListItem[], status: ClientStatus | null): number {
  return status === null ? clients.length : clients.filter((c) => c.status === status).length;
}

export function ClientsPage() {
  const { data, isLoading, isError, error, refetch } = useClients();
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const clientDetail = useClientDetail(selectedClientId);
  const createClient = useCreateClient();
  const archiveClient = useArchiveClient();

  const attentionCount = data ? countFor(data, "ATTENTION") : 0;
  usePageHeader({
    title: "Клієнти",
    subtitle: data ? `${data.length} клієнтів · ${attentionCount} потребують уваги` : "",
  });

  const openAddClient = useCallback(() => setIsAddClientOpen(true), []);
  usePageFab({ label: "Новий клієнт", onClick: openAddClient });

  async function handleCreateClient(payload: CreateClientPayload) {
    await createClient.mutateAsync(payload);
    setIsAddClientOpen(false);
  }

  const activeFilterStatus = FILTERS.find((f) => f.id === activeFilter)?.status ?? null;
  const filteredClients = useMemo(() => {
    if (!data) return [];
    return activeFilterStatus === null ? data : data.filter((c) => c.status === activeFilterStatus);
  }, [data, activeFilterStatus]);

  if (isLoading) {
    return <div className={styles.state}>Завантаження…</div>;
  }

  if (isError || !data) {
    return (
      <div className={styles.state}>
        <p>Не вдалося завантажити дані. {error instanceof Error ? error.message : ""}</p>
        <button type="button" onClick={() => refetch()} className={styles.retry}>
          Спробувати ще раз
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.filtersRow}>
        <div className={styles.filterChips}>
          {FILTERS.map((filter) => (
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
          Новий клієнт
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
