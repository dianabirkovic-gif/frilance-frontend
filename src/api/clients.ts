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

export function getClients(): Promise<ClientListItem[]> {
  return apiRequest<ClientListItem[]>("/clients");
}

export function getClient(id: string): Promise<ClientDetail> {
  return apiRequest<ClientDetail>(`/clients/${id}`);
}
