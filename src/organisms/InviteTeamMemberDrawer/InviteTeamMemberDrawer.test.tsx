import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { InviteTeamMemberPayload, InviteTeamMemberResult } from "../../api/team";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { InviteTeamMemberDrawer } from "./InviteTeamMemberDrawer";

function renderDrawer(onSubmit = vi.fn<(payload: InviteTeamMemberPayload) => Promise<InviteTeamMemberResult>>()) {
  render(
    <LocaleProvider>
      <InviteTeamMemberDrawer open isSubmitting={false} onSubmit={onSubmit} onClose={vi.fn()} />
    </LocaleProvider>,
  );
  return onSubmit;
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(uk.inviteTeamMemberDrawer.fields.fullName), {
    target: { value: "Оксана Іванчук" },
  });
  fireEvent.change(screen.getByLabelText(uk.inviteTeamMemberDrawer.fields.email), {
    target: { value: "oksana@example.com" },
  });
}

describe("InviteTeamMemberDrawer", () => {
  it("pre-fills the matrix from the chosen role and re-fills it when the role changes", () => {
    renderDrawer();

    // PROJECT_MANAGER is the default: clients + content, nothing else.
    expect(screen.getByLabelText(uk.appSection.CLIENTS)).toHaveValue("FULL");
    expect(screen.getByLabelText(uk.appSection.CONTENT)).toHaveValue("FULL");
    expect(screen.getByLabelText(uk.appSection.TARGET)).toHaveValue("NONE");

    fireEvent.change(screen.getByLabelText(uk.inviteTeamMemberDrawer.fields.role), {
      target: { value: "TARGETOLOGIST" },
    });

    expect(screen.getByLabelText(uk.appSection.TARGET)).toHaveValue("FULL");
    expect(screen.getByLabelText(uk.appSection.CONTENT)).toHaveValue("NONE");
  });

  it("sends the owner's own choices, not the role's defaults", async () => {
    const onSubmit = renderDrawer(
      vi.fn().mockResolvedValue({
        member: {
          id: "1",
          fullName: "Оксана Іванчук",
          email: "oksana@example.com",
          role: "PROJECT_MANAGER",
          status: "INVITED",
          loadPercent: 0,
          clientCount: 0,
          access: { CLIENTS: "READ", CONTENT: "FULL", TARGET: "NONE", FINANCE: "FULL", ANALYTICS: "NONE" },
        },
        inviteToken: "token-1",
      }),
    );

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(uk.appSection.CLIENTS), { target: { value: "READ" } });
    fireEvent.change(screen.getByLabelText(uk.appSection.FINANCE), { target: { value: "FULL" } });
    fireEvent.click(screen.getByRole("button", { name: uk.inviteTeamMemberDrawer.submitIdle }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        fullName: "Оксана Іванчук",
        email: "oksana@example.com",
        role: "PROJECT_MANAGER",
        access: { CLIENTS: "READ", CONTENT: "FULL", TARGET: "NONE", FINANCE: "FULL", ANALYTICS: "NONE" },
      }),
    );
  });

  it("shows the one-time activation link once the invite succeeds", async () => {
    renderDrawer(
      vi.fn().mockResolvedValue({
        member: {
          id: "1",
          fullName: "Оксана Іванчук",
          email: "oksana@example.com",
          role: "PROJECT_MANAGER",
          status: "INVITED",
          loadPercent: 0,
          clientCount: 0,
          access: { CLIENTS: "FULL", CONTENT: "FULL", TARGET: "NONE", FINANCE: "NONE", ANALYTICS: "NONE" },
        },
        inviteToken: "token-1",
      }),
    );

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: uk.inviteTeamMemberDrawer.submitIdle }));

    expect(await screen.findByText(uk.inviteTeamMemberDrawer.successTitle)).toBeInTheDocument();
    const link = screen.getByLabelText<HTMLInputElement>(uk.inviteTeamMemberDrawer.linkLabel);
    expect(link.value).toContain("token-1");
    expect(link.value).toContain(encodeURIComponent("oksana@example.com"));
  });
});
