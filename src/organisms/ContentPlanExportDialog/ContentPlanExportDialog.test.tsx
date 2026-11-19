import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getContentPlan, type ContentPlan, type Post } from "../../api/contentPlan";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { downloadContentPlanPdf } from "../../utils/contentPlanPdf/downloadContentPlanPdf";
import { ContentPlanExportDialog } from "./ContentPlanExportDialog";

vi.mock("../../api/contentPlan", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/contentPlan")>()),
  getContentPlan: vi.fn(),
}));
vi.mock("../../utils/contentPlanPdf/downloadContentPlanPdf", () => ({
  downloadContentPlanPdf: vi.fn().mockResolvedValue(undefined),
}));

const getPlan = vi.mocked(getContentPlan);
const download = vi.mocked(downloadContentPlanPdf);

function post(overrides: Partial<Post>): Post {
  return {
    id: "p",
    clientId: "c1",
    clientName: "MUSE'23",
    type: "POST",
    title: "Пост",
    scheduledDate: "2026-11-05",
    status: "READY",
    rating: null,
    authorId: null,
    authorName: null,
    note: null,
    ...overrides,
  };
}

function plan(posts: Post[]): ContentPlan {
  return { month: "2026-11", selectedClientId: "c1", clients: [], totalPosts: posts.length, publishedPosts: 0, posts };
}

const onClose = vi.fn();

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LocaleProvider>
        <ContentPlanExportDialog
          open
          clients={[{ id: "c1", name: "MUSE'23", archived: false }]}
          defaultClientId="c1"
          defaultFrom="2026-11-01"
          defaultTo="2026-11-30"
          onClose={onClose}
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

const submit = () => fireEvent.click(screen.getByRole("button", { name: uk.contentPlanExport.submitIdle }));

describe("ContentPlanExportDialog", () => {
  beforeEach(() => {
    getPlan.mockReset();
    download.mockClear();
    onClose.mockClear();
  });

  it("leaves drafts out unless asked, and only keeps posts inside the period", async () => {
    getPlan.mockResolvedValue(
      plan([
        post({ id: "ready" }),
        post({ id: "draft", status: "DRAFT" }),
        post({ id: "outside", scheduledDate: "2026-12-02" }),
      ]),
    );
    renderDialog();
    submit();

    await waitFor(() => expect(download).toHaveBeenCalled());
    const input = vi.mocked(download).mock.calls[0][0];
    expect(JSON.stringify(input)).toContain("Публікацій у плані: 1");
    expect(onClose).toHaveBeenCalled();
  });

  it("includes drafts when the switch is on", async () => {
    getPlan.mockResolvedValue(plan([post({ id: "ready" }), post({ id: "draft", status: "DRAFT", title: "Чернетка" })]));
    renderDialog();
    fireEvent.click(screen.getByRole("checkbox"));
    submit();

    await waitFor(() => expect(download).toHaveBeenCalled());
    expect(JSON.stringify(vi.mocked(download).mock.calls[0][0])).toContain("Публікацій у плані: 2");
  });

  it("says so instead of downloading an empty document", async () => {
    getPlan.mockResolvedValue(plan([post({ id: "draft", status: "DRAFT" })]));
    renderDialog();
    submit();

    expect(await screen.findByText(uk.contentPlanExport.noPosts)).toBeInTheDocument();
    expect(download).not.toHaveBeenCalled();
  });

  it("refuses a period that ends before it starts", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText(uk.contentPlanExport.toLabel), { target: { value: "2026-10-01" } });
    submit();

    expect(screen.getByText(uk.contentPlanExport.rangeInvalid)).toBeInTheDocument();
    expect(getPlan).not.toHaveBeenCalled();
  });

  it("shows a failure and stays open when the plan cannot be read", async () => {
    getPlan.mockRejectedValue(new Error("boom"));
    renderDialog();
    submit();

    expect(await screen.findByText(uk.contentPlanExport.loadError)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
