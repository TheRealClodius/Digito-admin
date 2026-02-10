import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Global mock for useTranslation — resolves actual English strings from en.json.
// This means existing tests that assert on English strings keep working unchanged.
vi.mock("@/hooks/use-translation", async () => {
  const en = (await import("@/i18n/en.json")).default;

  function getNestedValue(obj: Record<string, unknown>, path: string): string {
    const result = path.split(".").reduce<unknown>((acc, key) => {
      if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
      return undefined;
    }, obj);
    return typeof result === "string" ? result : path;
  }

  return {
    useTranslation: () => ({
      t: (key: string, values?: Record<string, string | number>) => {
        let str = getNestedValue(en, key);
        if (values) {
          Object.entries(values).forEach(([k, v]) => {
            str = str.replace(`{{${k}}}`, String(v));
          });
        }
        return str;
      },
      language: "en" as const,
      setLanguage: vi.fn(),
    }),
  };
});

// Mock localStorage for tests
class LocalStorageMock {
  private store: Record<string, string> = {};

  clear() {
    this.store = {};
  }

  getItem(key: string) {
    return this.store[key] || null;
  }

  setItem(key: string, value: string) {
    this.store[key] = value.toString();
  }

  removeItem(key: string) {
    delete this.store[key];
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index: number) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

global.localStorage = new LocalStorageMock() as any;
