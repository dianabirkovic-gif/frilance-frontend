import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFinance, type Finance, type FinanceEntry } from "../../api/finance";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { PageFabProvider } from "../../templates/AppShell/PageFabContext";
import { PageHeaderProvider } from "../../templates/AppShell/PageHeaderContext";
import { FinancePage } from "./FinancePage";

vi.mock("../../api/finance", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/finance")>()),
  getFinance: vi.fn(),
}));

const canEdit = vi.fn(() => true);
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ canEdit, canView: () => true }),
}));

const getFinanceMock = vi.mocked(getFinance);

const TODAY = new Date(2026, 6, 15, 10, 0);

function entry(overrides: Partial<FinanceEntry> = {}): FinanceEntry {
  return {
    id: "entry-1",
    type: "INCOME",
    direction: "IN",
    title: "MUSE'23 — рахунок #0142",
    description: "Щомісячний SMM-супровід",
    amount: 32000,
    currency: "UAH",
    clientId: "client-1",
    clientName: "MUSE'23",
    counterparty: null,
    entryDate: "2026-07-02",
    dueDate: null,
    paymentStatus: "PAID",
    overdue: false,
    paymentMethod: "CARD",
    invoiceNumber: "0142",
    carriedOver: false,
    recipientUserId: null,
    ...overrides,
  };
}

function finance(month: string, entries: FinanceEntry[] = []): Finance {
  return {
    month,
    currency: "UAH",
    selectedClientId: null,
    selectedType: null,
    members: [],
    clients: [
      { id: "client-1", name: "MUSE'23" },
      { id: "client-2", name: "Brookside Wellness" },
    ],
    summary: {
      income: 184200,
      incomeDeltaPercent: 12,
      expenses: 96400,
      expensesDeltaPercent: 4,
      netProfit: 87800,
      netProfitDeltaPercent: 21,
      taxReserve: 18420,
      taxReserveGoal: 30000,
      taxReservePercentOfGoal: 61,
      overdueReceivable: 0,
      overdueCount: 0,
    },
    flow: [{ date: `${month}-01`, cumulativeIncome: 18000, cumulativeExpense: 3400 }],
    entries,
  };
}

/**
 * The register renders both a table and a stacked list (CSS picks one), so a
 * title appears twice in jsdom — every lookup here takes the first match
 * rather than asserting a single one.
 */
function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <PageHeaderProvider>
          <PageFabProvider>{children}</PageFabProvider>
        </PageHeaderProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
  return render(<FinancePage />, { wrapper });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(TODAY);
  canEdit.mockReturnValue(true);
  getFinanceMock.mockReset();
  getFinanceMock.mockResolvedValue(finance("2026-07", [entry()]));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("FinancePage", () => {
  it("asks for the current month and renders the cards, the chart and the register", async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText("MUSE'23 — рахунок #0142")[0]).toBeInTheDocument());
    expect(getFinanceMock).toHaveBeenCalledWith("2026-07", null, null);
    // "Дохід" is the stat label, the chart's legend and a chip — assert on the
    // numbers, which only the cards and the legend carry.
    expect(screen.getByText("₴184 200")).toBeInTheDocument();
    expect(screen.getByText("₴87 800")).toBeInTheDocument();
    expect(screen.getByText(uk.cashFlowChart.title)).toBeInTheDocument();
  });

  it("walks to another month and asks for that one", async () => {
    renderPage();
    await waitFor(() => expect(getFinanceMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: uk.financePage.previousMonth }));

    await waitFor(() => expect(getFinanceMock).toHaveBeenLastCalledWith("2026-06", null, null));
  });

  /** The chips narrow the table; the cards above are already the breakdown by type. */
  it("passes the chip's type to the server", async () => {
    renderPage();
    await waitFor(() => expect(getFinanceMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: uk.financeEntryType.PAYOUT }));

    await waitFor(() => expect(getFinanceMock).toHaveBeenLastCalledWith("2026-07", null, "PAYOUT"));
  });

  it("narrows the whole screen to one client", async () => {
    renderPage();
    await waitFor(() => expect(getFinanceMock).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/^Клієнт:/), { target: { value: "client-2" } });

    await waitFor(() => expect(getFinanceMock).toHaveBeenLastCalledWith("2026-07", "client-2", null));
  });

  it("says the month is empty rather than showing a bare screen", async () => {
    getFinanceMock.mockResolvedValue(finance("2026-07", []));
    renderPage();

    await waitFor(() => expect(screen.getByText(uk.financeRegister.empty)).toBeInTheDocument());
  });

  /**
   * Navigation is how somebody leaves a month that would not load, so a state
   * that replaces its own navigation traps whoever reached it — the rule the
   * content plan's toolbar and the client drawer's month navigator follow.
   */
  it("keeps the month navigator on screen while loading and after a failure", async () => {
    getFinanceMock.mockRejectedValue(new Error("boom"));
    renderPage();

    expect(screen.getByRole("button", { name: uk.financePage.previousMonth })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: uk.financePage.retry })).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: uk.financePage.nextMonth })).toBeInTheDocument();
  });

  it("opens an operation's drawer when its row is clicked", async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText("MUSE'23 — рахунок #0142")[0]).toBeInTheDocument());

    fireEvent.click(screen.getAllByText("MUSE'23 — рахунок #0142")[0]);

    // The drawer's own field, not the row's text, which the register renders twice.
    expect(screen.getByLabelText(uk.financeEntryDrawer.fields.invoiceNumber)).toHaveValue("0142");
  });

  /** READ opens the register; it does not offer writes the backend would 403. */
  it("offers no way in to the form for a read-only member", async () => {
    canEdit.mockReturnValue(false);
    renderPage();

    await waitFor(() => expect(screen.getAllByText("MUSE'23 — рахунок #0142")[0]).toBeInTheDocument());
    expect(
      screen.queryByRole("button", { name: uk.financePage.newEntryButton }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(uk.financeEntryDrawer.fields.amount)).not.toBeInTheDocument();
  });
});
