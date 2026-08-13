import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { TeamMember } from "../../api/team";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { TeamTable } from "./TeamTable";

const sample: TeamMember = {
  id: "1",
  fullName: "Оксана Іванчук",
  email: "oksana@moneyagency.ua",
  role: "SMM",
  status: "ACTIVE",
  loadPercent: 85,
  clientCount: 6,
  access: { CLIENTS: "FULL", CONTENT: "READ", TARGET: "NONE", FINANCE: "NONE", ANALYTICS: "NONE" },
};

function renderTable(props: Partial<ComponentProps<typeof TeamTable>> = {}) {
  return render(
    <LocaleProvider>
      <TeamTable
        members={[sample]}
        canManageTeam={false}
        onRevoke={vi.fn()}
        onEditAccess={vi.fn()}
        revokingId={null}
        {...props}
      />
    </LocaleProvider>,
  );
}

describe("TeamTable", () => {
  it("renders each member's name, role and workload (desktop table + mobile cards)", () => {
    renderTable();

    expect(screen.getAllByText(sample.fullName).length).toBeGreaterThan(0);
    expect(screen.getAllByText(sample.email).length).toBeGreaterThan(0);
    expect(screen.getAllByText(uk.role.SMM).length).toBeGreaterThan(0);
    expect(screen.getAllByText("85%").length).toBeGreaterThan(0);
  });

  it("shows an invited member's status distinctly from an active one", () => {
    renderTable({ members: [{ ...sample, status: "INVITED" }] });

    expect(screen.getAllByText(uk.teamTable.status.INVITED).length).toBeGreaterThan(0);
  });

  it("shows an empty state instead of an empty table when there are no members", () => {
    renderTable({ members: [] });

    expect(screen.getByText(uk.teamTable.empty)).toBeInTheDocument();
  });

  it("hides the revoke action from a non-owner even for an invited member", () => {
    // ConfirmationDialog portals to document.body regardless of open state, and its own
    // confirm button happens to share this label — scope to the render container (which
    // the portal sits outside of) so this checks the table/card rows, not the dialog.
    const { container } = renderTable({ members: [{ ...sample, status: "INVITED" }], canManageTeam: false });

    expect(within(container).queryByText(uk.teamTable.revokeAction)).not.toBeInTheDocument();
  });

  it("does not offer revoke for an already-active member, even for the owner", () => {
    const { container } = renderTable({ members: [{ ...sample, status: "ACTIVE" }], canManageTeam: true });

    expect(within(container).queryByText(uk.teamTable.revokeAction)).not.toBeInTheDocument();
  });

  it("summarizes each member's granted sections and leaves out the ones set to none", () => {
    renderTable();

    const summary = screen.getAllByText(new RegExp(uk.appSection.CLIENTS))[0];
    expect(summary).toHaveTextContent(`${uk.appSection.CLIENTS} · ${uk.accessLevel.FULL}`);
    expect(summary).toHaveTextContent(`${uk.appSection.CONTENT} · ${uk.accessLevel.READ}`);
    expect(summary).not.toHaveTextContent(uk.appSection.FINANCE);
  });

  it("offers the owner an edit-access action per member, and nobody else", () => {
    const onEditAccess = vi.fn();
    const { container, rerender } = renderTable({ canManageTeam: false });
    expect(within(container).queryByText(uk.teamTable.editAccessAction)).not.toBeInTheDocument();

    rerender(
      <LocaleProvider>
        <TeamTable
          members={[sample]}
          canManageTeam
          onRevoke={vi.fn()}
          onEditAccess={onEditAccess}
          revokingId={null}
        />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getAllByText(uk.teamTable.editAccessAction)[0]);
    expect(onEditAccess).toHaveBeenCalledWith(sample);
  });

  it("does not offer to edit the owner's own access, which owning the tenant already implies", () => {
    const { container } = renderTable({ members: [{ ...sample, role: "OWNER" }], canManageTeam: true });

    expect(within(container).queryByText(uk.teamTable.editAccessAction)).not.toBeInTheDocument();
  });

  it("lets the owner revoke an invited member after confirming", async () => {
    const onRevoke = vi.fn().mockResolvedValue(undefined);
    renderTable({ members: [{ ...sample, status: "INVITED" }], canManageTeam: true, onRevoke });

    fireEvent.click(screen.getAllByText(uk.teamTable.revokeAction)[0]);
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent(sample.fullName);

    fireEvent.click(within(dialog).getByRole("button", { name: uk.teamTable.revokeAction }));
    await waitFor(() => expect(onRevoke).toHaveBeenCalledWith(sample.id));
  });
});
