import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FinanceSummary } from "../../api/finance";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { FinanceStatCards } from "./FinanceStatCards";

function summary(overrides: Partial<FinanceSummary> = {}): FinanceSummary {
  return {
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
    ...overrides,
  };
}

function renderCards(value: FinanceSummary) {
  return render(
    <LocaleProvider>
      <FinanceStatCards summary={value} />
    </LocaleProvider>,
  );
}

describe("FinanceStatCards", () => {
  it("renders the four totals with the month's own numbers", () => {
    renderCards(summary());

    expect(screen.getByText(uk.financeStatCards.income)).toBeInTheDocument();
    expect(screen.getByText("₴184 200")).toBeInTheDocument();
    expect(screen.getByText("₴96 400")).toBeInTheDocument();
    expect(screen.getByText("₴87 800")).toBeInTheDocument();
    expect(screen.getByText("₴18 420")).toBeInTheDocument();
  });

  it("explains the tax-reserve bar against its goal", () => {
    renderCards(summary());

    expect(screen.getByText("61% від цільових ₴30 000")).toBeInTheDocument();
  });

  /** No goal means no bar — an empty track at 0% reads as a reserve that is behind. */
  it("says the month has no goal rather than drawing an empty bar", () => {
    renderCards(summary({ taxReserveGoal: 0, taxReservePercentOfGoal: 0 }));

    expect(screen.getByText(uk.financeStatCards.taxReserveNoGoal)).toBeInTheDocument();
    expect(screen.queryByText(/від цільових/)).not.toBeInTheDocument();
  });

  /** A delta against an empty month is a number neither side can stand behind. */
  it("renders no delta at all when there is nothing to compare against", () => {
    renderCards(
      summary({ incomeDeltaPercent: null, expensesDeltaPercent: null, netProfitDeltaPercent: null }),
    );

    expect(screen.queryByText("12%")).not.toBeInTheDocument();
    expect(screen.queryByText(/ніж місяцем раніше/)).not.toBeInTheDocument();
  });

  /**
   * The arrow follows the number; only the colour knows whether that is good
   * news. Expenses that rose must still say they rose.
   */
  it("says expenses rose when they rose, however that is coloured", () => {
    renderCards(summary({ incomeDeltaPercent: null, netProfitDeltaPercent: null, expensesDeltaPercent: 4 }));

    expect(screen.getByText("більше на 4% ніж місяцем раніше")).toBeInTheDocument();
  });

  it("keeps quiet about receivables when nothing is overdue", () => {
    renderCards(summary());

    expect(screen.queryByText(/прострочено/)).not.toBeInTheDocument();
  });

  it("names what the month is still owed when something is overdue", () => {
    renderCards(summary({ overdueReceivable: 18000, overdueCount: 1 }));

    expect(screen.getByText("₴18 000 прострочено — рахунків: 1")).toBeInTheDocument();
  });
});
