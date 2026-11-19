import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TrashedClient } from "../../api/clients";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { ClientTrashTable } from "./ClientTrashTable";

const NOW = new Date("2026-11-19T12:00:00Z").getTime();

function client(overrides: Partial<TrashedClient> = {}): TrashedClient {
  return {
    id: "c1",
    name: "MUSE'23",
    niche: "Beauty",
    deletedAt: "2026-11-10T10:00:00Z",
    deletedByName: "Діана М.",
    purgeAt: "2026-12-10T10:00:00Z",
    ...overrides,
  };
}

function renderTable(clients: TrashedClient[], handlers: Partial<Parameters<typeof ClientTrashTable>[0]> = {}) {
  return render(
    <LocaleProvider>
      <ClientTrashTable
        clients={clients}
        restoringId={null}
        onRestore={vi.fn()}
        onPurge={vi.fn()}
        now={NOW}
        {...handlers}
      />
    </LocaleProvider>,
  );
}

describe("ClientTrashTable", () => {
  it("shows who was deleted, by whom, and how many days are left", () => {
    renderTable([client()]);

    expect(screen.getByText("MUSE'23")).toBeInTheDocument();
    expect(screen.getByText(/Діана М\./)).toBeInTheDocument();
    // 10 Dec 10:00 − 19 Nov 12:00 = 20.9 days: rounded up, so "in 21 days", never "in 20" while it still exists.
    expect(screen.getByText("через 21 дн.")).toBeInTheDocument();
  });

  it("flags the last days, and says 'shortly' once the time is up but the purge has not run yet", () => {
    renderTable([
      client({ id: "a", name: "Скоро", purgeAt: "2026-11-21T00:00:00Z" }),
      client({ id: "b", name: "Прострочений", purgeAt: "2026-11-18T00:00:00Z" }),
    ]);

    expect(screen.getByText("через 2 дн.").className).toMatch(/soon/);
    expect(screen.getByText(uk.clientsPage.trash.purgeToday)).toBeInTheDocument();
  });

  it("restores and deletes for good the client of the row that was clicked", () => {
    const onRestore = vi.fn();
    const onPurge = vi.fn();
    const first = client({ id: "a", name: "Перший" });
    const second = client({ id: "b", name: "Другий" });
    renderTable([first, second], { onRestore, onPurge });

    const [, restoreSecond] = screen.getAllByRole("button", { name: uk.clientsPage.trash.restore });
    fireEvent.click(restoreSecond);
    const [foreverFirst] = screen.getAllByRole("button", { name: uk.clientsPage.trash.deleteForever });
    fireEvent.click(foreverFirst);

    expect(onRestore).toHaveBeenCalledWith(second);
    expect(onPurge).toHaveBeenCalledWith(first);
  });

  /** One at a time: while a restore is in flight nothing else in the trash can be clicked. */
  it("disables every action while one client is being restored", () => {
    renderTable([client({ id: "a" }), client({ id: "b" })], { restoringId: "a" });

    expect(screen.getByRole("button", { name: uk.clientsPage.trash.restoring })).toBeDisabled();
    for (const button of screen.getAllByRole("button", { name: uk.clientsPage.trash.deleteForever })) {
      expect(button).toBeDisabled();
    }
  });

  it("says so when the trash is empty", () => {
    renderTable([]);

    expect(screen.getByText(uk.clientsPage.trash.empty)).toBeInTheDocument();
  });
});
