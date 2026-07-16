import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddClientDrawer } from "./AddClientDrawer";

describe("AddClientDrawer", () => {
  it("submits the form with the trimmed field values and defaults", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AddClientDrawer open isSubmitting={false} onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Назва клієнта *"), { target: { value: "  MUSE'23  " } });
    fireEvent.change(screen.getByLabelText("Ім'я *"), { target: { value: "  Наталія Вовк  " } });
    fireEvent.change(screen.getByLabelText("Мобільний телефон *"), { target: { value: "  +380501234567  " } });
    fireEvent.change(screen.getByLabelText("Email *"), { target: { value: "  natalia@example.com  " } });
    fireEvent.click(screen.getByRole("button", { name: "Створити клієнта" }));

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
    const onSubmit = vi.fn().mockRejectedValue(new Error("Не вдалося створити клієнта. Спробуйте ще раз."));
    render(<AddClientDrawer open isSubmitting={false} onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Назва клієнта *"), { target: { value: "MUSE'23" } });
    fireEvent.change(screen.getByLabelText("Ім'я *"), { target: { value: "Наталія Вовк" } });
    fireEvent.change(screen.getByLabelText("Мобільний телефон *"), { target: { value: "+380501234567" } });
    fireEvent.change(screen.getByLabelText("Email *"), { target: { value: "natalia@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Створити клієнта" }));

    expect(await screen.findByText("Не вдалося створити клієнта. Спробуйте ще раз.")).toBeInTheDocument();
  });

  it("disables submit while the create call is in flight", () => {
    render(<AddClientDrawer open isSubmitting onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Створюємо..." })).toBeDisabled();
  });
});
