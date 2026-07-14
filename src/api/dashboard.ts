import { apiRequest } from "./client";

/** Mirrors DashboardOverviewResponse and its nested records on the backend exactly — keep in sync. */
export interface DashboardOverview {
  dateLabel: string;
  greeting: string;
  revenue: Revenue;
  attentionItems: AttentionItem[];
  contentPlanWeek: ContentPlanDay[];
  financeSummary: FinanceSummary;
  teamWorkload: TeamMember[];
  eventLedger: LedgerEntry[];
}

export interface Revenue {
  amount: number;
  currency: string;
  deltaPercent: number;
  series: RevenuePoint[];
}

export interface RevenuePoint {
  date: string;
  cumulativeAmount: number;
}

export type AttentionSeverity = "HIGH" | "MID";

export interface AttentionItem {
  severity: AttentionSeverity;
  title: string;
  subtitle: string;
  metaLabel: string;
  metaIsDanger: boolean;
}

export type PostStatus = "DRAFT" | "REVIEW" | "READY" | "PUBLISHED";

export interface ContentPlanDay {
  dayLabel: string;
  date: string;
  clientLabel: string;
  status: PostStatus;
}

export interface FinanceSummary {
  rows: FinanceRow[];
}

export interface FinanceRow {
  label: string;
  amount: number;
  percentOfGoal: number;
  colorRole: "brand" | "info" | "gold";
}

export interface TeamMember {
  name: string;
  role: string;
  loadPercent: number;
  clientCount: number;
}

export type EventTag = "MONEY" | "CONTENT" | "CLIENT";
export type EventDirection = "IN" | "OUT" | "NONE";

export interface LedgerEntry {
  time: string;
  actorInitials: string;
  actorName: string;
  description: string;
  tag: EventTag;
  amount: number | null;
  direction: EventDirection;
}

export function getDashboardOverview(): Promise<DashboardOverview> {
  return apiRequest<DashboardOverview>("/dashboard/overview");
}
