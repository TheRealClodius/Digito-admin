"use client";

import { useEffect } from "react";
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
import { useTranslation } from "@/hooks/use-translation";
import { type AIAction } from "@/lib/ai";
import { cn } from "@/lib/utils";

interface AITextareaProps {
  label: string;
  fieldName: string;
  id: string;
  getCurrentValue: () => string;
  onAccept: (text: string) => void;
  textareaProps?: React.ComponentProps<"textarea">;
  className?: string;
  ariaLabel?: string;
}

const ACTION_ICONS: Record<AIAction, typeof Wand2> = {
  improve: Wand2,
  shorten: Minimize2,
  expand: Maximize2,
  longform: FileText,
  grammar: SpellCheck,
};

const ACTION_ORDER: AIAction[] = ["improve", "shorten", "expand", "longform", "grammar"];

export function AITextarea({
  label,
  fieldName,
  id,
  getCurrentValue,
  onAccept,
  textareaProps = {},
  className,
  ariaLabel,
}: AITextareaProps) {
  const { isLoading, error, result, improve, reset } = useAIImprove();
  const { setHasActiveSuggestion } = useAISuggestion();
  const { t } = useTranslation();

  const currentValue = getCurrentValue();
  const isEmpty = !currentValue || currentValue.trim().length === 0;

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
      {/* Label row */}
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
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

      {/* Content area: textarea + optional suggestion card side-by-side */}
      <div className={cn("flex gap-3", result ? "" : "")}>
        <Textarea
          id={id}
          aria-label={ariaLabel}
          className={cn(result && "flex-1 min-w-0")}
          {...textareaProps}
        />
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
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={handleReject}>
                Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
