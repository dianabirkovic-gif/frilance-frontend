import { apiRequest, apiRequestBlob } from "./client";
import type { TargetClient } from "./target";

/** Mirrors the backend's `CampaignPlatform`. */
export const CAMPAIGN_PLATFORM_ORDER = ["META", "GOOGLE", "TIKTOK", "OTHER"] as const;
export type CampaignPlatform = (typeof CAMPAIGN_PLATFORM_ORDER)[number];

/** Mirrors the backend's `CampaignStatus`. */
export const CAMPAIGN_STATUS_ORDER = ["ACTIVE", "PAUSED", "FINISHED"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUS_ORDER)[number];

/** Mirrors the backend's `CreativeKind`. */
export type CreativeKind = "IMAGE" | "VIDEO";

/**
 * Mirrors CampaignResponse.MetricsDto. The ratios are null when their
 * denominator is zero — render a dash, never 0 (a CPL of 0 would read as the
 * best result there is).
 */
export interface Metrics {
  spend: number;
  impressions: number;
  /** Sum of the days' reach: an upper bound on unique reach over a period, not the unique figure. */
  reach: number;
  clicks: number;
  leads: number;
  revenue: number;
  /** Clicks per 100 impressions, %. */
  ctr: number | null;
  cpc: number | null;
  cpl: number | null;
  /** Spend per 1000 impressions. */
  cpm: number | null;
  /** Revenue per unit of spend; null without revenue and spend. */
  roas: number | null;
}

/** Mirrors CampaignResponse.CampaignDto. */
export interface Campaign {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  platform: CampaignPlatform;
  status: CampaignStatus;
  /** `YYYY-MM-DD`. */
  startDate: string;
  endDate: string | null;
  budget: number | null;
  /** Over every day entered so far. */
  totals: Metrics;
  statDays: number;
}

export interface CampaignList {
  selectedClientId: string | null;
  clients: TargetClient[];
  campaigns: Campaign[];
}

/** Mirrors CampaignRequests.CampaignRequest — a full replacement, every field sent. */
export interface CampaignPayload {
  clientId: string;
  name: string;
  platform: CampaignPlatform;
  status: CampaignStatus;
  startDate: string;
  endDate: string | null;
  budget: number | null;
}

export interface StatRow {
  id: string;
  date: string;
  metrics: Metrics;
}

export interface CampaignStats {
  campaign: Campaign;
  rows: StatRow[];
}

/** Mirrors CampaignRequests.CampaignStatRequest. Saving a date that has a row replaces it. */
export interface StatPayload {
  statDate: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  revenue: number | null;
}

export interface Analytics {
  selectedClientId: string | null;
  from: string;
  to: string;
  clients: TargetClient[];
  totals: Metrics;
  byCampaign: { campaignId: string; name: string; clientName: string; platform: CampaignPlatform; metrics: Metrics }[];
  byPlatform: { platform: CampaignPlatform; metrics: Metrics }[];
  daily: { date: string; metrics: Metrics }[];
}

/** Mirrors CreativeResponse.CreativeDto. */
export interface Creative {
  id: string;
  clientId: string;
  campaignId: string | null;
  name: string;
  kind: CreativeKind;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  uploadedByName: string | null;
  createdAt: string;
  /** The caller uploaded it or owns the agency — decided server-side. */
  canModify: boolean;
}

export interface CreativeList {
  selectedClientId: string | null;
  clients: TargetClient[];
  campaigns: { id: string; clientId: string; name: string }[];
  creatives: Creative[];
}

/** Image and video limits, mirrored from the backend's `CreativeFiles` so the form can say it before uploading. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const CREATIVE_ACCEPT = ".png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.webm";

export function creativeKindOf(fileName: string): CreativeKind | null {
  const ext = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "IMAGE";
  if (["mp4", "mov", "webm"].includes(ext)) return "VIDEO";
  return null;
}

// ---- Campaigns ----

export const campaignsQueryKey = (clientId: string | null) => ["target", "campaigns", clientId] as const;
export const campaignStatsQueryKey = (campaignId: string) => ["target", "campaignStats", campaignId] as const;
export const analyticsQueryKey = (clientId: string | null, from: string, to: string) =>
  ["target", "analytics", clientId, from, to] as const;
export const creativesQueryKey = (clientId: string | null) => ["target", "creatives", clientId] as const;

function clientQuery(clientId: string | null, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams(extra);
  if (clientId) params.set("clientId", clientId);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getCampaigns(clientId: string | null): Promise<CampaignList> {
  return apiRequest<CampaignList>(`/target/campaigns${clientQuery(clientId)}`);
}

export function createCampaign(payload: CampaignPayload): Promise<Campaign> {
  return apiRequest<Campaign>("/target/campaigns", { method: "POST", body: payload });
}

export function updateCampaign(id: string, payload: CampaignPayload): Promise<Campaign> {
  return apiRequest<Campaign>(`/target/campaigns/${id}`, { method: "PUT", body: payload });
}

export function deleteCampaign(id: string): Promise<void> {
  return apiRequest<void>(`/target/campaigns/${id}`, { method: "DELETE" });
}

export function getCampaignStats(id: string): Promise<CampaignStats> {
  return apiRequest<CampaignStats>(`/target/campaigns/${id}/stats`);
}

export function saveCampaignStat(id: string, payload: StatPayload): Promise<StatRow> {
  return apiRequest<StatRow>(`/target/campaigns/${id}/stats`, { method: "PUT", body: payload });
}

/** What an import did: new days added, existing days replaced. */
export interface StatImportResult {
  created: number;
  updated: number;
}

/** Many days at once, all or nothing; a date that already has a row is replaced. */
export function importCampaignStats(id: string, rows: StatPayload[]): Promise<StatImportResult> {
  return apiRequest<StatImportResult>(`/target/campaigns/${id}/stats/bulk`, { method: "PUT", body: { rows } });
}

export function deleteCampaignStat(campaignId: string, statId: string): Promise<void> {
  return apiRequest<void>(`/target/campaigns/${campaignId}/stats/${statId}`, { method: "DELETE" });
}

export function getAnalytics(clientId: string | null, from: string, to: string): Promise<Analytics> {
  return apiRequest<Analytics>(`/target/analytics${clientQuery(clientId, { from, to })}`);
}

// ---- Creatives ----

export function getCreatives(clientId: string | null): Promise<CreativeList> {
  return apiRequest<CreativeList>(`/target/creatives${clientQuery(clientId)}`);
}

export function uploadCreative(input: {
  clientId: string;
  campaignId: string | null;
  name: string;
  file: File;
}): Promise<Creative> {
  const form = new FormData();
  form.set("clientId", input.clientId);
  if (input.campaignId) form.set("campaignId", input.campaignId);
  if (input.name.trim()) form.set("name", input.name.trim());
  form.set("file", input.file);
  return apiRequest<Creative>("/target/creatives", { method: "POST", body: form });
}

export function updateCreative(id: string, payload: { name: string; campaignId: string | null }): Promise<Creative> {
  return apiRequest<Creative>(`/target/creatives/${id}`, { method: "PUT", body: payload });
}

export function deleteCreative(id: string): Promise<void> {
  return apiRequest<void>(`/target/creatives/${id}`, { method: "DELETE" });
}

/** The bytes, fetched with the bearer token — a plain `<img src>` or link cannot send it. */
export function getCreativeContent(id: string): Promise<Blob> {
  return apiRequestBlob(`/target/creatives/${id}/content`);
}
