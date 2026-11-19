import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { AddClientDrawer } from "./AddClientDrawer";

const members = [
  { id: "u1", name: "Оксана", initials: "ОК", role: "SMM" as const },
  { id: "u2", name: "Аліна", initials: "АЛ", role: "PROJECT_MANAGER" as const },
];

describe("AddClientDrawer", () => {
  it("staffs the client with the members that were ticked", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <LocaleProvider>
        <AddClientDrawer open assignableMembers={members} isSubmitting={false} onSubmit={onSubmit} onClose={vi.fn()} />
      </LocaleProvider>,
    );

    fireEvent.change(screen.getByLabelText(uk.addClientDrawer.fields.name), { target: { value: "MUSE'23" } });
    fireEvent.change(screen.getByLabelText(uk.addClientDrawer.fields.contactName), { target: { value: "Н" } });
    fireEvent.change(screen.getByLabelText(uk.addClientDrawer.fields.contactPhone), { target: { value: "+380" } });
    fireEvent.change(screen.getByLabelText(uk.addClientDrawer.fields.contactEmail), { target: { value: "n@e.com" } });

    // Several members on one client is the whole point of the field.
    fireEvent.click(screen.getByRole("checkbox", { name: /Оксана/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Аліна/ }));
    fireEvent.click(screen.getByRole("button", { name: uk.addClientDrawer.submitIdle }));

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ assigneeIds: ["u1", "u2"] })),
    );
  });

  it("unticking a member takes them off the staffing again", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <LocaleProvider>
        <AddClientDrawer open assignableMembers={members} isSubmitting={false} onSubmit={onSubmit} onClose={vi.fn()} />
      </LocaleProvider>,
    );

    const oksana = screen.getByRole("checkbox", { name: /Оксана/ });
    fireEvent.click(oksana);
    expect(oksana).toBeChecked();
    fireEvent.click(oksana);
    expect(oksana).not.toBeChecked();
  });

  it("says so rather than showing an empty box when the tenant has no members", () => {
    render(
      <LocaleProvider>
        <AddClientDrawer open assignableMembers={[]} isSubmitting={false} onSubmit={vi.fn()} onClose={vi.fn()} />
      </LocaleProvider>,
    );

    expect(screen.getByText(uk.assigneePicker.empty)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("submits the form with the trimmed field values and defaults", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <LocaleProvider>
        <AddClientDrawer open assignableMembers={members} isSubmitting={false} onSubmit={onSubmit} onClose={vi.fn()} />
      </LocaleProvider>,
    );

    fireEvent.change(screen.getByLabelText(uk.addClientDrawer.fields.name), { target: { value: "  MUSE'23  " } });
    fireEvent.change(screen.getByLabelText(uk.addClientDrawer.fields.contactName), {
      target: { value: "  Наталія Вовк  " },
    });
    fireEvent.change(screen.getByLabelText(uk.addClientDrawer.fields.contactPhone), {
      target: { value: "  +380501234567  " },
    });
    fireEvent.change(screen.getByLabelText(uk.addClientDrawer.fields.contactEmail), {
      target: { value: "  natalia@example.com  " },
    });
    fireEvent.click(screen.getByRole("button", { name: uk.addClientDrawer.submitIdle }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "MUSE'23",
      niche: null,
      tariffPlan: null,
      cooperationStartDate: null,
      serviceCost: null,
      status: "NEW",
      contactName: "Наталія Вовк",
      contactRole: null,
      contactPhone: "+380501234567",
      contactEmail: "natalia@example.com",
      stage: "BRIEF",
      assigneeIds: [],
    });
  });

  it("shows an error instead of closing when the create call fails", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error(uk.addClientDrawer.genericError));
    render(
      <LocaleProvider>
        <AddClientDrawer open assignableMembers={members} isSubmitting={false} onSubmit={onSubmit} onClose={vi.fn()} />
      </LocaleProvider>,
    );

    fireEvent.change(screen.getByLabelText(uk.addClientDrawer.fields.name), { target: { value: "MUSE'23" } });
    fireEvent.change(screen.getByLabelText(uk.addClientDrawer.fields.contactName), {
      target: { value: "Наталія Вовк" },
    });
    fireEvent.change(screen.getByLabelText(uk.addClientDrawer.fields.contactPhone), {
      target: { value: "+380501234567" },
    });
    fireEvent.change(screen.getByLabelText(uk.addClientDrawer.fields.contactEmail), {
      target: { value: "natalia@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: uk.addClientDrawer.submitIdle }));

    expect(await screen.findByText(uk.addClientDrawer.genericError)).toBeInTheDocument();
  });

  it("disables submit while the create call is in flight", () => {
    render(
      <LocaleProvider>
        <AddClientDrawer open assignableMembers={members} isSubmitting onSubmit={vi.fn()} onClose={vi.fn()} />
      </LocaleProvider>,
    );

    expect(screen.getByRole("button", { name: uk.addClientDrawer.submitLoading })).toBeDisabled();
  });

  /** The same form, opened on an existing client: every field starts from what it has and is sent back whole. */
  it("edits an existing client with every field pre-filled and sends them all back", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <LocaleProvider>
        <AddClientDrawer
          open
          client={{
            id: "c1",
            name: "MUSE'23",
            niche: "Beauty",
            assignees: [members[0]],
            status: "ACTIVE",
            monthlyRevenue: 50000,
            revenueScope: "AGENCY",
            cooperationDurationLabel: "8 міс",
            contactName: "Наталія",
            contactRole: "Засновниця",
            contactPhone: "+380501234567",
            contactEmail: "n@example.com",
            stage: "WORK_STARTED",
            activity: [],
            tariffPlan: "Standard",
            cooperationStartDate: "2026-01-15",
            serviceCost: 50000,
          }}
          assignableMembers={members}
          isSubmitting={false}
          onSubmit={onSubmit}
          onClose={vi.fn()}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText(uk.addClientDrawer.editTitle)).toBeInTheDocument();
    expect(screen.getByLabelText(uk.addClientDrawer.fields.tariffPlan)).toHaveValue("Standard");
    expect(screen.getByLabelText(uk.addClientDrawer.fields.startDate)).toHaveValue("2026-01-15");

    fireEvent.change(screen.getByLabelText(uk.addClientDrawer.fields.name), { target: { value: "MUSE'24" } });
    fireEvent.click(screen.getByRole("button", { name: uk.addClientDrawer.editSubmitIdle }));

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "MUSE'24",
        niche: "Beauty",
        tariffPlan: "Standard",
        cooperationStartDate: "2026-01-15",
        serviceCost: 50000,
        status: "ACTIVE",
        contactName: "Наталія",
        contactRole: "Засновниця",
        contactPhone: "+380501234567",
        contactEmail: "n@example.com",
        stage: "WORK_STARTED",
        assigneeIds: ["u1"],
      }),
    );
  });
});
