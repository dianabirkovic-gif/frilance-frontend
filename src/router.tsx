import { createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "./guards/RequireAuth/RequireAuth";
import { RequireOwner } from "./guards/RequireOwner/RequireOwner";
import { RequireTeamMember } from "./guards/RequireTeamMember/RequireTeamMember";
import { RequireSection } from "./guards/RequireSection/RequireSection";
import { AppShell } from "./templates/AppShell/AppShell";
import { LoginPage } from "./pages/LoginPage/LoginPage";
import { ClaimInvitePage } from "./pages/ClaimInvitePage/ClaimInvitePage";
import { DashboardPage } from "./pages/DashboardPage/DashboardPage";
import { ClientsPage } from "./pages/ClientsPage/ClientsPage";
import { ContentPlanPage } from "./pages/ContentPlanPage/ContentPlanPage";
import { FinancePage } from "./pages/FinancePage/FinancePage";
import { MySalaryPage } from "./pages/MySalaryPage/MySalaryPage";
import { TargetPage } from "./pages/TargetPage/TargetPage";
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
      {
        path: "content",
        element: (
          <RequireSection section="CONTENT">
            <ContentPlanPage />
          </RequireSection>
        ),
      },
      {
        path: "target",
        element: (
          <RequireSection section="TARGET">
            <TargetPage />
          </RequireSection>
        ),
      },
      {
        path: "finance",
        element: (
          <RequireSection section="FINANCE">
            <FinancePage />
          </RequireSection>
        ),
      },
      // Team members only (owners/freelancers are redirected to Overview, matching the nav).
      // There is no grant to check: the backend takes the member from the token and
      // shows only the caller's own payouts.
      {
        path: "my-salary",
        element: (
          <RequireTeamMember>
            <MySalaryPage />
          </RequireTeamMember>
        ),
      },
      {
        path: "team",
        element: (
          <RequireOwner>
            <TeamPage />
          </RequireOwner>
        ),
      },
    ],
  },
]);
