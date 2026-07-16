import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface PageFabAction {
  label: string;
  onClick: () => void;
}

interface PageFabContextValue {
  fab: PageFabAction | null;
  setPageFab: (action: PageFabAction | null) => void;
}

const PageFabContext = createContext<PageFabContextValue | null>(null);

/** Owns the mobile tab bar's center FAB slot — see MobileTabBar. */
export function PageFabProvider({ children }: { children: ReactNode }) {
  const [fab, setPageFab] = useState<PageFabAction | null>(null);
  const value = useMemo(() => ({ fab, setPageFab }), [fab]);
  return <PageFabContext.Provider value={value}>{children}</PageFabContext.Provider>;
}

function usePageFabContext(): PageFabContextValue {
  const context = useContext(PageFabContext);
  if (!context) {
    throw new Error("usePageFab/useCurrentPageFab must be used within a PageFabProvider");
  }
  return context;
}

/** MobileTabBar reads the current route's FAB action, if any, for its center button. */
export function useCurrentPageFab(): PageFabAction | null {
  return usePageFabContext().fab;
}

/**
 * A page calls this to take over the mobile FAB while it's mounted, and it's
 * cleared automatically on unmount so navigating away doesn't leave a stale
 * action wired up. `action` must be referentially stable (wrap the callback
 * in `useCallback`) — otherwise every render would re-register it.
 */
export function usePageFab(action: PageFabAction | null) {
  const { setPageFab } = usePageFabContext();
  useEffect(() => {
    setPageFab(action);
    return () => setPageFab(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action?.label, action?.onClick, setPageFab]);
}
