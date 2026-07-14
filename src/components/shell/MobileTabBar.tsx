import { NavLink } from "react-router-dom";
import { FinanceIcon, PlusIcon, ReportsIcon } from "./icons";
import { MOBILE_TAB_ITEMS } from "./navItems";
import styles from "./MobileTabBar.module.css";

/**
 * Mirrors dashboard.html's mobile tab bar: two real tabs, a center FAB for
 * the most common action, then two more. FAB and the two right-hand tabs
 * have no destination yet (see backend/frontend CLAUDE.md) — they render
 * disabled until their modules exist.
 */
export function MobileTabBar() {
  const [firstTab, secondTab] = MOBILE_TAB_ITEMS;

  return (
    <nav className={styles.tabbar}>
      <NavLink
        to={firstTab.path ?? "/"}
        end
        className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
      >
        <firstTab.icon width={20} height={20} />
        <span>{firstTab.label}</span>
      </NavLink>
      <div className={`${styles.tab} ${styles.disabled}`} aria-disabled="true">
        <secondTab.icon width={20} height={20} />
        <span>{secondTab.label}</span>
        {secondTab.danger && <span className={styles.badge} />}
      </div>
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
