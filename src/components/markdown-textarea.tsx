"use client";

import { useEffect, useState } from "react";
import {
  Wand2,
  Minimize2,
  Maximize2,
  FileText,
  SpellCheck,
  Loader2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useAIImprove } from "@/hooks/use-ai-improve";
import { useAISuggestion } from "@/contexts/ai-suggestion-context";
import { useDebounce } from "@/hooks/use-debounce";
import { MarkdownPreview } from "@/components/markdown-preview";
import { useTranslation } from "@/hooks/use-translation";
import { type AIAction } from "@/lib/ai";
import { cn } from "@/lib/utils";

interface MarkdownTextareaProps {
  label: string;
  fieldName: string;
  id: string;
  getCurrentValue: () => string;
  onAccept: (text: string) => void;
  textareaProps?: React.ComponentProps<"textarea">;
  className?: string;
  ariaLabel?: string;
  showPreview?: boolean; // Default: false for backward compatibility
}

const ACTION_ICONS: Record<AIAction, typeof Wand2> = {
  improve: Wand2,
  shorten: Minimize2,
  expand: Maximize2,
  longform: FileText,
  grammar: SpellCheck,
};

const ACTION_ORDER: AIAction[] = ["improve", "shorten", "expand", "longform", "grammar"];

export function MarkdownTextarea({
  label,
  fieldName,
  id,
  getCurrentValue,
  onAccept,
  textareaProps = {},
  className,
  ariaLabel,
  showPreview = false,
}: MarkdownTextareaProps) {
  const { t } = useTranslation();
  const [isPreviewVisible, setIsPreviewVisible] = useState(showPreview);
  const { isLoading, error, result, improve, reset } = useAIImprove();
  const { setHasActiveSuggestion } = useAISuggestion();

  const currentValue = getCurrentValue();
  const isEmpty = !currentValue || currentValue.trim().length === 0;

  // Debounce preview updates for performance
  const debouncedValue = useDebounce(currentValue, 300);

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
      {/* Label row with preview toggle and AI button */}
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-2">
          {/* Preview toggle button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                aria-label="Toggle markdown preview"
              >
                <Eye className={cn("size-4", isPreviewVisible && "text-primary")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPreviewVisible ? t("common.hidePreview") : t("common.showPreview")}
            </TooltipContent>
          </Tooltip>

          {/* AI button */}
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

      {/* Content area: either textarea or preview (toggle mode) + optional AI suggestion */}
      <div className={cn("flex flex-col gap-3", result && "lg:flex-row")}>
        {/* Textarea (shown in edit mode) */}
        {!isPreviewVisible && (
          <Textarea
            id={id}
            aria-label={ariaLabel}
            className={cn(result && "flex-1 min-w-0")}
            {...textareaProps}
          />
        )}

        {/* Preview pane (shown in preview mode) */}
        {isPreviewVisible && (
          <div className={cn("rounded-md border bg-muted/10 p-3", result && "flex-1 min-w-0")}>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              {t("common.markdownPreview")}
            </div>
            <MarkdownPreview content={debouncedValue} />
          </div>
        )}

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
