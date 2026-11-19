import { describe, expect, it } from "vitest";
import type { Analytics, Metrics } from "../../api/targetAds";
import { uk } from "../../i18n/locales/uk";
import { adReportPdfFilename, buildAdReportPdf, buildInsights, hasAdReportData } from "./buildAdReportPdf";

function metrics(overrides: Partial<Metrics> = {}): Metrics {
  return {
    spend: 1000,
    impressions: 50000,
    reach: 40000,
    clicks: 500,
    leads: 20,
    revenue: 0,
    ctr: 1,
    cpc: 2,
    cpl: 50,
    cpm: 20,
    roas: null,
    ...overrides,
  };
}

function analytics(overrides: Partial<Analytics> = {}): Analytics {
  return {
    selectedClientId: "c1",
    from: "2026-10-12",
    to: "2026-11-10",
    clients: [],
    totals: metrics({ spend: 1500, leads: 30, cpl: 50 }),
    byCampaign: [
      { campaignId: "k1", name: "Дорога", clientName: "MUSE'23", platform: "META", metrics: metrics({ cpl: 80 }) },
      { campaignId: "k2", name: "Дешева", clientName: "MUSE'23", platform: "GOOGLE", metrics: metrics({ cpl: 30 }) },
    ],
    byPlatform: [{ platform: "META", metrics: metrics() }],
    daily: [
      { date: "2026-11-08", metrics: metrics({ leads: 4 }) },
      { date: "2026-11-09", metrics: metrics({ leads: 11 }) },
    ],
    ...overrides,
  };
}

const text = (value: unknown) => JSON.stringify(value);

describe("buildAdReportPdf", () => {
  it("prints the client, the period and the headline figures", () => {
    const out = text(buildAdReportPdf({ clientName: "MUSE'23", analytics: analytics(), generatedAt: new Date(2026, 10, 10), t: uk }));

    expect(out).toContain("MUSE'23");
    expect(out).toContain("12 жов 2026");
    expect(out).toContain("10 лис 2026");
    expect(out).toContain("Дорога");
    expect(out).toContain("Дешева");
  });

  /** A ratio with nothing to divide by is a dash in the document too, never ₴0. */
  it("prints a dash for a missing ratio", () => {
    const out = text(
      buildAdReportPdf({
        clientName: "MUSE'23",
        analytics: analytics({ byCampaign: [{ campaignId: "k", name: "Без лідів", clientName: "x", platform: "META", metrics: metrics({ leads: 0, cpl: null }) }] }),
        generatedAt: new Date(),
        t: uk,
      }),
    );

    expect(out).toContain("—");
  });

  /**
   * The font embedded in the PDF has no ₴ glyph: it prints as a box and mangles the
   * text after it. Money is a number and a word here, in every language.
   */
  it("never prints the ₴ sign — money is written with the currency as a word", () => {
    const out = text(buildAdReportPdf({ clientName: "MUSE'23", analytics: analytics({ totals: metrics({ revenue: 6000, roas: 4 }) }), generatedAt: new Date(), t: uk }));

    expect(out).not.toContain("₴");
    expect(out).toContain("грн");
  });

  it("is addressed to the client: nothing about authors or internal ids", () => {
    const out = text(buildAdReportPdf({ clientName: "MUSE'23", analytics: analytics(), generatedAt: new Date(), t: uk }));

    expect(out).not.toContain("k1");
    expect(out).not.toContain("campaignId");
  });
});

describe("buildInsights", () => {
  it("names the cheapest and the dearest campaign by cost per lead, and the best day", () => {
    const lines = buildInsights(analytics(), uk);

    expect(lines.some((line) => line.includes("«Дешева»") && line.includes("«Дорога»"))).toBe(true);
    expect(lines.some((line) => line.includes("9 лис 2026") && line.includes("11"))).toBe(true);
  });

  /** One campaign has nothing to be best against — an invented comparison is worse than none. */
  it("states no best or worst when only one campaign has a cost per lead", () => {
    const one = analytics();
    const lines = buildInsights(analytics({ byCampaign: [one.byCampaign[0]] }), uk);

    expect(lines.some((line) => line.includes("Найвигідніша"))).toBe(false);
  });

  it("states no best or worst when the prices are equal", () => {
    const base = analytics();
    const equal = base.byCampaign.map((row) => ({ ...row, metrics: metrics({ cpl: 50 }) }));

    expect(buildInsights(analytics({ byCampaign: equal }), uk).some((line) => line.includes("Найвигідніша"))).toBe(false);
  });

  it("says there were no leads instead of quoting a cost per lead", () => {
    const lines = buildInsights(analytics({ totals: metrics({ leads: 0, cpl: null }), daily: [] }), uk);

    expect(lines[0]).toContain("Лідів не зафіксовано");
    expect(lines.some((line) => line.includes("Найбільше лідів"))).toBe(false);
  });

  it("mentions ROAS only when there is revenue", () => {
    expect(buildInsights(analytics(), uk).some((line) => line.includes("ROAS"))).toBe(false);
    const withRoas = buildInsights(analytics({ totals: metrics({ revenue: 6000, roas: 4 }) }), uk);
    expect(withRoas.some((line) => line.includes("ROAS"))).toBe(true);
  });
});

describe("hasAdReportData / filename", () => {
  it("has no data when no campaign has statistics in the period", () => {
    expect(hasAdReportData(analytics({ byCampaign: [] }))).toBe(false);
    expect(hasAdReportData(analytics())).toBe(true);
  });

  it("makes a file-system-safe name", () => {
    expect(adReportPdfFilename("MUSE'23 / Beauty", "2026-10-12", "2026-11-10")).toBe(
      "ad-report-muse-23-beauty-2026-10-12_2026-11-10.pdf",
    );
  });
});
