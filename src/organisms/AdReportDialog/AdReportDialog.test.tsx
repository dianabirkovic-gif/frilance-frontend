import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAnalytics, type Analytics, type Metrics } from "../../api/targetAds";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { downloadPdf } from "../../utils/downloadPdf";
import { AdReportDialog } from "./AdReportDialog";

vi.mock("../../api/targetAds", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/targetAds")>()),
  getAnalytics: vi.fn(),
}));
vi.mock("../../utils/downloadPdf", () => ({ downloadPdf: vi.fn().mockResolvedValue(undefined) }));

const getAnalyticsMock = vi.mocked(getAnalytics);
const downloadMock = vi.mocked(downloadPdf);

const CLIENTS = [{ id: "c1", name: "MUSE'23", archived: false }];

const m: Metrics = {
  spend: 100, impressions: 1000, reach: 900, clicks: 10, leads: 2, revenue: 0,
  ctr: 1, cpc: 10, cpl: 50, cpm: 100, roas: null,
};

function analytics(withData: boolean): Analytics {
  return {
    selectedClientId: "c1",
    from: "2026-10-12",
    to: "2026-11-10",
    clients: CLIENTS,
    totals: m,
    byCampaign: withData
      ? [{ campaignId: "k1", name: "Осінь", clientName: "MUSE'23", platform: "META", metrics: m }]
      : [],
    byPlatform: [],
    daily: [],
  };
}

function renderDialog(onClose = vi.fn(), defaultClientId: string | null = "c1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AdReportDialog
          open
          clients={CLIENTS}
          defaultClientId={defaultClientId}
          defaultFrom="2026-10-12"
          defaultTo="2026-11-10"
          onClose={onClose}
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );
  return onClose;
}

beforeEach(() => {
  getAnalyticsMock.mockReset();
  downloadMock.mockClear();
});

describe("AdReportDialog", () => {
  it("builds the report for the chosen client and period, then closes", async () => {
    getAnalyticsMock.mockResolvedValue(analytics(true));
    const onClose = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: uk.adReport.submitIdle }));

    await waitFor(() => expect(downloadMock).toHaveBeenCalledTimes(1));
    expect(getAnalyticsMock).toHaveBeenCalledWith("c1", "2026-10-12", "2026-11-10");
    expect(downloadMock.mock.calls[0][1]).toBe("ad-report-muse-23-2026-10-12_2026-11-10.pdf");
    expect(onClose).toHaveBeenCalled();
  });

  /** An empty document is never worth sending: say so and keep the dialog open. */
  it("refuses to make a report when the period has no statistics", async () => {
    getAnalyticsMock.mockResolvedValue(analytics(false));
    const onClose = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: uk.adReport.submitIdle }));

    expect(await screen.findByText(uk.adReport.noData)).toBeInTheDocument();
    expect(downloadMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("needs a client — a report cannot mix clients", () => {
    renderDialog(vi.fn(), null);

    expect(screen.getByRole("button", { name: uk.adReport.submitIdle })).toBeDisabled();
  });

  it("refuses an inverted period before asking the server", async () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText(uk.adReport.fromLabel), { target: { value: "2026-12-01" } });

    fireEvent.click(screen.getByRole("button", { name: uk.adReport.submitIdle }));

    expect(await screen.findByText(uk.adReport.rangeInvalid)).toBeInTheDocument();
    expect(getAnalyticsMock).not.toHaveBeenCalled();
  });

  it("says so when the report cannot be loaded", async () => {
    getAnalyticsMock.mockRejectedValue(new Error("boom"));
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: uk.adReport.submitIdle }));

    expect(await screen.findByText(uk.adReport.loadError)).toBeInTheDocument();
    expect(downloadMock).not.toHaveBeenCalled();
  });
});
