import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ClientDetail } from "../../api/clients";
import { interpolate } from "../../i18n/interpolate";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { ClientDetailDrawer } from "./ClientDetailDrawer";

const sample: ClientDetail = {
  id: "1",
  name: "MUSE'23",
  niche: "Beauty-простір",
  assigneeName: "Оксана",
  status: "ACTIVE",
  monthlyRevenue: 32000,
  cooperationDurationLabel: "8 міс",
  contactName: "Наталія Вовк",
  contactRole: "Засновниця",
  contactPhone: "+380501234567",
  contactEmail: "natalia@example.com",
  stage: "REPORT",
  activity: [{ timeLabel: "2 год тому", actorInitials: "ОК", actorName: "Оксана", description: "Опублікувала Reels" }],
};

describe("ClientDetailDrawer", () => {
  it("renders the client's card fields, stats, contact and activity", () => {
    render(
      <LocaleProvider>
        <ClientDetailDrawer
          open
          detail={sample}
          isLoading={false}
          isArchiving={false}
          onClose={vi.fn()}
          onArchive={vi.fn()}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText("MUSE'23")).toBeInTheDocument();
    expect(screen.getByText("₴32 000")).toBeInTheDocument();
    expect(screen.getByText("8 міс")).toBeInTheDocument();
    expect(screen.getByText("Наталія Вовк")).toBeInTheDocument();
    expect(screen.getByText("+380501234567 · natalia@example.com")).toBeInTheDocument();
    expect(screen.getByText(/Опублікувала Reels/)).toBeInTheDocument();
  });

  it("shows an empty state instead of an empty list when there is no activity yet", () => {
    render(
      <LocaleProvider>
        <ClientDetailDrawer
          open
          detail={{ ...sample, activity: [] }}
          isLoading={false}
          isArchiving={false}
          onClose={vi.fn()}
          onArchive={vi.fn()}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText(uk.clientDetailDrawer.activityEmpty)).toBeInTheDocument();
  });

  it("shows a loading state while the detail query is in flight", () => {
    render(
      <LocaleProvider>
        <ClientDetailDrawer
          open
          detail={undefined}
          isLoading
          isArchiving={false}
          onClose={vi.fn()}
          onArchive={vi.fn()}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText(uk.clientDetailDrawer.loading)).toBeInTheDocument();
  });

  it("opens the confirmation dialog and archives the client after confirming", async () => {
    const onArchive = vi.fn().mockResolvedValue(undefined);
    render(
      <LocaleProvider>
        <ClientDetailDrawer
          open
          detail={sample}
          isLoading={false}
          isArchiving={false}
          onClose={vi.fn()}
          onArchive={onArchive}
        />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: uk.clientDetailDrawer.archiveIdle }));

    const dialog = screen.getByRole("alertdialog");
    expect(
      within(dialog).getByText(interpolate(uk.clientDetailDrawer.archiveConfirmMessageTemplate, { name: "MUSE'23" })),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: uk.clientDetailDrawer.archiveIdle }));

    await waitFor(() => expect(onArchive).toHaveBeenCalledWith("1"));
  });

  it("skips archiving when the confirmation dialog is cancelled", () => {
    const onArchive = vi.fn();
    render(
      <LocaleProvider>
        <ClientDetailDrawer
          open
          detail={sample}
          isLoading={false}
          isArchiving={false}
          onClose={vi.fn()}
          onArchive={onArchive}
        />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: uk.clientDetailDrawer.archiveIdle }));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: uk.confirmationDialog.cancelLabel }));

    expect(onArchive).not.toHaveBeenCalled();
  });

  it("shows the client as already archived instead of offering the action again", () => {
    render(
      <LocaleProvider>
        <ClientDetailDrawer
          open
          detail={{ ...sample, status: "ARCHIVED" }}
          isLoading={false}
          isArchiving={false}
          onClose={vi.fn()}
          onArchive={vi.fn()}
        />
      </LocaleProvider>,
    );

    expect(screen.getByRole("button", { name: uk.clientDetailDrawer.archiveDone })).toBeDisabled();
  });
});
