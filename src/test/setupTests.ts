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

// jsdom doesn't implement ResizeObserver — needed by MobileTabBar (measures
// .tabbar's height to position its portalled "more" menu). A no-op stub is
// enough for tests: they only render/click, they don't assert on layout
// values derived from a real resize.
if (typeof window !== "undefined" && !window.ResizeObserver) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, "ResizeObserver", { value: ResizeObserverStub, configurable: true });
  Object.defineProperty(globalThis, "ResizeObserver", { value: ResizeObserverStub, configurable: true });
}
