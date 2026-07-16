import type { Role } from "../api/auth";
import type { ClientStage, ClientStatus } from "../api/clients";
import type { EventTag } from "../api/dashboard";
import type { ChipTone } from "../atoms/Chip/Chip";

export type NavGroupKey = "work" | "business";
export type NavItemKey = "overview" | "clients" | "content" | "target" | "finance" | "reports" | "analytics" | "team";
export type FilterId = "all" | "active" | "attention" | "archived";
export type ClientDetailTab = "overview" | "content" | "finance" | "files" | "notes";

/**
 * Every user-facing UI string in the app, grouped by the component/page that
 * owns it, plus a few shared namespaces keyed by domain enum so every place
 * needing "the label for enum value X" reads the same entry. `uk`/`en` are
 * checked against this interface, so a missing/extra key in either locale is
 * a compile error.
 */
export interface Dictionary {
  themeToggle: {
    ariaLabel: string;
  };
  localeToggle: {
    ariaLabel: string;
  };
  loginPage: {
    email: string;
    password: string;
    submitIdle: string;
    submitLoading: string;
    genericError: string;
  };
  dashboardPage: {
    title: string;
    loading: string;
    loadErrorPrefix: string;
    retry: string;
  };
  clientsPage: {
    title: string;
    loading: string;
    loadErrorPrefix: string;
    retry: string;
    newClientButton: string;
    filters: Record<FilterId, string>;
    subtitleTemplate: string;
  };
  clientStatus: Record<ClientStatus, string>;
  clientStage: Record<ClientStage, string>;
  role: Record<Role, string>;
  chip: {
    tone: Record<ChipTone, string>;
  };
  nav: {
    groups: Record<NavGroupKey, string>;
    items: Record<NavItemKey, string>;
  };
  workspace: {
    modeLabel: string;
    value: string;
  };
  addClientDrawer: {
    title: string;
    close: string;
    genericError: string;
    submitIdle: string;
    submitLoading: string;
    fields: {
      name: string;
      niche: string;
      status: string;
      stage: string;
      tariffPlan: string;
      revenue: string;
      startDate: string;
      contactSectionTitle: string;
      contactName: string;
      contactRole: string;
      contactPhone: string;
      contactEmail: string;
    };
  };
  clientDetailDrawer: {
    loading: string;
    close: string;
    notImplemented: string;
    writeAction: string;
    invoiceAction: string;
    callAriaLabel: string;
    messageAriaLabel: string;
    archiveIdle: string;
    archiving: string;
    archiveDone: string;
    tabs: Record<ClientDetailTab, string>;
    contentEmpty: string;
    financeEmpty: string;
    filesEmpty: string;
    notesLockNote: string;
    notesEmpty: string;
    sectionStage: string;
    statRevenueLabel: string;
    statDurationLabel: string;
    sectionContact: string;
    sectionActivity: string;
    activityEmpty: string;
    archiveConfirmTitle: string;
    archiveConfirmMessageTemplate: string;
    archiveErrorFallback: string;
  };
  cooperationTimeline: {
    completedOverride: string;
  };
  clientTable: {
    empty: string;
    headers: {
      client: string;
      specialist: string;
      status: string;
      nextPost: string;
      revenue: string;
      activity: string;
    };
  };
  attentionList: {
    title: string;
    allLink: string;
    empty: string;
  };
  confirmationDialog: {
    confirmLabel: string;
    cancelLabel: string;
    confirming: string;
  };
  contentPlanStrip: {
    title: string;
    empty: string;
  };
  eventLedger: {
    title: string;
    link: string;
    empty: string;
    headers: {
      time: string;
      who: string;
      action: string;
      type: string;
      amount: string;
    };
    tag: Record<EventTag, string>;
  };
  financeStrip: {
    title: string;
    noAccess: string;
  };
  mobileHeader: {
    searchAriaLabel: string;
    notificationsAriaLabel: string;
  };
  revenueHero: {
    kickerTemplate: string;
    range: Record<"week" | "month" | "year", string>;
    empty: string;
  };
  sidebar: {
    disabledTooltip: string;
  };
  teamWorkload: {
    title: string;
    empty: string;
    clientCountTemplate: string;
  };
  topbar: {
    searchPlaceholder: string;
    notificationsAriaLabel: string;
    settingsAriaLabel: string;
  };
  mobileTabBar: {
    financeTab: string;
    moreTab: string;
    disabledFabTooltip: string;
  };
}
