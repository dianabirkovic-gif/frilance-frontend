import { apiRequest } from "./client";

/** Mirrors ClientResponse.ClientListItemDto on the backend exactly — keep in sync. */
export interface ClientListItem {
  id: string;
  name: string;
  niche: string | null;
  assigneeName: string | null;
  assigneeInitials: string | null;
  status: ClientStatus;
  nextPostLabel: string;
  monthlyRevenue: number | null;
  lastActivityLabel: string;
}

/** Mirrors ClientResponse.ClientDetailDto on the backend exactly — keep in sync. */
export interface ClientDetail {
  id: string;
  name: string;
  niche: string | null;
  assigneeName: string | null;
  status: ClientStatus;
  monthlyRevenue: number | null;
  cooperationDurationLabel: string;
  contactName: string | null;
  contactRole: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  stage: ClientStage;
  activity: ActivityEntry[];
}

export interface ActivityEntry {
  timeLabel: string;
  actorInitials: string;
  actorName: string;
  description: string;
}

export type ClientStatus = "ACTIVE" | "ATTENTION" | "NEW" | "ARCHIVED";
export type ClientStage = "BRIEF" | "ESTIMATE" | "PAYMENT" | "WORK_STARTED" | "REPORT";

/**
 * Mirrors CreateClientRequest on the backend exactly — keep in sync. No
 * `assigneeId` field yet: agency-mode team-member assignment has no data
 * source on the frontend until FR-02/team module lands (see backend
 * CLAUDE.md "Known simplifications"). Contact name/phone/email are required
 * — a client card always needs someone reachable on the other end.
 */
export interface CreateClientPayload {
  name: string;
  niche: string | null;
  tariffPlan: string | null;
  cooperationStartDate: string | null;
  serviceCost: number | null;
  status: ClientStatus;
  contactName: string;
  contactRole: string | null;
  contactPhone: string;
  contactEmail: string;
  stage: ClientStage | null;
}

export function getClients(): Promise<ClientListItem[]> {
  return apiRequest<ClientListItem[]>("/clients");
}

export function getClient(id: string): Promise<ClientDetail> {
  return apiRequest<ClientDetail>(`/clients/${id}`);
}

export function createClient(payload: CreateClientPayload): Promise<ClientDetail> {
  return apiRequest<ClientDetail>("/clients", { method: "POST", body: payload });
}

export function updateClientStatus(id: string, status: ClientStatus): Promise<ClientDetail> {
  return apiRequest<ClientDetail>(`/clients/${id}/status`, { method: "PATCH", body: { status } });
}
