import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MarkdownPreview } from "./markdown-preview";

describe("MarkdownPreview", () => {
  it("renders plain text correctly", () => {
    render(<MarkdownPreview content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders headings with proper styling", () => {
    const content = "# Heading 1\n## Heading 2\n### Heading 3";
    const { container } = render(<MarkdownPreview content={content} />);

    expect(container.querySelector("h1")).toHaveTextContent("Heading 1");
    expect(container.querySelector("h2")).toHaveTextContent("Heading 2");
    expect(container.querySelector("h3")).toHaveTextContent("Heading 3");
  });

  it("renders bold, italic, and strikethrough formatting", () => {
    const content = "**bold text** and *italic text* and ~~strikethrough~~";
    const { container } = render(<MarkdownPreview content={content} />);

    expect(container.querySelector("strong")).toHaveTextContent("bold text");
    expect(container.querySelector("em")).toHaveTextContent("italic text");
    expect(container.querySelector("del")).toHaveTextContent("strikethrough");
  });

  it("renders unordered lists", () => {
    const content = "- Item 1\n- Item 2\n- Item 3";
    const { container } = render(<MarkdownPreview content={content} />);

    const ul = container.querySelector("ul");
    expect(ul).toBeInTheDocument();
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Item 1");
  });

  it("renders ordered lists", () => {
    const content = "1. First\n2. Second\n3. Third";
    const { container } = render(<MarkdownPreview content={content} />);

    const ol = container.querySelector("ol");
    expect(ol).toBeInTheDocument();
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(3);
  });

  it("renders links with href attributes", () => {
    const content = "[Link text](https://example.com)";
    const { container } = render(<MarkdownPreview content={content} />);

    const link = container.querySelector("a");
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveTextContent("Link text");
  });

  it("sanitizes dangerous HTML/scripts (XSS protection)", () => {
    const content = "<script>alert('xss')</script>\n<img src=x onerror=alert('xss')>";
    const { container } = render(<MarkdownPreview content={content} />);

    // Script tags should be removed by rehype-sanitize
    expect(container.querySelector("script")).not.toBeInTheDocument();
    // Event handlers should be removed
    const img = container.querySelector("img");
    if (img) {
      expect(img).not.toHaveAttribute("onerror");
    }
  });

  it("applies Tailwind prose classes for typography", () => {
    const { container } = render(<MarkdownPreview content="Some text" />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("prose");
    expect(wrapper).toHaveClass("prose-sm");
    expect(wrapper).toHaveClass("dark:prose-invert");
    expect(wrapper).toHaveClass("max-w-none");
  });

  it("handles null content gracefully", () => {
    const { container } = render(<MarkdownPreview content={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("handles empty content gracefully", () => {
    const { container } = render(<MarkdownPreview content="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders code blocks", () => {
    const content = "```javascript\nconst x = 1;\n```";
    const { container } = render(<MarkdownPreview content={content} />);

    const pre = container.querySelector("pre");
    expect(pre).toBeInTheDocument();
    const code = container.querySelector("code");
    expect(code).toBeInTheDocument();
  });

  it("renders blockquotes", () => {
    const content = "> This is a quote";
    const { container } = render(<MarkdownPreview content={content} />);

    const blockquote = container.querySelector("blockquote");
    expect(blockquote).toBeInTheDocument();
    expect(blockquote).toHaveTextContent("This is a quote");
  });

  it("applies custom className when provided", () => {
    const { container } = render(
      <MarkdownPreview content="Text" className="custom-class" />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("custom-class");
  });

  it("renders nested lists correctly", () => {
    const content = "- Item 1\n  - Nested 1\n  - Nested 2\n- Item 2";
    const { container } = render(<MarkdownPreview content={content} />);

    const lists = container.querySelectorAll("ul");
    expect(lists.length).toBeGreaterThan(1); // Should have nested ul
  });

  it("renders inline code", () => {
    const content = "Here is some `inline code` in text";
    const { container } = render(<MarkdownPreview content={content} />);

    const code = container.querySelector("code");
    expect(code).toBeInTheDocument();
    expect(code).toHaveTextContent("inline code");
  });

  it("renders horizontal rules", () => {
    const content = "Text above\n\n---\n\nText below";
    const { container } = render(<MarkdownPreview content={content} />);

    const hr = container.querySelector("hr");
    expect(hr).toBeInTheDocument();
  });
});
