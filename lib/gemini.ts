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

export type Source = { title: string; uri: string };

export type LLMResultWithSources = LLMResult & { sources: Source[] };

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

/**
 * Same as callGemini, but with Google Search grounding enabled — the model
 * can issue real web searches as part of generating its response. Used for
 * the Interview Prep agent, which needs to actually research the company
 * rather than reason from training data alone.
 *
 * Note: Gemini's structured JSON output mode (responseSchema) and tool use
 * are mutually exclusive in the same call, so this always returns markdown
 * text, same as callGemini — never JSON mode.
 */
export async function callGeminiWithSearch(
  systemInstruction: string,
  userMessage: string,
  model: string = MODEL_QUALITY
): Promise<LLMResultWithSources> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model,
    contents: userMessage,
    config: {
      systemInstruction,
      temperature: 0.5,
      maxOutputTokens: 4096,
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text;
  if (!text || !text.trim()) {
    throw new Error(
      `Empty response from ${model} with search grounding enabled. This can happen if the prompt tripped a safety filter.`
    );
  }

  // Grounding metadata is the authoritative source list — safer to extract it
  // programmatically than to trust the model to self-report accurate
  // citations in its own text.
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set<string>();
  const sources: Source[] = [];
  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    sources.push({ title: chunk.web?.title || uri, uri });
  }

  return {
    text,
    modelUsed: model,
    inputTokens: response.usageMetadata?.promptTokenCount,
    outputTokens: response.usageMetadata?.candidatesTokenCount,
    sources,
  };
}
