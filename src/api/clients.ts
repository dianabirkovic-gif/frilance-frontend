import type { Role } from "./auth";
import { apiRequest, apiRequestBlob } from "./client";

/** Mirrors ClientResponse.ClientListItemDto on the backend exactly — keep in sync. */
export interface ClientListItem {
  id: string;
  name: string;
  niche: string | null;
  /** Everyone staffed on this client — FR-05 allows several. */
  assignees: ClientAssignee[];
  status: ClientStatus;
  nextPostLabel: string;
  /**
   * The owner's: what the client is worth to the agency. A member's: what they
   * themselves were paid for this client this month. Null means no figure.
   */
  monthlyRevenue: number | null;
  revenueScope: RevenueScope;
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
  revenueScope: RevenueScope;
  cooperationDurationLabel: string;
  contactName: string | null;
  contactRole: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  stage: ClientStage;
  activity: ActivityEntry[];
  /** The deal's terms — sent to the owner only, and what the edit form starts from. Null for everyone else. */
  tariffPlan: string | null;
  /** `YYYY-MM-DD`. */
  cooperationStartDate: string | null;
  serviceCost: number | null;
}

/** `AGENCY` is the owner's picture; `PERSONAL` is a team member's own pay from the client. */
export type RevenueScope = "AGENCY" | "PERSONAL";

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

/**
 * Edit a client — every field. Owner-only on the backend (403 for anyone else);
 * the body is the same shape as creation, and a full replacement, so every
 * field must be sent.
 */
export function updateClient(id: string, payload: CreateClientPayload): Promise<ClientDetail> {
  return apiRequest<ClientDetail>(`/clients/${id}`, { method: "PUT", body: payload });
}

/**
 * «Видалити»: moves a client to the trash — it disappears from the app, but everything it had is
 * kept, and it can be restored until the trash purges it. Owner-only on the backend (403 for
 * anyone else).
 */
export function deleteClient(id: string): Promise<void> {
  return apiRequest<void>(`/clients/${id}`, { method: "DELETE" });
}

/** Mirrors ClientTrashResponse.TrashedClientDto. */
export interface TrashedClient {
  id: string;
  name: string;
  niche: string | null;
  /** ISO instant. */
  deletedAt: string;
  deletedByName: string | null;
  /** ISO instant: when the daily purge deletes it for good unless it is restored first. */
  purgeAt: string;
}

/** Mirrors ClientTrashResponse.TrashDto. */
export interface Trash {
  clients: TrashedClient[];
  retentionDays: number;
}

/** What the trash holds. Owner-only. */
export function getTrash(): Promise<Trash> {
  return apiRequest<Trash>("/clients/trash");
}

/** Back among the living, with every post, campaign, file and note it had. */
export function restoreClient(id: string): Promise<void> {
  return apiRequest<void>(`/clients/${id}/restore`, { method: "POST" });
}

/**
 * Deletes a client **already in the trash** for good — its notes, files, posts, campaigns,
 * statistics, creatives and tasks go with it. Finance entries stay and lose only their link to
 * the client. An active client is a 404 here: it has to go through the trash first.
 */
export function purgeClient(id: string): Promise<void> {
  return apiRequest<void>(`/clients/${id}/permanent`, { method: "DELETE" });
}

/** Deletes everything in the trash for good. */
export function emptyTrash(): Promise<{ purged: number }> {
  return apiRequest<{ purged: number }>("/clients/trash", { method: "DELETE" });
}

/** Mirrors ClientAttachmentsResponse.ClientNoteDto. */
export interface ClientNote {
  id: string;
  body: string;
  authorName: string;
  /** ISO instant. */
  createdAt: string;
  updatedAt: string;
  /** The caller wrote it or owns the agency — derived server-side, never guessed here. */
  canModify: boolean;
}

/** Mirrors ClientAttachmentsResponse.ClientFileDto. */
export interface ClientFile {
  id: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  uploadedByName: string;
  createdAt: string;
  canDelete: boolean;
}

/** Must match the backend's limit (`spring.servlet.multipart.max-file-size`) — checked here first so a big file fails before it uploads. */
export const MAX_CLIENT_FILE_BYTES = 10 * 1024 * 1024;

/** Mirrors the backend's allow-list in `ClientAttachmentsService` — the picker's `accept` hint, not a security check. */
export const CLIENT_FILE_EXTENSIONS = [
  "pdf", "png", "jpg", "jpeg", "gif", "webp", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "zip", "mp4", "mov",
];

export const clientNotesQueryKey = (clientId: string) => ["clientNotes", clientId] as const;
export const clientFilesQueryKey = (clientId: string) => ["clientFiles", clientId] as const;

export function getClientNotes(clientId: string): Promise<ClientNote[]> {
  return apiRequest<ClientNote[]>(`/clients/${clientId}/notes`);
}

export function addClientNote(clientId: string, body: string): Promise<ClientNote> {
  return apiRequest<ClientNote>(`/clients/${clientId}/notes`, { method: "POST", body: { body } });
}

export function editClientNote(clientId: string, noteId: string, body: string): Promise<ClientNote> {
  return apiRequest<ClientNote>(`/clients/${clientId}/notes/${noteId}`, { method: "PUT", body: { body } });
}

export function deleteClientNote(clientId: string, noteId: string): Promise<void> {
  return apiRequest<void>(`/clients/${clientId}/notes/${noteId}`, { method: "DELETE" });
}

export function getClientFiles(clientId: string): Promise<ClientFile[]> {
  return apiRequest<ClientFile[]>(`/clients/${clientId}/files`);
}

export function uploadClientFile(clientId: string, file: File): Promise<ClientFile> {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<ClientFile>(`/clients/${clientId}/files`, { method: "POST", body: form });
}

export function deleteClientFile(clientId: string, fileId: string): Promise<void> {
  return apiRequest<void>(`/clients/${clientId}/files/${fileId}`, { method: "DELETE" });
}

export function downloadClientFile(clientId: string, fileId: string): Promise<Blob> {
  return apiRequestBlob(`/clients/${clientId}/files/${fileId}/download`);
}
