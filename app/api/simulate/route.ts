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
import type {
  ScenarioKey,
  ScenarioMetrics,
  ScenarioPlan,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST /api/simulate
 * Pillar 2 — Scenario Simulator.
 *
 * Body:
 *   {
 *     scenario: "Red Sea Crisis" | "Raw Material Shortage" | "Demand Drop" | "Cyber Threat",
 *     businessId?: string,
 *     businessName?: string,
 *     industry?: string,
 *     baseline?: ScenarioMetrics
 *   }
 *
 * Returns: { scenario, before, after, plan }
 */
export async function POST(req: NextRequest) {
  let body: {
    scenario?: ScenarioKey;
    businessId?: string;
    businessName?: string;
    industry?: string;
    baseline?: Partial<ScenarioMetrics>;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const scenario = body.scenario;
  const ALLOWED: ScenarioKey[] = [
    "Red Sea Crisis",
    "Raw Material Shortage",
    "Demand Drop",
    "Cyber Threat",
  ];
  if (!scenario || !ALLOWED.includes(scenario)) {
    return NextResponse.json(
      { error: "Invalid scenario." },
      { status: 400 },
    );
  }

  // Establish a deterministic baseline if not provided.
  const before: ScenarioMetrics = {
    revenue: clampNum(body.baseline?.revenue, 100),
    margin: clampNum(body.baseline?.margin, 22),
    cashRunwayDays: clampNum(body.baseline?.cashRunwayDays, 240),
    customerRetention: clampNum(body.baseline?.customerRetention, 88),
    supplyHealth: clampNum(body.baseline?.supplyHealth, 82),
  };

  let plan: ScenarioPlan;
  let after: ScenarioMetrics;

  if (isGroqConfigured()) {
    try {
      const userPrompt = `MODE: Internal (Vanguard Mode — Scenario Simulator)
BUSINESS: ${body.businessName || "Unspecified"}
INDUSTRY: ${body.industry || "Unspecified"}
SCENARIO: ${scenario}
BASELINE METRICS: ${JSON.stringify(before)}

Simulate the realistic 90-day impact of this scenario on the baseline. Then propose a mitigation plan.

Return ONLY a JSON object with this EXACT shape (do NOT use the canonical NEXUS schema this time — use the simulator-specific shape below):

{
  "after": {
    "revenue": number,            // index, 0-200, where 100 = baseline
    "margin": number,             // % points, 0-60
    "cashRunwayDays": number,     // days, 0-720
    "customerRetention": number,  // %, 0-100
    "supplyHealth": number        // 0-100 health index
  },
  "plan": {
    "headline": "string",
    "steps": [
      { "title": "string", "detail": "string", "horizon": "0-30 days" }
    ],
    "riskDelta": number    // negative = risk reduced, positive = risk grew
  }
}

Be quantitatively realistic. For "Red Sea Crisis", expect supplyHealth and margin to drop sharply. For "Demand Drop", expect revenue and cashRunwayDays to plunge. For "Raw Material Shortage", expect margin and supplyHealth to crater.

For "Cyber Threat" (targeted ransomware breach): expect customerRetention and revenue to fall sharply. The mitigation plan MUST contain at least 4 steps and MUST include India's regulatory clock: CERT-In incident reporting within 6 hours (IT Act §70B directions) and DPDP Act 2023 breach notification to the Data Protection Board and affected Data Principals. Also cover containment (force MFA + rotate all credentials), forensics/clean-backup recovery, and a customer-trust communications plan.`;

      const result = (await Promise.race([
        groqJsonCall({
          userContent: userPrompt,
          systemPrompt:
            "You are NEXUS AI Oracle — Scenario Simulator. Return only the simulator JSON shape requested.",
          temperature: 0.45,
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Groq request timed out (60s).")),
            GROQ_TIMEOUT_MS,
          ),
        ),
      ])) as { after?: Partial<ScenarioMetrics>; plan?: Partial<ScenarioPlan> };

      after = sanitizeMetrics(result.after, before, scenario);
      plan = sanitizePlan(result.plan, scenario);

      // Cyber Threat is a compliance-critical scenario: guarantee the full
      // CERT-In / DPDP Act response is shown even if the model returned a
      // thin plan. Fall back to the deterministic 4-step playbook.
      if (scenario === "Cyber Threat" && plan.steps.length < 4) {
        plan = deterministicSim(scenario, before).plan;
      }
    } catch {
      // Fallback to deterministic simulation if Groq is unavailable.
      ({ after, plan } = deterministicSim(scenario, before));
    }
  } else {
    ({ after, plan } = deterministicSim(scenario, before));
  }

  // Persist (best-effort)
  if (
    isSupabaseConfigured() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    body.businessId
  ) {
    try {
      const supabase = createSupabaseAdminClient();
      await supabase.from("simulations").insert({
        business_id: body.businessId,
        scenario,
        before_metrics: before,
        after_metrics: after,
        ai_plan: plan,
      });
    } catch {
      /* swallow */
    }
  }

  return NextResponse.json({ scenario, before, after, plan });
}

// ============================================================================
// Helpers
// ============================================================================

function clampNum(v: unknown, fallback: number, min = 0, max = 720): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function sanitizeMetrics(
  raw: Partial<ScenarioMetrics> | undefined,
  before: ScenarioMetrics,
  scenario: ScenarioKey,
): ScenarioMetrics {
  if (!raw) return deterministicSim(scenario, before).after;
  return {
    revenue: clampNum(raw.revenue, before.revenue, 0, 200),
    margin: clampNum(raw.margin, before.margin, 0, 60),
    cashRunwayDays: clampNum(raw.cashRunwayDays, before.cashRunwayDays, 0, 720),
    customerRetention: clampNum(
      raw.customerRetention,
      before.customerRetention,
      0,
      100,
    ),
    supplyHealth: clampNum(raw.supplyHealth, before.supplyHealth, 0, 100),
  };
}

function sanitizePlan(
  raw: Partial<ScenarioPlan> | undefined,
  scenario: ScenarioKey,
): ScenarioPlan {
  const fallback: ScenarioPlan = {
    headline: `Mitigation plan for ${scenario}`,
    steps: [
      {
        title: "Activate war-room",
        detail: "Convene a cross-functional crisis taskforce within 24 hours.",
        horizon: "0-7 days",
      },
      {
        title: "Diversify exposure",
        detail: "Reroute or hedge the affected operational dependency.",
        horizon: "0-30 days",
      },
      {
        title: "Communicate proactively",
        detail: "Brief customers and investors before the news cycle.",
        horizon: "0-14 days",
      },
    ],
    riskDelta: -8,
  };
  if (!raw) return fallback;

  const steps = Array.isArray(raw.steps)
    ? raw.steps
        .map((s) => ({
          title: typeof s?.title === "string" ? s.title : "Step",
          detail: typeof s?.detail === "string" ? s.detail : "",
          horizon: typeof s?.horizon === "string" ? s.horizon : "0-30 days",
        }))
        .filter((s) => s.title)
    : fallback.steps;

  return {
    headline:
      typeof raw.headline === "string" && raw.headline.length > 0
        ? raw.headline
        : fallback.headline,
    steps: steps.length ? steps : fallback.steps,
    riskDelta:
      typeof raw.riskDelta === "number" ? raw.riskDelta : fallback.riskDelta,
  };
}

/**
 * deterministicSim — local fallback so the simulator works without Groq.
 * Tuned to be visually meaningful in the bar chart.
 */
function deterministicSim(
  scenario: ScenarioKey,
  before: ScenarioMetrics,
): { after: ScenarioMetrics; plan: ScenarioPlan } {
  let multiplier: ScenarioMetrics;
  let plan: ScenarioPlan;

  switch (scenario) {
    case "Red Sea Crisis":
      multiplier = {
        revenue: 0.86,
        margin: 0.62,
        cashRunwayDays: 0.78,
        customerRetention: 0.94,
        supplyHealth: 0.45,
      };
      plan = {
        headline: "Reroute & hedge — pivot to alternative shipping corridors",
        steps: [
          {
            title: "Charter Cape-of-Good-Hope routing",
            detail:
              "Lock 90-day capacity with carriers that already moved off Suez to absorb 30% of priority freight.",
            horizon: "0-14 days",
          },
          {
            title: "Air-freight critical SKUs",
            detail:
              "Identify the top 8 SKUs that drive 60% of margin and air-freight them for 60 days.",
            horizon: "0-30 days",
          },
          {
            title: "Hedge fuel surcharge exposure",
            detail:
              "Take a 6-month fuel hedge to cap BAF/CAF surprises at +12%.",
            horizon: "30-60 days",
          },
        ],
        riskDelta: -14,
      };
      break;
    case "Raw Material Shortage":
      multiplier = {
        revenue: 0.92,
        margin: 0.55,
        cashRunwayDays: 0.84,
        customerRetention: 0.97,
        supplyHealth: 0.5,
      };
      plan = {
        headline: "Dual-source the bill of materials within 60 days",
        steps: [
          {
            title: "Qualify a second supplier",
            detail:
              "Run accelerated quality tests on 2 alternates for the top 5 critical inputs.",
            horizon: "0-45 days",
          },
          {
            title: "Reformulate where possible",
            detail:
              "Engage R&D to substitute scarce inputs in 20% of SKUs.",
            horizon: "30-90 days",
          },
          {
            title: "Pre-buy 90-day strategic inventory",
            detail:
              "Use a 3-month purchase order to lock pricing before the next shock.",
            horizon: "0-30 days",
          },
        ],
        riskDelta: -11,
      };
      break;
    case "Demand Drop":
      multiplier = {
        revenue: 0.72,
        margin: 0.78,
        cashRunwayDays: 0.65,
        customerRetention: 0.89,
        supplyHealth: 0.96,
      };
      plan = {
        headline: "Shrink to fight — protect cash, double-down on retention",
        steps: [
          {
            title: "Cut discretionary spend by 18%",
            detail:
              "Freeze hiring + travel; renegotiate top 10 SaaS contracts.",
            horizon: "0-30 days",
          },
          {
            title: "Launch a retention price tier",
            detail:
              "Offer existing customers a stripped-down plan at -25% to keep them on platform.",
            horizon: "0-14 days",
          },
          {
            title: "Convert fixed → variable cost",
            detail:
              "Move 25% of contractor spend to outcome-based contracts.",
            horizon: "30-90 days",
          },
        ],
        riskDelta: -9,
      };
      break;
    case "Cyber Threat":
    default:
      // Targeted ransomware breach — sharper hit on trust + revenue, plus a
      // compliance-grade 4-step response anchored on real India regulation.
      multiplier = {
        revenue: 0.72,
        margin: 0.82,
        cashRunwayDays: 0.8,
        customerRetention: 0.68,
        supplyHealth: 0.88,
      };
      plan = {
        headline:
          "Contain, report on India's regulatory clock, recover clean, rebuild trust",
        steps: [
          {
            title: "Contain + rotate everything (Hour 0–6)",
            detail:
              "Isolate affected systems, force hardware MFA on all privileged accounts, and rotate every cloud + DB credential and API key. Preserve forensic logs.",
            horizon: "0-1 days",
          },
          {
            title: "File CERT-In report within 6 hours",
            detail:
              "Report the incident to CERT-In within 6 hours as mandated by the IT Act §70B directions, and engage a Tier-1 incident-response firm on retainer.",
            horizon: "0-1 days",
          },
          {
            title: "DPDP Act 2023 breach notification",
            detail:
              "Notify the Data Protection Board of India and every affected Data Principal of the personal-data breach, with scope and remediation, per the DPDP Act 2023.",
            horizon: "0-3 days",
          },
          {
            title: "Recover clean + rebuild customer trust",
            detail:
              "Restore from verified clean backups (never pay the ransom blind), publish a transparency report, and offer 12 months of free credit/identity monitoring to affected users.",
            horizon: "3-14 days",
          },
        ],
        riskDelta: -16,
      };
      break;
  }

  const after: ScenarioMetrics = {
    revenue: round(before.revenue * multiplier.revenue),
    margin: round(before.margin * multiplier.margin),
    cashRunwayDays: round(before.cashRunwayDays * multiplier.cashRunwayDays),
    customerRetention: round(
      before.customerRetention * multiplier.customerRetention,
    ),
    supplyHealth: round(before.supplyHealth * multiplier.supplyHealth),
  };

  return { after, plan };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
