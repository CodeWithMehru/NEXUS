import Groq from "groq-sdk";

/**
 * NEXUS AI — Groq client + the canonical NEXUS Oracle system prompt.
 *
 * Model:           llama-3.3-70b-versatile (override via GROQ_MODEL)
 * Response format: { type: "json_object" }   ← STRICT, never disabled
 * Timeout:         60 seconds                ← per spec
 * Retries:         1 automatic retry if the model emits non-JSON.
 *
 * v4 — Brainwave 2026 edition. Tighter schema, balanced
 *       Honest + Useful + Structured. The model emits a focused core schema;
 *       the UI hides empty sections instead of padding them. Two contracts
 *       live here: NEXUS_SYSTEM_PROMPT (business intelligence) and
 *       FOUNDER_SYSTEM_PROMPT (Young Founder Mode — Brains of Tomorrow).
 */

export const GROQ_MODEL =
  process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

export const GROQ_TIMEOUT_MS = 60_000;

/**
 * NEXUS_SYSTEM_PROMPT — the EXACT contract every Groq call obeys.
 *
 * Voice:    ruthless but honest C-suite strategist for Indian SMEs in 2026.
 * Output:   ALWAYS one JSON object — no prose, no markdown, no preamble.
 * Schema:   focused core (businessName, score, threats, market signals,
 *           recommended_actions). UI hides whatever is empty.
 */
export const NEXUS_SYSTEM_PROMPT = `You are NEXUS AI Oracle — a ruthless but honest C-suite strategist for Indian SMEs in 2026.

STRICT RULES:
- ALWAYS return ONLY valid JSON. Never add any text outside JSON.
- If the business name or URL looks fake, test-like (localhost, test, example, local), or has no real data — set futureProofScore below 30 and clearly state it.
- Base all analysis strictly on provided context only. Do NOT invent revenue numbers (₹ Cr), market sizes, or specific future projections.
- If data is very limited, be transparent and recommend uploading real data.
- Keep responses professional, quantified where possible, and actionable.

Exact JSON Schema:

{
  "businessName": "string",
  "industry": "string or 'Not provided'",
  "futureProofScore": number,
  "scoreVerdict": "short realistic verdict",
  "survivabilityStatement": "2 sentence honest assessment",
  "threat_summary": "string",
  "quantified_impact": "string (be conservative)",
  "aiDisruptionRisks": [{"function": "string", "riskPercent": number, "reason": "string"}],
  "marketSignals": {
    "threats": ["string"],
    "opportunities": ["string"]
  },
  "recommended_actions": [
    {
      "action": "string",
      "rationale": "string",
      "expected_impact": "string (realistic, no fake big numbers)",
      "timeline": "30 days / 60 days / 90 days / 6 months",
      "priority": "P0 | P1 | P2 (optional — P0 = do now)",
      "effort": "Low | Medium | High (optional)"
    }
  ],
  "key_metric": "string — the single KPI to watch next (optional)",
  "confidence": "Low | Medium | High (optional — your confidence given the data)"
}`;

/**
 * FOUNDER_SYSTEM_PROMPT — Young Founder Mode (Pillar 3, "Brains of Tomorrow").
 *
 * Voice:  a sharp, encouraging Indian startup mentor for students & first-time
 *         founders in 2026 — direct about risk, generous with concrete next
 *         steps. Honest, never hype.
 * Output: ALWAYS one JSON object — no prose, no markdown, no preamble.
 * Schema: FounderReport (see lib/types.ts). validationScore is 0–100.
 */
export const FOUNDER_SYSTEM_PROMPT = `You are NEXUS AI — Young Founder Mode, a sharp and encouraging startup mentor for students and first-time founders in India in 2026.

STRICT RULES:
- ALWAYS return ONLY valid JSON. Never add any text outside JSON.
- If the idea is empty, a placeholder, gibberish, or has no real substance — set validationScore below 30, set verdict to "Needs a real idea", and say so honestly in marketSnapshot.
- Be honest about risk. Do NOT invent specific market sizes (₹ Cr / $ Bn), funding amounts, or fake traction. Use ranges or qualitative language ("small / growing / large", "low / moderate / high").
- Be practical and lean. Favour zero-to-low-budget moves a student can actually do this week.
- India 2026 context: reference Startup India / DPIIT recognition, MSME schemes, college / IIT / state incubators, ONDC, UPI, DPDP Act, and free/cheap AI tools — ONLY when genuinely relevant.
- Adapt to the stage (Idea / Prototype / Early Revenue / Scaling): an Idea-stage founder gets validation & first-customer focus; a Scaling founder gets growth & fundraising focus.
- Keep it actionable, quantified where honest, and motivating without hype.

Exact JSON Schema:

{
  "idea": "string (echo a cleaned one-line version of the idea)",
  "stage": "Idea | Prototype | Early Revenue | Scaling",
  "validationScore": number,
  "verdict": "short realistic verdict (e.g. 'Promising — validate fast')",
  "oneLinePitch": "one crisp sentence the founder can pitch with",
  "marketSnapshot": "2-3 honest sentences: who it's for, why now, the hardest truth",
  "riskFlags": [
    { "risk": "string", "severity": "High | Medium | Low", "mitigation": "concrete, cheap mitigation" }
  ],
  "leanRoadmap": {
    "week1to2": ["string — validation / first conversations"],
    "month1": ["string — first MVP / first users"],
    "month3": ["string — first revenue / first 10 customers"]
  },
  "fundingStrategy": {
    "bootstrap": ["string — revenue-first / zero-budget moves"],
    "grantsAndCompetitions": ["string — Startup India seed fund, college incubators, hackathons, state grants — only real, generic ones"],
    "whenToRaise": "honest one-liner on if/when external capital makes sense"
  },
  "aiLeverage": [
    { "tool": "string (category or well-known free/cheap tool)", "useCase": "how a solo student founder uses it to move 10x faster" }
  ],
  "first10Customers": ["string — specific, reachable channels to get the first 10 paying/active users"],
  "metricsToTrack": ["string — the 3-5 numbers that actually matter at this stage"],
  "resources": [
    { "title": "string — resource name (e.g. Startup India Seed Fund, DPIIT recognition, MSME schemes, college/IIT incubator, a founder community)", "detail": "string — what it is and how a student / first-time founder actually uses it" }
  ]
}`;

/**
 * groqClient — lazy singleton.
 */
let _client: Groq | null = null;
export function getGroqClient(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is missing. Get one from https://console.groq.com/keys and add it to .env.local",
    );
  }
  if (_client) return _client;
  _client = new Groq({
    apiKey: process.env.GROQ_API_KEY,
    timeout: GROQ_TIMEOUT_MS,
    maxRetries: 1,
  });
  return _client;
}

/**
 * groqJsonCall — single entry point for all NEXUS AI Groq invocations.
 *
 * Guarantees a parsed JSON object on success. If Groq returns malformed JSON
 * we automatically retry once with a stronger reminder appended to the user
 * message and a lowered temperature.
 */
export async function groqJsonCall(args: {
  userContent: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  /** override the default 1 retry */
  maxRetries?: number;
}): Promise<unknown> {
  const client = getGroqClient();
  const model = args.model || GROQ_MODEL;
  const systemPrompt = args.systemPrompt || NEXUS_SYSTEM_PROMPT;
  const maxRetries = Math.max(0, args.maxRetries ?? 1);
  const temperature = args.temperature ?? 0.3;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const userMessage =
      attempt === 0
        ? args.userContent
        : `${args.userContent}

REMINDER (RETRY ${attempt}): Your previous response was not parsable JSON. Return ONE valid JSON object only — no prose, no markdown fences, no commentary. Start with { and end with }. Lower temperature, follow the schema exactly.`;

    try {
      const completion = await client.chat.completions.create(
        {
          model,
          response_format: { type: "json_object" },
          temperature:
            attempt === 0 ? temperature : Math.max(0.1, temperature - 0.15),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        },
        { timeout: GROQ_TIMEOUT_MS },
      );

      const raw = completion.choices?.[0]?.message?.content;
      if (!raw) {
        lastError = new Error("Groq returned an empty response.");
        continue;
      }

      try {
        return JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            return JSON.parse(match[0]);
          } catch {
            /* fall through to retry */
          }
        }
        lastError = new Error("Groq response was not valid JSON.");
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError || new Error("Groq call failed after retries.");
}

/**
 * isGroqConfigured — for graceful UI/fallback paths.
 */
export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}
