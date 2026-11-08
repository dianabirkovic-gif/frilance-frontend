import { apiRequest } from "./client";

/**
 * FR-08's publication lifecycle, in cycle order — clicking a status chip
 * advances to the next one and wraps. Mirrors the backend's `PostStatus`
 * enum, whose declaration order says the same thing; `PUBLISHED` is "done"
 * for every count and the only status that may carry a rating.
 */
export const POST_STATUS_ORDER = ["DRAFT", "REVIEW", "READY", "PUBLISHED"] as const;

export type PostStatus = (typeof POST_STATUS_ORDER)[number];

/** Mirrors the backend's `PostType` enum — the mockup's "+ Пост" type select. */
export const POST_TYPE_ORDER = ["REELS", "CAROUSEL", "POST", "STORIES", "TIKTOK"] as const;

export type PostType = (typeof POST_TYPE_ORDER)[number];

/** The highest rating FR-08 allows ("оцінювати за 3-бальною шкалою"). */
export const MAX_POST_RATING = 3;

export function nextPostStatus(status: PostStatus): PostStatus {
  const index = POST_STATUS_ORDER.indexOf(status);
  return POST_STATUS_ORDER[(index + 1) % POST_STATUS_ORDER.length];
}

/** Mirrors ContentPlanResponse.PostDto on the backend exactly — keep in sync. */
export interface Post {
  id: string;
  clientId: string;
  clientName: string;
  type: PostType;
  title: string;
  /** `YYYY-MM-DD`. */
  scheduledDate: string;
  status: PostStatus;
  /** Null until a published post is rated. */
  rating: number | null;
  /**
   * Who wrote it — the member who created the post, stamped server-side.
   * Null for posts created before the backend recorded authorship.
   */
  authorId: string | null;
  authorName: string | null;
  /**
   * Free-form note about the post (#24) — sanitized HTML from the server, or
   * null when there is none. It belongs in a rich-text editor; anywhere else,
   * rendering it is a decision about markup you own.
   */
  note: string | null;
}

/** Mirrors ContentPlanResponse.ContentPlanClientDto — the section's own client picker. */
export interface ContentPlanClient {
  id: string;
  name: string;
  /**
   * The client's cooperation is finished («Завершено» — an ARCHIVED client).
   * It stays in the picker because its months are still worth reading, but no
   * new post may be planned for it; the backend refuses the write either way.
   * See `../freelance-all/new-requirements.md` #23.
   */
  archived: boolean;
}

/** Mirrors ContentPlanResponse.ContentPlanDto on the backend exactly — keep in sync. */
export interface ContentPlan {
  /** `YYYY-MM`. */
  month: string;
  selectedClientId: string | null;
  clients: ContentPlanClient[];
  totalPosts: number;
  publishedPosts: number;
  posts: Post[];
}

/** Mirrors CreatePostRequest — `status` omitted means DRAFT, the FR's default. */
export interface CreatePostPayload {
  clientId: string;
  type: PostType;
  title: string;
  scheduledDate: string;
  status?: PostStatus;
  /** Null clears it; on update, omitting it means the same — the PUT is a full replacement. */
  note: string | null;
}

/** Mirrors UpdatePostRequest — a full replacement, every field required. */
export interface UpdatePostPayload extends CreatePostPayload {
  status: PostStatus;
}

/**
 * The TanStack cache identity of one month of one client's plan — it lives
 * next to the request it stands for because two screens now read the same
 * months: the content plan itself, and the client drawer's «Контент-план»
 * tab. `usePostMutations` invalidates the whole `contentPlan` prefix after
 * every write, so a second key under another name would quietly go stale.
 */
export function contentPlanQueryKey(month: string, clientId: string | null) {
  return ["contentPlan", month, clientId] as const;
}

export function getContentPlan(month: string, clientId: string | null): Promise<ContentPlan> {
  const params = new URLSearchParams({ month });
  if (clientId) {
    params.set("clientId", clientId);
  }
  return apiRequest<ContentPlan>(`/content-plan?${params.toString()}`);
}

export function createPost(payload: CreatePostPayload): Promise<Post> {
  return apiRequest<Post>("/content-plan/posts", { method: "POST", body: payload });
}

export function updatePost(id: string, payload: UpdatePostPayload): Promise<Post> {
  return apiRequest<Post>(`/content-plan/posts/${id}`, { method: "PUT", body: payload });
}

export function updatePostStatus(id: string, status: PostStatus): Promise<Post> {
  return apiRequest<Post>(`/content-plan/posts/${id}/status`, { method: "PATCH", body: { status } });
}

/** `null` clears the rating — the mockup's "скинути". */
export function updatePostRating(id: string, rating: number | null): Promise<Post> {
  return apiRequest<Post>(`/content-plan/posts/${id}/rating`, { method: "PATCH", body: { rating } });
}

export function deletePost(id: string): Promise<void> {
  return apiRequest<void>(`/content-plan/posts/${id}`, { method: "DELETE" });
}
