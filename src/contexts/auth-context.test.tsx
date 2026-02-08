import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-context";
import type { User } from "firebase/auth";

// Mock Firebase auth
const mockOnAuthStateChanged = vi.fn();
const mockUser: Partial<User> = {
  uid: "test-user-123",
  email: "test@test.com",
};

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}));

// Test component that uses useAuth
function TestComponent({ id }: { id: string }) {
  const { user, loading } = useAuth();

  return (
    <div>
      <div data-testid={`${id}-loading`}>{loading ? "loading" : "loaded"}</div>
      <div data-testid={`${id}-user`}>{user ? user.email : "no-user"}</div>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onAuthStateChanged only once even with multiple consumers", () => {
    render(
      <AuthProvider>
        <TestComponent id="first" />
        <TestComponent id="second" />
        <TestComponent id="third" />
      </AuthProvider>
    );

    // Should be called exactly once despite 3 components using useAuth
    expect(mockOnAuthStateChanged).toHaveBeenCalledTimes(1);
  });

  it("provides loading state initially", () => {
    render(
      <AuthProvider>
        <TestComponent id="test" />
      </AuthProvider>
    );

    expect(screen.getByTestId("test-loading")).toHaveTextContent("loading");
  });

  it("provides user data after auth state changes", async () => {
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      // Simulate auth state change
      setTimeout(() => callback(mockUser), 0);
      return vi.fn(); // unsubscribe function
    });

    render(
      <AuthProvider>
        <TestComponent id="test" />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("test-loading")).toHaveTextContent("loaded");
      expect(screen.getByTestId("test-user")).toHaveTextContent("test@test.com");
    });
  });

  it("provides null user when signed out", async () => {
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      setTimeout(() => callback(null), 0);
      return vi.fn();
    });

    render(
      <AuthProvider>
        <TestComponent id="test" />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("test-loading")).toHaveTextContent("loaded");
      expect(screen.getByTestId("test-user")).toHaveTextContent("no-user");
    });
  });

  it("throws error when useAuth is used outside AuthProvider", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestComponent id="test" />);
    }).toThrow("useAuth must be used within AuthProvider");

    consoleSpy.mockRestore();
  });

  it("unsubscribes from auth state on unmount", () => {
    const mockUnsubscribe = vi.fn();
    mockOnAuthStateChanged.mockReturnValue(mockUnsubscribe);

    const { unmount } = render(
      <AuthProvider>
        <TestComponent id="test" />
      </AuthProvider>
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
