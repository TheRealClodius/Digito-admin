export const AI_ACTIONS = ["improve", "shorten", "expand", "grammar"] as const;
export type AIAction = (typeof AI_ACTIONS)[number];

export const ACTION_LABELS: Record<AIAction, string> = {
  improve: "Improve clarity",
  shorten: "Shorten",
  expand: "Expand",
  grammar: "Fix grammar",
};

export const PROMPTS: Record<AIAction, string> = {
  improve:
    "Improve the clarity and readability of the following text. Keep the same meaning and tone. Return only the improved text, no explanations.",
  shorten:
    "Make the following text shorter and more concise while preserving the key message. Return only the shortened text, no explanations.",
  expand:
    "Expand the following text with more detail and context while keeping the same tone. Return only the expanded text, no explanations.",
  grammar:
    "Fix all grammar, spelling, and punctuation errors in the following text. Keep the meaning unchanged. Return only the corrected text, no explanations.",
};
