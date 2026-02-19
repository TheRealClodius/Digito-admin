import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/use-api-collection", () => ({
  useApiCollection: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { UserManagementSection } from "./user-management-section";
import * as apiCollectionHook from "@/hooks/use-api-collection";
import * as apiClient from "@/lib/api-client";

const mockApiFetch = vi.mocked(apiClient.apiFetch);

function QueryWrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("UserManagementSection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows active users with Deactivate button", () => {
    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: [
        { id: "user-1", email: "alice@test.com", firstName: "Alice", lastName: "Smith", isActive: true },
      ] as any,
      loading: false,
      error: null,
    });

    render(
      <QueryWrapper>
        <UserManagementSection eventCode="e1" />
      </QueryWrapper>
    );

    expect(screen.getByText("alice@test.com")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /deactivate/i })).toBeInTheDocument();
  });

  it("shows deactivated users with Reactivate button", () => {
    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: [
        { id: "user-2", email: "bob@test.com", firstName: "Bob", lastName: "Jones", isActive: false },
      ] as any,
      loading: false,
      error: null,
    });

    render(
      <QueryWrapper>
        <UserManagementSection eventCode="e1" />
      </QueryWrapper>
    );

    expect(screen.getByText("bob@test.com")).toBeInTheDocument();
    expect(screen.getByText("Deactivated")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reactivate/i })).toBeInTheDocument();
  });

  it("shows Delete button for all users", () => {
    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: [
        { id: "user-1", email: "alice@test.com", firstName: "Alice", lastName: "Smith", isActive: true },
      ] as any,
      loading: false,
      error: null,
    });

    render(
      <QueryWrapper>
        <UserManagementSection eventCode="e1" />
      </QueryWrapper>
    );

    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("calls deactivate API when deactivate is confirmed", async () => {
    const user = userEvent.setup();
    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: [
        { id: "user-1", email: "alice@test.com", firstName: "Alice", lastName: "Smith", isActive: true },
      ] as any,
      loading: false,
      error: null,
    });
    mockApiFetch.mockResolvedValueOnce({});

    render(
      <QueryWrapper>
        <UserManagementSection eventCode="e1" />
      </QueryWrapper>
    );

    await user.click(screen.getByRole("button", { name: /deactivate/i }));

    // Confirm dialog
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /confirm|yes|deactivate/i }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/events/e1/users/user-1",
        expect.objectContaining({
          method: "PUT",
          body: { isActive: false },
        })
      );
    });
  });

  it("calls delete API when delete is confirmed", async () => {
    const user = userEvent.setup();
    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: [
        { id: "user-1", email: "alice@test.com", firstName: "Alice", lastName: "Smith", isActive: true },
      ] as any,
      loading: false,
      error: null,
    });
    mockApiFetch.mockResolvedValueOnce({});

    render(
      <QueryWrapper>
        <UserManagementSection eventCode="e1" />
      </QueryWrapper>
    );

    await user.click(screen.getByRole("button", { name: /delete/i }));

    // Confirm dialog
    await waitFor(() => {
      expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /confirm|yes|delete/i }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/events/e1/users/user-1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("shows empty state when no users exist", () => {
    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: [],
      loading: false,
      error: null,
    });

    render(
      <QueryWrapper>
        <UserManagementSection eventCode="e1" />
      </QueryWrapper>
    );

    expect(screen.getByText(/no users have signed up/i)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: [],
      loading: true,
      error: null,
    });

    render(
      <QueryWrapper>
        <UserManagementSection eventCode="e1" />
      </QueryWrapper>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
