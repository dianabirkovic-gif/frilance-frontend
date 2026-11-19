import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  emptyTrash,
  getAssignableMembers,
  getClients,
  getTrash,
  purgeClient,
  restoreClient,
  type Trash,
} from "../../api/clients";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { PageFabProvider } from "../../templates/AppShell/PageFabContext";
import { PageHeaderProvider } from "../../templates/AppShell/PageHeaderContext";
import { ClientsPage } from "./ClientsPage";

vi.mock("../../api/clients", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/clients")>()),
  getClients: vi.fn(),
  getAssignableMembers: vi.fn(),
  getTrash: vi.fn(),
  restoreClient: vi.fn(),
  purgeClient: vi.fn(),
  emptyTrash: vi.fn(),
}));

const auth = { canEdit: () => true, ownsTenant: true };
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => auth }));

const getClientsMock = vi.mocked(getClients);
const getTrashMock = vi.mocked(getTrash);
const restoreMock = vi.mocked(restoreClient);
const purgeMock = vi.mocked(purgeClient);
const emptyMock = vi.mocked(emptyTrash);

function trash(): Trash {
  return {
    retentionDays: 30,
    clients: [
      {
        id: "t1",
        name: "Видалений клієнт",
        niche: "Тест",
        deletedAt: "2026-11-10T10:00:00Z",
        deletedByName: "Діана М.",
        purgeAt: "2026-12-10T10:00:00Z",
      },
    ],
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <PageHeaderProvider>
          <PageFabProvider>
            <ClientsPage />
          </PageFabProvider>
        </PageHeaderProvider>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

async function openTrash() {
  fireEvent.click(await screen.findByRole("button", { name: new RegExp(uk.clientsPage.trash.chip) }));
}

beforeEach(() => {
  auth.ownsTenant = true;
  getClientsMock.mockReset().mockResolvedValue([]);
  vi.mocked(getAssignableMembers).mockReset().mockResolvedValue([]);
  getTrashMock.mockReset().mockResolvedValue(trash());
  restoreMock.mockReset().mockResolvedValue(undefined);
  purgeMock.mockReset().mockResolvedValue(undefined);
  emptyMock.mockReset().mockResolvedValue({ purged: 1 });
});

describe("Clients page — trash", () => {
  it("shows the trash tab with its count, and the deleted clients when opened", async () => {
    renderPage();

    const chip = await screen.findByRole("button", { name: new RegExp(uk.clientsPage.trash.chip) });
    await waitFor(() => expect(chip).toHaveTextContent("1"));
    fireEvent.click(chip);

    expect(await screen.findByText("Видалений клієнт")).toBeInTheDocument();
    expect(screen.getByText(/зберігається 30 дн\./)).toBeInTheDocument();
  });

  /** The trash is the owner's: nobody else is offered the tab, and nothing is requested for them. */
  it("offers no trash and asks for none to anyone but the owner", async () => {
    auth.ownsTenant = false;
    renderPage();

    await screen.findByText(uk.clientsPage.filters.all);
    expect(screen.queryByRole("button", { name: new RegExp(uk.clientsPage.trash.chip) })).not.toBeInTheDocument();
    expect(getTrashMock).not.toHaveBeenCalled();
  });

  it("restores a client and says so", async () => {
    renderPage();
    await openTrash();

    fireEvent.click(await screen.findByRole("button", { name: uk.clientsPage.trash.restore }));

    await waitFor(() => expect(restoreMock).toHaveBeenCalledWith("t1"));
    expect(await screen.findByText("Клієнта «Видалений клієнт» відновлено.")).toBeInTheDocument();
  });

  it("says so when a restore fails", async () => {
    restoreMock.mockRejectedValue(new Error("boom"));
    renderPage();
    await openTrash();

    fireEvent.click(await screen.findByRole("button", { name: uk.clientsPage.trash.restore }));

    expect(await screen.findByText(uk.clientsPage.trash.restoreError)).toBeInTheDocument();
  });

  /** Permanent means permanent: it asks first, and only the confirmation deletes. */
  it("asks before deleting for good, and does nothing when cancelled", async () => {
    renderPage();
    await openTrash();

    fireEvent.click(await screen.findByRole("button", { name: uk.clientsPage.trash.deleteForever }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("Видалений клієнт");
    expect(dialog).toHaveTextContent("неможливо");
    fireEvent.click(within(dialog).getByRole("button", { name: uk.confirmationDialog.cancelLabel }));

    expect(purgeMock).not.toHaveBeenCalled();
  });

  it("deletes for good once confirmed", async () => {
    renderPage();
    await openTrash();

    fireEvent.click(await screen.findByRole("button", { name: uk.clientsPage.trash.deleteForever }));
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: uk.clientsPage.trash.purgeConfirmLabel }),
    );

    await waitFor(() => expect(purgeMock).toHaveBeenCalledWith("t1"));
  });

  it("empties the trash only after a confirmation that says how many go", async () => {
    renderPage();
    await openTrash();

    fireEvent.click(await screen.findByRole("button", { name: uk.clientsPage.trash.emptyTrash }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("(1)");
    expect(emptyMock).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: uk.clientsPage.trash.emptyConfirmLabel }));

    await waitFor(() => expect(emptyMock).toHaveBeenCalled());
  });

  it("says so when the trash is empty, and offers nothing to empty", async () => {
    getTrashMock.mockResolvedValue({ retentionDays: 30, clients: [] });
    renderPage();
    await openTrash();

    expect(await screen.findByText(uk.clientsPage.trash.empty)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: uk.clientsPage.trash.emptyTrash })).not.toBeInTheDocument();
  });
});
