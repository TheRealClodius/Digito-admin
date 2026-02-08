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
});
