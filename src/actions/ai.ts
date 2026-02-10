"use server";

import { GoogleGenAI } from "@google/genai";
import { PROMPTS, AI_ACTIONS, type AIAction } from "@/lib/ai";

export async function improveText(
  text: string,
  action: AIAction
): Promise<{ result?: string; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

  if (!apiKey) {
    return { error: "Gemini API key is not configured" };
  }

  if (!AI_ACTIONS.includes(action)) {
    return { error: "Invalid action" };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `${PROMPTS[action]}\n\n${text}`,
    });
    return { result: response.text ?? "" };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to improve text";
    console.error("[AI Action Error]", { action, modelName, error: errorMessage });

    return {
      error: `AI service error: ${errorMessage}. Please check your API configuration.`,
    };
  }
}
