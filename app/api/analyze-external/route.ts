import { NextRequest, NextResponse } from "next/server";
import {
  GROQ_TIMEOUT_MS,
  groqJsonCall,
  isGroqConfigured,
} from "@/lib/groq";
import {
  createSupabaseAdminClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { groundWithWeb, type WebSnippet } from "@/lib/search";
import type { NexusReport } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST /api/analyze-external
 * Pillar 1 — External Intelligence (Nexus Mode).
 *
 * Body: { query: string }   // business name OR url
 * Returns: { report: NexusReport, businessId: string | null, inputQuality }
 *
 * v4 — final optimized:
 *   - Uses the new minimal system prompt; passes business name/URL clearly.
 *   - Detects placeholder/test inputs and forces score < 30.
 *   - Sanitizer keeps the schema honest — empty arrays are preserved (UI hides
 *     empty sections), no fabricated defaults.
 */
export async function POST(req: NextRequest) {
  let body: { query?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const query = (body.query || "").toString().trim();
  if (!query) {
    return NextResponse.json(
      { error: "Business name or URL is required." },
      { status: 400 },
    );
  }

  if (!isGroqConfigured()) {
    return NextResponse.json(
      {
        error:
          "GROQ_API_KEY is not configured on the server. Add it to .env.local and restart.",
      },
      { status: 500 },
    );
  }

  const quality = assessInputQuality(query);

  // Live web grounding — only for likely-real inputs (gibberish/placeholders
  // skip the network hop). Returns [] when TAVILY_API_KEY is absent or on error,
  // in which case the prompt and report fall back to honest AI-inference.
  const snippets: WebSnippet[] =
    quality.kind === "likely_real" ? await groundWithWeb(query) : [];

  const userPrompt = buildExternalPrompt(query, quality, snippets);

  let report: NexusReport;
  try {
    const result = (await Promise.race([
      groqJsonCall({
        userContent: userPrompt,
        temperature: quality.kind === "placeholder" ? 0.15 : 0.3,
        maxRetries: 1,
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Groq request timed out (60s).")),
          GROQ_TIMEOUT_MS,
        ),
      ),
    ])) as Partial<NexusReport>;

    report = sanitizeReport(result, query, quality);

    // Attach live-web provenance after sanitizing (keeps the sanitizer pure).
    // `sources` rides along inside the existing external_report JSONB on persist.
    if (snippets.length > 0) {
      report.groundedByWeb = true;
      report.sources = snippets
        .slice(0, 6)
        .map((s) => ({ title: s.title, url: s.url }));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Groq error.";
    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 502 },
    );
  }

  // Persist (best-effort).
  let businessId: string | null = null;
  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createSupabaseAdminClient();
      const { data, error } = await supabase
        .from("business_profiles")
        .insert({
          name: report.businessName || query,
          url: quality.isUrl ? query : null,
          industry: report.industry || null,
          external_report: report,
          future_proof_score: report.futureProofScore ?? null,
        })
        .select("id")
        .single();
      if (!error && data?.id) businessId = data.id;
    } catch {
      /* swallow */
    }
  }

  return NextResponse.json({ report, businessId, inputQuality: quality.kind });
}

// ---------------------------------------------------------------------------
// Input quality assessment
// ---------------------------------------------------------------------------

type InputQuality = {
  kind: "placeholder" | "unknown" | "likely_real";
  isUrl: boolean;
  domain: string | null;
  scoreCap: number;
  reason: string;
};

const PLACEHOLDER_HOSTS = new Set([
  "localhost",
  "0.0.0.0",
  "127.0.0.1",
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "foo.bar",
  "foo.com",
  "bar.com",
  "acme.com",
  "domain.com",
  "site.com",
  "asdf.com",
  "qwerty.com",
]);

const PLACEHOLDER_NAMES = new Set([
  "test",
  "testing",
  "asdf",
  "qwerty",
  "abcd",
  "abc",
  "xyz",
  "foo",
  "bar",
  "baz",
  "lorem",
  "ipsum",
  "placeholder",
  "demo",
  "example",
  "sample",
]);

function assessInputQuality(q: string): InputQuality {
  const trimmed = q.trim();
  const lower = trimmed.toLowerCase();
  const isUrl = /^https?:\/\//i.test(trimmed) || /\./.test(trimmed);

  let domain: string | null = null;
  if (isUrl) {
    try {
      const u = trimmed.match(/^https?:\/\//) ? trimmed : `https://${trimmed}`;
      const url = new URL(u);
      domain = url.hostname.toLowerCase();
    } catch {
      domain = null;
    }
  }

  const reasons: string[] = [];

  if (
    domain &&
    (PLACEHOLDER_HOSTS.has(domain) ||
      domain.startsWith("localhost") ||
      domain.endsWith(".local") ||
      domain.endsWith(".test") ||
      domain.endsWith(".invalid") ||
      domain.endsWith(".localhost"))
  ) {
    reasons.push(`Domain "${domain}" is a known placeholder/test host.`);
  }

  if (domain && /^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) {
    reasons.push(`Numeric IP "${domain}" — not a real public business URL.`);
  }

  if (!isUrl && PLACEHOLDER_NAMES.has(lower)) {
    reasons.push(`"${trimmed}" is a generic placeholder term.`);
  }

  if (!isUrl && /^[a-z0-9]{2,12}$/.test(lower)) {
    const hasVowel = /[aeiou]/.test(lower);
    const repeated = /(.)\1{2,}/.test(lower);
    if (!hasVowel || repeated) {
      reasons.push(`"${trimmed}" looks like random/keyboard mash input.`);
    }
  }

  if (domain && /(^|\.)localhost(\.|$)/.test(domain)) {
    reasons.push(`Domain "${domain}" contains "localhost" — placeholder/test.`);
  }

  if (reasons.length > 0) {
    return {
      kind: "placeholder",
      isUrl,
      domain,
      scoreCap: 25,
      reason: reasons.join(" "),
    };
  }

  if (!isUrl && trimmed.length <= 4) {
    return {
      kind: "unknown",
      isUrl,
      domain,
      scoreCap: 60,
      reason: `"${trimmed}" is too short to disambiguate uniquely. Treat as limited context.`,
    };
  }

  return {
    kind: "likely_real",
    isUrl,
    domain,
    scoreCap: 100,
    reason: "Input looks like a real business name or URL.",
  };
}

// ---------------------------------------------------------------------------
// Prompt construction — explicit business-name injection
// ---------------------------------------------------------------------------

function buildExternalPrompt(
  query: string,
  quality: InputQuality,
  snippets: WebSnippet[] = [],
): string {
  const inputClass =
    quality.kind === "placeholder"
      ? "PLACEHOLDER / FAKE / TEST"
      : quality.kind === "unknown"
        ? "AMBIGUOUS / LOW-CONTEXT"
        : "LIKELY REAL";

  const placeholderInstructions =
    quality.kind === "placeholder"
      ? `
INPUT IS PLACEHOLDER:
- Set "futureProofScore" between 0 and 25.
- Set "scoreVerdict" to "Insufficient Data".
- Open "survivabilityStatement" with: "This appears to be a placeholder or test domain with no real public information."
- Set "industry" to "Not provided".
- "threat_summary": one honest line stating the input is a test/placeholder.
- "quantified_impact": "Insufficient real business data — impact cannot be quantified."
- "aiDisruptionRisks": empty array.
- "marketSignals.threats" and "marketSignals.opportunities": empty arrays.
- "recommended_actions": ONE entry asking the operator to provide a real business name OR upload internal data via The Vault. timeline = "0-5 minutes".`
      : quality.kind === "unknown"
        ? `
INPUT IS AMBIGUOUS:
- Cap "futureProofScore" between 25 and 60.
- Use cautious, qualitative language. Avoid specific ₹ figures.
- It is OK to leave "marketSignals.threats" / "marketSignals.opportunities" / "aiDisruptionRisks" as empty arrays if you cannot ground them. The UI will hide empty sections.`
        : `
INPUT IS LIKELY REAL:
- Use ONLY ₹ figures, regulations, and market claims you have HIGH confidence about for THIS specific business.
- For everything else, use ranges or qualitative language ("low / moderate / high impact").
- "futureProofScore" should reflect data quality: 60-85 for recognized brands you know well; 45-60 if you only have brand recognition without operational detail; 30-45 if you barely know the company.
- Populate "aiDisruptionRisks" with 4-6 concrete functions (Sales / Operations / Marketing / Customer Support / Finance / Logistics / HR) ONLY when you can ground each one. Otherwise return fewer.
- Populate "marketSignals.threats" and "marketSignals.opportunities" with 3-5 entries each ONLY when grounded.
- Populate "recommended_actions" with 3-5 actionable, concrete steps. expected_impact must be REALISTIC — no fake ₹ Cr.`;

  // Inject live web results (when available) so market signals are grounded in
  // current reality rather than the model's training cutoff.
  const webBlock =
    snippets.length > 0
      ? `
LIVE WEB SIGNALS (fetched just now — prefer these for "marketSignals" and "competitorMoves"; do NOT cite anything not present below):
${snippets
  .map(
    (s, i) =>
      `[${i + 1}] ${s.title}\n    ${s.url}\n    ${s.content}`,
  )
  .join("\n")}
`
      : "";

  return `MODE: External (Nexus Mode — Pillar 1)

TARGET BUSINESS NAME / URL: ${query}
INPUT TYPE: ${quality.isUrl ? "URL" : "Business Name"}
INPUT QUALITY: ${inputClass}
QUALITY REASON: ${quality.reason}
${quality.domain ? `RESOLVED DOMAIN: ${quality.domain}` : ""}

CONTEXT (apply only when INPUT QUALITY is LIKELY REAL):
- Year: 2026. Indian SME context.
- Macro defaults (use ONLY when relevant): DPDP Act enforced, GST 2.0 e-invoicing, ONDC mainstreaming, EU AI Act spillover, ~₹83/USD.
- Do NOT stuff macro defaults into every response.
${webBlock}
YOUR JOB:
Produce a focused, honest future-proof report on the target above. Refuse to fabricate ₹ figures, market sizes, or competitor names you cannot ground. If you cannot ground something, leave that field empty — the UI hides empty sections.
${placeholderInstructions}

OUTPUT: ONE JSON object, schema-exact (per system prompt). No prose, no markdown fences, no commentary.`;
}

// ---------------------------------------------------------------------------
// Sanitizer — enforces schema + applies the score cap from input quality
// ---------------------------------------------------------------------------

function sanitizeReport(
  raw: Partial<NexusReport>,
  fallbackName: string,
  quality: InputQuality,
): NexusReport {
  const r = (raw || {}) as Partial<NexusReport>;

  let score = clamp0to100(Number(r.futureProofScore ?? 0));
  if (score > quality.scoreCap) score = quality.scoreCap;

  const report: NexusReport = {
    businessName: str(
      r.businessName,
      quality.kind === "placeholder" ? "Unknown" : fallbackName,
    ),
    industry: str(
      r.industry,
      quality.kind === "placeholder" ? "Not provided" : "Not provided",
    ),
    futureProofScore: score,
    scoreVerdict: str(
      r.scoreVerdict,
      quality.kind === "placeholder"
        ? "Insufficient Data"
        : verdictForScore(score),
    ),
    survivabilityStatement: str(
      r.survivabilityStatement,
      quality.kind === "placeholder"
        ? "This appears to be a placeholder or test domain with no real public information."
        : "Analysis complete.",
    ),
    threat_summary: str(r.threat_summary, ""),
    quantified_impact: str(r.quantified_impact, ""),
    aiDisruptionRisks: Array.isArray(r.aiDisruptionRisks)
      ? r.aiDisruptionRisks
          .map((x) => ({
            function: str(x?.function, ""),
            riskPercent: clamp0to100(Number(x?.riskPercent ?? 0)),
            reason: str(x?.reason, ""),
          }))
          .filter((x) => x.function.length > 0)
      : [],
    marketSignals: {
      threats: arrStr(r.marketSignals?.threats),
      opportunities: arrStr(r.marketSignals?.opportunities),
    },
    recommended_actions: Array.isArray(r.recommended_actions)
      ? r.recommended_actions
          .map((x) => ({
            action: str(x?.action, ""),
            rationale: str(x?.rationale, ""),
            expected_impact: str(x?.expected_impact, ""),
            timeline: str(x?.timeline, ""),
          }))
          .filter((x) => x.action.length > 0)
      : [],
  };

  // ---- Pass-through optional extended fields if the model returned them ----
  if (r.workforceEvolution) {
    const we = {
      atRiskRoles: arrStr(r.workforceEvolution.atRiskRoles),
      reskillingPaths: arrStr(r.workforceEvolution.reskillingPaths),
    };
    if (we.atRiskRoles.length || we.reskillingPaths.length) {
      report.workforceEvolution = we;
    }
  }
  if (Array.isArray(r.opportunityGaps) && r.opportunityGaps.length > 0) {
    const gaps = r.opportunityGaps
      .map((x) => ({
        title: str(x?.title, ""),
        description: str(x?.description, ""),
        revenueEstimate: str(x?.revenueEstimate, ""),
      }))
      .filter((x) => x.title.length > 0);
    if (gaps.length) report.opportunityGaps = gaps;
  }
  if (r.actionRoadmap) {
    const rm = {
      ninetyDays: arrStr(r.actionRoadmap.ninetyDays),
      oneYear: arrStr(r.actionRoadmap.oneYear),
      threeYears: arrStr(r.actionRoadmap.threeYears),
    };
    if (rm.ninetyDays.length || rm.oneYear.length || rm.threeYears.length) {
      report.actionRoadmap = rm;
    }
  }
  const competitors = arrStr(r.competitorMoves);
  if (competitors.length) report.competitorMoves = competitors;
  const reg = str(r.regulatoryWatch, "");
  if (reg) report.regulatoryWatch = reg;
  const steps = arrStr(r.reasoning_steps);
  if (steps.length) report.reasoning_steps = steps;

  return report;
}

// ---------------------------------------------------------------------------

function clamp0to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function str(v: unknown, fallback = ""): string {
  if (typeof v === "string" && v.trim().length > 0) return v;
  if (typeof v === "number") return String(v);
  return fallback;
}

function arrStr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string" && x.trim().length > 0);
}

function verdictForScore(score: number): string {
  if (score >= 80) return "Future Proof";
  if (score >= 60) return "Stable";
  if (score >= 40) return "At Risk";
  if (score >= 25) return "Vulnerable";
  return "Insufficient Data";
}
