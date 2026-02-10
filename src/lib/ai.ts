export const AI_ACTIONS = ["improve", "shorten", "expand", "longform", "grammar"] as const;
export type AIAction = (typeof AI_ACTIONS)[number];

export const ACTION_LABELS: Record<AIAction, string> = {
  improve: "Improve clarity",
  shorten: "Shorten",
  expand: "Expand",
  longform: "Long form",
  grammar: "Fix grammar",
};

export const PROMPTS: Record<AIAction, string> = {
  improve:
    "Improve clarity and readability. Maintain the original length (±20%). Keep the same meaning, tone, and key facts. Return only the improved text with no preamble or explanations.",
  shorten:
    "Reduce to 50-70% of original length. Preserve the core message and tone. Remove filler words and redundancy. Return only the shortened text with no preamble or explanations.",
  expand:
    "Expand to 110-130% of original length. Add a bit more detail and context where helpful. Keep the same tone and style. Use simple paragraph breaks for readability. Return only the expanded text with no preamble or explanations.",
  longform:
    "Expand to 150-200% of original length. Add relevant detail and context. Use markdown formatting: ## for section headings, **bold** for emphasis, and blank lines between paragraphs. Organize longer content with headings and structure. Maintain the same tone and style. Do not add new claims or change the meaning. Return only the markdown-formatted text with no preamble or explanations.",
  grammar:
    "Fix grammar, spelling, and punctuation errors only. Do not change word choice, tone, or sentence structure unless grammatically necessary. Maintain exact original length where possible. Return only the corrected text with no preamble or explanations.",
};
