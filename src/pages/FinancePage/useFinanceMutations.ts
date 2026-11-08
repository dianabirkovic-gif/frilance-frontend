import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createFinanceEntry,
  deleteFinanceEntry,
  updateFinanceEntry,
  updatePaymentStatus,
  type CreateFinanceEntryPayload,
  type PaymentStatus,
  type UpdateFinanceEntryPayload,
} from "../../api/finance";

/**
 * FR-09's writes. Every one of them can move an operation out of the month or
 * the client currently on screen — a re-dated invoice, one refiled against
 * another client — so they all invalidate the whole `finance` key rather than
 * patching the cached month in place. Both the month it left and the month it
 * landed in have to catch up, and only the server knows which those are.
 *
 * The Overview screen draws its revenue hero and finance strip from the same
 * entries, so it is invalidated too: marking an invoice paid must not leave
 * the dashboard reporting last week's income.
 */
function useFinanceMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
    },
  });
}

export function useCreateFinanceEntry() {
  return useFinanceMutation((payload: CreateFinanceEntryPayload) => createFinanceEntry(payload));
}

export function useUpdateFinanceEntry() {
  return useFinanceMutation(({ id, payload }: { id: string; payload: UpdateFinanceEntryPayload }) =>
    updateFinanceEntry(id, payload),
  );
}

/**
 * The narrow status write. It exists separately from the full update for the
 * reason `PUT /clients/{id}/assignees` does (#22a): marking an invoice paid is
 * this module's most frequent action, and rebuilding a whole entry to do it
 * would risk blanking a field the caller never saw.
 */
export function useUpdatePaymentStatus() {
  return useFinanceMutation(({ id, paymentStatus }: { id: string; paymentStatus: PaymentStatus }) =>
    updatePaymentStatus(id, paymentStatus),
  );
}

export function useDeleteFinanceEntry() {
  return useFinanceMutation((id: string) => deleteFinanceEntry(id));
}
