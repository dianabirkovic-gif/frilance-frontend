import { useEffect, useState } from "react";

/**
 * Drives the desktop/mobile shell split at the design system's 900px
 * breakpoint (base.breakpoint.desktop-min). Used only for structural nav
 * chrome (sidebar vs. bottom tab bar) — page content panels should stay
 * one component and reflow via CSS media queries instead of branching here;
 * see frontend CLAUDE.md "Responsive strategy".
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener("change", listener);
    return () => mediaQueryList.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
