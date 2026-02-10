import { MarkdownPreview } from "./markdown-preview";

interface MarkdownContentProps {
  content: string | null;
  maxLength?: number; // Characters before truncation
  className?: string;
}

export function MarkdownContent({
  content,
  maxLength,
  className,
}: MarkdownContentProps) {
  if (!content || content.trim().length === 0) {
    return <span className="text-muted-foreground">No description</span>;
  }

  const displayContent =
    typeof maxLength === "number" && content.length > maxLength
      ? content.slice(0, maxLength) + "..."
      : content;

  return <MarkdownPreview content={displayContent} className={className} />;
}
