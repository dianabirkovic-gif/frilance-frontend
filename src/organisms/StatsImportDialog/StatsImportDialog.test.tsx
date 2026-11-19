import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { importCampaignStats } from "../../api/targetAds";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { StatsImportDialog } from "./StatsImportDialog";

vi.mock("../../api/targetAds", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/targetAds")>()),
  importCampaignStats: vi.fn(),
}));

const importMock = vi.mocked(importCampaignStats);

const META = [
  "Day,Campaign name,Amount spent (UAH),Impressions,Reach,Link clicks,Results",
  '2026-11-05,Осінь,"1 234,50",12000,9000,240,12',
  '2026-11-06,Осінь,"980,00",9000,7000,180,9',
  "2026-11-06,Весна,100,1000,800,20,1",
].join("\n");

const SINGLE = [
  "Day,Cost,Impressions,Clicks,Conversions",
  "2026-11-05,100,1000,20,2",
  "2026-11-06,200,2000,40,4",
  "Total,300,3000,60,6",
].join("\n");

/** jsdom's File has no arrayBuffer(), which is what the dialog reads. */
function csvFile(text: string, name = "report.csv"): File {
  const file = new File([text], name, { type: "text/csv" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => new TextEncoder().encode(text).buffer });
  return file;
}

function renderDialog(existing: string[] = []) {
  const onClose = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <StatsImportDialog
          open
          campaignId="k1"
          campaignName="Осінь"
          existingDates={new Set(existing)}
          onClose={onClose}
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );
  return onClose;
}

async function upload(text: string) {
  const input = screen.getByLabelText(uk.statsImport.fileLabel) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [csvFile(text)] } });
}

beforeEach(() => {
  importMock.mockReset();
});

describe("StatsImportDialog", () => {
  it("previews the days and how many of them replace existing ones, then sends them", async () => {
    importMock.mockResolvedValue({ created: 1, updated: 1 });
    renderDialog(["2026-11-05"]);

    await upload(SINGLE);

    // The 'Total' line is a title, not a day.
    expect(await screen.findByText("Днів до імпорту: 2 (нових: 1, замінить існуючих: 1).")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: uk.statsImport.submitIdle }));

    await waitFor(() =>
      expect(importMock).toHaveBeenCalledWith("k1", [
        { statDate: "2026-11-05", spend: 100, impressions: 1000, reach: 0, clicks: 20, leads: 2, revenue: null },
        { statDate: "2026-11-06", spend: 200, impressions: 2000, reach: 0, clicks: 40, leads: 4, revenue: null },
      ]),
    );
    expect(await screen.findByText("Готово: додано днів — 1, оновлено — 1.")).toBeInTheDocument();
  });

  /** A file of several campaigns must not be added together: nothing imports until one is chosen. */
  it("asks which campaign of a multi-campaign file to import, preselecting the same name", async () => {
    importMock.mockResolvedValue({ created: 2, updated: 0 });
    renderDialog();

    await upload(META);

    const select = (await screen.findByLabelText(uk.statsImport.campaignFilterLabel)) as HTMLSelectElement;
    expect(select.value).toBe("Осінь");
    fireEvent.click(screen.getByRole("button", { name: uk.statsImport.submitIdle }));

    await waitFor(() => expect(importMock).toHaveBeenCalled());
    const rows = importMock.mock.calls[0][1];
    expect(rows).toHaveLength(2);
    expect(rows[1].spend).toBe(980); // Осінь only — Весна's 100 on the same day is not added
  });

  it("blocks the import until a campaign is chosen when none matches by name", async () => {
    renderDialog();
    const text = META.replace(/Осінь/g, "Літо");

    await upload(text);

    await screen.findByLabelText(uk.statsImport.campaignFilterLabel);
    expect(screen.getByRole("button", { name: uk.statsImport.submitIdle })).toBeDisabled();
  });

  it("lists rows it will not import, with the reason, and imports the rest", async () => {
    importMock.mockResolvedValue({ created: 1, updated: 0 });
    renderDialog();

    await upload("Day,Cost,Impressions,Clicks\n2026-11-05,10,100,500\n2026-11-06,10,100,5");

    expect(await screen.findByText(/кліків більше, ніж показів/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: uk.statsImport.submitIdle }));
    await waitFor(() => expect(importMock.mock.calls[0][1].map((row) => row.statDate)).toEqual(["2026-11-06"]));
  });

  it("lets the member correct a column the guess got wrong", async () => {
    renderDialog();
    await upload("Day,Spend,Impressions,Clicks,Extra\n2026-11-05,10,100,5,99");

    const leads = (await screen.findByLabelText(uk.statsImport.fields.leads)) as HTMLSelectElement;
    expect(leads.value).toBe("");
    fireEvent.change(leads, { target: { value: "4" } });

    expect(leads.value).toBe("4");
  });

  it("says when the file has no table, or nothing importable", async () => {
    renderDialog();
    await upload("just one line");
    expect(await screen.findByText(uk.statsImport.noTable)).toBeInTheDocument();

    await upload("Day,Cost,Impressions,Clicks\nTotal,300,3000,60");
    expect(await screen.findByText(uk.statsImport.noRows)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: uk.statsImport.submitIdle })).toBeDisabled();
  });

  it("shows the server's refusal and stays open", async () => {
    importMock.mockRejectedValue(new Error("boom"));
    const onClose = renderDialog();
    await upload(SINGLE);
    await screen.findByText(/Днів до імпорту/);

    fireEvent.click(screen.getByRole("button", { name: uk.statsImport.submitIdle }));

    expect(await screen.findAllByRole("alert")).not.toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();
  });
});
