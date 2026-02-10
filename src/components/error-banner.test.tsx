import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBanner } from "./error-banner";

describe("ErrorBanner", () => {
  it("renders error message", () => {
    render(<ErrorBanner error={new Error("Network error")} />);
    expect(screen.getByText(/failed to load data/i)).toBeInTheDocument();
  });

  it("renders nothing when error is null", () => {
    const { container } = render(<ErrorBanner error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("displays the actual error message for debugging", () => {
    render(<ErrorBanner error={new Error("Missing or insufficient permissions.")} />);
    expect(screen.getByText(/missing or insufficient permissions/i)).toBeInTheDocument();
  });

  it("displays permission-denied error details", () => {
    render(<ErrorBanner error={new Error("FirebaseError: permission-denied")} />);
    expect(screen.getByText(/permission-denied/i)).toBeInTheDocument();
  });
});
