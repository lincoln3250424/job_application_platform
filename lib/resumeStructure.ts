import { GoogleGenAI } from "@google/genai";
import { MODEL_FAST } from "./gemini";

export type StructuredResume = {
  name: string;
  contact: {
    email?: string;
    phone?: string;
    location?: string;
    links?: string[];
  };
  summary?: string;
  experience: {
    company: string;
    title: string;
    dates?: string;
    bullets: string[];
  }[];
  education: {
    institution: string;
    detail?: string;
    dates?: string;
  }[];
  skills: string[];
};

const RESUME_JSON_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    contact: {
      type: "object",
      properties: {
        email: { type: "string" },
        phone: { type: "string" },
        location: { type: "string" },
        links: { type: "array", items: { type: "string" } },
      },
    },
    summary: { type: "string" },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          title: { type: "string" },
          dates: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
        },
        required: ["company", "title", "bullets"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          institution: { type: "string" },
          detail: { type: "string" },
          dates: { type: "string" },
        },
        required: ["institution"],
      },
    },
    skills: { type: "array", items: { type: "string" } },
  },
  required: ["name", "contact", "experience", "education", "skills"],
};

const SYSTEM_STRUCTURE = `Convert the resume text into the given JSON structure. Use only \
information present in the resume — do not invent employers, dates, or details. Split each \
job's description into separate bullet strings (no leading dashes or bullet characters). \
Keep bullet wording exactly as in the source; do not rephrase.`;

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  client = new GoogleGenAI({ apiKey });
  return client;
}

/**
 * Converts a polished resume (markdown, meant for display) into a structured
 * schema suitable for programmatic DOCX/PDF rendering. Deliberately a
 * separate, cheap call rather than asking the Editor agent to emit both
 * formats at once — keeps the Editor's prompt focused, and this only runs
 * once per draft (the result is cached on ResumeDraft.structuredJson).
 */
export async function structureResume(resumeMarkdown: string): Promise<StructuredResume> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL_FAST,
    contents: `RESUME:\n\n${resumeMarkdown}`,
    config: {
      systemInstruction: SYSTEM_STRUCTURE,
      temperature: 0.1,
      responseMimeType: "application/json",
      responseJsonSchema: RESUME_JSON_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned no structured resume data.");
  }

  try {
    return JSON.parse(text) as StructuredResume;
  } catch {
    throw new Error("Gemini returned malformed JSON for the structured resume.");
  }
}
