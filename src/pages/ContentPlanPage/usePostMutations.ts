import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPost,
  deletePost,
  updatePost,
  updatePostRating,
  updatePostStatus,
  type CreatePostPayload,
  type PostStatus,
  type UpdatePostPayload,
} from "../../api/contentPlan";

/**
 * FR-08's writes. Every one of them can move a post out of the month or
 * client currently on screen (a re-scheduled post, a post reassigned to
 * another client), so they all invalidate the whole `contentPlan` key rather
 * than patching the cached month in place — the source month and the
 * destination month both have to catch up, and only the server knows which
 * ones those are after the fact.
 *
 * The dashboard's weekly strip is the same data, so it is invalidated too:
 * publishing today's post should not leave the Overview screen claiming it's
 * still a draft.
 */
function useContentPlanMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contentPlan"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
      // A post is a client's "next scheduled post" in the clients list.
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useCreatePost() {
  return useContentPlanMutation((payload: CreatePostPayload) => createPost(payload));
}

export function useUpdatePost() {
  return useContentPlanMutation(({ id, payload }: { id: string; payload: UpdatePostPayload }) =>
    updatePost(id, payload),
  );
}

export function useUpdatePostStatus() {
  return useContentPlanMutation(({ id, status }: { id: string; status: PostStatus }) => updatePostStatus(id, status));
}

export function useRatePost() {
  return useContentPlanMutation(({ id, rating }: { id: string; rating: number | null }) =>
    updatePostRating(id, rating),
  );
}

export function useDeletePost() {
  return useContentPlanMutation((id: string) => deletePost(id));
}
