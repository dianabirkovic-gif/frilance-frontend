import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAnalytics,
  getCampaigns,
  getCreativeContent,
  getCreatives,
  type Analytics,
  type Campaign,
  type CampaignList,
  type CreativeList,
  type Metrics,
} from "../../api/targetAds";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { PageFabProvider } from "../../templates/AppShell/PageFabContext";
import { PageHeaderProvider } from "../../templates/AppShell/PageHeaderContext";
import { AnalyticsTab } from "./AnalyticsTab";
import { CampaignsTab } from "./CampaignsTab";
import { CreativesTab } from "./CreativesTab";

vi.mock("../../api/targetAds", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/targetAds")>()),
  getCampaigns: vi.fn(),
  getAnalytics: vi.fn(),
  getCreatives: vi.fn(),
  getCreativeContent: vi.fn(),
}));

const canEdit = vi.fn(() => true);
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ canEdit, canView: () => true }),
}));

const getCampaignsMock = vi.mocked(getCampaigns);
const getAnalyticsMock = vi.mocked(getAnalytics);
const getCreativesMock = vi.mocked(getCreatives);
const getContentMock = vi.mocked(getCreativeContent);

const CLIENTS = [{ id: "c1", name: "MUSE'23", archived: false }];

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

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "k1",
    clientId: "c1",
    clientName: "MUSE'23",
    name: "Осінній розпродаж",
    platform: "META",
    status: "ACTIVE",
    startDate: "2026-10-01",
    endDate: null,
    budget: 5000,
    totals: metrics(),
    statDays: 5,
    ...overrides,
  };
}

function renderTab(tab: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <PageHeaderProvider>
          <PageFabProvider>{tab}</PageFabProvider>
        </PageHeaderProvider>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  canEdit.mockReturnValue(true);
  getCampaignsMock.mockReset();
  getAnalyticsMock.mockReset();
  getCreativesMock.mockReset();
  getContentMock.mockReset();
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

describe("CampaignsTab", () => {
  it("shows a campaign with its figures, and a dash for a missing CPL", async () => {
    const list: CampaignList = {
      selectedClientId: null,
      clients: CLIENTS,
      campaigns: [campaign({ totals: metrics({ cpl: null, leads: 0 }) })],
    };
    getCampaignsMock.mockResolvedValue(list);
    renderTab(<CampaignsTab />);

    const card = (await screen.findByText("Осінній розпродаж")).closest("li")!;
    expect(card).toHaveTextContent(uk.campaignPlatform.META);
    // No leads means no CPL: a dash, not ₴0.
    expect(card).toHaveTextContent("—");
  });

  it("says so when a campaign has no statistics yet", async () => {
    getCampaignsMock.mockResolvedValue({
      selectedClientId: null,
      clients: CLIENTS,
      campaigns: [campaign({ statDays: 0, totals: metrics({ spend: 0, leads: 0, cpl: null }) })],
    });
    renderTab(<CampaignsTab />);

    expect(await screen.findByText(uk.campaignsTab.noStats)).toBeInTheDocument();
  });

  it("offers no write controls without edit access, but still the statistics", async () => {
    canEdit.mockReturnValue(false);
    getCampaignsMock.mockResolvedValue({ selectedClientId: null, clients: CLIENTS, campaigns: [campaign()] });
    renderTab(<CampaignsTab />);

    await screen.findByText("Осінній розпродаж");
    expect(screen.queryByRole("button", { name: uk.campaignsTab.newButton })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: uk.campaignsTab.edit })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: uk.campaignsTab.delete })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: uk.campaignsTab.enterStats })).toBeInTheDocument();
  });
});

describe("AnalyticsTab", () => {
  function analytics(overrides: Partial<Analytics> = {}): Analytics {
    return {
      selectedClientId: null,
      from: "2026-10-12",
      to: "2026-11-10",
      clients: CLIENTS,
      totals: metrics({ spend: 1500, leads: 30, cpl: 50 }),
      byCampaign: [
        { campaignId: "k1", name: "Дорога кампанія", clientName: "MUSE'23", platform: "META", metrics: metrics({ cpl: 80 }) },
        { campaignId: "k2", name: "Дешева кампанія", clientName: "MUSE'23", platform: "GOOGLE", metrics: metrics({ cpl: 30 }) },
      ],
      byPlatform: [{ platform: "META", metrics: metrics() }],
      daily: [{ date: "2026-11-09", metrics: metrics() }],
      ...overrides,
    };
  }

  it("flags the campaign with the lowest cost per lead", async () => {
    getAnalyticsMock.mockResolvedValue(analytics());
    renderTab(<AnalyticsTab />);

    const cheap = (await screen.findByText("Дешева кампанія")).closest("tr")!;
    expect(cheap).toHaveTextContent(uk.analyticsTab.bestBadge);
    expect(screen.getByText("Дорога кампанія").closest("tr")).not.toHaveTextContent(uk.analyticsTab.bestBadge);
  });

  /** One campaign has nothing to be best against. */
  it("flags nothing when only one campaign has a CPL to compare", async () => {
    getAnalyticsMock.mockResolvedValue(analytics({ byCampaign: [analytics().byCampaign[0]] }));
    renderTab(<AnalyticsTab />);

    await screen.findByText("Дорога кампанія");
    expect(screen.queryByText(uk.analyticsTab.bestBadge)).not.toBeInTheDocument();
  });

  it("says so when the period has no statistics", async () => {
    getAnalyticsMock.mockResolvedValue(analytics({ byCampaign: [], byPlatform: [], daily: [] }));
    renderTab(<AnalyticsTab />);

    expect(await screen.findByText(uk.analyticsTab.empty)).toBeInTheDocument();
  });

  it("asks again for the chosen period", async () => {
    getAnalyticsMock.mockResolvedValue(analytics());
    renderTab(<AnalyticsTab />);
    await screen.findByText("Дешева кампанія");

    fireEvent.click(screen.getByRole("button", { name: uk.analyticsTab.last7 }));

    await waitFor(() => {
      const [, from, to] = getAnalyticsMock.mock.calls.at(-1)!;
      const days = (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
      expect(days).toBe(6);
    });
  });
});

describe("CreativesTab", () => {
  function list(overrides: Partial<CreativeList> = {}): CreativeList {
    return {
      selectedClientId: null,
      clients: CLIENTS,
      campaigns: [{ id: "k1", clientId: "c1", name: "Осінній розпродаж" }],
      creatives: [
        {
          id: "i1",
          clientId: "c1",
          campaignId: "k1",
          name: "Банер осінь",
          kind: "IMAGE",
          originalName: "banner.png",
          contentType: "image/png",
          sizeBytes: 2048,
          uploadedByName: "Діана М.",
          createdAt: "2026-11-01T10:00:00Z",
          canModify: true,
        },
        {
          id: "v1",
          clientId: "c1",
          campaignId: null,
          name: "Рілс",
          kind: "VIDEO",
          originalName: "reel.mp4",
          contentType: "video/mp4",
          sizeBytes: 50 * 1024 * 1024,
          uploadedByName: null,
          createdAt: "2026-11-02T10:00:00Z",
          canModify: false,
        },
      ],
      ...overrides,
    };
  }

  it("loads an image straight away but waits for a click before pulling a video", async () => {
    getCreativesMock.mockResolvedValue(list());
    getContentMock.mockResolvedValue(new Blob(["x"], { type: "image/png" }));
    renderTab(<CreativesTab />);

    await screen.findByText("Банер осінь");
    await waitFor(() => expect(getContentMock).toHaveBeenCalledWith("i1"));
    // 50 MB of video must not be fetched just because the card scrolled into view.
    expect(getContentMock).not.toHaveBeenCalledWith("v1");

    fireEvent.click(screen.getByRole("button", { name: uk.creativesTab.play }));
    await waitFor(() => expect(getContentMock).toHaveBeenCalledWith("v1"));
  });

  it("offers delete only where the server says the caller may change it", async () => {
    getCreativesMock.mockResolvedValue(list());
    getContentMock.mockResolvedValue(new Blob(["x"]));
    renderTab(<CreativesTab />);

    await screen.findByText("Банер осінь");
    // Only the image (canModify) gets one; the video does not.
    expect(screen.getAllByRole("button", { name: uk.creativesTab.delete })).toHaveLength(1);
  });

  it("filters to creatives without a campaign", async () => {
    getCreativesMock.mockResolvedValue(list());
    getContentMock.mockResolvedValue(new Blob(["x"]));
    renderTab(<CreativesTab />);
    await screen.findByText("Банер осінь");

    fireEvent.change(screen.getByLabelText(uk.creativesTab.campaignFilterAll), { target: { value: "none" } });

    expect(screen.queryByText("Банер осінь")).not.toBeInTheDocument();
    expect(screen.getByText("Рілс")).toBeInTheDocument();
  });

  it("says so when there are no creatives", async () => {
    getCreativesMock.mockResolvedValue(list({ creatives: [] }));
    renderTab(<CreativesTab />);

    expect(await screen.findByText(uk.creativesTab.empty)).toBeInTheDocument();
  });
});
