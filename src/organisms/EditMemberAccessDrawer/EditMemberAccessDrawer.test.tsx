import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TeamMember } from "../../api/team";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { EditMemberAccessDrawer } from "./EditMemberAccessDrawer";

const member: TeamMember = {
  id: "1",
  fullName: "Ірина Мельник",
  email: "iryna@example.com",
  role: "SMM",
  status: "ACTIVE",
  loadPercent: 0,
  clientCount: 0,
  access: { CLIENTS: "READ", CONTENT: "NONE", TARGET: "NONE", FINANCE: "FULL", ANALYTICS: "NONE" },
};

function renderDrawer(props: Partial<Parameters<typeof EditMemberAccessDrawer>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(
    <LocaleProvider>
      <EditMemberAccessDrawer
        member={member}
        isSubmitting={false}
        onSubmit={onSubmit}
        onClose={onClose}
        {...props}
      />
    </LocaleProvider>,
  );
  return { onSubmit, onClose };
}

describe("EditMemberAccessDrawer", () => {
  it("opens on the member's current grants", () => {
    renderDrawer();

    expect(screen.getByText(`Доступ: ${member.fullName}`)).toBeInTheDocument();
    expect(screen.getByLabelText(uk.appSection.CLIENTS)).toHaveValue("READ");
    expect(screen.getByLabelText(uk.appSection.FINANCE)).toHaveValue("FULL");
    expect(screen.getByLabelText(uk.appSection.CONTENT)).toHaveValue("NONE");
  });

  it("sends the whole matrix, not just the section that changed, and closes", async () => {
    const { onSubmit, onClose } = renderDrawer();

    fireEvent.change(screen.getByLabelText(uk.appSection.CLIENTS), { target: { value: "NONE" } });
    fireEvent.click(screen.getByRole("button", { name: uk.editMemberAccessDrawer.submitIdle }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(member.id, {
        CLIENTS: "NONE",
        CONTENT: "NONE",
        TARGET: "NONE",
        FINANCE: "FULL",
        ANALYTICS: "NONE",
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("renders nothing to edit when no member is selected", () => {
    renderDrawer({ member: null });

    expect(screen.queryByRole("button", { name: uk.editMemberAccessDrawer.submitIdle })).not.toBeInTheDocument();
  });
});
