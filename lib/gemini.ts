import { GoogleGenAI } from "@google/genai";

// Model assignment: cheap/fast Flash for mechanical extraction, Pro for the
// three agents that need actual judgment. Override via env vars without
// touching code. See the system design doc, Section 2, for the reasoning.
export const MODEL_FAST = process.env.GEMINI_MODEL_FAST || "gemini-2.5-flash";
export const MODEL_QUALITY = process.env.GEMINI_MODEL_QUALITY || "gemini-2.5-pro";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }
  client = new GoogleGenAI({ apiKey });
  return client;
}

export type LLMResult = {
  text: string;
  modelUsed: string;
  inputTokens?: number;
  outputTokens?: number;
};

/**
 * Calls Gemini with a system instruction + a single user message and returns
 * the plain-text response. This is the one place all four agents route
 * through — swapping providers (e.g. adding Claude for a specific agent)
 * means adding a sibling function here and choosing it at the call site,
 * not touching the pipeline logic.
 */
export async function callGemini(
  systemInstruction: string,
  userMessage: string,
  model: string = MODEL_QUALITY
): Promise<LLMResult> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model,
    contents: userMessage,
    config: {
      systemInstruction,
      temperature: 0.4,
      maxOutputTokens: 4096,
    },
  });

  const text = response.text;
  if (!text || !text.trim()) {
    throw new Error(
      `Empty response from ${model}. This can happen if the prompt tripped a safety filter — check response.promptFeedback if this recurs.`
    );
  }

  return {
    text,
    modelUsed: model,
    inputTokens: response.usageMetadata?.promptTokenCount,
    outputTokens: response.usageMetadata?.candidatesTokenCount,
  };
}
