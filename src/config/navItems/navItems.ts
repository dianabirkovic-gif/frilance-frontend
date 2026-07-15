import type { ComponentType, SVGProps } from "react";
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
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Omitted for modules not built yet (see backend/frontend CLAUDE.md) — rendered as a disabled item. */
  path?: string;
  badge?: number;
  danger?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Only "Огляд" has a `path` today. Add a `path` here the same release you
 * add the route in router.tsx — see frontend CLAUDE.md "Adding a new module".
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Робота",
    items: [
      { label: "Огляд", icon: OverviewIcon, path: "/" },
      { label: "Клієнти", icon: ClientsIcon, path: "/clients" },
      { label: "Контент-план", icon: ContentIcon },
      { label: "Таргет", icon: TargetIcon },
    ],
  },
  {
    label: "Бізнес",
    items: [
      { label: "Фінанси", icon: FinanceIcon },
      { label: "Звіти та інвойси", icon: ReportsIcon },
      { label: "Аналітика", icon: AnalyticsIcon },
      { label: "Команда", icon: TeamIcon },
    ],
  },
];

export const MOBILE_TAB_ITEMS: NavItem[] = [
  { label: "Огляд", icon: OverviewIcon, path: "/" },
  { label: "Клієнти", icon: ClientsIcon, path: "/clients" },
];
