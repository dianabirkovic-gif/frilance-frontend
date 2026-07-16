import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { AttentionItem } from "../../api/dashboard";
import { AttentionList } from "./AttentionList";

const sample: AttentionItem = {
  severity: "HIGH",
  title: "MUSE'23",
  subtitle: "Рахунок не оплачено",
  metaLabel: "₴12 000",
  metaIsDanger: true,
};

describe("AttentionList", () => {
  it("renders each item's title, subtitle and meta label", () => {
    render(
      <MemoryRouter>
        <AttentionList items={[sample]} />
      </MemoryRouter>,
    );

    expect(screen.getByText(sample.title)).toBeInTheDocument();
    expect(screen.getByText(sample.subtitle)).toBeInTheDocument();
    expect(screen.getByText(sample.metaLabel)).toBeInTheDocument();
  });

  it("shows an empty state instead of an empty panel when there is nothing to flag", () => {
    render(
      <MemoryRouter>
        <AttentionList items={[]} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Немає сигналів/)).toBeInTheDocument();
  });

  it("links \"Усі →\" to the Clients page", () => {
    render(
      <MemoryRouter>
        <AttentionList items={[sample]} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Усі/ })).toHaveAttribute("href", "/clients");
  });
});
