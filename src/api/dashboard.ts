import { apiRequest } from "./client";
import type { PostStatus } from "./contentPlan";

/**
 * The weekly strip is five days of the content plan, so its status taxonomy
 * is the content plan's — re-exported rather than restated so the two can't
 * drift (`api/contentPlan.ts` owns it, alongside the cycle order).
 */
export type { PostStatus };

/** Mirrors DashboardOverviewResponse and its nested records on the backend exactly — keep in sync. */
/**
 * Every panel is gated on the section it draws from, server-side — a member
 * without the grant gets the panel absent rather than a 403 for the whole
 * screen. Absent is `null` for `revenue` and an empty array for the lists,
 * so each panel renders its own "no access"/empty state.
 */
export interface DashboardOverview {
  dateLabel: string;
  greeting: string;
  /** Null without the Finance grant. */
  revenue: Revenue | null;
  /** Empty without the Clients grant. */
  attentionItems: AttentionItem[];
  /** Empty without the Content grant. */
  contentPlanWeek: ContentPlanDay[];
  financeSummary: FinanceSummary;
  /** Empty for non-owners — the roster is owner-only. */
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

export interface ContentPlanDay {
  dayLabel: string;
  date: string;
  clientLabel: string;
  status: PostStatus;
}

export interface FinanceSummary {
  /**
   * Whose money the rows are. `AGENCY` is the owner's picture of the business;
   * `PERSONAL` is a team member's own pay — they are never sent `AGENCY`.
   * `PERSONAL` with no rows means no payouts this month.
   */
  scope: "AGENCY" | "PERSONAL";
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
