import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ClientDetail } from "../../api/clients";
import { ClientDetailDrawer } from "./ClientDetailDrawer";

const sample: ClientDetail = {
  id: "1",
  name: "MUSE'23",
  niche: "Beauty-простір",
  assigneeName: "Оксана",
  status: "ACTIVE",
  monthlyRevenue: 32000,
  cooperationDurationLabel: "8 міс",
  contactName: "Наталія Вовк",
  contactRole: "Засновниця",
  stage: "REPORT",
  activity: [{ timeLabel: "2 год тому", actorInitials: "ОК", actorName: "Оксана", description: "Опублікувала Reels" }],
};

describe("ClientDetailDrawer", () => {
  it("renders the client's card fields, stats, contact and activity", () => {
    render(<ClientDetailDrawer open detail={sample} isLoading={false} onClose={vi.fn()} />);

    expect(screen.getByText("MUSE'23")).toBeInTheDocument();
    expect(screen.getByText("₴32 000")).toBeInTheDocument();
    expect(screen.getByText("8 міс")).toBeInTheDocument();
    expect(screen.getByText("Наталія Вовк")).toBeInTheDocument();
    expect(screen.getByText(/Опублікувала Reels/)).toBeInTheDocument();
  });

  it("shows an empty state instead of an empty list when there is no activity yet", () => {
    render(<ClientDetailDrawer open detail={{ ...sample, activity: [] }} isLoading={false} onClose={vi.fn()} />);

    expect(screen.getByText("Ще немає подій.")).toBeInTheDocument();
  });

  it("shows a loading state while the detail query is in flight", () => {
    render(<ClientDetailDrawer open detail={undefined} isLoading onClose={vi.fn()} />);

    expect(screen.getByText("Завантаження…")).toBeInTheDocument();
  });
});
