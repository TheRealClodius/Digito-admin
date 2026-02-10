"use client";

import { useState, useCallback } from "react";
import { improveText } from "@/actions/ai";
import type { AIAction } from "@/lib/ai";

interface UseAIImproveReturn {
  isLoading: boolean;
  error: string | null;
  result: string | null;
  improve: (text: string, action: AIAction) => Promise<void>;
  reset: () => void;
}

export function useAIImprove(): UseAIImproveReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const improve = useCallback(async (text: string, action: AIAction) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await improveText(text, action);
      if (response.error) {
        setError(response.error);
      } else {
        setResult(response.result ?? "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to improve text");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setResult(null);
  }, []);

  return { isLoading, error, result, improve, reset };
}
