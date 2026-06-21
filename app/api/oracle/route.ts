import { NextRequest, NextResponse } from "next/server";
import {
  GROQ_TIMEOUT_MS,
  groqJsonCall,
  isGroqConfigured,
} from "@/lib/groq";
import type { OracleResponse, RecommendedAction } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST /api/oracle
 * Pillar 2 — OracleChat (Internal advisor).
 *
 * v4 — final optimized:
 *   - Identity / greeting questions → friendly intro JSON, score 0.
 *   - Internal data is injected as a clear, structured summary block.
 *   - Data-quality cap: score is hard-capped server-side based on the Vault
 *     snapshot so the model can't claim 80+ on a 1-row PDF.
 */
export async function POST(req: NextRequest) {
  let body: {
    question?: string;
    businessName?: string;
    industry?: string;
    internalContext?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const question = (body.question || "").toString().trim();
  if (!question) {
    return NextResponse.json(
      { error: "A question is required." },
      { status: 400 },
    );
  }

  if (!isGroqConfigured()) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const isIdentity = isIdentityQuestion(question);
  const dataQuality = assessDataQuality(body.internalContext);
  const internalBlock = buildInternalContextBlock(
    body.internalContext,
    dataQuality,
  );

  const userPrompt = `MODE: Internal (Vanguard Mode — Oracle Chat)

BUSINESS: ${body.businessName || "Unspecified"}
INDUSTRY: ${body.industry || "Unspecified"}
QUESTION CLASS: ${isIdentity ? "IDENTITY / GREETING" : "OPERATIONAL / STRATEGIC"}
DATA QUALITY: ${dataQuality.label}${
    dataQuality.scoreCap < 100
      ? ` (futureProofScore must NOT exceed ${dataQuality.scoreCap})`
      : ""
  }
DATA QUALITY REASON: ${dataQuality.reason}

${internalBlock}

OPERATOR QUESTION:
"""
${question}
"""

INSTRUCTIONS:
${
  isIdentity
    ? `- This is an identity / greeting question.
- Set "futureProofScore" = 0, "scoreVerdict" = "Awaiting Input".
- Set "businessName" = "NEXUS AI Oracle", "industry" = "Not provided".
- "survivabilityStatement": one warm sentence about what NEXUS AI does.
- "threat_summary": friendly NEXUS AI introduction (2 sentences).
- "quantified_impact": "Awaiting your data."
- "aiDisruptionRisks": empty array.
- "marketSignals.threats" / "marketSignals.opportunities": empty arrays.
- "recommended_actions": ONE onboarding entry guiding the operator to upload sales / inventory / suppliers / contracts to The Vault. timeline = "0-5 minutes".`
    : `- Use ONLY the Vault snapshot above. Quote SPECIFIC numbers, SKUs, supplier names, and revenue figures from it VERBATIM.
- DO NOT invent ₹ amounts, customer counts, supplier names, market sizes, or competitor names not in the snapshot.
- If the data is too thin to draw a quantified conclusion, SAY SO honestly. Use qualitative language ("low / moderate / high impact") instead of fake ₹ figures.
- DATA QUALITY rule: if "Insufficient" or "Limited", futureProofScore < 45 AND state that clearly in survivabilityStatement.
- "recommended_actions": 3-6 prioritized actions with realistic expected_impact and concrete timelines (30 / 60 / 90 days, 6 months). For EACH action also set "priority" (P0 = do now, P1 = next, P2 = later) and "effort" (Low / Medium / High).
- "key_metric": name the SINGLE KPI the operator should watch next (e.g. "Gross margin %", "Cash conversion cycle", "Top-supplier concentration"). Pull it from the data when possible.
- "confidence": your confidence in this analysis given the data quality (Low / Medium / High).
- It is OK and PREFERRED to leave "aiDisruptionRisks" or "marketSignals" arrays empty if you cannot ground them. The UI hides empty sections.`
}

OUTPUT: ONE JSON object, schema-exact (per system prompt). No prose, no markdown fences, no commentary.`;

  let parsed: Record<string, unknown>;
  try {
    parsed = (await Promise.race([
      groqJsonCall({
        userContent: userPrompt,
        temperature: isIdentity ? 0.2 : dataQuality.scoreCap < 50 ? 0.25 : 0.3,
        maxRetries: 1,
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Groq request timed out (60s).")),
          GROQ_TIMEOUT_MS,
        ),
      ),
    ])) as Record<string, unknown>;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Groq error.";
    return NextResponse.json(
      { error: `Oracle failed: ${message}` },
      { status: 502 },
    );
  }

  // Enforce the data-quality score cap server-side.
  const rawScore =
    typeof parsed.futureProofScore === "number"
      ? clamp0to100(parsed.futureProofScore as number)
      : isIdentity
        ? 0
        : undefined;
  const finalScore =
    typeof rawScore === "number"
      ? Math.min(rawScore, dataQuality.scoreCap)
      : undefined;

  const oracle: OracleResponse = {
    threat_summary:
      typeof parsed.threat_summary === "string" && parsed.threat_summary.trim()
        ? (parsed.threat_summary as string)
        : isIdentity
          ? "I am NEXUS AI Oracle — your data-grounded C-suite strategist for Indian SMEs in 2026. Upload data to The Vault and ask me anything; I quantify only what I can ground."
          : dataQuality.scoreCap < 50
            ? "Limited data provided. The Vault snapshot is too thin to draw confident, quantified conclusions."
            : "",
    quantified_impact:
      typeof parsed.quantified_impact === "string" &&
      parsed.quantified_impact.trim()
        ? (parsed.quantified_impact as string)
        : isIdentity
          ? "Awaiting your data."
          : dataQuality.scoreCap < 50
            ? "Insufficient real business data — impact cannot be quantified."
            : "",
    recommended_actions: normalizeActions(
      parsed.recommended_actions,
      isIdentity,
    ),
    reasoning_steps: normalizeStringArray(parsed.reasoning_steps),
    scoreVerdict:
      typeof parsed.scoreVerdict === "string"
        ? (parsed.scoreVerdict as string)
        : isIdentity
          ? "Awaiting Input"
          : dataQuality.scoreCap < 50
            ? "Insufficient Data"
            : undefined,
    futureProofScore: finalScore,
    key_metric:
      !isIdentity &&
      typeof parsed.key_metric === "string" &&
      parsed.key_metric.trim()
        ? (parsed.key_metric as string)
        : undefined,
    confidence: normalizeConfidence(parsed.confidence),
  };

  return NextResponse.json({ oracle, dataQuality: dataQuality.label });
}

// ---------------------------------------------------------------------------
// Identity / smalltalk detection
// ---------------------------------------------------------------------------

function isIdentityQuestion(q: string): boolean {
  const s = q.toLowerCase().trim();
  if (s.length <= 3) return true;
  const patterns = [
    /^(hi|hello|hey|yo|namaste|hola)\b/,
    /\bwho are you\b/,
    /\bwhat are you\b/,
    /\bwhat (can|do) you (do|help)/,
    /\bintroduce yourself\b/,
    /\bnexus ai\?\s*$/,
    /^(test|testing)$/,
  ];
  return patterns.some((p) => p.test(s));
}

// ---------------------------------------------------------------------------
// Data quality
// ---------------------------------------------------------------------------

type DataQuality = {
  label: "None" | "Insufficient" | "Limited" | "Adequate" | "Strong";
  scoreCap: number;
  reason: string;
  totalRows: number;
  datasets: number;
};

function assessDataQuality(ctx: unknown): DataQuality {
  if (!ctx || (Array.isArray(ctx) && (ctx as unknown[]).length === 0)) {
    return {
      label: "None",
      scoreCap: 50,
      reason: "No internal data has been uploaded to The Vault yet.",
      totalRows: 0,
      datasets: 0,
    };
  }

  if (!Array.isArray(ctx)) {
    return {
      label: "Limited",
      scoreCap: 45,
      reason: "Context provided but not as a structured datasets array.",
      totalRows: 0,
      datasets: 1,
    };
  }

  type Item = {
    type?: string;
    filename?: string;
    rowCount?: number;
    totals?: Record<string, unknown>;
    sample?: Record<string, unknown>[];
  };
  const items = ctx as Item[];
  const datasets = items.length;
  const totalRows = items.reduce(
    (sum, x) => sum + (typeof x?.rowCount === "number" ? x.rowCount : 0),
    0,
  );
  const distinctTypes = new Set(
    items.map((x) => (x?.type || "unknown").toLowerCase()),
  ).size;

  if (totalRows <= 1) {
    return {
      label: "Insufficient",
      scoreCap: 35,
      reason: `Only ${totalRows} usable row(s) across ${datasets} file(s) — likely a PDF excerpt or empty CSV.`,
      totalRows,
      datasets,
    };
  }
  if (totalRows < 25) {
    return {
      label: "Limited",
      scoreCap: 50,
      reason: `Only ${totalRows} rows across ${datasets} file(s) — too thin for confident quantification.`,
      totalRows,
      datasets,
    };
  }
  if (totalRows < 200 || distinctTypes < 2) {
    return {
      label: "Adequate",
      scoreCap: 75,
      reason: `${totalRows} rows across ${datasets} file(s), ${distinctTypes} distinct dataset type(s).`,
      totalRows,
      datasets,
    };
  }
  return {
    label: "Strong",
    scoreCap: 90,
    reason: `${totalRows} rows across ${datasets} file(s), ${distinctTypes} distinct dataset types — solid grounding.`,
    totalRows,
    datasets,
  };
}

// ---------------------------------------------------------------------------
// Internal-context block
// ---------------------------------------------------------------------------

function buildInternalContextBlock(ctx: unknown, dq: DataQuality): string {
  if (dq.label === "None") {
    return "INTERNAL DATA SNAPSHOT (Vault): (none uploaded yet — operator has not loaded any sales / inventory / suppliers / contracts. Treat operational claims as ungrounded.)";
  }

  let block = `INTERNAL DATA SUMMARY (Vault) — quote these values verbatim, never fabricate beyond them:
- Datasets uploaded: ${dq.datasets}
- Total rows: ${dq.totalRows}
- Data quality: ${dq.label}
- Note: ${dq.reason}\n`;

  if (Array.isArray(ctx)) {
    type Item = {
      type?: string;
      filename?: string;
      rowCount?: number;
      totals?: Record<string, unknown>;
      sample?: Record<string, unknown>[];
    };
    (ctx as Item[]).forEach((item, i) => {
      block += `\n[${i + 1}] ${(item?.type || "data").toUpperCase()} — ${
        item?.filename || "—"
      } (${item?.rowCount ?? 0} rows)\n`;
      if (item?.totals && Object.keys(item.totals).length > 0) {
        block += `    Totals: ${JSON.stringify(item.totals)}\n`;
      }
      if (Array.isArray(item?.sample) && item.sample.length > 0) {
        const trimmed = item.sample
          .slice(0, 5)
          .map((row) => JSON.stringify(row))
          .join("\n      ");
        block += `    First rows:\n      ${trimmed}\n`;
      } else {
        block += `    First rows: (no parsed rows — likely PDF excerpt or unstructured text)\n`;
      }
    });
  } else {
    block += `\nRaw context: ${JSON.stringify(ctx).slice(0, 4000)}`;
  }

  return block.length > 6000
    ? `${block.slice(0, 6000)}\n... [truncated]`
    : block;
}

// ---------------------------------------------------------------------------
// Sanitizers
// ---------------------------------------------------------------------------

function normalizeActions(
  input: unknown,
  isIdentity: boolean,
): RecommendedAction[] {
  if (!Array.isArray(input)) {
    return isIdentity ? [identityFallbackAction()] : [];
  }
  const actions = input
    .map((x) => {
      const o = (x || {}) as Partial<RecommendedAction>;
      const action: RecommendedAction = {
        action: typeof o.action === "string" ? o.action : "",
        rationale: typeof o.rationale === "string" ? o.rationale : "",
        expected_impact:
          typeof o.expected_impact === "string" ? o.expected_impact : "",
        timeline: typeof o.timeline === "string" ? o.timeline : "",
      };
      // Optional triage fields — only carried through when the model returns a valid enum.
      if (o.priority === "P0" || o.priority === "P1" || o.priority === "P2") {
        action.priority = o.priority;
      }
      if (o.effort === "Low" || o.effort === "Medium" || o.effort === "High") {
        action.effort = o.effort;
      }
      return action;
    })
    .filter((a) => a.action.length > 0);
  if (actions.length === 0 && isIdentity) {
    return [identityFallbackAction()];
  }
  return actions;
}

function identityFallbackAction(): RecommendedAction {
  return {
    action: "Upload your business data to The Vault",
    rationale:
      "I run a quantified, data-grounded analysis the moment you load CSV / PDF for sales, inventory, suppliers or contracts.",
    expected_impact:
      "Unlocks an Internal Resilience Scan + ranked actions in seconds.",
    timeline: "0-5 minutes",
  };
}

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0,
  );
}

function normalizeConfidence(
  v: unknown,
): "Low" | "Medium" | "High" | undefined {
  return v === "Low" || v === "Medium" || v === "High" ? v : undefined;
}

function clamp0to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
