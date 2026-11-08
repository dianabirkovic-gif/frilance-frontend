import type { Role } from "./auth";
import { apiRequest } from "./client";

/** Mirrors ClientResponse.ClientListItemDto on the backend exactly — keep in sync. */
export interface ClientListItem {
  id: string;
  name: string;
  niche: string | null;
  /** Everyone staffed on this client — FR-05 allows several. */
  assignees: ClientAssignee[];
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
  assignees: ClientAssignee[];
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

/**
 * Mirrors ClientResponse.AssigneeDto — one staffed member, and also the shape
 * the assignable-members picker returns.
 */
export interface ClientAssignee {
  id: string;
  name: string;
  initials: string;
  role: Role;
}

export interface ActivityEntry {
  timeLabel: string;
  actorInitials: string;
  actorName: string;
  description: string;
}

export type ClientStatus = "ACTIVE" | "ATTENTION" | "NEW" | "ARCHIVED";
export type ClientStage = "BRIEF" | "ESTIMATE" | "PAYMENT" | "WORK_STARTED" | "REPORT";

/** Display order for the cooperation stages — shared by AddClientDrawer's stage select and CooperationTimeline. */
export const CLIENT_STAGE_ORDER: ClientStage[] = ["BRIEF", "ESTIMATE", "PAYMENT", "WORK_STARTED", "REPORT"];

/**
 * Mirrors CreateClientRequest on the backend exactly — keep in sync.
 * `assigneeIds` is the whole staffing of the client: the backend replaces the
 * set on every write, so omitting a member removes them (and their sight of
 * the client — see `new-requirements.md` #22). Contact name/phone/email are
 * required — a client card always needs someone reachable on the other end.
 */
export interface CreateClientPayload {
  assigneeIds: string[];
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

/**
 * The team roster the assignee picker offers — names and roles only, and only
 * for members of the caller's own tenant. `GET /team` is owner-only, so this
 * narrower lookup is what lets a PM with Clients FULL staff a client (see
 * `new-requirements.md` #16 and #22).
 */
export function getAssignableMembers(): Promise<ClientAssignee[]> {
  return apiRequest<ClientAssignee[]>("/clients/assignable-members");
}

/**
 * Restaff a client. Deliberately its own endpoint rather than a full client
 * update: `ClientDetail` carries no `tariffPlan` and only a formatted
 * duration label rather than the start date, so rebuilding a whole update
 * request from what this screen can see would silently null both.
 *
 * The list is the whole staffing — a member left out is removed.
 */
export function updateClientAssignees(id: string, assigneeIds: string[]): Promise<ClientDetail> {
  // `apiRequest` serialises `body` itself — stringifying here would send the
  // JSON as a JSON *string* and the server would reject the whole object.
  return apiRequest<ClientDetail>(`/clients/${id}/assignees`, {
    method: "PUT",
    body: { assigneeIds },
  });
}
