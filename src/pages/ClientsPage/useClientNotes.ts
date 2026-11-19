import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addClientNote,
  clientNotesQueryKey,
  deleteClientNote,
  editClientNote,
  getClientNotes,
} from "../../api/clients";

export function useClientNotes(clientId: string) {
  return useQuery({ queryKey: clientNotesQueryKey(clientId), queryFn: () => getClientNotes(clientId) });
}

/** Every note write refetches the list: the server owns `canModify` and the ordering. */
export function useClientNoteMutations(clientId: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: clientNotesQueryKey(clientId) });
  return {
    add: useMutation({ mutationFn: (body: string) => addClientNote(clientId, body), onSuccess: refresh }),
    edit: useMutation({
      mutationFn: ({ id, body }: { id: string; body: string }) => editClientNote(clientId, id, body),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: string) => deleteClientNote(clientId, id), onSuccess: refresh }),
  };
}
