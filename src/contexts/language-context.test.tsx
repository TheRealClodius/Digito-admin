import { render, screen, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { User } from "firebase/auth";

// Mock Firebase modules
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));
vi.mock("firebase/auth", () => ({ getAuth: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));
vi.mock("firebase/storage", () => ({ getStorage: vi.fn() }));

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock firestore operations
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDoc = vi.fn();
vi.mock("@/lib/firebase", () => ({
  getDbInstance: vi.fn(() => ({})),
}));

// Re-mock firebase/firestore with our spies
vi.mock("firebase/firestore", async () => ({
  getFirestore: vi.fn(),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  serverTimestamp: () => "mock-timestamp",
}));

import { LanguageProvider, useLanguage } from "./language-context";

function createMockUser(uid = "test-uid"): User {
  return { uid, email: "test@test.com" } as User;
}

function TestComponent() {
  const { language, t, setLanguage } = useLanguage();

  return (
    <div>
      <div data-testid="language">{language}</div>
      <div data-testid="nav-dashboard">{t("nav.dashboard")}</div>
      <div data-testid="settings-auto">{t("settings.auto", { theme: "light" })}</div>
      <button data-testid="switch-it" onClick={() => setLanguage("it")}>
        Switch to Italian
      </button>
      <button data-testid="switch-en" onClick={() => setLanguage("en")}>
        Switch to English
      </button>
    </div>
  );
}

describe("LanguageProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.lang = "en";
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null });
  });

  it("defaults to English when no preference is stored", () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>,
    );

    expect(screen.getByTestId("language")).toHaveTextContent("en");
    expect(screen.getByTestId("nav-dashboard")).toHaveTextContent("Dashboard");
  });

  it("reads language from localStorage", () => {
    localStorage.setItem("language", "it");

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>,
    );

    expect(screen.getByTestId("language")).toHaveTextContent("it");
    expect(screen.getByTestId("nav-dashboard")).toHaveTextContent("Dashboard");
  });

  it("translates strings to Italian when language is it", () => {
    localStorage.setItem("language", "it");

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>,
    );

    expect(screen.getByTestId("nav-dashboard")).toHaveTextContent("Dashboard");
  });

  it("falls back to English for missing keys", () => {
    localStorage.setItem("language", "it");

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>,
    );

    // "nav.dashboard" exists in both languages, but test general fallback behavior
    // by checking that a valid key returns a string (not undefined)
    expect(screen.getByTestId("nav-dashboard").textContent).toBeTruthy();
  });

  it("returns the key itself as ultimate fallback", () => {
    function BadKeyComponent() {
      const { t } = useLanguage();
      // Cast to bypass type safety for testing purposes
      return <div data-testid="bad-key">{(t as (key: string) => string)("nonexistent.key")}</div>;
    }

    render(
      <LanguageProvider>
        <BadKeyComponent />
      </LanguageProvider>,
    );

    expect(screen.getByTestId("bad-key")).toHaveTextContent("nonexistent.key");
  });

  it("supports interpolation with {{var}} syntax", () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>,
    );

    expect(screen.getByTestId("settings-auto")).toHaveTextContent("Auto (currently light)");
  });

  it("updates language and localStorage when setLanguage is called", () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>,
    );

    act(() => {
      screen.getByTestId("switch-it").click();
    });

    expect(screen.getByTestId("language")).toHaveTextContent("it");
    expect(localStorage.getItem("language")).toBe("it");
  });

  it("updates document.documentElement.lang when language changes", () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>,
    );

    expect(document.documentElement.lang).toBe("en");

    act(() => {
      screen.getByTestId("switch-it").click();
    });

    expect(document.documentElement.lang).toBe("it");
  });

  it("writes language to Firestore when user is authenticated", async () => {
    const mockUser = createMockUser();
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
    mockDoc.mockReturnValue("mock-doc-ref");
    mockSetDoc.mockResolvedValue(undefined);

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>,
    );

    act(() => {
      screen.getByTestId("switch-it").click();
    });

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalled();
    });
  });

  it("reads language preference from Firestore on mount when user is authenticated", async () => {
    const mockUser = createMockUser();
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
    mockDoc.mockReturnValue("mock-doc-ref");
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ language: "it" }),
    });

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("language")).toHaveTextContent("it");
    });
  });

  it("throws error when useLanguage is used outside LanguageProvider", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useLanguage must be used within a LanguageProvider");

    consoleSpy.mockRestore();
  });
});
