import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { AppSection } from "../../api/auth";
import {
  visibleMobileTabItems,
  visibleMobileTrailingTabItems,
  visibleNavGroups,
} from "../../config/navItems/navItems";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { PageFabProvider } from "../../templates/AppShell/PageFabContext";
import { MobileTabBar } from "./MobileTabBar";

/**
 * Defaults to an owner the grants let everywhere; pass `canView` to render a
 * restricted member, or `canManageTeam: false` to drop the owner-only items.
 */
function renderTabBar(
  canView: (section: AppSection) => boolean = () => true,
  canManageTeam = true,
) {
  return render(
    <LocaleProvider>
      <MemoryRouter>
        <PageFabProvider>
          <MobileTabBar
            navGroups={visibleNavGroups(canView, canManageTeam)}
            tabItems={visibleMobileTabItems(canView, canManageTeam)}
            trailingTabItems={visibleMobileTrailingTabItems(canView, canManageTeam)}
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

  it("opens a menu with the built modules as real links and the unbuilt ones disabled", () => {
    renderTabBar();

    fireEvent.click(screen.getByRole("button", { name: uk.mobileTabBar.moreTab }));

    expect(screen.getByRole("button", { name: uk.mobileTabBar.moreTab })).toHaveAttribute("aria-expanded", "true");
    const teamLink = screen.getByRole("link", { name: uk.nav.items.team });
    expect(teamLink).toHaveAttribute("href", "/team");
    expect(isOpenClass(teamLink.closest("div")!)).toBe(true);
    // The content plan is the mobile route reached from here rather than from
    // a pinned tab — a real link, unlike the modules that aren't built yet.
    expect(screen.getByRole("link", { name: uk.nav.items.content })).toHaveAttribute("href", "/content");
    expect(screen.getByRole("link", { name: uk.nav.items.target })).toHaveAttribute("href", "/target");
    expect(screen.getByText(uk.nav.items.reports)).toHaveAttribute("aria-disabled", "true");
    // Фінанси is pinned after the FAB, so it is never in this menu.
    expect(screen.queryAllByRole("link", { name: uk.nav.items.finance })).toHaveLength(1);
  });

  /**
   * The trailing slot after the FAB. It was a disabled placeholder for as long
   * as the module was unbuilt; it is a route now, and it comes from
   * `config/navItems` like every other tab rather than being hardcoded here.
   */
  it("pins Фінанси as a real tab after the FAB", () => {
    renderTabBar();

    expect(screen.getByRole("link", { name: uk.nav.items.finance })).toHaveAttribute("href", "/finance");
  });

  it("leaves out the sections the owner granted no access to", () => {
    renderTabBar((section) => section !== "CLIENTS" && section !== "FINANCE");

    expect(screen.queryByText(uk.nav.items.clients)).not.toBeInTheDocument();
    expect(screen.queryByText(uk.nav.items.finance)).not.toBeInTheDocument();

    // Granted sections still show, as does Overview — the landing screen
    // nobody has to be granted. Team is there because this member is an owner.
    expect(screen.getByText(uk.nav.items.overview)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: uk.mobileTabBar.moreTab }));
    expect(screen.getByText(uk.nav.items.content)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: uk.nav.items.team })).toBeInTheDocument();
    expect(screen.queryByText(uk.nav.items.finance)).not.toBeInTheDocument();
  });

  /**
   * Team isn't a grantable section — it's owner-only — so no combination of
   * grants puts it in a member's nav. It used to be visible to everyone, and
   * the roster behind it listed every colleague's email and access matrix.
   */
  it("hides Team from a member who isn't the owner, however much else they're granted", () => {
    renderTabBar(() => true, false);

    fireEvent.click(screen.getByRole("button", { name: uk.mobileTabBar.moreTab }));

    expect(screen.queryByRole("link", { name: uk.nav.items.team })).not.toBeInTheDocument();
    expect(screen.queryByText(uk.nav.items.team)).not.toBeInTheDocument();
    // The rest of the More menu is unaffected.
    expect(screen.getByText(uk.nav.items.content)).toBeInTheDocument();
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
