import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "./auth-context";

const mockGetCurrentAuthUser = vi.fn();
let hubCallback: ((event: { payload: { event: string } }) => void) | null = null;
const mockHubUnsubscribe = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentAuthUser: (...args: unknown[]) => mockGetCurrentAuthUser(...args),
}));

vi.mock("@/lib/amplify-config", () => ({
  ensureAmplifyConfigured: vi.fn(),
}));

vi.mock("aws-amplify/utils", () => ({
  Hub: {
    listen: vi.fn((_channel: string, callback: (event: { payload: { event: string } }) => void) => {
      hubCallback = callback;
      return mockHubUnsubscribe;
    }),
  },
}));

const mockUser = {
  sub: "sub-123",
  email: "test@test.com",
  getToken: vi.fn().mockResolvedValue("mock-token"),
};

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
    hubCallback = null;
  });

  it("provides loading state initially", () => {
    mockGetCurrentAuthUser.mockReturnValue(new Promise(() => {})); // never resolves

    render(
      <AuthProvider>
        <TestComponent id="test" />
      </AuthProvider>
    );

    expect(screen.getByTestId("test-loading")).toHaveTextContent("loading");
  });

  it("provides user data after initial check", async () => {
    mockGetCurrentAuthUser.mockResolvedValue(mockUser);

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

  it("provides null user when not authenticated", async () => {
    mockGetCurrentAuthUser.mockResolvedValue(null);

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

  it("updates user on signedIn hub event", async () => {
    mockGetCurrentAuthUser
      .mockResolvedValueOnce(null) // initial check
      .mockResolvedValueOnce(mockUser); // after signedIn

    render(
      <AuthProvider>
        <TestComponent id="test" />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("test-user")).toHaveTextContent("no-user");
    });

    // Simulate signedIn event
    hubCallback?.({ payload: { event: "signedIn" } });

    await waitFor(() => {
      expect(screen.getByTestId("test-user")).toHaveTextContent("test@test.com");
    });
  });

  it("clears user on signedOut hub event", async () => {
    mockGetCurrentAuthUser.mockResolvedValue(mockUser);

    render(
      <AuthProvider>
        <TestComponent id="test" />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("test-user")).toHaveTextContent("test@test.com");
    });

    hubCallback?.({ payload: { event: "signedOut" } });

    await waitFor(() => {
      expect(screen.getByTestId("test-user")).toHaveTextContent("no-user");
    });
  });

  it("throws error when useAuth is used outside AuthProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestComponent id="test" />);
    }).toThrow("useAuth must be used within AuthProvider");

    consoleSpy.mockRestore();
  });

  it("unsubscribes from Hub on unmount", async () => {
    mockGetCurrentAuthUser.mockResolvedValue(null);

    const { unmount } = render(
      <AuthProvider>
        <TestComponent id="test" />
      </AuthProvider>
    );

    unmount();
    expect(mockHubUnsubscribe).toHaveBeenCalled();
  });
});
