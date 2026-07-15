import { NavLink } from "react-router-dom";
import { FinanceIcon, PlusIcon, ReportsIcon } from "../../atoms/icons/icons";
import { MOBILE_TAB_ITEMS } from "../../config/navItems/navItems";
import styles from "./MobileTabBar.module.css";

/**
 * Mirrors dashboard.html's mobile tab bar: two real tabs, a center FAB for
 * the most common action, then two more. FAB and the two right-hand tabs
 * have no destination yet (see backend/frontend CLAUDE.md) — they render
 * disabled until their modules exist.
 */
export function MobileTabBar() {
  return (
    <nav className={styles.tabbar}>
      {MOBILE_TAB_ITEMS.map((item) =>
        item.path ? (
          <NavLink
            key={item.label}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
          >
            <item.icon width={20} height={20} />
            <span>{item.label}</span>
            {item.danger && <span className={styles.badge} />}
          </NavLink>
        ) : (
          <div key={item.label} className={`${styles.tab} ${styles.disabled}`} aria-disabled="true">
            <item.icon width={20} height={20} />
            <span>{item.label}</span>
            {item.danger && <span className={styles.badge} />}
          </div>
        ),
      )}
      <div className={`${styles.fab} ${styles.disabled}`} aria-disabled="true" title="Модуль ще не реалізовано">
        <PlusIcon width={20} height={20} style={{ color: "var(--on-brand)" }} />
      </div>
      <div className={`${styles.tab} ${styles.disabled}`} aria-disabled="true">
        <FinanceIcon width={20} height={20} />
        <span>Фінанси</span>
      </div>
      <div className={`${styles.tab} ${styles.disabled}`} aria-disabled="true">
        <ReportsIcon width={20} height={20} />
        <span>Ще</span>
      </div>
    </nav>
  );
}
