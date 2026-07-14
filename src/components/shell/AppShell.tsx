import { Outlet } from "react-router-dom";
import { useDashboardOverview } from "../../features/dashboard/useDashboardOverview";
import { useAuth } from "../../hooks/useAuth";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { MobileHeader } from "./MobileHeader";
import { MobileTabBar } from "./MobileTabBar";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import styles from "./AppShell.module.css";

/**
 * Structural nav chrome only (sidebar+topbar vs. header+tab bar) branches on
 * viewport width, per frontend CLAUDE.md "Responsive strategy" — page
 * content itself (DashboardPage and friends) stays one component per route
 * and reflows via CSS, it does not branch here too.
 *
 * TEMPORARY: the topbar/mobile header's date+greeting subtitle reads the
 * dashboard query directly, which only works because Overview is the only
 * route today (the query result is cached/shared via the same queryKey, so
 * this doesn't add a request). Once a second page exists, replace this with
 * a route-driven page-header slot instead of coupling the shell to one
 * feature's query — see CLAUDE.md "Component structure" on why
 * `components/shell/` shouldn't otherwise know about a specific feature.
 */
export function AppShell() {
  const isDesktop = useMediaQuery(`(min-width: 900px)`);
  const { user } = useAuth();
  const { data } = useDashboardOverview();
  const subtitle = data ? `${data.dateLabel} · ${data.greeting}` : "";
  const userName = user?.fullName ?? "";
  const userRole = user?.role ?? "FREELANCER";

  if (isDesktop) {
    return (
      <div className={styles.desktopShell}>
        <Sidebar userName={userName} userRole={userRole} />
        <div className={styles.main}>
          <Topbar title="Огляд" subtitle={subtitle} />
          <div className={styles.content}>
            <Outlet />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mobileShell}>
      <MobileHeader title="Огляд" greeting={subtitle} userName={userName} />
      <main className={styles.mobileContent}>
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  );
}
