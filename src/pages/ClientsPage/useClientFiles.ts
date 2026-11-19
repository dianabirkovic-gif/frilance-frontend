import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clientFilesQueryKey,
  deleteClientFile,
  downloadClientFile,
  getClientFiles,
  uploadClientFile,
  type ClientFile,
} from "../../api/clients";

export function useClientFiles(clientId: string) {
  return useQuery({ queryKey: clientFilesQueryKey(clientId), queryFn: () => getClientFiles(clientId) });
}

export function useClientFileMutations(clientId: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: clientFilesQueryKey(clientId) });
  return {
    upload: useMutation({ mutationFn: (file: File) => uploadClientFile(clientId, file), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => deleteClientFile(clientId, id), onSuccess: refresh }),
    /** Fetches with the bearer token, then hands the browser a download — a plain link could not send it. */
    download: useMutation({
      mutationFn: async (file: ClientFile) => {
        const blob = await downloadClientFile(clientId, file.id);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file.name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      },
    }),
  };
}
