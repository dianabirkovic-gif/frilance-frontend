import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FinanceEntry } from "../../api/finance";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { FinanceRegister } from "./FinanceRegister";

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

function renderRegister(entries: FinanceEntry[], onSelectEntry = vi.fn()) {
  render(
    <LocaleProvider>
      <FinanceRegister entries={entries} onSelectEntry={onSelectEntry} />
    </LocaleProvider>,
  );
  return onSelectEntry;
}

/** Both renderings are in the DOM (CSS picks one), so scope to the table. */
function table() {
  return screen.getByRole("table");
}

describe("FinanceRegister", () => {
  it("renders one row per operation with its title and subtitle", () => {
    renderRegister([entry()]);

    expect(within(table()).getByText("MUSE'23 — рахунок #0142")).toBeInTheDocument();
    expect(within(table()).getByText("Щомісячний SMM-супровід")).toBeInTheDocument();
  });

  /** Money in and money out live in one register — DESIGN_SYSTEM.md 12.7. */
  it("signs the amount by direction rather than splitting the table", () => {
    renderRegister([
      entry(),
      entry({ id: "entry-2", type: "PAYOUT", direction: "OUT", title: "Виплата — Оксана", amount: 14000 }),
    ]);

    expect(within(table()).getByText("+ ₴32 000")).toBeInTheDocument();
    expect(within(table()).getByText("− ₴14 000")).toBeInTheDocument();
  });

  it("falls back to the counterparty when an operation has no description", () => {
    renderRegister([entry({ description: null, counterparty: "Meta Ads" })]);

    expect(within(table()).getByText("Meta Ads")).toBeInTheDocument();
  });

  it("shows an overdue operation as overdue, not as awaiting payment", () => {
    renderRegister([entry({ paymentStatus: "PENDING", overdue: true, dueDate: "2026-06-30" })]);

    expect(within(table()).getByText(uk.financeRegister.overdueBadge)).toBeInTheDocument();
  });

  /**
   * A row dated before the month on screen is there on purpose — carried
   * forward until it is settled — so it says so rather than looking like a
   * stray date.
   */
  it("labels a row carried over from an earlier month, in both renderings", () => {
    renderRegister([entry({ carriedOver: true, entryDate: "2026-06-28" })]);

    // Table and stacked list both explain the out-of-month date — on the
    // narrow row it is the only thing that does.
    expect(screen.getAllByText(uk.financeRegister.carriedOverLabel)).toHaveLength(2);
    expect(within(table()).getByText(uk.financeRegister.carriedOverLabel)).toBeInTheDocument();
  });

  it("opens the operation that was clicked", () => {
    const onSelect = renderRegister([entry()]);

    fireEvent.click(within(table()).getByText("MUSE'23 — рахунок #0142"));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "entry-1" }));
  });

  it("says the month is empty rather than rendering a headed table with no rows", () => {
    renderRegister([]);

    expect(screen.getByText(uk.financeRegister.empty)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
