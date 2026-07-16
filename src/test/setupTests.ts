import "@testing-library/jest-dom/vitest";

// Node 22+'s experimental global `localStorage` shadows jsdom's own Storage
// implementation without --localstorage-file, leaving window.localStorage
// undefined here. Provide a minimal in-memory Storage so ThemeProvider/
// LocaleProvider (and anything else reading localStorage) work under test.
if (typeof window !== "undefined" && !window.localStorage) {
  const store = new Map<string, string>();
  const memoryStorage: Storage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(window, "localStorage", { value: memoryStorage, configurable: true });
}
