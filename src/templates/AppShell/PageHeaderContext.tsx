import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface PageHeader {
  title: string;
  subtitle: string;
}

interface PageHeaderContextValue extends PageHeader {
  setPageHeader: (header: PageHeader) => void;
}

const EMPTY_HEADER: PageHeader = { title: "", subtitle: "" };

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

/** Owns the page-header slot AppShell renders into its Topbar/MobileHeader. */
export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setPageHeader] = useState<PageHeader>(EMPTY_HEADER);
  const value = useMemo(() => ({ ...header, setPageHeader }), [header]);
  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

function usePageHeaderContext(): PageHeaderContextValue {
  const context = useContext(PageHeaderContext);
  if (!context) {
    throw new Error("usePageHeader/useCurrentPageHeader must be used within a PageHeaderProvider");
  }
  return context;
}

/** AppShell reads the current route's title/subtitle to render in its chrome. */
export function useCurrentPageHeader(): PageHeader {
  const { title, subtitle } = usePageHeaderContext();
  return { title, subtitle };
}

/** Each page calls this with its own title/subtitle once it has data to show. */
export function usePageHeader(header: PageHeader) {
  const { setPageHeader } = usePageHeaderContext();
  useEffect(() => {
    setPageHeader(header);
    // Depend on the primitive strings, not the `header` object — a new object literal
    // every render would otherwise re-set state (and re-render) on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [header.title, header.subtitle, setPageHeader]);
}
