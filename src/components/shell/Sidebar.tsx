import { NavLink } from "react-router-dom";
import { ROLE_LABEL, type Role } from "../../api/auth";
import { initials } from "../../utils/initials";
import { ChevronDownIcon } from "./icons";
import { NAV_GROUPS, type NavItem } from "./navItems";
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
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>F</div>
        <div className={styles.brandName}>Frilance OS</div>
      </div>

      <div className={styles.workspaceSwitch}>
        <div>
          <div className={styles.wsLabel}>Режим</div>
          <div className={styles.wsValue}>
            <span className={styles.wsDot} />
            Агентство
          </div>
        </div>
        <ChevronDownIcon width={14} height={14} />
      </div>

      {NAV_GROUPS.map((group) => (
        <nav className={styles.navGroup} key={group.label}>
          <div className={styles.navGroupLabel}>{group.label}</div>
          {group.items.map((item) =>
            item.path ? (
              <NavLink
                key={item.label}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
                }
              >
                <item.icon width={16} height={16} />
                {item.label}
                <NavBadge item={item} />
              </NavLink>
            ) : (
              <div
                key={item.label}
                className={`${styles.navItem} ${styles.disabled}`}
                aria-disabled="true"
                title="Цей модуль ще не реалізовано"
              >
                <item.icon width={16} height={16} />
                {item.label}
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
          <div className={styles.userRole}>{ROLE_LABEL[userRole]}</div>
        </div>
      </div>
    </aside>
  );
}
