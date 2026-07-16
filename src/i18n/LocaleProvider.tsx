import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";
import type { Dictionary } from "./dictionary";
import { en } from "./locales/en";
import { uk } from "./locales/uk";

export type Locale = "uk" | "en";

const STORAGE_KEY = "frilanceos.locale";

const DICTIONARIES: Record<Locale, Dictionary> = { uk, en };

interface LocaleContextValue {
  locale: Locale;
  toggleLocale: () => void;
  t: Dictionary;
}

export const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "uk";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" ? "en" : "uk";
}

/** Locale choice is per-device (localStorage), same persistence model as ThemeProvider's theme choice. */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readStoredLocale);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const toggleLocale = useCallback(() => {
    setLocale((current) => (current === "uk" ? "en" : "uk"));
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, toggleLocale, t: DICTIONARIES[locale] }}>
      {children}
    </LocaleContext.Provider>
  );
}
