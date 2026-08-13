import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Revenue } from "../../api/dashboard";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { RevenueHero } from "./RevenueHero";

function renderHero(revenue: Revenue | null) {
  return render(
    <LocaleProvider>
      <RevenueHero revenue={revenue} />
    </LocaleProvider>,
  );
}

const populated: Revenue = {
  amount: 186200,
  currency: "UAH",
  deltaPercent: 13.6,
  series: [
    { date: "2026-08-01", cumulativeAmount: 40000 },
    { date: "2026-08-09", cumulativeAmount: 120000 },
    { date: "2026-08-13", cumulativeAmount: 186200 },
  ],
};

describe("RevenueHero", () => {
  it("shows the total and the delta when the member has finance access", () => {
    renderHero(populated);

    expect(screen.getByText(/186\s?200/)).toBeInTheDocument();
    expect(screen.getByText(/13\.6%/)).toBeInTheDocument();
    expect(screen.queryByText(uk.revenueHero.noAccess)).not.toBeInTheDocument();
  });

  it("shows an empty state when there is access but no revenue yet", () => {
    renderHero({ ...populated, amount: 0, deltaPercent: 0, series: [] });

    expect(screen.getByText(uk.revenueHero.empty)).toBeInTheDocument();
  });

  /**
   * Null means "no Finance grant", and it has to render as no access rather
   * than as ₴0 — the backend deliberately omits the panel instead of zeroing
   * it so this distinction survives the wire. The whole point is that a
   * member without the grant never sees the agency's revenue, not that they
   * see it as zero.
   */
  it("shows no access, and no figures at all, when the member has no finance grant", () => {
    renderHero(null);

    expect(screen.getByText(uk.revenueHero.noAccess)).toBeInTheDocument();
    expect(screen.queryByText(/₴/)).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
