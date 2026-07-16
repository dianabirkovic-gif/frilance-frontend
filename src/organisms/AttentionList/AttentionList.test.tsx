import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { AttentionItem } from "../../api/dashboard";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
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
      <LocaleProvider>
        <MemoryRouter>
          <AttentionList items={[sample]} />
        </MemoryRouter>
      </LocaleProvider>,
    );

    expect(screen.getByText(sample.title)).toBeInTheDocument();
    expect(screen.getByText(sample.subtitle)).toBeInTheDocument();
    expect(screen.getByText(sample.metaLabel)).toBeInTheDocument();
  });

  it("shows an empty state instead of an empty panel when there is nothing to flag", () => {
    render(
      <LocaleProvider>
        <MemoryRouter>
          <AttentionList items={[]} />
        </MemoryRouter>
      </LocaleProvider>,
    );

    expect(screen.getByText(uk.attentionList.empty)).toBeInTheDocument();
  });

  it("links the \"all\" link to the Clients page", () => {
    render(
      <LocaleProvider>
        <MemoryRouter>
          <AttentionList items={[sample]} />
        </MemoryRouter>
      </LocaleProvider>,
    );

    expect(screen.getByRole("link", { name: uk.attentionList.allLink })).toHaveAttribute("href", "/clients");
  });
});
