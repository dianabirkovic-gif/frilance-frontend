import type { ComponentType, SVGProps } from "react";
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
      { labelKey: "clients", icon: ClientsIcon, path: "/clients" },
      { labelKey: "content", icon: ContentIcon },
      { labelKey: "target", icon: TargetIcon },
    ],
  },
  {
    labelKey: "business",
    items: [
      { labelKey: "finance", icon: FinanceIcon },
      { labelKey: "reports", icon: ReportsIcon },
      { labelKey: "analytics", icon: AnalyticsIcon },
      { labelKey: "team", icon: TeamIcon },
    ],
  },
];

export const MOBILE_TAB_ITEMS: NavItem[] = [
  { labelKey: "overview", icon: OverviewIcon, path: "/" },
  { labelKey: "clients", icon: ClientsIcon, path: "/clients" },
];
