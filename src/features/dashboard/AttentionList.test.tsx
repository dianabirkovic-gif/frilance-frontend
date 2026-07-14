import { render, screen } from "@testing-library/react";
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
    render(<AttentionList items={[sample]} />);

    expect(screen.getByText(sample.title)).toBeInTheDocument();
    expect(screen.getByText(sample.subtitle)).toBeInTheDocument();
    expect(screen.getByText(sample.metaLabel)).toBeInTheDocument();
  });

  it("shows an empty state instead of an empty panel when there is nothing to flag", () => {
    render(<AttentionList items={[]} />);

    expect(screen.getByText(/Немає сигналів/)).toBeInTheDocument();
  });
});
