import type { ComponentType, SVGProps } from "react";
import type { AppSection } from "../../api/auth";
import type { NavGroupKey, NavItemKey } from "../../i18n/dictionary";
import {
  AnalyticsIcon,
  ClientsIcon,
  ContentIcon,
  FinanceIcon,
  OverviewIcon,
  ReportsIcon,
  TargetIcon,
  TeamIcon,
} from "../../atoms/icons/icons";

export interface NavItem {
  labelKey: NavItemKey;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Omitted for modules not built yet (see backend/frontend CLAUDE.md) — rendered as a disabled item. */
  path?: string;
  /**
   * The grantable section this item belongs to, if any — the nav hides it
   * when the member's access is NONE (see `visibleNavGroups`). Omitted for
   * items that aren't the owner's to grant: Overview is the landing screen
   * everyone gets, Reports has no section of its own yet, and Team is
   * owner-gated inside the page instead (backend AppSection says the same).
   */
  section?: AppSection;
  badge?: number;
  danger?: boolean;
}

export interface NavGroup {
  labelKey: NavGroupKey;
  items: NavItem[];
}

/**
 * Only "overview" has a `path` today. Add a `path` here the same release you
 * add the route in router.tsx — see frontend CLAUDE.md "Adding a new module".
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "work",
    items: [
      { labelKey: "overview", icon: OverviewIcon, path: "/" },
      { labelKey: "clients", icon: ClientsIcon, path: "/clients", section: "CLIENTS" },
      { labelKey: "content", icon: ContentIcon, section: "CONTENT" },
      { labelKey: "target", icon: TargetIcon, section: "TARGET" },
    ],
  },
  {
    labelKey: "business",
    items: [
      { labelKey: "finance", icon: FinanceIcon, section: "FINANCE" },
      { labelKey: "reports", icon: ReportsIcon },
      { labelKey: "analytics", icon: AnalyticsIcon, section: "ANALYTICS" },
      { labelKey: "team", icon: TeamIcon, path: "/team" },
    ],
  },
];

export const MOBILE_TAB_ITEMS: NavItem[] = [
  { labelKey: "overview", icon: OverviewIcon, path: "/" },
  { labelKey: "clients", icon: ClientsIcon, path: "/clients", section: "CLIENTS" },
];

/**
 * Drops the sections this member has no access to, and any group left empty
 * by that. Sidebar and MobileTabBar both render from the result so a hidden
 * tab is hidden in both shells — presentational as ever, the caller passes
 * `canView` in rather than these reading the session themselves.
 */
export function visibleNavGroups(canView: (section: AppSection) => boolean): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.section || canView(item.section)),
  })).filter((group) => group.items.length > 0);
}

export function visibleMobileTabItems(canView: (section: AppSection) => boolean): NavItem[] {
  return MOBILE_TAB_ITEMS.filter((item) => !item.section || canView(item.section));
}
