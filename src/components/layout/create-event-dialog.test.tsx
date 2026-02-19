import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function render(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(
    <QueryClientProvider client={qc}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>
  );
}

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
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
import { apiFetch } from "@/lib/api-client";

const mockApiFetch = vi.mocked(apiFetch);

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  clientId: "client-1",
  onEventCreated: vi.fn(),
};

/** Mock apiFetch to handle both next-code query and POST calls */
function setupApiFetchMock(postResult: unknown = { eventCode: "2026001" }) {
  mockApiFetch.mockImplementation((path: string) => {
    if (path === "/api/events/next-code") {
      return Promise.resolve({ nextEventCode: "2026001" } as never);
    }
    return Promise.resolve(postResult as never);
  });
}

describe("CreateEventDialog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupApiFetchMock();
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

    // Wait for form to stabilize after next-code query resolves
    await waitFor(() => {
      expect(screen.getByLabelText(/event code/i)).toHaveValue("2026001");
    });

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("prefills eventCode from next-code API", async () => {
    render(<CreateEventDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/event code/i)).toHaveValue("2026001");
    });
  });

  it("calls apiFetch and onEventCreated on successful submit", async () => {
    const user = userEvent.setup();
    const onEventCreated = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <CreateEventDialog
        {...defaultProps}
        onEventCreated={onEventCreated}
        onOpenChange={onOpenChange}
      />,
    );

    // Wait for eventCode to be prefilled
    await waitFor(() => {
      expect(screen.getByLabelText(/event code/i)).toHaveValue("2026001");
    });

    await user.type(screen.getByLabelText(/name/i), "My New Event");
    await user.type(screen.getByLabelText(/start date/i), "2026-06-15T09:00");
    await user.type(screen.getByLabelText(/end date/i), "2026-06-17T18:00");

    const submitButton = screen.getByRole("button", { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/clients/client-1/events",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            clientId: "client-1",
            eventCode: "2026001",
            name: "My New Event",
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(onEventCreated).toHaveBeenCalledWith("2026001", "My New Event");
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows error state when apiFetch fails on submit", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((path: string) => {
      if (path === "/api/events/next-code") {
        return Promise.resolve({ nextEventCode: "2026001" } as never);
      }
      return Promise.reject(new Error("API error"));
    });

    render(<CreateEventDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/event code/i)).toHaveValue("2026001");
    });

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

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });
});
