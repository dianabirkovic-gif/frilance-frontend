import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMySalary, type MySalary } from "../../api/finance";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { PageHeaderProvider } from "../../templates/AppShell/PageHeaderContext";
import { MySalaryPage } from "./MySalaryPage";

vi.mock("../../api/finance", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/finance")>()),
  getMySalary: vi.fn(),
}));

const getMySalaryMock = vi.mocked(getMySalary);

function salary(overrides: Partial<MySalary> = {}): MySalary {
  return {
    month: "2026-07",
    currency: "UAH",
    paidTotal: 20000,
    pendingTotal: 5000,
    payments: [
      {
        id: "p1",
        title: "Зарплата за липень",
        description: null,
        amount: 20000,
        currency: "UAH",
        entryDate: "2026-07-05",
        dueDate: null,
        paymentStatus: "PAID",
        overdue: false,
        paymentMethod: "BANK_TRANSFER",
      },
    ],
    ...overrides,
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LocaleProvider>
        <PageHeaderProvider>
          <MySalaryPage />
        </PageHeaderProvider>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

describe("MySalaryPage", () => {
  beforeEach(() => {
    getMySalaryMock.mockReset();
  });

  it("shows the member's payouts and totals", async () => {
    getMySalaryMock.mockResolvedValue(salary());
    renderPage();

    expect(await screen.findByText("Зарплата за липень")).toBeInTheDocument();
    expect(screen.getByText(uk.mySalaryPage.paidLabel)).toBeInTheDocument();
    expect(screen.getByText(uk.mySalaryPage.pendingLabel)).toBeInTheDocument();
    expect(screen.getByText(uk.mySalaryPage.privacyNote)).toBeInTheDocument();
  });

  it("says so when the month has no payouts", async () => {
    getMySalaryMock.mockResolvedValue(salary({ payments: [], paidTotal: 0, pendingTotal: 0 }));
    renderPage();

    await waitFor(() => expect(screen.getByText(uk.mySalaryPage.empty)).toBeInTheDocument());
  });

  /** The navigation is how somebody leaves a month that would not load. */
  it("keeps the month navigation when the load fails", async () => {
    getMySalaryMock.mockRejectedValue(new Error("boom"));
    renderPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText(uk.mySalaryPage.nextMonth)).toBeInTheDocument();
  });
});
