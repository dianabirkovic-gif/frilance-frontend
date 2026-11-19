import { apiRequest } from "./client";

/** The board's columns, in lifecycle order. Mirrors the backend's `TargetTaskStatus`. */
export const TARGET_STATUS_ORDER = ["TODO", "IN_PROGRESS", "DONE"] as const;
export type TargetTaskStatus = (typeof TARGET_STATUS_ORDER)[number];

/** Mirrors the backend's `TargetTaskKind` — what sort of work a task is. */
export const TARGET_KIND_ORDER = ["CREATIVE", "LAUNCH", "OPTIMIZATION", "REPORT", "OTHER"] as const;
export type TargetTaskKind = (typeof TARGET_KIND_ORDER)[number];

/** The status a card moves to on "advance"; DONE is the end and has no next. */
export function nextTargetStatus(status: TargetTaskStatus): TargetTaskStatus | null {
  const index = TARGET_STATUS_ORDER.indexOf(status);
  return TARGET_STATUS_ORDER[index + 1] ?? null;
}

/** Mirrors TargetResponse.TargetTaskDto on the backend exactly — keep in sync. */
export interface TargetTask {
  id: string;
  clientId: string;
  clientName: string;
  kind: TargetTaskKind;
  title: string;
  description: string | null;
  /** `YYYY-MM-DD`, or null when the task has no deadline. */
  dueDate: string | null;
  status: TargetTaskStatus;
  /** Open and past its due date — decided server-side so the board and the API agree on "today". */
  overdue: boolean;
  authorId: string | null;
  authorName: string | null;
  /** ISO instant. */
  createdAt: string;
}

/**
 * Mirrors TargetResponse.TargetClientDto — the section's own client picker.
 * `archived` is a completed client: it stays listed (its tasks are readable and
 * editable) but takes no new task.
 */
export interface TargetClient {
  id: string;
  name: string;
  archived: boolean;
}

/** Mirrors TargetResponse.TargetBoardDto on the backend exactly — keep in sync. */
export interface TargetBoard {
  selectedClientId: string | null;
  clients: TargetClient[];
  totalTasks: number;
  doneTasks: number;
  overdueTasks: number;
  tasks: TargetTask[];
}

/** Mirrors CreateTargetTaskRequest — `status` omitted means TODO. */
export interface CreateTargetTaskPayload {
  clientId: string;
  kind: TargetTaskKind;
  title: string;
  description: string | null;
  dueDate: string | null;
  status?: TargetTaskStatus;
}

/** Mirrors UpdateTargetTaskRequest — a full replacement, every field required. */
export interface UpdateTargetTaskPayload extends CreateTargetTaskPayload {
  status: TargetTaskStatus;
}

export function targetBoardQueryKey(clientId: string | null) {
  return ["target", "board", clientId] as const;
}

export function getTargetBoard(clientId: string | null): Promise<TargetBoard> {
  const query = clientId ? `?${new URLSearchParams({ clientId }).toString()}` : "";
  return apiRequest<TargetBoard>(`/target/tasks${query}`);
}

export function createTargetTask(payload: CreateTargetTaskPayload): Promise<TargetTask> {
  return apiRequest<TargetTask>("/target/tasks", { method: "POST", body: payload });
}

export function updateTargetTask(id: string, payload: UpdateTargetTaskPayload): Promise<TargetTask> {
  return apiRequest<TargetTask>(`/target/tasks/${id}`, { method: "PUT", body: payload });
}

export function updateTargetTaskStatus(id: string, status: TargetTaskStatus): Promise<TargetTask> {
  return apiRequest<TargetTask>(`/target/tasks/${id}/status`, { method: "PATCH", body: { status } });
}

export function deleteTargetTask(id: string): Promise<void> {
  return apiRequest<void>(`/target/tasks/${id}`, { method: "DELETE" });
}
