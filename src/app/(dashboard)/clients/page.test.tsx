import { render as rtlRender, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// Mock API client
const mockApiFetch = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number) {
      super(message);
    }
  },
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: vi.fn(),
}));

vi.mock("@/hooks/use-upload", () => ({
  useUpload: () => ({
    upload: vi.fn(),
    deleteFile: vi.fn(),
  }),
}));

// Mock WysiwygEditor as a simple textarea so getByDisplayValue works
vi.mock("@/components/wysiwyg-editor", () => ({
  WysiwygEditor: ({ label, value, onChange, id }: { label: string; value: string; onChange: (v: string) => void; id: string }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  ),
}));

vi.mock("@/hooks/use-ai-improve", () => ({
  useAIImprove: vi.fn(() => ({
    isLoading: false,
    error: null,
    result: null,
    improve: vi.fn(),
    reset: vi.fn(),
  })),
}));

vi.mock("@/contexts/ai-suggestion-context", () => ({
  AISuggestionProvider: ({ children }: { children: React.ReactNode }) => children,
  useAISuggestion: vi.fn(() => ({
    hasActiveSuggestion: false,
    setHasActiveSuggestion: vi.fn(),
  })),
}));

vi.mock("@/hooks/use-client-stats", () => ({
  useClientStats: () => ({
    stats: { totalEvents: 2, activeEvents: 1, upcomingEvents: 0, pastEvents: 1 },
    loading: false,
    error: null,
  }),
}));

import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryWrapper } from "@/test/query-wrapper";
import ClientsPage from "./page";
import * as permissionsHook from "@/hooks/use-permissions";

const sampleClients = [
  {
    id: "c1",
    name: "Acme Corp",
    description: "Enterprise client",
    logoUrl: null,
    createdAt: "2025-01-15T00:00:00.000Z",
  },
  {
    id: "c2",
    name: "Globex Inc",
    description: null,
    logoUrl: null,
    createdAt: "2025-03-20T00:00:00.000Z",
  },
];

function render(ui: React.ReactElement) {
  return rtlRender(
    <QueryWrapper>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryWrapper>
  );
}

function setupSuperadmin() {
  vi.mocked(permissionsHook.usePermissions).mockReturnValue({
    role: "superadmin",
    permissions: null,
    loading: false,
    isSuperAdmin: true,
    isClientAdmin: false,
    isEventAdmin: false,
  });
}

function setupNonSuperadmin() {
  vi.mocked(permissionsHook.usePermissions).mockReturnValue({
    role: "clientAdmin",
    permissions: null,
    loading: false,
    isSuperAdmin: false,
    isClientAdmin: true,
    isEventAdmin: false,
  });
}

describe("ClientsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockApiFetch.mockResolvedValue(sampleClients);
  });

  // ----- Rendering -----

  it("renders the clients page title", async () => {
    setupSuperadmin();
    render(<ClientsPage />);
    await waitFor(() => {
      expect(screen.getByText("Clients")).toBeInTheDocument();
    });
  });

  it("renders client rows in the table", async () => {
    setupSuperadmin();
    render(<ClientsPage />);
    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
    expect(screen.getByText("Globex Inc")).toBeInTheDocument();
  });

  it("shows Add Client button for superadmin", async () => {
    setupSuperadmin();
    render(<ClientsPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /new client/i })).toBeInTheDocument();
    });
  });

  // ----- Access control -----

  it("shows unauthorized message for non-superadmin", async () => {
    setupNonSuperadmin();
    render(<ClientsPage />);
    await waitFor(() => {
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
  });

  // ----- Edit flow -----

  it("opens edit sheet when clicking Edit on a client row", async () => {
    const user = userEvent.setup();
    setupSuperadmin();
    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const acmeRow = screen.getByText("Acme Corp").closest("tr")!;
    const editButton = within(acmeRow).getByRole("button", { name: /edit/i });
    await user.click(editButton);

    expect(screen.getByText("Edit Client")).toBeInTheDocument();
  });

  it("pre-fills form with client name when editing", async () => {
    const user = userEvent.setup();
    setupSuperadmin();
    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const acmeRow = screen.getByText("Acme Corp").closest("tr")!;
    const editButton = within(acmeRow).getByRole("button", { name: /edit/i });
    await user.click(editButton);

    expect(screen.getByDisplayValue("Acme Corp")).toBeInTheDocument();
  });

  it("pre-fills form with client description when editing", async () => {
    const user = userEvent.setup();
    setupSuperadmin();
    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const acmeRow = screen.getByText("Acme Corp").closest("tr")!;
    const editButton = within(acmeRow).getByRole("button", { name: /edit/i });
    await user.click(editButton);

    expect(screen.getByDisplayValue("Enterprise client")).toBeInTheDocument();
  });

  it("calls apiFetch with PUT when saving an edited client", async () => {
    const user = userEvent.setup();
    setupSuperadmin();
    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    // Open edit sheet
    const acmeRow = screen.getByText("Acme Corp").closest("tr")!;
    const editButton = within(acmeRow).getByRole("button", { name: /edit/i });
    await user.click(editButton);

    // Modify the name
    const nameInput = screen.getByDisplayValue("Acme Corp");
    await user.clear(nameInput);
    await user.type(nameInput, "Acme Corp Updated");

    // Submit
    mockApiFetch.mockResolvedValueOnce({ id: "c1", name: "Acme Corp Updated" });
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/clients/c1",
        expect.objectContaining({
          method: "PUT",
          body: expect.objectContaining({ name: "Acme Corp Updated" }),
        })
      );
    });
  });

  // ----- Create flow -----

  it("opens create sheet when clicking Add button", async () => {
    const user = userEvent.setup();
    setupSuperadmin();
    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /new client/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /new client/i }));

    expect(screen.getByRole("heading", { name: /new client/i })).toBeInTheDocument();
  });

  // ----- Delete flow -----

  it("shows delete confirmation when clicking Delete on a client row", async () => {
    const user = userEvent.setup();
    setupSuperadmin();
    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const acmeRow = screen.getByText("Acme Corp").closest("tr")!;
    const deleteButton = within(acmeRow).getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    expect(screen.getByText(/delete client/i)).toBeInTheDocument();
  });

  it("disables delete action button until client name is typed correctly", async () => {
    const user = userEvent.setup();
    setupSuperadmin();
    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const acmeRow = screen.getByText("Acme Corp").closest("tr")!;
    const deleteButton = within(acmeRow).getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    // The delete action button should be disabled initially
    const dialogButtons = screen.getAllByRole("button", { name: /delete/i });
    const actionButton = dialogButtons.find(btn => btn.closest("[role='alertdialog']"));
    expect(actionButton).toBeDisabled();

    // Type the wrong text — still disabled
    const confirmInput = screen.getByPlaceholderText("Acme Corp");
    await user.type(confirmInput, "wrong");
    expect(actionButton).toBeDisabled();

    // Clear and type the correct client name
    await user.clear(confirmInput);
    await user.type(confirmInput, "Acme Corp");
    expect(actionButton).toBeEnabled();
  });

  it("resets confirmation input when delete dialog is dismissed", async () => {
    const user = userEvent.setup();
    setupSuperadmin();
    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const acmeRow = screen.getByText("Acme Corp").closest("tr")!;
    const deleteButton = within(acmeRow).getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    // Type something in the confirmation input
    const confirmInput = screen.getByPlaceholderText("Acme Corp");
    await user.type(confirmInput, "something");

    // Cancel the dialog
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    // Re-open the dialog — input should be empty
    await user.click(deleteButton);
    const newConfirmInput = screen.getByPlaceholderText("Acme Corp");
    expect(newConfirmInput).toHaveValue("");
  });
});
