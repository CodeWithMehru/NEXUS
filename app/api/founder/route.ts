import { NextRequest, NextResponse } from "next/server";
import {
  FOUNDER_SYSTEM_PROMPT,
  GROQ_TIMEOUT_MS,
  groqJsonCall,
  isGroqConfigured,
} from "@/lib/groq";
import type {
  FounderAiLeverage,
  FounderFundingStrategy,
  FounderLeanRoadmap,
  FounderReport,
  FounderResource,
  FounderRiskFlag,
  FounderStage,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST /api/founder
 * Pillar 3 — Young Founder Mode ("Brains of Tomorrow").
 *
 * Body: { idea: string, stage?: FounderStage }
 * Returns: { report: FounderReport, inputQuality }
 *
 * Mirrors /api/analyze-external: detect placeholder/gibberish input → force a
 * low validationScore, otherwise produce a grounded, stage-aware founder
 * playbook. No persistence (no founder table; never reuse the NexusReport
 * column).
 */
export async function POST(req: NextRequest) {
  let body: { idea?: string; stage?: FounderStage } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const idea = (body.idea || "").toString().trim();
  if (!idea) {
    return NextResponse.json(
      { error: "A startup idea is required." },
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

  const stage = normalizeStage(body.stage);
  const isPlaceholder = looksLikePlaceholder(idea);
  const userPrompt = buildFounderPrompt(idea, stage, isPlaceholder);

  let report: FounderReport;
  try {
    const result = (await Promise.race([
      groqJsonCall({
        userContent: userPrompt,
        systemPrompt: FOUNDER_SYSTEM_PROMPT,
        temperature: isPlaceholder ? 0.15 : 0.35,
        maxRetries: 1,
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Groq request timed out (60s).")),
          GROQ_TIMEOUT_MS,
        ),
      ),
    ])) as Partial<FounderReport>;

    report = sanitizeFounderReport(result, idea, stage, isPlaceholder);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Groq error.";
    return NextResponse.json(
      { error: `Founder analysis failed: ${message}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    report,
    inputQuality: isPlaceholder ? "placeholder" : "ok",
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STAGES: FounderStage[] = ["Idea", "Prototype", "Early Revenue", "Scaling"];

function normalizeStage(s: unknown): FounderStage {
  return typeof s === "string" && (STAGES as string[]).includes(s)
    ? (s as FounderStage)
    : "Idea";
}

/**
 * looksLikePlaceholder — cheap guard so "asdf" / "test" / a single word can't
 * mint a high validation score. Mirrors the spirit of analyze-external's
 * input-quality assessment, kept lightweight here.
 */
function looksLikePlaceholder(idea: string): boolean {
  const lower = idea.toLowerCase().trim();
  const PLACEHOLDERS = new Set([
    "test",
    "testing",
    "asdf",
    "qwerty",
    "abc",
    "abcd",
    "xyz",
    "foo",
    "bar",
    "lorem",
    "ipsum",
    "demo",
    "sample",
    "idea",
    "startup",
    "app",
    "business",
  ]);
  if (PLACEHOLDERS.has(lower)) return true;
  // Too short to describe a real idea, or keyboard-mash with no vowels.
  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length < 2 && lower.length < 12) return true;
  if (/^[a-z]{2,12}$/.test(lower) && !/[aeiou]/.test(lower)) return true;
  return false;
}

function buildFounderPrompt(
  idea: string,
  stage: FounderStage,
  isPlaceholder: boolean,
): string {
  const placeholderBlock = isPlaceholder
    ? `
INPUT LOOKS LIKE A PLACEHOLDER / TOO THIN:
- Set "validationScore" between 0 and 29.
- Set "verdict" to "Needs a real idea".
- "marketSnapshot": one honest line asking the founder to describe the problem, who it's for, and why now.
- "oneLinePitch": leave as a gentle prompt to refine the idea.
- Keep all arrays empty EXCEPT "leanRoadmap.week1to2", which should contain ONE step: "Write a one-paragraph problem statement: who hurts, how badly, and what they do today."`
    : `
THIS IS A REAL IDEA:
- Score honestly. 60-80 only for a clear problem + reachable customer + a wedge. 40-60 for promising-but-unvalidated. 30-45 for vague/crowded.
- Be specific to THIS idea and stage. No generic startup platitudes.
- Every roadmap step must be something a student founder can start this week with little/no money.`;

  return `MODE: Young Founder (Pillar 3 — Brains of Tomorrow)

STARTUP IDEA: ${idea}
STAGE: ${stage}

CONTEXT:
- Year: 2026. Founder is a student or first-time founder, likely in India.
- Reference Startup India / DPIIT, MSME schemes, college / IIT / state incubators, ONDC, UPI, free/cheap AI tools — ONLY when genuinely relevant.
- Do NOT invent market sizes (₹ Cr / $ Bn), funding amounts, or fake traction.

YOUR JOB:
Produce an honest, lean, stage-aware founder playbook for the idea above. Motivating but never hype. Leave any field empty rather than fabricate.
${placeholderBlock}

OUTPUT: ONE JSON object, schema-exact (per system prompt). No prose, no markdown fences, no commentary.`;
}

// ---------------------------------------------------------------------------
// Sanitizer
// ---------------------------------------------------------------------------

function sanitizeFounderReport(
  raw: Partial<FounderReport>,
  fallbackIdea: string,
  stage: FounderStage,
  isPlaceholder: boolean,
): FounderReport {
  const r = (raw || {}) as Partial<FounderReport>;

  let score = clamp0to100(Number(r.validationScore ?? 0));
  if (isPlaceholder && score > 29) score = 29;

  const lr: Partial<FounderLeanRoadmap> = r.leanRoadmap || {};
  const fs: Partial<FounderFundingStrategy> = r.fundingStrategy || {};

  return {
    idea: str(r.idea, fallbackIdea),
    stage: STAGES.includes(r.stage as FounderStage)
      ? (r.stage as FounderStage)
      : stage,
    validationScore: score,
    verdict: str(
      r.verdict,
      isPlaceholder ? "Needs a real idea" : verdictForValidation(score),
    ),
    oneLinePitch: str(r.oneLinePitch, ""),
    marketSnapshot: str(r.marketSnapshot, ""),
    riskFlags: Array.isArray(r.riskFlags)
      ? r.riskFlags
          .map((x) => sanitizeRiskFlag(x))
          .filter((x): x is FounderRiskFlag => x !== null)
      : [],
    leanRoadmap: {
      week1to2: arrStr(lr.week1to2),
      month1: arrStr(lr.month1),
      month3: arrStr(lr.month3),
    },
    fundingStrategy: {
      bootstrap: arrStr(fs.bootstrap),
      grantsAndCompetitions: arrStr(fs.grantsAndCompetitions),
      whenToRaise: str(fs.whenToRaise, ""),
    },
    aiLeverage: Array.isArray(r.aiLeverage)
      ? r.aiLeverage
          .map((x) => ({
            tool: str((x as FounderAiLeverage)?.tool, ""),
            useCase: str((x as FounderAiLeverage)?.useCase, ""),
          }))
          .filter((x) => x.tool.length > 0)
      : [],
    first10Customers: arrStr(r.first10Customers),
    metricsToTrack: arrStr(r.metricsToTrack),
    resources: Array.isArray(r.resources)
      ? r.resources
          .map((x) => ({
            title: str((x as FounderResource)?.title, ""),
            detail: str((x as FounderResource)?.detail, ""),
          }))
          .filter((x) => x.title.length > 0)
      : [],
  };
}

function sanitizeRiskFlag(x: unknown): FounderRiskFlag | null {
  const o = (x || {}) as Partial<FounderRiskFlag>;
  const risk = str(o.risk, "");
  if (!risk) return null;
  const severity =
    o.severity === "High" || o.severity === "Medium" || o.severity === "Low"
      ? o.severity
      : "Medium";
  return { risk, severity, mitigation: str(o.mitigation, "") };
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

function verdictForValidation(score: number): string {
  if (score >= 80) return "Strong — go build";
  if (score >= 60) return "Promising — validate fast";
  if (score >= 40) return "Worth a hard look";
  if (score >= 30) return "Risky — sharpen the wedge";
  return "Needs a real idea";
}
