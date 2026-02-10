import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock Firebase modules
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));
vi.mock("firebase/auth", () => ({ getAuth: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(),
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d }),
    now: () => ({ toDate: () => new Date() }),
  },
}));
vi.mock("firebase/storage", () => ({ getStorage: vi.fn() }));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(() => ({
    user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
    loading: false,
  })),
}));

vi.mock("@/hooks/use-collection", () => ({
  useCollection: vi.fn(),
}));

import { UserManagementSection } from "./user-management-section";
import * as collectionHook from "@/hooks/use-collection";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("UserManagementSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows active users with Deactivate button", () => {
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: [
        { id: "user-1", email: "alice@test.com", firstName: "Alice", lastName: "Smith", isActive: true },
      ] as any,
      loading: false,
      error: null,
    });

    render(
      <UserManagementSection clientId="c1" eventId="e1" />
    );

    expect(screen.getByText("alice@test.com")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /deactivate/i })).toBeInTheDocument();
  });

  it("shows deactivated users with Reactivate button", () => {
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: [
        { id: "user-2", email: "bob@test.com", firstName: "Bob", lastName: "Jones", isActive: false },
      ] as any,
      loading: false,
      error: null,
    });

    render(
      <UserManagementSection clientId="c1" eventId="e1" />
    );

    expect(screen.getByText("bob@test.com")).toBeInTheDocument();
    expect(screen.getByText("Deactivated")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reactivate/i })).toBeInTheDocument();
  });

  it("shows Delete button for all users", () => {
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: [
        { id: "user-1", email: "alice@test.com", firstName: "Alice", lastName: "Smith", isActive: true },
      ] as any,
      loading: false,
      error: null,
    });

    render(
      <UserManagementSection clientId="c1" eventId="e1" />
    );

    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("calls deactivate API when deactivate is confirmed", async () => {
    const user = userEvent.setup();
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: [
        { id: "user-1", email: "alice@test.com", firstName: "Alice", lastName: "Smith", isActive: true },
      ] as any,
      loading: false,
      error: null,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(
      <UserManagementSection clientId="c1" eventId="e1" />
    );

    await user.click(screen.getByRole("button", { name: /deactivate/i }));

    // Confirm dialog
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /confirm|yes|deactivate/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/event-users/deactivate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ clientId: "c1", eventId: "e1", userId: "user-1" }),
        })
      );
    });
  });

  it("calls delete API when delete is confirmed", async () => {
    const user = userEvent.setup();
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: [
        { id: "user-1", email: "alice@test.com", firstName: "Alice", lastName: "Smith", isActive: true },
      ] as any,
      loading: false,
      error: null,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(
      <UserManagementSection clientId="c1" eventId="e1" />
    );

    await user.click(screen.getByRole("button", { name: /delete/i }));

    // Confirm dialog
    await waitFor(() => {
      expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /confirm|yes|delete/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/event-users/delete",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ clientId: "c1", eventId: "e1", userId: "user-1" }),
        })
      );
    });
  });

  it("shows empty state when no users exist", () => {
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: [],
      loading: false,
      error: null,
    });

    render(
      <UserManagementSection clientId="c1" eventId="e1" />
    );

    expect(screen.getByText(/no users have signed up/i)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: [],
      loading: true,
      error: null,
    });

    render(
      <UserManagementSection clientId="c1" eventId="e1" />
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
