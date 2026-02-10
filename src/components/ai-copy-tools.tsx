"use client";

import { useEffect } from "react";
import {
  Wand2,
  Minimize2,
  Maximize2,
  SpellCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAIImprove } from "@/hooks/use-ai-improve";
import { ACTION_LABELS, type AIAction } from "@/lib/ai";

interface AICopyToolsProps {
  fieldName: string;
  getCurrentValue: () => string;
  onAccept: (text: string) => void;
}

const ACTION_ICONS: Record<AIAction, typeof Wand2> = {
  improve: Wand2,
  shorten: Minimize2,
  expand: Maximize2,
  grammar: SpellCheck,
};

const ACTION_ORDER: AIAction[] = ["improve", "shorten", "expand", "grammar"];

export function AICopyTools({
  fieldName,
  getCurrentValue,
  onAccept,
}: AICopyToolsProps) {
  const { isLoading, error, result, improve, reset } = useAIImprove();

  const currentValue = getCurrentValue();
  const isEmpty = !currentValue || currentValue.trim().length === 0;

  useEffect(() => {
    if (error) {
      toast.error(error);
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

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span>Improving...</span>
      </div>
    );
  }

  if (result) {
    return (
      <div className="rounded-md border bg-muted/50 p-3 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Wand2 className="size-4 text-primary" />
          AI Suggestion
        </div>
        <p className="text-sm whitespace-pre-wrap">{result}</p>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleAccept}>
            Accept
          </Button>
          <Button size="sm" variant="outline" onClick={handleReject}>
            Reject
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
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
      <DropdownMenuContent align="end">
        {ACTION_ORDER.map((action) => {
          const Icon = ACTION_ICONS[action];
          return (
            <DropdownMenuItem
              key={action}
              onClick={() => handleAction(action)}
            >
              <Icon className="size-4" />
              {ACTION_LABELS[action]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
