import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardOverview } from "../../api/dashboard";
import type { Role } from "../../api/auth";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { PageHeaderProvider } from "../../templates/AppShell/PageHeaderContext";
import { DashboardPage } from "./DashboardPage";

let role: Role = "OWNER";
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: { role } }),
}));

let overview: DashboardOverview;
vi.mock("./useDashboardOverview", () => ({
  useDashboardOverview: () => ({ data: overview, isLoading: false, isError: false, error: null, refetch: vi.fn() }),
}));

const ownerOverview = (): DashboardOverview => ({
  dateLabel: "Понеділок, 9 листопада",
  greeting: "Гарного дня!",
  revenue: {
    amount: 184200,
    currency: "UAH",
    deltaPercent: 12,
    series: [{ date: "2026-11-01", cumulativeAmount: 1000 }],
  },
  attentionItems: [],
  contentPlanWeek: [],
  financeSummary: {
    scope: "AGENCY",
    rows: [{ label: "Дохід", amount: 184200, percentOfGoal: 60, colorRole: "brand" }],
  },
  teamWorkload: [{ name: "Оксана", role: "SMM", loadPercent: 80, clientCount: 3 }],
  eventLedger: [],
});

const memberOverview = (): DashboardOverview => ({
  ...ownerOverview(),
  revenue: null,
  financeSummary: {
    scope: "PERSONAL",
    rows: [{ label: "Виплачено", amount: 20000, percentOfGoal: 100, colorRole: "brand" }],
  },
  teamWorkload: [],
});

function renderPage() {
  render(
    <MemoryRouter>
      <LocaleProvider>
        <PageHeaderProvider>
          <DashboardPage />
        </PageHeaderProvider>
      </LocaleProvider>
    </MemoryRouter>,
  );
}

describe("DashboardPage panels by role", () => {
  beforeEach(() => {
    role = "OWNER";
    overview = ownerOverview();
  });

  it("gives the owner the agency picture and the team load", () => {
    renderPage();

    expect(screen.getByText(uk.financeStrip.title)).toBeInTheDocument();
    expect(screen.getByText(uk.teamWorkload.title)).toBeInTheDocument();
    expect(screen.getByText("Дохід")).toBeInTheDocument();
  });

  it("gives a project manager the team load", () => {
    role = "PROJECT_MANAGER";
    overview = { ...memberOverview() };
    renderPage();

    expect(screen.getByText(uk.teamWorkload.title)).toBeInTheDocument();
  });

  /** An SMM sees their own pay and nothing of the agency's income or the team's load. */
  it("shows a team member only their own pay, with no revenue or team load", () => {
    role = "SMM";
    overview = memberOverview();
    renderPage();

    expect(screen.getByText(uk.financeStrip.personalTitle)).toBeInTheDocument();
    expect(screen.getByText("Виплачено")).toBeInTheDocument();
    expect(screen.queryByText(uk.financeStrip.title)).not.toBeInTheDocument();
    expect(screen.queryByText(uk.teamWorkload.title)).not.toBeInTheDocument();
    expect(screen.queryByText("Дохід")).not.toBeInTheDocument();
  });

  it("says there are no payouts yet instead of showing zeros", () => {
    role = "SMM";
    overview = { ...memberOverview(), financeSummary: { scope: "PERSONAL", rows: [] } };
    renderPage();

    expect(screen.getByText(uk.financeStrip.personalEmpty)).toBeInTheDocument();
  });
});
