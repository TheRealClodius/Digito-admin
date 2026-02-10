import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MarkdownContent } from "./markdown-content";

describe("MarkdownContent", () => {
  it("renders markdown content with proper styling", () => {
    render(<MarkdownContent content="**Bold text**" />);

    // The MarkdownPreview component should render the markdown
    const container = screen.getByText(/Bold text/i).closest("div");
    expect(container).toHaveClass("prose");
  });

  it("handles null content gracefully", () => {
    render(<MarkdownContent content={null} />);

    expect(screen.getByText("No description")).toBeInTheDocument();
  });

  it("handles empty content gracefully", () => {
    render(<MarkdownContent content="" />);

    expect(screen.getByText("No description")).toBeInTheDocument();
  });

  it("handles whitespace-only content gracefully", () => {
    render(<MarkdownContent content="   " />);

    expect(screen.getByText("No description")).toBeInTheDocument();
  });

  it("truncates long content when maxLength is provided", () => {
    const longContent = "A".repeat(100);
    render(<MarkdownContent content={longContent} maxLength={50} />);

    const rendered = screen.getByText(/A{3,}\.{3}/); // Should show AAA...
    expect(rendered).toBeInTheDocument();
  });

  it("does not truncate short content when maxLength is provided", () => {
    const shortContent = "Short text";
    render(<MarkdownContent content={shortContent} maxLength={50} />);

    expect(screen.getByText("Short text")).toBeInTheDocument();
    expect(screen.queryByText(/\.\.\./)).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <MarkdownContent content="Text" className="custom-class" />
    );

    const markdownWrapper = container.querySelector(".custom-class");
    expect(markdownWrapper).toBeInTheDocument();
  });

  it("renders markdown with headings", () => {
    const { container } = render(<MarkdownContent content="# Heading" />);

    expect(container.querySelector("h1")).toHaveTextContent("Heading");
  });

  it("renders markdown with lists", () => {
    const content = "- Item 1\n- Item 2";
    const { container } = render(<MarkdownContent content={content} />);

    const ul = container.querySelector("ul");
    expect(ul).toBeInTheDocument();
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("renders markdown with links", () => {
    const content = "[Link](https://example.com)";
    const { container } = render(<MarkdownContent content={content} />);

    const link = container.querySelector("a");
    expect(link).toHaveAttribute("href", "https://example.com");
  });

  it("preserves markdown formatting when truncating", () => {
    const content = "**Bold** text and *italic* text " + "A".repeat(100);
    const { container } = render(<MarkdownContent content={content} maxLength={50} />);

    // Should still render markdown even when truncated
    expect(container.querySelector("strong")).toBeInTheDocument();
  });

  it("handles maxLength of 0", () => {
    const { container } = render(<MarkdownContent content="Some text" maxLength={0} />);

    // Should show "..." immediately
    expect(container.textContent).toContain("...");
  });

  it("handles exact maxLength match", () => {
    const content = "Exact";
    render(<MarkdownContent content={content} maxLength={5} />);

    // Should not truncate when exactly at maxLength
    expect(screen.getByText("Exact")).toBeInTheDocument();
    expect(screen.queryByText(/\.\.\./)).not.toBeInTheDocument();
  });

  it("renders multi-line markdown correctly", () => {
    const content = "Line 1\n\nLine 2\n\nLine 3";
    const { container } = render(<MarkdownContent content={content} />);

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs.length).toBeGreaterThan(0);
  });
});
