import { NavLink } from "react-router-dom";
import { FinanceIcon, PlusIcon, ReportsIcon } from "../../atoms/icons/icons";
import { MOBILE_TAB_ITEMS } from "../../config/navItems/navItems";
import { useLocale } from "../../i18n/useLocale";
import { useCurrentPageFab } from "../../templates/AppShell/PageFabContext";
import styles from "./MobileTabBar.module.css";

/**
 * Mirrors dashboard.html's mobile tab bar: two real tabs, a center FAB for
 * the most common action, then two more. The two right-hand tabs have no
 * destination yet (see backend/frontend CLAUDE.md) and render disabled
 * until their modules exist. The FAB itself is driven by whichever page is
 * mounted (see PageFabContext) — it renders disabled unless the current
 * page has registered an action.
 */
export function MobileTabBar() {
  const fab = useCurrentPageFab();
  const { t } = useLocale();

  return (
    <nav className={styles.tabbar}>
      {MOBILE_TAB_ITEMS.map((item) =>
        item.path ? (
          <NavLink
            key={item.labelKey}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
          >
            <item.icon width={20} height={20} />
            <span>{t.nav.items[item.labelKey]}</span>
            {item.danger && <span className={styles.badge} />}
          </NavLink>
        ) : (
          <div key={item.labelKey} className={`${styles.tab} ${styles.disabled}`} aria-disabled="true">
            <item.icon width={20} height={20} />
            <span>{t.nav.items[item.labelKey]}</span>
            {item.danger && <span className={styles.badge} />}
          </div>
        ),
      )}
      {fab ? (
        <button type="button" className={styles.fab} onClick={fab.onClick} aria-label={fab.label} title={fab.label}>
          <PlusIcon width={20} height={20} style={{ color: "var(--on-brand)" }} />
        </button>
      ) : (
        <div className={`${styles.fab} ${styles.disabled}`} aria-disabled="true" title={t.mobileTabBar.disabledFabTooltip}>
          <PlusIcon width={20} height={20} style={{ color: "var(--on-brand)" }} />
        </div>
      )}
      <div className={`${styles.tab} ${styles.disabled}`} aria-disabled="true">
        <FinanceIcon width={20} height={20} />
        <span>{t.mobileTabBar.financeTab}</span>
      </div>
      <div className={`${styles.tab} ${styles.disabled}`} aria-disabled="true">
        <ReportsIcon width={20} height={20} />
        <span>{t.mobileTabBar.moreTab}</span>
      </div>
    </nav>
  );
}
