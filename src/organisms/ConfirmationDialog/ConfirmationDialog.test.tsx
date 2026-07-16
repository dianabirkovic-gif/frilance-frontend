import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { ConfirmationDialog } from "./ConfirmationDialog";

describe("ConfirmationDialog", () => {
  it("renders the title, message and default action labels", () => {
    render(
      <LocaleProvider>
        <ConfirmationDialog
          open
          title="Архівувати клієнта"
          message="Заархівувати клієнта «MUSE'23»?"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText("Архівувати клієнта")).toBeInTheDocument();
    expect(screen.getByText("Заархівувати клієнта «MUSE'23»?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: uk.confirmationDialog.cancelLabel })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: uk.confirmationDialog.confirmLabel })).toBeInTheDocument();
  });

  it("hides itself from assistive tech and blocks clicks when closed", () => {
    render(
      <LocaleProvider>
        <ConfirmationDialog
          open={false}
          title="Архівувати клієнта"
          message="Заархівувати клієнта «MUSE'23»?"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </LocaleProvider>,
    );

    expect(screen.getByRole("alertdialog", { hidden: true })).toHaveAttribute("aria-hidden", "true");
  });

  it("calls onConfirm/onCancel with custom labels", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <LocaleProvider>
        <ConfirmationDialog
          open
          title="Видалити файл"
          message="Цю дію не можна скасувати."
          confirmLabel="Видалити"
          cancelLabel="Назад"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </LocaleProvider>,
    );

    screen.getByRole("button", { name: "Видалити" }).click();
    expect(onConfirm).toHaveBeenCalledTimes(1);

    screen.getByRole("button", { name: "Назад" }).click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables both actions and shows a waiting label while confirming", () => {
    render(
      <LocaleProvider>
        <ConfirmationDialog
          open
          isConfirming
          title="Архівувати клієнта"
          message="Заархівувати клієнта «MUSE'23»?"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </LocaleProvider>,
    );

    expect(screen.getByRole("button", { name: uk.confirmationDialog.confirming })).toBeDisabled();
    expect(screen.getByRole("button", { name: uk.confirmationDialog.cancelLabel })).toBeDisabled();
  });
});
