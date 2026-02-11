import { render as rtlRender, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Firebase modules before any imports
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

import { TooltipProvider } from "@/components/ui/tooltip";

// Wrap render to include TooltipProvider
function render(ui: React.ReactElement, options = {}) {
  return rtlRender(<TooltipProvider>{ui}</TooltipProvider>, options);
}

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: vi.fn(),
}));

const mockAddDocument = vi.fn(() => Promise.resolve());
const mockUpdateDocument = vi.fn(() => Promise.resolve());
const mockDeleteDocument = vi.fn(() => Promise.resolve());
const mockDeleteClientCascade = vi.fn(() => Promise.resolve());

vi.mock("@/lib/firestore", () => ({
  addDocument: (...args: unknown[]) => mockAddDocument(...args),
  updateDocument: (...args: unknown[]) => mockUpdateDocument(...args),
  deleteDocument: (...args: unknown[]) => mockDeleteDocument(...args),
  deleteClientCascade: (...args: unknown[]) => mockDeleteClientCascade(...args),
}));

vi.mock("@/hooks/use-collection", () => ({
  useCollection: vi.fn(),
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

import ClientsPage from "./page";
import * as permissionsHook from "@/hooks/use-permissions";
import * as useCollectionHook from "@/hooks/use-collection";

const sampleClients = [
  {
    id: "c1",
    name: "Acme Corp",
    description: "Enterprise client",
    logoUrl: null,
    createdAt: { toDate: () => new Date("2025-01-15T00:00:00Z") },
  },
  {
    id: "c2",
    name: "Globex Inc",
    description: null,
    logoUrl: null,
    createdAt: { toDate: () => new Date("2025-03-20T00:00:00Z") },
  },
];

function setupMocks(overrides?: { clients?: typeof sampleClients; loading?: boolean }) {
  vi.mocked(permissionsHook.usePermissions).mockReturnValue({
    role: "superadmin",
    permissions: null,
    loading: false,
    isSuperAdmin: true,
    isClientAdmin: false,
    isEventAdmin: false,
  });

  vi.mocked(useCollectionHook.useCollection).mockReturnValue({
    data: overrides?.clients ?? sampleClients,
    loading: overrides?.loading ?? false,
    error: null,
  } as ReturnType<typeof useCollectionHook.useCollection>);
}

describe("ClientsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----- Rendering -----

  it("renders the clients page title", () => {
    setupMocks();
    render(<ClientsPage />);
    expect(screen.getByText("Clients")).toBeInTheDocument();
  });

  it("renders client rows in the table", () => {
    setupMocks();
    render(<ClientsPage />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Globex Inc")).toBeInTheDocument();
  });

  it("shows Add Client button for superadmin", () => {
    setupMocks();
    render(<ClientsPage />);
    expect(screen.getByRole("button", { name: /new client/i })).toBeInTheDocument();
  });

  // ----- Access control -----

  it("shows unauthorized message for non-superadmin", () => {
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "clientAdmin",
      permissions: null,
      loading: false,
      isSuperAdmin: false,
      isClientAdmin: true,
      isEventAdmin: false,
    });
    vi.mocked(useCollectionHook.useCollection).mockReturnValue({
      data: [],
      loading: false,
      error: null,
    } as ReturnType<typeof useCollectionHook.useCollection>);

    render(<ClientsPage />);
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
  });

  // ----- Edit flow -----

  it("opens edit sheet when clicking Edit on a client row", async () => {
    const user = userEvent.setup();
    setupMocks();
    render(<ClientsPage />);

    const acmeRow = screen.getByText("Acme Corp").closest("tr")!;
    const editButton = within(acmeRow).getByRole("button", { name: /edit/i });
    await user.click(editButton);

    expect(screen.getByText("Edit Client")).toBeInTheDocument();
  });

  it("pre-fills form with client name when editing", async () => {
    const user = userEvent.setup();
    setupMocks();
    render(<ClientsPage />);

    const acmeRow = screen.getByText("Acme Corp").closest("tr")!;
    const editButton = within(acmeRow).getByRole("button", { name: /edit/i });
    await user.click(editButton);

    expect(screen.getByDisplayValue("Acme Corp")).toBeInTheDocument();
  });

  it("pre-fills form with client description when editing", async () => {
    const user = userEvent.setup();
    setupMocks();
    render(<ClientsPage />);

    const acmeRow = screen.getByText("Acme Corp").closest("tr")!;
    const editButton = within(acmeRow).getByRole("button", { name: /edit/i });
    await user.click(editButton);

    expect(screen.getByDisplayValue("Enterprise client")).toBeInTheDocument();
  });

  it("calls updateDocument when saving an edited client", async () => {
    const user = userEvent.setup();
    setupMocks();
    render(<ClientsPage />);

    // Open edit sheet
    const acmeRow = screen.getByText("Acme Corp").closest("tr")!;
    const editButton = within(acmeRow).getByRole("button", { name: /edit/i });
    await user.click(editButton);

    // Modify the name
    const nameInput = screen.getByDisplayValue("Acme Corp");
    await user.clear(nameInput);
    await user.type(nameInput, "Acme Corp Updated");

    // Submit
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    expect(mockUpdateDocument).toHaveBeenCalledWith(
      "clients",
      "c1",
      expect.objectContaining({ name: "Acme Corp Updated" }),
    );
  });

  // ----- Create flow -----

  it("opens create sheet when clicking Add button", async () => {
    const user = userEvent.setup();
    setupMocks();
    render(<ClientsPage />);

    await user.click(screen.getByRole("button", { name: /new client/i }));

    // Sheet title uses heading role
    expect(screen.getByRole("heading", { name: /new client/i })).toBeInTheDocument();
  });

  // ----- Delete flow -----

  it("shows delete confirmation when clicking Delete on a client row", async () => {
    const user = userEvent.setup();
    setupMocks();
    render(<ClientsPage />);

    const acmeRow = screen.getByText("Acme Corp").closest("tr")!;
    const deleteButton = within(acmeRow).getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    expect(screen.getByText(/delete client/i)).toBeInTheDocument();
  });
});
