"use client";

import { useState, useCallback } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PROMPTS, type AIAction } from "@/lib/ai";

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
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      setError("Gemini API key is not configured");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `${PROMPTS[action]}\n\n${text}`;
      const response = await model.generateContent(prompt);
      const resultText = response.response.text();
      setResult(resultText);
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
