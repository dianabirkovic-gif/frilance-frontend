import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { AddClientDrawer } from "./AddClientDrawer";

describe("AddClientDrawer", () => {
  it("submits the form with the trimmed field values and defaults", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <LocaleProvider>
        <AddClientDrawer open isSubmitting={false} onSubmit={onSubmit} onClose={vi.fn()} />
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
    });
  });

  it("shows an error instead of closing when the create call fails", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error(uk.addClientDrawer.genericError));
    render(
      <LocaleProvider>
        <AddClientDrawer open isSubmitting={false} onSubmit={onSubmit} onClose={vi.fn()} />
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
        <AddClientDrawer open isSubmitting onSubmit={vi.fn()} onClose={vi.fn()} />
      </LocaleProvider>,
    );

    expect(screen.getByRole("button", { name: uk.addClientDrawer.submitLoading })).toBeDisabled();
  });
});
