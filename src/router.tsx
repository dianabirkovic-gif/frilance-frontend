import { createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "./guards/RequireAuth/RequireAuth";
import { RequireSection } from "./guards/RequireSection/RequireSection";
import { AppShell } from "./templates/AppShell/AppShell";
import { LoginPage } from "./pages/LoginPage/LoginPage";
import { ClaimInvitePage } from "./pages/ClaimInvitePage/ClaimInvitePage";
import { DashboardPage } from "./pages/DashboardPage/DashboardPage";
import { ClientsPage } from "./pages/ClientsPage/ClientsPage";
import { TeamPage } from "./pages/TeamPage/TeamPage";

/**
 * New modules add a sibling route here and a nav entry in
 * `config/navItems.ts` — see frontend CLAUDE.md "Adding a new module".
 */
export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/claim-invite", element: <ClaimInvitePage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: "clients",
        element: (
          <RequireSection section="CLIENTS">
            <ClientsPage />
          </RequireSection>
        ),
      },
      { path: "team", element: <TeamPage /> },
    ],
  },
]);
