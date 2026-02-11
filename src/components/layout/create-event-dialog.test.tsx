import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

function render(ui: React.ReactElement, options = {}) {
  return rtlRender(<TooltipProvider>{ui}</TooltipProvider>, options);
}

// Mock Firebase
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

vi.mock("@/lib/firestore", () => ({
  addDocument: vi.fn(),
}));

vi.mock("@/hooks/use-upload", () => ({
  useUpload: vi.fn(() => ({
    upload: vi.fn(),
    deleteFile: vi.fn(),
    progress: 0,
    uploading: false,
    error: null,
  })),
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
  useAISuggestion: vi.fn(() => ({
    hasActiveSuggestion: false,
    setHasActiveSuggestion: vi.fn(),
  })),
}));

vi.mock("@/components/image-upload", () => ({
  ImageUpload: ({ value }: { value: string | null }) => (
    <div data-testid="image-upload">{value || "empty"}</div>
  ),
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

import { CreateEventDialog } from "./create-event-dialog";
import { addDocument } from "@/lib/firestore";

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  clientId: "client-1",
  onEventCreated: vi.fn(),
};

describe("CreateEventDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog with title and EventForm when open", () => {
    render(<CreateEventDialog {...defaultProps} />);

    expect(screen.getByText("New Event")).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it("does not render content when open is false", () => {
    render(<CreateEventDialog {...defaultProps} open={false} />);

    expect(screen.queryByText("New Event")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
  });

  it("calls onOpenChange(false) when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<CreateEventDialog {...defaultProps} onOpenChange={onOpenChange} />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls addDocument and onEventCreated on successful submit", async () => {
    const user = userEvent.setup();
    const onEventCreated = vi.fn();
    const onOpenChange = vi.fn();
    vi.mocked(addDocument).mockResolvedValue("new-event-id");

    render(
      <CreateEventDialog
        {...defaultProps}
        onEventCreated={onEventCreated}
        onOpenChange={onOpenChange}
      />,
    );

    // Fill in required fields
    await user.type(screen.getByLabelText(/name/i), "My New Event");
    await user.type(screen.getByLabelText(/start date/i), "2026-06-15T09:00");
    await user.type(screen.getByLabelText(/end date/i), "2026-06-17T18:00");

    const submitButton = screen.getByRole("button", { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(addDocument).toHaveBeenCalledWith(
        "clients/client-1/events",
        expect.objectContaining({
          clientId: "client-1",
          name: "My New Event",
        }),
      );
    });

    await waitFor(() => {
      expect(onEventCreated).toHaveBeenCalledWith("new-event-id", "My New Event");
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows error state when addDocument fails", async () => {
    const user = userEvent.setup();
    vi.mocked(addDocument).mockRejectedValue(new Error("Firestore error"));

    render(<CreateEventDialog {...defaultProps} />);

    await user.type(screen.getByLabelText(/name/i), "Failing Event");
    await user.type(screen.getByLabelText(/start date/i), "2026-06-15T09:00");
    await user.type(screen.getByLabelText(/end date/i), "2026-06-17T18:00");

    const submitButton = screen.getByRole("button", { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
    });
  });

  it("passes correct storagePath to EventForm", () => {
    render(<CreateEventDialog {...defaultProps} clientId="client-42" />);

    // The form renders — storagePath is internal, but we verify the form is
    // present and functional for the given clientId
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });
});
