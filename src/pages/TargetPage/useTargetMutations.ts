import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createTargetTask,
  deleteTargetTask,
  updateTargetTask,
  updateTargetTaskStatus,
  type CreateTargetTaskPayload,
  type TargetTaskStatus,
  type UpdateTargetTaskPayload,
} from "../../api/target";

/**
 * Every write can move a task between clients or columns, so all of them
 * invalidate the whole `target` key rather than patching one cached board — the
 * unfiltered board and the filtered one both have to catch up.
 */
function useTargetMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["target"] }),
  });
}

export function useCreateTargetTask() {
  return useTargetMutation((payload: CreateTargetTaskPayload) => createTargetTask(payload));
}

export function useUpdateTargetTask() {
  return useTargetMutation(({ id, payload }: { id: string; payload: UpdateTargetTaskPayload }) =>
    updateTargetTask(id, payload),
  );
}

export function useUpdateTargetTaskStatus() {
  return useTargetMutation(({ id, status }: { id: string; status: TargetTaskStatus }) =>
    updateTargetTaskStatus(id, status),
  );
}

export function useDeleteTargetTask() {
  return useTargetMutation((id: string) => deleteTargetTask(id));
}
