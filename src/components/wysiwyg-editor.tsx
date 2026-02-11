"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import {
  Wand2,
  Minimize2,
  Maximize2,
  FileText,
  SpellCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { WysiwygToolbar } from "@/components/wysiwyg-toolbar";
import { useAIImprove } from "@/hooks/use-ai-improve";
import { useAISuggestion } from "@/contexts/ai-suggestion-context";
import { useTranslation } from "@/hooks/use-translation";
import { type AIAction } from "@/lib/ai";
import { cn } from "@/lib/utils";

// tiptap-markdown extends editor.storage but doesn't ship TS declarations
interface MarkdownStorage {
  markdown: { getMarkdown: () => string };
}

interface WysiwygEditorProps {
  label: string;
  fieldName: string;
  id: string;
  value: string;
  onChange: (markdown: string) => void;
  getCurrentValue: () => string;
  onAccept: (text: string) => void;
  className?: string;
  placeholder?: string;
}

const ACTION_ICONS: Record<AIAction, typeof Wand2> = {
  improve: Wand2,
  shorten: Minimize2,
  expand: Maximize2,
  longform: FileText,
  grammar: SpellCheck,
};

const ACTION_ORDER: AIAction[] = [
  "improve",
  "shorten",
  "expand",
  "longform",
  "grammar",
];

export function WysiwygEditor({
  label,
  fieldName,
  id,
  value,
  onChange,
  getCurrentValue,
  onAccept,
  className,
  placeholder,
}: WysiwygEditorProps) {
  const { t } = useTranslation();
  const { isLoading, error, result, improve, reset } = useAIImprove();
  const { setHasActiveSuggestion } = useAISuggestion();
  const isUpdatingRef = useRef(false);

  const currentValue = getCurrentValue();
  const isEmpty = !currentValue || currentValue.trim().length === 0;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return;
      const md = (editor.storage as unknown as MarkdownStorage).markdown.getMarkdown();
      onChange(md);
    },
  });

  // Sync external value changes (AI accept, form reset) into the editor
  useEffect(() => {
    if (!editor) return;
    const currentMd = (editor.storage as unknown as MarkdownStorage).markdown.getMarkdown();
    if (value !== currentMd) {
      isUpdatingRef.current = true;
      editor.commands.setContent(value);
      isUpdatingRef.current = false;
    }
  }, [value, editor]);

  // Signal context about active suggestion
  useEffect(() => {
    setHasActiveSuggestion(!!result);
    return () => setHasActiveSuggestion(false);
  }, [result, setHasActiveSuggestion]);

  useEffect(() => {
    if (error) {
      toast.error("AI Writing Assistant Error", {
        description: error,
      });
    }
  }, [error]);

  const handleAction = (action: AIAction) => {
    const text = getCurrentValue();
    if (text.trim()) {
      improve(text, action);
    }
  };

  const handleAccept = () => {
    if (result) {
      onAccept(result);
      reset();
    }
  };

  const handleReject = () => {
    reset();
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label row with AI button */}
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>{t("ai.improving")}</span>
            </div>
          ) : (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={isEmpty}
                      aria-label={`AI writing tools for ${fieldName}`}
                    >
                      <Wand2 className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>{t("ai.assistantName")}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                {ACTION_ORDER.map((action) => {
                  const Icon = ACTION_ICONS[action];
                  return (
                    <DropdownMenuItem
                      key={action}
                      onClick={() => handleAction(action)}
                    >
                      <Icon className="size-4" />
                      {t(`ai.${action}`)}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Editor + optional AI suggestion card */}
      <div className={cn("flex flex-col gap-3", result && "lg:flex-row")}>
        {/* WYSIWYG Editor */}
        <div
          className={cn(
            "wysiwyg-container rounded-md border border-input bg-transparent shadow-xs focus-within:ring-1 focus-within:ring-ring",
            result && "flex-1 min-w-0"
          )}
        >
          <WysiwygToolbar editor={editor} />
          <EditorContent editor={editor} id={id} />
        </div>

        {/* AI suggestion card (when active) */}
        {result && (
          <div className="flex-1 min-w-0 rounded-md border bg-muted/30 p-3 space-y-3 animate-shimmer-border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wand2 className="size-4 text-primary" />
              {t("ai.assistantName")}
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
              >
                {result}
              </ReactMarkdown>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleAccept}>
                {t("common.accept")}
              </Button>
              <Button size="sm" variant="outline" onClick={handleReject}>
                {t("common.reject")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
