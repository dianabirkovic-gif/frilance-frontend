import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { AppSection } from "../../api/auth";
import { visibleMobileTabItems, visibleNavGroups } from "../../config/navItems/navItems";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { PageFabProvider } from "../../templates/AppShell/PageFabContext";
import { MobileTabBar } from "./MobileTabBar";

/** Defaults to a member the owner granted everything; pass `canView` to render a restricted one. */
function renderTabBar(canView: (section: AppSection) => boolean = () => true) {
  return render(
    <LocaleProvider>
      <MemoryRouter>
        <PageFabProvider>
          <MobileTabBar
            navGroups={visibleNavGroups(canView)}
            tabItems={visibleMobileTabItems(canView)}
            canViewFinance={canView("FINANCE")}
          />
        </PageFabProvider>
      </MemoryRouter>
    </LocaleProvider>,
  );
}

/**
 * The menu (like AddClientDrawer/ConfirmationDialog) is always mounted and
 * toggles an "open" class for the fade/slide transition, rather than being
 * conditionally rendered — so "closed" is asserted via aria-expanded and the
 * open class, not via the link's absence from the DOM.
 */
function isOpenClass(element: Element) {
  return element.className.split(" ").some((cls) => cls.startsWith("open") || cls.includes("_open_"));
}

describe("MobileTabBar", () => {
  it("keeps the More menu closed until the More tab is pressed", () => {
    renderTabBar();

    const moreButton = screen.getByRole("button", { name: uk.mobileTabBar.moreTab });
    expect(moreButton).toHaveAttribute("aria-expanded", "false");
    expect(isOpenClass(screen.getByRole("link", { name: uk.nav.items.team })
      .closest("div")!)).toBe(false);
  });

  it("opens a menu with Team as a real link and the unbuilt modules disabled", () => {
    renderTabBar();

    fireEvent.click(screen.getByRole("button", { name: uk.mobileTabBar.moreTab }));

    expect(screen.getByRole("button", { name: uk.mobileTabBar.moreTab })).toHaveAttribute("aria-expanded", "true");
    const teamLink = screen.getByRole("link", { name: uk.nav.items.team });
    expect(teamLink).toHaveAttribute("href", "/team");
    expect(isOpenClass(teamLink.closest("div")!)).toBe(true);
    expect(screen.getByText(uk.nav.items.content)).toHaveAttribute("aria-disabled", "true");
  });

  it("leaves out the sections the owner granted no access to", () => {
    renderTabBar((section) => section !== "CLIENTS" && section !== "FINANCE");

    expect(screen.queryByText(uk.nav.items.clients)).not.toBeInTheDocument();
    expect(screen.queryByText(uk.mobileTabBar.financeTab)).not.toBeInTheDocument();

    // Granted sections and the ungrantable ones (Overview, Team) still show.
    expect(screen.getByText(uk.nav.items.overview)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: uk.mobileTabBar.moreTab }));
    expect(screen.getByText(uk.nav.items.content)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: uk.nav.items.team })).toBeInTheDocument();
    expect(screen.queryByText(uk.nav.items.finance)).not.toBeInTheDocument();
  });

  it("closes the menu after navigating to Team", () => {
    renderTabBar();

    fireEvent.click(screen.getByRole("button", { name: uk.mobileTabBar.moreTab }));
    fireEvent.click(screen.getByRole("link", { name: uk.nav.items.team }));

    expect(screen.getByRole("button", { name: uk.mobileTabBar.moreTab })).toHaveAttribute("aria-expanded", "false");
    expect(isOpenClass(screen.getByRole("link", { name: uk.nav.items.team })
      .closest("div")!)).toBe(false);
  });
});
