import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FinanceFlowPoint } from "../../api/finance";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { CashFlowChart } from "./CashFlowChart";

function renderChart(flow: FinanceFlowPoint[]) {
  return render(
    <LocaleProvider>
      <CashFlowChart flow={flow} />
    </LocaleProvider>,
  );
}

const FLOW: FinanceFlowPoint[] = [
  { date: "2026-07-01", cumulativeIncome: 18000, cumulativeExpense: 3400 },
  { date: "2026-07-02", cumulativeIncome: 50000, cumulativeExpense: 3400 },
  { date: "2026-07-03", cumulativeIncome: 50000, cumulativeExpense: 17400 },
];

describe("CashFlowChart", () => {
  it("draws both series and names them in the legend", () => {
    const { container } = renderChart(FLOW);

    expect(screen.getByText(uk.cashFlowChart.incomeLegend)).toBeInTheDocument();
    expect(screen.getByText(uk.cashFlowChart.expensesLegend)).toBeInTheDocument();
    // Income area + income line + expense line.
    expect(container.querySelectorAll("path")).toHaveLength(3);
  });

  /** The legend carries the running totals, so the lines don't need value labels. */
  it("shows what each series has come to by the last day drawn", () => {
    renderChart(FLOW);

    expect(screen.getByText("₴50 000")).toBeInTheDocument();
    expect(screen.getByText("₴17 400")).toBeInTheDocument();
  });

  it("says the month has no settled operations rather than drawing a flat line", () => {
    const { container } = renderChart([]);

    expect(screen.getByText(uk.cashFlowChart.empty)).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });
});
