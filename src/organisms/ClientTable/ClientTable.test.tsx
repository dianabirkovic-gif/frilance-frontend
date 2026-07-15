import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ClientListItem } from "../../api/clients";
import { ClientTable } from "./ClientTable";

const sample: ClientListItem = {
  id: "1",
  name: "MUSE'23",
  niche: "Beauty-простір",
  assigneeName: "Оксана",
  assigneeInitials: "ОК",
  status: "ACTIVE",
  nextPostLabel: "Пн, Reels",
  monthlyRevenue: 32000,
  lastActivityLabel: "2 год тому",
};

describe("ClientTable", () => {
  it("renders each client's name, assignee and revenue (desktop table + mobile cards)", () => {
    render(<ClientTable clients={[sample]} onSelectClient={vi.fn()} />);

    expect(screen.getAllByText(sample.name).length).toBeGreaterThan(0);
    expect(screen.getAllByText(sample.assigneeName as string).length).toBeGreaterThan(0);
    expect(screen.getAllByText("₴32 000").length).toBeGreaterThan(0);
  });

  it("shows a placeholder for a client with no revenue yet", () => {
    render(<ClientTable clients={[{ ...sample, monthlyRevenue: null }]} onSelectClient={vi.fn()} />);

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows an empty state instead of an empty table when there are no clients", () => {
    render(<ClientTable clients={[]} onSelectClient={vi.fn()} />);

    expect(screen.getByText(/Клієнтів не знайдено/)).toBeInTheDocument();
  });
});
