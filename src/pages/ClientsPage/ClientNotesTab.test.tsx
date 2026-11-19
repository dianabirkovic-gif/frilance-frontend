import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addClientNote, deleteClientNote, getClientNotes, type ClientNote } from "../../api/clients";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { ClientNotesTab } from "./ClientNotesTab";

vi.mock("../../api/clients", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/clients")>()),
  getClientNotes: vi.fn(),
  addClientNote: vi.fn(),
  deleteClientNote: vi.fn(),
}));

let canEdit = true;
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ canEdit: () => canEdit }) }));

const note = (overrides: Partial<ClientNote> = {}): ClientNote => ({
  id: "n1",
  body: "Любить мінімалізм",
  authorName: "Оксана",
  createdAt: "2026-11-05T10:00:00Z",
  updatedAt: "2026-11-05T10:00:00Z",
  canModify: true,
  ...overrides,
});

function renderTab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LocaleProvider>
        <ClientNotesTab clientId="c1" />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

describe("ClientNotesTab", () => {
  beforeEach(() => {
    canEdit = true;
    vi.mocked(getClientNotes).mockReset();
    vi.mocked(addClientNote).mockReset();
    vi.mocked(deleteClientNote).mockReset();
  });

  it("lists the notes with their author", async () => {
    vi.mocked(getClientNotes).mockResolvedValue([note()]);
    renderTab();

    expect(await screen.findByText("Любить мінімалізм")).toBeInTheDocument();
    expect(screen.getByText(/Оксана/)).toBeInTheDocument();
  });

  it("adds a note and clears the box", async () => {
    vi.mocked(getClientNotes).mockResolvedValue([]);
    vi.mocked(addClientNote).mockResolvedValue(note());
    renderTab();
    await screen.findByText(uk.clientNotesTab.empty);

    const box = screen.getByLabelText(uk.clientNotesTab.placeholder);
    fireEvent.change(box, { target: { value: "  Нова нотатка  " } });
    fireEvent.click(screen.getByRole("button", { name: uk.clientNotesTab.add }));

    await waitFor(() => expect(addClientNote).toHaveBeenCalledWith("c1", "Нова нотатка"));
    await waitFor(() => expect(box).toHaveValue(""));
  });

  /** `canModify` is the server's answer — somebody else's note offers no controls. */
  it("offers edit and delete only on notes the server says may be changed", async () => {
    vi.mocked(getClientNotes).mockResolvedValue([note({ id: "mine" }), note({ id: "theirs", body: "Чужа", canModify: false })]);
    renderTab();
    await screen.findByText("Чужа");

    expect(screen.getAllByRole("button", { name: uk.clientNotesTab.delete })).toHaveLength(1);
  });

  it("asks before deleting", async () => {
    vi.mocked(getClientNotes).mockResolvedValue([note()]);
    vi.mocked(deleteClientNote).mockResolvedValue(undefined);
    renderTab();
    await screen.findByText("Любить мінімалізм");

    fireEvent.click(screen.getByRole("button", { name: uk.clientNotesTab.delete }));
    expect(deleteClientNote).not.toHaveBeenCalled();
    // The dialog's own confirm button is the second «Видалити».
    fireEvent.click(screen.getAllByRole("button", { name: uk.clientNotesTab.delete }).at(-1)!);

    await waitFor(() => expect(deleteClientNote).toHaveBeenCalledWith("c1", "n1"));
  });

  it("shows no composer under a read-only grant", async () => {
    canEdit = false;
    vi.mocked(getClientNotes).mockResolvedValue([note()]);
    renderTab();

    expect(await screen.findByText(uk.clientNotesTab.readOnly)).toBeInTheDocument();
    expect(screen.queryByLabelText(uk.clientNotesTab.placeholder)).not.toBeInTheDocument();
  });
});
