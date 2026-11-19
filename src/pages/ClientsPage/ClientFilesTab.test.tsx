import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getClientFiles, uploadClientFile, type ClientFile } from "../../api/clients";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { ClientFilesTab } from "./ClientFilesTab";

vi.mock("../../api/clients", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/clients")>()),
  getClientFiles: vi.fn(),
  uploadClientFile: vi.fn(),
}));

let canEdit = true;
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ canEdit: () => canEdit }) }));

const file = (overrides: Partial<ClientFile> = {}): ClientFile => ({
  id: "f1",
  name: "бриф.pdf",
  contentType: "application/pdf",
  sizeBytes: 2048,
  uploadedByName: "Оксана",
  createdAt: "2026-11-05T10:00:00Z",
  canDelete: true,
  ...overrides,
});

function renderTab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LocaleProvider>
        <ClientFilesTab clientId="c1" />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

function choose(input: HTMLElement, name: string, size = 10) {
  const chosen = new File([new Uint8Array(size)], name);
  fireEvent.change(input, { target: { files: [chosen] } });
  return chosen;
}

describe("ClientFilesTab", () => {
  beforeEach(() => {
    canEdit = true;
    vi.mocked(getClientFiles).mockReset().mockResolvedValue([]);
    vi.mocked(uploadClientFile).mockReset();
  });

  it("lists files with size and uploader", async () => {
    vi.mocked(getClientFiles).mockResolvedValue([file()]);
    renderTab();

    expect(await screen.findByText("бриф.pdf")).toBeInTheDocument();
    expect(screen.getByText("2 KB")).toBeInTheDocument();
    expect(screen.getByText(/Оксана/)).toBeInTheDocument();
  });

  it("uploads the chosen file", async () => {
    vi.mocked(uploadClientFile).mockResolvedValue(file());
    renderTab();
    await screen.findByText(uk.clientFilesTab.empty);

    const chosen = choose(screen.getByLabelText(uk.clientFilesTab.upload, { selector: "input" }), "договір.pdf");

    await waitFor(() => expect(uploadClientFile).toHaveBeenCalledWith("c1", chosen));
  });

  /** Spares the user an upload that is bound to fail; the server checks both itself. */
  it("refuses an unsupported type or an oversized file before uploading", async () => {
    renderTab();
    await screen.findByText(uk.clientFilesTab.empty);
    const input = screen.getByLabelText(uk.clientFilesTab.upload, { selector: "input" });

    choose(input, "script.exe");
    expect(await screen.findByText(uk.clientFilesTab.unsupportedType)).toBeInTheDocument();

    choose(input, "huge.pdf", 11 * 1024 * 1024);
    expect(await screen.findByText(uk.clientFilesTab.tooLarge)).toBeInTheDocument();

    expect(uploadClientFile).not.toHaveBeenCalled();
  });

  it("offers delete only where the server allows it, and no upload under a read-only grant", async () => {
    canEdit = false;
    vi.mocked(getClientFiles).mockResolvedValue([file()]);
    renderTab();

    await screen.findByText("бриф.pdf");
    expect(screen.getByText(uk.clientFilesTab.readOnly)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: uk.clientFilesTab.delete })).not.toBeInTheDocument();
    // Reading and downloading stay open.
    expect(screen.getByRole("button", { name: uk.clientFilesTab.download })).toBeInTheDocument();
  });
});
