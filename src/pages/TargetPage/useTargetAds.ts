import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  analyticsQueryKey,
  campaignStatsQueryKey,
  campaignsQueryKey,
  createCampaign,
  creativesQueryKey,
  deleteCampaign,
  deleteCampaignStat,
  deleteCreative,
  getAnalytics,
  getCampaignStats,
  getCampaigns,
  getCreatives,
  importCampaignStats,
  saveCampaignStat,
  updateCampaign,
  uploadCreative,
  type CampaignPayload,
  type StatPayload,
} from "../../api/targetAds";

/**
 * Reads. The filter changes the key, and keeping the previous answer on screen
 * while the next loads avoids a flash of the loading state on every client
 * change — nothing in these screens' headings flips on a click.
 */
export function useCampaigns(clientId: string | null) {
  return useQuery({
    queryKey: campaignsQueryKey(clientId),
    queryFn: () => getCampaigns(clientId),
    placeholderData: keepPreviousData,
  });
}

export function useCampaignStats(campaignId: string | null) {
  return useQuery({
    queryKey: campaignStatsQueryKey(campaignId ?? ""),
    queryFn: () => getCampaignStats(campaignId as string),
    enabled: campaignId !== null,
  });
}

export function useAnalytics(clientId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: analyticsQueryKey(clientId, from, to),
    queryFn: () => getAnalytics(clientId, from, to),
    placeholderData: keepPreviousData,
  });
}

export function useCreatives(clientId: string | null) {
  return useQuery({
    queryKey: creativesQueryKey(clientId),
    queryFn: () => getCreatives(clientId),
    placeholderData: keepPreviousData,
  });
}

/**
 * Every write here can change what the campaigns list, a campaign's stats, the
 * analysis and the creatives show (a stat day moves the totals; deleting a
 * campaign unlinks its creatives), so all of them invalidate the whole
 * `target` key rather than patching one cache entry.
 */
function useAdsMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["target"] }),
  });
}

export function useCreateCampaign() {
  return useAdsMutation((payload: CampaignPayload) => createCampaign(payload));
}

export function useUpdateCampaign() {
  return useAdsMutation(({ id, payload }: { id: string; payload: CampaignPayload }) => updateCampaign(id, payload));
}

export function useDeleteCampaign() {
  return useAdsMutation((id: string) => deleteCampaign(id));
}

export function useSaveCampaignStat() {
  return useAdsMutation(({ id, payload }: { id: string; payload: StatPayload }) => saveCampaignStat(id, payload));
}

export function useImportCampaignStats() {
  return useAdsMutation(({ id, rows }: { id: string; rows: StatPayload[] }) => importCampaignStats(id, rows));
}

export function useDeleteCampaignStat() {
  return useAdsMutation(({ campaignId, statId }: { campaignId: string; statId: string }) =>
    deleteCampaignStat(campaignId, statId),
  );
}

export function useUploadCreative() {
  return useAdsMutation(uploadCreative);
}

export function useDeleteCreative() {
  return useAdsMutation((id: string) => deleteCreative(id));
}
