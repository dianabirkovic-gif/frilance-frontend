import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect } from "react";
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
  assignees: [{ id: "u1", name: "Оксана", initials: "ОК", role: "SMM" as const }],
  status: "ACTIVE",
  monthlyRevenue: 32000,
  cooperationDurationLabel: "8 міс",
  contactName: "Наталія Вовк",
  contactRole: "Засновниця",
  contactPhone: "+380501234567",
  contactEmail: "natalia@example.com",
  stage: "REPORT",
  revenueScope: "AGENCY",
  tariffPlan: null,
  cooperationStartDate: null,
  serviceCost: null,
  activity: [{ timeLabel: "2 год тому", actorInitials: "ОК", actorName: "Оксана", description: "Опублікувала Reels" }],
};

const members = [
  { id: "u1", name: "Оксана", initials: "ОК", role: "SMM" as const },
  { id: "u2", name: "Аліна", initials: "АЛ", role: "PROJECT_MANAGER" as const },
];

type DrawerProps = Parameters<typeof ClientDetailDrawer>[0];

function renderDrawer(props: Partial<DrawerProps> = {}) {
  return render(
    <LocaleProvider>
      <ClientDetailDrawer
        open
        detail={sample}
        isLoading={false}
        isError={false}
        isArchiving={false}
        isDeleting={false}
        canEdit
        canManageClient
        onEdit={vi.fn()}
        assignableMembers={members}
        onSaveAssignees={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
        {...props}
      />
    </LocaleProvider>,
  );
}

describe("ClientDetailDrawer", () => {
  describe("staffing", () => {
    it("lists who is on the client", () => {
      renderDrawer();

      expect(screen.getByText(uk.clientDetailDrawer.sectionAssignees)).toBeInTheDocument();
      expect(screen.getAllByText("Оксана").length).toBeGreaterThan(0);
    });

    it("saves the members that were ticked, replacing the whole staffing", async () => {
      const onSaveAssignees = vi.fn().mockResolvedValue(undefined);
      renderDrawer({ onSaveAssignees });

      fireEvent.click(screen.getByRole("button", { name: uk.clientDetailDrawer.editAssignees }));
      // Оксана is already on; add Аліна, drop Оксана.
      fireEvent.click(screen.getByRole("checkbox", { name: /Аліна/ }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Оксана/ }));
      fireEvent.click(screen.getByRole("button", { name: uk.clientDetailDrawer.saveAssignees }));

      await waitFor(() => expect(onSaveAssignees).toHaveBeenCalledWith(["u2"]));
    });

    it("abandons the draft on cancel rather than remembering it", () => {
      renderDrawer();

      fireEvent.click(screen.getByRole("button", { name: uk.clientDetailDrawer.editAssignees }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Аліна/ }));
      fireEvent.click(screen.getByRole("button", { name: uk.clientDetailDrawer.cancelAssignees }));

      fireEvent.click(screen.getByRole("button", { name: uk.clientDetailDrawer.editAssignees }));
      expect(screen.getByRole("checkbox", { name: /Аліна/ })).not.toBeChecked();
      expect(screen.getByRole("checkbox", { name: /Оксана/ })).toBeChecked();
    });

    it("keeps the editor open and says so when the save fails", async () => {
      const onSaveAssignees = vi.fn().mockRejectedValue(new Error("boom"));
      renderDrawer({ onSaveAssignees });

      fireEvent.click(screen.getByRole("button", { name: uk.clientDetailDrawer.editAssignees }));
      fireEvent.click(screen.getByRole("button", { name: uk.clientDetailDrawer.saveAssignees }));

      expect(await screen.findByText(uk.clientDetailDrawer.assigneesErrorFallback)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: uk.clientDetailDrawer.saveAssignees })).toBeInTheDocument();
    });

    it("offers no way to restaff under a read-only grant", () => {
      renderDrawer({ canEdit: false });

      expect(
        screen.queryByRole("button", { name: uk.clientDetailDrawer.editAssignees }),
      ).not.toBeInTheDocument();
      // The staffing is still readable.
      expect(screen.getAllByText("Оксана").length).toBeGreaterThan(0);
    });
  });

  it("renders the client's card fields, stats, contact and activity", () => {
    render(
      <LocaleProvider>
        <ClientDetailDrawer
          open
          detail={sample}
          isLoading={false}
          isError={false}
          isArchiving={false}
          isDeleting={false}
          assignableMembers={members}
      onSaveAssignees={vi.fn().mockResolvedValue(undefined)}
      canEdit
      canManageClient
      onEdit={vi.fn()}
          onClose={vi.fn()}
          onArchive={vi.fn()}
          onDelete={vi.fn()}
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
          isError={false}
          isArchiving={false}
          isDeleting={false}
          assignableMembers={members}
      onSaveAssignees={vi.fn().mockResolvedValue(undefined)}
      canEdit
      canManageClient
      onEdit={vi.fn()}
          onClose={vi.fn()}
          onArchive={vi.fn()}
          onDelete={vi.fn()}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText(uk.clientDetailDrawer.activityEmpty)).toBeInTheDocument();
  });

  // Regression: removing yourself from a client 404s the detail refetch, and
  // TanStack Query keeps the last good `data` on error — so the drawer went on
  // rendering the client with the user still on its staffing.
  it("stops rendering a client whose detail became unreachable, even with stale data in hand", () => {
    renderDrawer({ isError: true });

    expect(screen.getByText(uk.clientDetailDrawer.unavailable)).toBeInTheDocument();
    expect(screen.queryByText("MUSE'23")).not.toBeInTheDocument();
    expect(screen.queryByText(uk.clientDetailDrawer.sectionAssignees)).not.toBeInTheDocument();
  });

  it("prefers the loading state over the error state while a retry is in flight", () => {
    renderDrawer({ isError: true, isLoading: true });

    expect(screen.getByText(uk.clientDetailDrawer.loading)).toBeInTheDocument();
    expect(screen.queryByText(uk.clientDetailDrawer.unavailable)).not.toBeInTheDocument();
  });

  it("shows a loading state while the detail query is in flight", () => {
    render(
      <LocaleProvider>
        <ClientDetailDrawer
          open
          detail={undefined}
          isLoading
          isError={false}
          isArchiving={false}
          isDeleting={false}
          assignableMembers={members}
      onSaveAssignees={vi.fn().mockResolvedValue(undefined)}
      canEdit
      canManageClient
      onEdit={vi.fn()}
          onClose={vi.fn()}
          onArchive={vi.fn()}
          onDelete={vi.fn()}
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
          isError={false}
          isArchiving={false}
          isDeleting={false}
          assignableMembers={members}
      onSaveAssignees={vi.fn().mockResolvedValue(undefined)}
      canEdit
      canManageClient
      onEdit={vi.fn()}
          onClose={vi.fn()}
          onArchive={onArchive}
          onDelete={vi.fn()}
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
          isError={false}
          isArchiving={false}
          isDeleting={false}
          assignableMembers={members}
      onSaveAssignees={vi.fn().mockResolvedValue(undefined)}
      canEdit
      canManageClient
      onEdit={vi.fn()}
          onClose={vi.fn()}
          onArchive={onArchive}
          onDelete={vi.fn()}
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
          isError={false}
          isArchiving={false}
          isDeleting={false}
          assignableMembers={members}
      onSaveAssignees={vi.fn().mockResolvedValue(undefined)}
      canEdit
      canManageClient
      onEdit={vi.fn()}
          onClose={vi.fn()}
          onArchive={vi.fn()}
          onDelete={vi.fn()}
        />
      </LocaleProvider>,
    );

    expect(screen.getByRole("button", { name: uk.clientDetailDrawer.archiveDone })).toBeDisabled();
  });

  it("hides the archive action entirely under a read-only Clients grant", () => {
    render(
      <LocaleProvider>
        <ClientDetailDrawer
          open
          detail={sample}
          isLoading={false}
          isError={false}
          isArchiving={false}
          isDeleting={false}
          assignableMembers={members}
      onSaveAssignees={vi.fn().mockResolvedValue(undefined)}
      canEdit={false}
      canManageClient={false}
      onEdit={vi.fn()}
          onClose={vi.fn()}
          onArchive={vi.fn()}
          onDelete={vi.fn()}
        />
      </LocaleProvider>,
    );

    // The card itself still reads normally — READ opens it, it just can't change it.
    expect(screen.getByText("MUSE'23")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: uk.clientDetailDrawer.archiveIdle })).not.toBeInTheDocument();
  });

  // The plan belongs to another module: the drawer only owns the slot, and
  // whoever fills it (ClientsPage) owns the fetching and the access check.
  describe("the content tab's slot", () => {
    it("shows what it was given, once that tab is selected", () => {
      renderDrawer({ contentTab: <div>Контент-план клієнта</div> });

      expect(screen.queryByText("Контент-план клієнта")).not.toBeInTheDocument();

      fireEvent.click(screen.getByText(uk.clientDetailDrawer.tabs.content));

      expect(screen.getByText("Контент-план клієнта")).toBeInTheDocument();
    });

    it("keeps the placeholder copy when nothing fills the slot", () => {
      renderDrawer();

      fireEvent.click(screen.getByText(uk.clientDetailDrawer.tabs.content));

      expect(screen.getByText(uk.clientDetailDrawer.contentEmpty)).toBeInTheDocument();
    });

    /**
     * The selected tab used to be state in the outer component, reset by an
     * effect on open — and effects run after the commit, so reopening a client
     * whose detail was still cached (30s `staleTime`) rendered one frame on the
     * tab last left open before correcting itself. Invisible, and harmless
     * while every tab was static copy; with a fetching tab behind one of them,
     * it meant requests going out for a tab nobody selected.
     *
     * Asserting on the DOM cannot catch that — `act` flushes the correcting
     * effect before any assertion runs — so this counts mounts instead.
     */
    it("does not mount the slot again when a client is reopened on it", () => {
      const mounted = vi.fn();
      function Probe() {
        useEffect(() => {
          mounted();
        }, []);
        return <div>Контент-план клієнта</div>;
      }

      const drawer = (open: boolean, detail: ClientDetail | undefined) => (
        <LocaleProvider>
          <ClientDetailDrawer
            open={open}
            detail={detail}
            isLoading={false}
            isError={false}
            isArchiving={false}
            isDeleting={false}
            canEdit
            canManageClient
            onEdit={vi.fn()}
            assignableMembers={members}
            contentTab={<Probe />}
            onSaveAssignees={vi.fn().mockResolvedValue(undefined)}
            onClose={vi.fn()}
            onArchive={vi.fn()}
            onDelete={vi.fn()}
          />
        </LocaleProvider>
      );

      const { rerender } = render(drawer(true, sample));
      fireEvent.click(screen.getByText(uk.clientDetailDrawer.tabs.content));
      expect(mounted).toHaveBeenCalledTimes(1);

      // Closing clears the page's selection, so the detail goes with it...
      rerender(drawer(false, undefined));
      // ...and reopening the same client answers from cache, synchronously.
      rerender(drawer(true, sample));

      expect(mounted).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("Контент-план клієнта")).not.toBeInTheDocument();
      expect(screen.getByText(uk.clientDetailDrawer.sectionAssignees)).toBeInTheDocument();
    });
  });

  describe("who may edit the card", () => {
    it("offers «Редагувати» and archive only to whoever owns the agency", () => {
      const onEdit = vi.fn();
      renderDrawer({ canManageClient: true, onEdit });

      fireEvent.click(screen.getByRole("button", { name: uk.clientDetailDrawer.editClient }));
      expect(onEdit).toHaveBeenCalled();
      expect(screen.getByRole("button", { name: uk.clientDetailDrawer.archiveIdle })).toBeInTheDocument();
    });

    /** Full Clients access still staffs and annotates a client — it does not edit its terms. */
    it("hides both from a member even with full Clients access", () => {
      renderDrawer({ canEdit: true, canManageClient: false });

      expect(screen.queryByRole("button", { name: uk.clientDetailDrawer.editClient })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: uk.clientDetailDrawer.archiveIdle })).not.toBeInTheDocument();
      expect(screen.getByText(uk.clientDetailDrawer.editAssignees)).toBeInTheDocument();
    });

    it("labels a member's figure as their own income, not the client's revenue", () => {
      renderDrawer({ detail: { ...sample, revenueScope: "PERSONAL", monthlyRevenue: 10000 } });

      expect(screen.getByText(uk.clientDetailDrawer.statRevenueLabelPersonal)).toBeInTheDocument();
      expect(screen.queryByText(uk.clientDetailDrawer.statRevenueLabel)).not.toBeInTheDocument();
    });
  });

  describe("deleting a client", () => {
    /** Deleting takes a lot with it: it must not be one click, and it must say what goes. */
    it("asks first, saying it goes to the trash and for how long, and does nothing until confirmed", () => {
      const onDelete = vi.fn().mockResolvedValue(undefined);
      renderDrawer({ onDelete });

      fireEvent.click(screen.getByRole("button", { name: uk.clientDetailDrawer.deleteIdle }));

      const dialog = screen.getByRole("alertdialog");
      expect(within(dialog).getByText(uk.clientDetailDrawer.deleteConfirmTitle)).toBeInTheDocument();
      // Not "permanent": the client goes to the trash and can be restored from there.
      expect(dialog).toHaveTextContent("кошика");
      expect(dialog).toHaveTextContent("30 дн.");
      expect(dialog).toHaveTextContent("відновити");
      expect(onDelete).not.toHaveBeenCalled();
    });

    it("deletes the client and closes the drawer once confirmed", async () => {
      const onDelete = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      renderDrawer({ onDelete, onClose });

      fireEvent.click(screen.getByRole("button", { name: uk.clientDetailDrawer.deleteIdle }));
      fireEvent.click(
        within(screen.getByRole("alertdialog")).getByRole("button", { name: uk.clientDetailDrawer.deleteConfirmLabel }),
      );

      await waitFor(() => expect(onDelete).toHaveBeenCalledWith("1"));
      await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it("does not delete when cancelled", () => {
      const onDelete = vi.fn();
      renderDrawer({ onDelete });

      fireEvent.click(screen.getByRole("button", { name: uk.clientDetailDrawer.deleteIdle }));
      fireEvent.click(
        within(screen.getByRole("alertdialog")).getByRole("button", { name: uk.confirmationDialog.cancelLabel }),
      );

      expect(onDelete).not.toHaveBeenCalled();
    });

    it("keeps the drawer open and says so when the server refuses", async () => {
      const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
      const onClose = vi.fn();
      renderDrawer({ onDelete: vi.fn().mockRejectedValue(new Error("boom")), onClose });

      fireEvent.click(screen.getByRole("button", { name: uk.clientDetailDrawer.deleteIdle }));
      fireEvent.click(
        within(screen.getByRole("alertdialog")).getByRole("button", { name: uk.clientDetailDrawer.deleteConfirmLabel }),
      );

      await waitFor(() => expect(alert).toHaveBeenCalledWith(uk.clientDetailDrawer.deleteErrorFallback));
      expect(onClose).not.toHaveBeenCalled();
      alert.mockRestore();
    });

    /** Only the owner may delete (the backend refuses anyone else): the button is not offered, not 403'd. */
    it("offers no delete action to anyone who cannot manage the client", () => {
      renderDrawer({ canManageClient: false });

      expect(screen.queryByRole("button", { name: uk.clientDetailDrawer.deleteIdle })).not.toBeInTheDocument();
    });
  });
});
