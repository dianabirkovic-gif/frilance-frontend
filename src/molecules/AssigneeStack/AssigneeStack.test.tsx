import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ClientAssignee } from "../../api/clients";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { AssigneeStack } from "./AssigneeStack";

function member(id: string, name: string, initials: string): ClientAssignee {
  return { id, name, initials, role: "SMM" };
}

function renderStack(assignees: ClientAssignee[], withName = false) {
  return render(
    <LocaleProvider>
      <AssigneeStack assignees={assignees} withName={withName} />
    </LocaleProvider>,
  );
}

describe("AssigneeStack", () => {
  it("shows one avatar per member", () => {
    renderStack([member("1", "Оксана", "ОК"), member("2", "Аліна", "АЛ")]);

    expect(screen.getByText("ОК")).toBeInTheDocument();
    expect(screen.getByText("АЛ")).toBeInTheDocument();
  });

  // The visuals collapse past three, but a screen reader still gets everyone —
  // otherwise you would have to open the client to learn who is on it.
  it("collapses a long staffing but still names everyone to assistive tech", () => {
    renderStack([
      member("1", "Оксана", "ОК"),
      member("2", "Аліна", "АЛ"),
      member("3", "Наталя", "НА"),
      member("4", "Іван", "ІВ"),
    ]);

    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.queryByText("ІВ")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Оксана, Аліна, Наталя, Іван")).toBeInTheDocument();
  });

  it("reads as nobody, not as missing, when the client is unstaffed", () => {
    renderStack([]);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("names the first member when asked", () => {
    renderStack([member("1", "Оксана", "ОК"), member("2", "Аліна", "АЛ")], true);

    // Two fit inside the limit, so there is nothing to count.
    expect(screen.getByText("Оксана")).toBeInTheDocument();
  });

  it("trails the named member with a count once the rest are hidden", () => {
    renderStack(
      [
        member("1", "Оксана", "ОК"),
        member("2", "Аліна", "АЛ"),
        member("3", "Наталя", "НА"),
        member("4", "Іван", "ІВ"),
      ],
      true,
    );

    expect(screen.getByText(/Оксана\s*\+1/)).toBeInTheDocument();
  });
});
