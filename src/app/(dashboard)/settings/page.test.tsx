import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { userEvent } from "@testing-library/user-event";
import SettingsPage from "./page";
import * as themeContext from "@/contexts/theme-context";
import * as authHook from "@/hooks/use-auth";

// Mock the useAuth hook
vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

// Mock the useTheme hook
vi.mock("@/contexts/theme-context", () => ({
  useTheme: vi.fn(),
}));

describe("SettingsPage - Theme Mode Selector", () => {
  const mockSetThemeMode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock user
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: {
        uid: "test-uid",
        email: "test@example.com",
      } as any,
      loading: false,
    });
  });

  it("renders theme mode selector with three options", () => {
    vi.mocked(themeContext.useTheme).mockReturnValue({
      theme: "light",
      themeMode: "light",
      setTheme: vi.fn(),
      setThemeMode: mockSetThemeMode,
      toggleTheme: vi.fn(),
    });

    render(<SettingsPage />);

    expect(screen.getByLabelText("Light")).toBeInTheDocument();
    expect(screen.getByLabelText("Dark")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Auto \(currently/)).toBeInTheDocument();
  });

  it("shows current mode selection - Light", () => {
    vi.mocked(themeContext.useTheme).mockReturnValue({
      theme: "light",
      themeMode: "light",
      setTheme: vi.fn(),
      setThemeMode: mockSetThemeMode,
      toggleTheme: vi.fn(),
    });

    render(<SettingsPage />);

    const lightOption = screen.getByLabelText("Light");
    expect(lightOption).toBeChecked();
  });

  it("shows current mode selection - Dark", () => {
    vi.mocked(themeContext.useTheme).mockReturnValue({
      theme: "dark",
      themeMode: "dark",
      setTheme: vi.fn(),
      setThemeMode: mockSetThemeMode,
      toggleTheme: vi.fn(),
    });

    render(<SettingsPage />);

    const darkOption = screen.getByLabelText("Dark");
    expect(darkOption).toBeChecked();
  });

  it("shows current mode selection - Auto", () => {
    vi.mocked(themeContext.useTheme).mockReturnValue({
      theme: "light",
      themeMode: "auto",
      setTheme: vi.fn(),
      setThemeMode: mockSetThemeMode,
      toggleTheme: vi.fn(),
    });

    render(<SettingsPage />);

    const autoOption = screen.getByLabelText(/^Auto \(currently/);
    expect(autoOption).toBeChecked();
  });

  it("calls setThemeMode when user selects Light", async () => {
    const user = userEvent.setup();

    vi.mocked(themeContext.useTheme).mockReturnValue({
      theme: "dark",
      themeMode: "dark",
      setTheme: vi.fn(),
      setThemeMode: mockSetThemeMode,
      toggleTheme: vi.fn(),
    });

    render(<SettingsPage />);

    const lightOption = screen.getByLabelText("Light");
    await user.click(lightOption);

    expect(mockSetThemeMode).toHaveBeenCalledWith("light");
  });

  it("calls setThemeMode when user selects Dark", async () => {
    const user = userEvent.setup();

    vi.mocked(themeContext.useTheme).mockReturnValue({
      theme: "light",
      themeMode: "light",
      setTheme: vi.fn(),
      setThemeMode: mockSetThemeMode,
      toggleTheme: vi.fn(),
    });

    render(<SettingsPage />);

    const darkOption = screen.getByLabelText("Dark");
    await user.click(darkOption);

    expect(mockSetThemeMode).toHaveBeenCalledWith("dark");
  });

  it("calls setThemeMode when user selects Auto", async () => {
    const user = userEvent.setup();

    vi.mocked(themeContext.useTheme).mockReturnValue({
      theme: "light",
      themeMode: "light",
      setTheme: vi.fn(),
      setThemeMode: mockSetThemeMode,
      toggleTheme: vi.fn(),
    });

    render(<SettingsPage />);

    const autoOption = screen.getByLabelText(/^Auto \(currently/);
    await user.click(autoOption);

    expect(mockSetThemeMode).toHaveBeenCalledWith("auto");
  });

  it("displays current computed theme in auto mode (light)", () => {
    vi.mocked(themeContext.useTheme).mockReturnValue({
      theme: "light",
      themeMode: "auto",
      setTheme: vi.fn(),
      setThemeMode: mockSetThemeMode,
      toggleTheme: vi.fn(),
    });

    render(<SettingsPage />);

    expect(screen.getByText(/auto.*currently light/i)).toBeInTheDocument();
  });

  it("displays current computed theme in auto mode (dark)", () => {
    vi.mocked(themeContext.useTheme).mockReturnValue({
      theme: "dark",
      themeMode: "auto",
      setTheme: vi.fn(),
      setThemeMode: mockSetThemeMode,
      toggleTheme: vi.fn(),
    });

    render(<SettingsPage />);

    expect(screen.getByText(/auto.*currently dark/i)).toBeInTheDocument();
  });
});
