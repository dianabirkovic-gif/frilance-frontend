import { createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "./components/auth/RequireAuth";
import { AppShell } from "./components/shell/AppShell";
import { LoginPage } from "./features/auth/LoginPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";

/**
 * One protected route today. New modules add a sibling route here and a
 * nav entry in `components/shell/navItems.ts` — see frontend CLAUDE.md
 * "Adding a new module".
 */
export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [{ index: true, element: <DashboardPage /> }],
  },
]);
