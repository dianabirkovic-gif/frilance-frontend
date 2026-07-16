import { NavLink } from "react-router-dom";
import type { Role } from "../../api/auth";
import { initials } from "../../utils/initials";
import { ChevronDownIcon } from "../../atoms/icons/icons";
import { BRAND_NAME } from "../../config/brand";
import { NAV_GROUPS, type NavItem } from "../../config/navItems/navItems";
import { useLocale } from "../../i18n/useLocale";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  userName: string;
  userRole: Role;
}

function NavBadge({ item }: { item: NavItem }) {
  if (item.badge === undefined) return null;
  return (
    <span className={item.danger ? `${styles.navBadge} ${styles.attn}` : styles.navBadge}>{item.badge}</span>
  );
}

export function Sidebar({ userName, userRole }: SidebarProps) {
  const { t } = useLocale();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>F</div>
        <div className={styles.brandName}>{BRAND_NAME}</div>
      </div>

      <div className={styles.workspaceSwitch}>
        <div>
          <div className={styles.wsLabel}>{t.workspace.modeLabel}</div>
          <div className={styles.wsValue}>
            <span className={styles.wsDot} />
            {t.workspace.value}
          </div>
        </div>
        <ChevronDownIcon width={14} height={14} />
      </div>

      {NAV_GROUPS.map((group) => (
        <nav className={styles.navGroup} key={group.labelKey}>
          <div className={styles.navGroupLabel}>{t.nav.groups[group.labelKey]}</div>
          {group.items.map((item) =>
            item.path ? (
              <NavLink
                key={item.labelKey}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
                }
              >
                <item.icon width={16} height={16} />
                {t.nav.items[item.labelKey]}
                <NavBadge item={item} />
              </NavLink>
            ) : (
              <div
                key={item.labelKey}
                className={`${styles.navItem} ${styles.disabled}`}
                aria-disabled="true"
                title={t.sidebar.disabledTooltip}
              >
                <item.icon width={16} height={16} />
                {t.nav.items[item.labelKey]}
                <NavBadge item={item} />
              </div>
            ),
          )}
        </nav>
      ))}

      <div className={styles.sidebarFoot}>
        <div className={styles.avatar}>{initials(userName)}</div>
        <div>
          <div className={styles.userName}>{userName}</div>
          <div className={styles.userRole}>{t.role[userRole]}</div>
        </div>
      </div>
    </aside>
  );
}
