import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { callGemini, MODEL_FAST } from "./gemini";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 5_000_000; // 5MB — plenty for an HTML job posting page
const MAX_EXTRACTED_CHARS = 15_000; // keeps the Gemini extraction call cheap

export class FetchJobPostError extends Error {}

/**
 * Basic SSRF guardrails: block non-http(s) schemes and obviously-internal
 * hostnames/IP literals. This is a reasonable baseline, not a complete
 * defense — a hardened production version would also resolve DNS and check
 * the resolved IP (to catch a public hostname that resolves internally) and
 * re-check on every redirect hop. See the system design doc's security
 * section for the fuller treatment.
 */
function assertSafeUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new FetchJobPostError("That doesn't look like a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new FetchJobPostError("Only http(s) URLs are supported.");
  }

  const hostname = url.hostname.toLowerCase();
  const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "::1"];
  if (blockedHosts.includes(hostname)) {
    throw new FetchJobPostError("That URL points to a local/internal address.");
  }

  const privateIpPattern =
    /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/;
  if (privateIpPattern.test(hostname)) {
    throw new FetchJobPostError("That URL points to a private network address.");
  }

  return url;
}

async function fetchHtml(url: URL): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Identify the bot honestly — good practice, and some sites allow-list on this.
        "User-Agent":
          "Mozilla/5.0 (compatible; TheDeskJobFetcher/1.0; +https://example.com/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      throw new FetchJobPostError(
        `The page returned an error (HTTP ${res.status}). It may block automated requests — try pasting the text instead.`
      );
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("html")) {
      throw new FetchJobPostError(
        "That URL didn't return an HTML page — try pasting the job post text instead."
      );
    }

    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
      throw new FetchJobPostError("That page is too large to fetch.");
    }

    return await res.text();
  } catch (err) {
    if (err instanceof FetchJobPostError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new FetchJobPostError(
        "Fetching that page took too long. It may require JavaScript to render — try pasting the text instead."
      );
    }
    throw new FetchJobPostError(
      "Couldn't reach that URL. Double-check it's correct, or paste the job post text instead."
    );
  } finally {
    clearTimeout(timeout);
  }
}

function stripBoilerplate(html: string, url: string): string {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article?.textContent || article.textContent.trim().length < 100) {
    throw new FetchJobPostError(
      "Couldn't find readable article content on that page — try pasting the job post text instead."
    );
  }

  return article.textContent.trim().slice(0, MAX_EXTRACTED_CHARS);
}

const SYSTEM_FETCHER_EXTRACT = `You are given roughly-cleaned webpage text. Return only the job posting itself \
— title, company, location, responsibilities, qualifications. Discard any navigation \
remnants, related/recommended job listings, cookie or newsletter notices, or unrelated page \
content. If no job posting is present in the text, respond with exactly: NO_JOB_POSTING_FOUND`;

async function extractJobPosting(cleanedText: string): Promise<string> {
  const result = await callGemini(SYSTEM_FETCHER_EXTRACT, cleanedText, MODEL_FAST);
  if (result.text.trim() === "NO_JOB_POSTING_FOUND") {
    throw new FetchJobPostError(
      "That page doesn't look like it contains a job posting — try pasting the text instead."
    );
  }
  return result.text.trim();
}

/**
 * Full Agent 0 flow: validate -> fetch -> strip boilerplate -> extract.
 * Throws FetchJobPostError with a message safe to show the user directly on
 * any failure — always leave manual paste as the fallback in the UI.
 */
export async function fetchJobPostFromUrl(rawUrl: string): Promise<string> {
  const url = assertSafeUrl(rawUrl);
  const html = await fetchHtml(url);
  const cleaned = stripBoilerplate(html, url.toString());
  return extractJobPosting(cleaned);
}
