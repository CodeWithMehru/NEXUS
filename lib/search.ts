/**
 * NEXUS AI — Live web grounding (Pillar 1).
 *
 * Wraps the Tavily Search API so the Nexus Mode report can ground its market
 * signals in real, current web results instead of pure model inference.
 *
 * Env-gated + never throws: if TAVILY_API_KEY is absent, the request errors, or
 * it exceeds WEB_SEARCH_TIMEOUT_MS, groundWithWeb() returns []. The caller then
 * proceeds with honest "AI-inferred" signals — byte-for-byte the prior behaviour.
 *
 * Get a free key (1,000 searches/month) at https://tavily.com.
 */

export interface WebSnippet {
  title: string;
  url: string;
  content: string;
}

/** 8s — kept well under the route's 60s Groq budget so grounding never starves the model. */
export const WEB_SEARCH_TIMEOUT_MS = 8_000;

const TAVILY_ENDPOINT = "https://api.tavily.com/search";

/**
 * isWebSearchConfigured — true when a Tavily key is present. Used by the UI/API
 * to label reports as "Grounded by live web search" vs "AI-inferred".
 */
export function isWebSearchConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY);
}

/**
 * groundWithWeb — fetch up to `maxResults` clean snippets for `query`.
 * Always resolves (never rejects). Returns [] when unconfigured or on any error.
 */
export async function groundWithWeb(
  query: string,
  maxResults = 5,
): Promise<WebSnippet[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || !query.trim()) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEB_SEARCH_TIMEOUT_MS);

  try {
    const res = await fetch(TAVILY_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${query} — business risks, competitors, market signals 2026`,
        search_depth: "basic",
        max_results: maxResults,
        include_answer: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return [];

    const json = (await res.json()) as {
      results?: { title?: string; url?: string; content?: string }[];
    };

    if (!Array.isArray(json.results)) return [];

    return json.results
      .map((r) => ({
        title: typeof r.title === "string" ? r.title.trim() : "",
        url: typeof r.url === "string" ? r.url.trim() : "",
        content:
          typeof r.content === "string" ? r.content.trim().slice(0, 500) : "",
      }))
      .filter((r) => r.title && r.url)
      .slice(0, maxResults);
  } catch {
    // No key, network error, abort/timeout, or bad JSON — degrade gracefully.
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
