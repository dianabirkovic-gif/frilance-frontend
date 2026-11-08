import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import type { NavGroup, NavItem } from "../../config/navItems/navItems";
import { PlusIcon, ReportsIcon } from "../../atoms/icons/icons";
import { useLocale } from "../../i18n/useLocale";
import { useCurrentPageFab } from "../../templates/AppShell/PageFabContext";
import styles from "./MobileTabBar.module.css";

/**
 * Everything not pinned to its own tab-bar slot lives behind "Ще" (More) —
 * e.g. Команда/Team, which has a real route but no dedicated tab icon.
 * Derived from the same nav groups Sidebar renders (already filtered to this
 * member's granted sections) rather than a separate mobile-only list, so a
 * module that gains a route — or a section the owner revokes — shows up the
 * same way in both shells without a second place to update.
 */
function useMoreMenuItems(navGroups: NavGroup[], tabItems: NavItem[], trailingTabItems: NavItem[]) {
  return useMemo(
    () => navGroups.flatMap((group) => group.items).filter(
      (item) =>
        !tabItems.some((pinned) => pinned.path === item.path) &&
        !trailingTabItems.some((pinned) => pinned.path === item.path),
    ),
    [navGroups, tabItems, trailingTabItems],
  );
}

/** Tracks .tabbar's live rendered height so the portalled menu can sit flush above it — see the portal comment below. */
function useElementHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, height] as const;
}

interface MobileTabBarProps {
  /** Already filtered to this member's granted sections — see `visibleNavGroups`. */
  navGroups: NavGroup[];
  /** Pinned tabs before the centre FAB. */
  tabItems: NavItem[];
  /** Pinned tabs after it — Фінанси, in the slot the mockup puts it in. */
  trailingTabItems: NavItem[];
}

/**
 * Mirrors the mockups' mobile tab bar: two tabs, a centre FAB for the most
 * common action, Фінанси, then "Ще" (More) — a popover listing every other
 * module (see useMoreMenuItems above). The FAB itself is driven by whichever
 * page is mounted (see PageFabContext) — it renders disabled unless the
 * current page has registered an action.
 *
 * Both pinned groups come from `config/navItems`, so a section the owner
 * revokes disappears here exactly as it does from the sidebar — the Finance
 * slot used to be hardcoded in this file, back when it led nowhere.
 */
export function MobileTabBar({ navGroups, tabItems, trailingTabItems }: MobileTabBarProps) {
  const fab = useCurrentPageFab();
  const { t } = useLocale();
  const location = useLocation();
  const moreItems = useMoreMenuItems(navGroups, tabItems, trailingTabItems);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [tabbarRef, tabbarHeight] = useElementHeight<HTMLElement>();

  const isMoreActive = moreItems.some((item) => item.path && item.path === location.pathname);

  // One rendering for both pinned groups. An item with no `path` is a module
  // that isn't built yet and shows as a disabled slot rather than vanishing —
  // the bar's layout is fixed, unlike the sidebar's list.
  const renderTab = (item: NavItem) =>
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
    );

  return (
    <nav ref={tabbarRef} className={styles.tabbar}>
      {tabItems.map(renderTab)}
      {fab ? (
        <button type="button" className={styles.fab} onClick={fab.onClick} aria-label={fab.label} title={fab.label}>
          <PlusIcon width={20} height={20} style={{ color: "var(--on-brand)" }} />
        </button>
      ) : (
        <div className={`${styles.fab} ${styles.disabled}`} aria-disabled="true" title={t.mobileTabBar.disabledFabTooltip}>
          <PlusIcon width={20} height={20} style={{ color: "var(--on-brand)" }} />
        </div>
      )}
      {trailingTabItems.map(renderTab)}
      <button
        type="button"
        className={isMoreActive ? `${styles.tab} ${styles.active}` : styles.tab}
        onClick={() => setIsMoreOpen((open) => !open)}
        aria-expanded={isMoreOpen}
      >
        <ReportsIcon width={20} height={20} />
        <span>{t.mobileTabBar.moreTab}</span>
      </button>

      {/*
        Backdrop AND menu are portalled to document.body together (same
        pattern as ConfirmationDialog), for two reasons:
        1. .tabbar has `transform: translateX(-50%)` (to center the 430px
           column), which turns it into the containing block for any
           `position: fixed` descendant — without the portal, the backdrop's
           `inset: 0` would only cover .tabbar's own small box instead of
           the actual viewport.
        2. #root has its own `z-index: 1` (global.css), i.e. its own
           stacking context. Portalling *only* the backdrop out of #root
           left the menu's `z-index` fighting the backdrop from inside a
           different stacking context — the backdrop (z-index 19, a body-level
           sibling of #root) rendered above the *entire* #root subtree,
           menu included, no matter how high the menu's own z-index was.
           Portalling both together puts them in the same context so their
           z-indexes actually compare against each other.
        The menu's own position can no longer be `absolute` relative to
        .tabbar once it's outside that tree, so it's a `fixed` column
        mirroring .tabbar's own centering, offset above it by the tabbar's
        live measured height (useElementHeight) rather than a guessed pixel
        value.
      */}
      {createPortal(
        <>
          <div
            className={isMoreOpen ? `${styles.moreBackdrop} ${styles.open}` : styles.moreBackdrop}
            onClick={() => setIsMoreOpen(false)}
          />
          <div className={styles.moreMenuColumn} style={{ bottom: tabbarHeight }}>
            <div className={isMoreOpen ? `${styles.moreMenu} ${styles.open}` : styles.moreMenu}>
              {moreItems.map((item) =>
                item.path ? (
                  <NavLink
                    key={item.labelKey}
                    to={item.path}
                    className={({ isActive }) =>
                      isActive ? `${styles.moreMenuItem} ${styles.active}` : styles.moreMenuItem
                    }
                    onClick={() => setIsMoreOpen(false)}
                  >
                    <item.icon width={17} height={17} />
                    {t.nav.items[item.labelKey]}
                  </NavLink>
                ) : (
                  <div
                    key={item.labelKey}
                    className={`${styles.moreMenuItem} ${styles.disabled}`}
                    aria-disabled="true"
                    title={t.sidebar.disabledTooltip}
                  >
                    <item.icon width={17} height={17} />
                    {t.nav.items[item.labelKey]}
                  </div>
                ),
              )}
            </div>
          </div>
        </>,
        document.body,
      )}
    </nav>
  );
}
