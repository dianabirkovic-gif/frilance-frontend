import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { PaymentStatusBadge } from "./PaymentStatusBadge";

function renderBadge(props: Parameters<typeof PaymentStatusBadge>[0]) {
  return render(
    <LocaleProvider>
      <PaymentStatusBadge {...props} />
    </LocaleProvider>,
  );
}

describe("PaymentStatusBadge", () => {
  it("names the two stored states", () => {
    renderBadge({ status: "PAID" });
    expect(screen.getByText(uk.paymentStatus.PAID)).toBeInTheDocument();
  });

  it("says «Очікує» for an unpaid operation inside its terms", () => {
    renderBadge({ status: "PENDING" });
    expect(screen.getByText(uk.paymentStatus.PENDING)).toBeInTheDocument();
  });

  /**
   * «Прострочено» replaces the label rather than being a fourth stored state —
   * the entry is still PENDING, it is the deadline that has passed.
   */
  it("shows overdue instead of the stored label once the deadline has passed", () => {
    renderBadge({ status: "PENDING", overdue: true });

    expect(screen.getByText(uk.financeRegister.overdueBadge)).toBeInTheDocument();
    expect(screen.queryByText(uk.paymentStatus.PENDING)).not.toBeInTheDocument();
  });
});
