import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FinanceEntry } from "../../api/finance";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { FinanceEntryDrawer } from "./FinanceEntryDrawer";

function entry(overrides: Partial<FinanceEntry> = {}): FinanceEntry {
  return {
    id: "entry-1",
    type: "INCOME",
    direction: "IN",
    title: "Brookside Wellness — рахунок #0144",
    description: "Таргетована реклама",
    amount: 41000,
    currency: "UAH",
    clientId: "client-2",
    clientName: "Brookside Wellness",
    counterparty: null,
    entryDate: "2026-07-03",
    dueDate: "2026-07-10",
    paymentStatus: "PENDING",
    overdue: false,
    paymentMethod: "INVOICE",
    invoiceNumber: "0144",
    carriedOver: false,
    ...overrides,
  };
}

function renderDrawer(overrides: Partial<Parameters<typeof FinanceEntryDrawer>[0]> = {}) {
  const props = {
    open: true,
    entry: null as FinanceEntry | null,
    clients: [
      { id: "client-1", name: "MUSE'23" },
      { id: "client-2", name: "Brookside Wellness" },
    ],
    defaultClientId: null,
    defaultDate: "2026-07-15",
    isSubmitting: false,
    isMarkingPaid: false,
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onMarkPaid: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(
    <LocaleProvider>
      <FinanceEntryDrawer {...props} />
    </LocaleProvider>,
  );
  return props;
}

describe("FinanceEntryDrawer", () => {
  it("opens blank on the viewed month's date when creating", () => {
    renderDrawer();

    expect(screen.getByText(uk.financeEntryDrawer.createTitle)).toBeInTheDocument();
    expect(screen.getByLabelText(uk.financeEntryDrawer.fields.entryDate)).toHaveValue("2026-07-15");
    expect(screen.getByLabelText(uk.financeEntryDrawer.fields.title)).toHaveValue("");
  });

  /** The sum at display size, where the client drawer puts an avatar — 12.7. */
  it("leads with the amount rather than the title when editing", () => {
    renderDrawer({ entry: entry() });

    expect(screen.getByText("+ ₴41 000")).toBeInTheDocument();
    expect(screen.getByLabelText(uk.financeEntryDrawer.fields.title)).toHaveValue(
      "Brookside Wellness — рахунок #0144",
    );
    expect(screen.getByLabelText(uk.financeEntryDrawer.fields.invoiceNumber)).toHaveValue("0144");
  });

  /** «Прострочено» is not a state anybody sets, so it is not on the stepper. */
  it("offers only the two stored payment states", () => {
    renderDrawer({ entry: entry() });

    expect(screen.getByRole("button", { name: uk.paymentStatus.PENDING })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: uk.paymentStatus.PAID })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: uk.financeRegister.overdueBadge })).not.toBeInTheDocument();
  });

  it("explains an overdue operation instead of leaving the red badge unexplained", () => {
    renderDrawer({ entry: entry({ overdue: true }) });

    expect(screen.getByText(uk.financeEntryDrawer.overdueNotice)).toBeInTheDocument();
  });

  /**
   * The module's most frequent write, in the slot the mockup gave to a
   * reminder nothing can send yet. It goes through the narrow status endpoint,
   * so it cannot blank a field the form has half-edited.
   */
  it("offers one-click «оплачено» only while the operation is unpaid", () => {
    const { onMarkPaid } = renderDrawer({ entry: entry() });

    fireEvent.click(screen.getByRole("button", { name: uk.financeEntryDrawer.markPaid }));

    expect(onMarkPaid).toHaveBeenCalledWith(expect.objectContaining({ id: "entry-1" }));
  });

  it("hides «оплачено» for an operation that is already paid", () => {
    renderDrawer({ entry: entry({ paymentStatus: "PAID" }) });

    expect(screen.queryByRole("button", { name: uk.financeEntryDrawer.markPaid })).not.toBeInTheDocument();
  });

  /** Tax and payouts are about no client, so that is a real option and not a placeholder. */
  it("lets an operation belong to no client", async () => {
    const { onSubmit } = renderDrawer();

    fireEvent.change(screen.getByLabelText(uk.financeEntryDrawer.fields.title), {
      target: { value: "Резерв на податки" },
    });
    fireEvent.change(screen.getByLabelText(uk.financeEntryDrawer.fields.amount), {
      target: { value: "18420" },
    });
    fireEvent.click(screen.getByRole("button", { name: uk.financeEntryDrawer.submitIdle }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ clientId: null, amount: 18420 })),
    );
  });

  it("sends blank optional fields as null rather than as empty strings", async () => {
    const { onSubmit } = renderDrawer();

    fireEvent.change(screen.getByLabelText(uk.financeEntryDrawer.fields.title), {
      target: { value: "  Meta Ads  " },
    });
    fireEvent.change(screen.getByLabelText(uk.financeEntryDrawer.fields.amount), {
      target: { value: "3400" },
    });
    fireEvent.click(screen.getByRole("button", { name: uk.financeEntryDrawer.submitIdle }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Meta Ads",
          description: null,
          counterparty: null,
          dueDate: null,
          invoiceNumber: null,
        }),
      ),
    );
  });

  it("only offers deletion for an operation that exists", () => {
    renderDrawer();
    expect(screen.queryByRole("button", { name: uk.financeEntryDrawer.deleteLabel })).not.toBeInTheDocument();

    renderDrawer({ entry: entry() });
    expect(screen.getByRole("button", { name: uk.financeEntryDrawer.deleteLabel })).toBeInTheDocument();
  });
});
