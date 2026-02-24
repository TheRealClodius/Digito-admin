import { render, screen, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock apiFetch
const mockApiFetch = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { LanguageProvider, useLanguage } from "./language-context";

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
    mockApiFetch.mockResolvedValue({ language: "en" });
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

    expect(screen.getByTestId("nav-dashboard").textContent).toBeTruthy();
  });

  it("returns the key itself as ultimate fallback", () => {
    function BadKeyComponent() {
      const { t } = useLanguage();
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

  it("saves language via API when user is authenticated", async () => {
    const mockUser = { sub: "user-sub-123", email: "test@test.com", getToken: vi.fn() };
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
    mockApiFetch.mockResolvedValue({ language: "en" });

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>,
    );

    act(() => {
      screen.getByTestId("switch-it").click();
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith("/api/admin/users/me", {
        method: "PATCH",
        body: { language: "it" },
      });
    });
  });

  it("reads language preference from API on mount when user is authenticated", async () => {
    const mockUser = { sub: "user-sub-123", email: "test@test.com", getToken: vi.fn() };
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
    mockApiFetch.mockResolvedValue({ language: "it" });

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("language")).toHaveTextContent("it");
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/api/admin/users/me");
  });

  it("throws error when useLanguage is used outside LanguageProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useLanguage must be used within a LanguageProvider");

    consoleSpy.mockRestore();
  });
});
