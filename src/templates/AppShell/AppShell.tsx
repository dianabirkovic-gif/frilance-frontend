import { Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { MobileHeader } from "../../organisms/MobileHeader/MobileHeader";
import { MobileTabBar } from "../../molecules/MobileTabBar/MobileTabBar";
import { Sidebar } from "../../organisms/Sidebar/Sidebar";
import { Topbar } from "../../organisms/Topbar/Topbar";
import { PageHeaderProvider, useCurrentPageHeader } from "./PageHeaderContext";
import styles from "./AppShell.module.css";

/**
 * Structural nav chrome only (sidebar+topbar vs. header+tab bar) branches on
 * viewport width, per frontend CLAUDE.md "Responsive strategy" — page
 * content itself (DashboardPage and friends) stays one component per route
 * and reflows via CSS, it does not branch here too.
 *
 * The title/subtitle shown in the Topbar/MobileHeader come from
 * `PageHeaderContext` — each page calls `usePageHeader` with its own data,
 * so this template doesn't need to know about any specific page's query.
 */
export function AppShell() {
  return (
    <PageHeaderProvider>
      <AppShellChrome />
    </PageHeaderProvider>
  );
}

function AppShellChrome() {
  const isDesktop = useMediaQuery(`(min-width: 900px)`);
  const { user } = useAuth();
  const { title, subtitle } = useCurrentPageHeader();
  const userName = user?.fullName ?? "";
  const userRole = user?.role ?? "FREELANCER";

  if (isDesktop) {
    return (
      <div className={styles.desktopShell}>
        <Sidebar userName={userName} userRole={userRole} />
        <div className={styles.main}>
          <Topbar title={title} subtitle={subtitle} />
          <div className={styles.content}>
            <Outlet />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mobileShell}>
      <MobileHeader title={title} greeting={subtitle} userName={userName} />
      <main className={styles.mobileContent}>
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  );
}
