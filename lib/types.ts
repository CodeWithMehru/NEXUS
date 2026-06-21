/**
 * NEXUS AI — Type definitions
 *
 * The NexusReport type mirrors the EXACT JSON contract enforced by the
 * Groq system prompt. Both External (Pillar 1) and Internal (Pillar 2 — Oracle)
 * responses obey this schema.
 */

export interface AIDisruptionRisk {
  function: string;
  riskPercent: number;
  reason: string;
}

export interface MarketSignals {
  threats: string[];
  opportunities: string[];
}

export interface WorkforceEvolution {
  atRiskRoles: string[];
  reskillingPaths: string[];
}

export interface OpportunityGap {
  title: string;
  description: string;
  revenueEstimate: string;
}

export interface ActionRoadmap {
  ninetyDays: string[];
  oneYear: string[];
  threeYears: string[];
}

export interface RecommendedAction {
  action: string;
  rationale: string;
  expected_impact: string;
  timeline: string;
  /** Optional triage priority — P0 (do now) → P2 (later). Backward-compatible. */
  priority?: "P0" | "P1" | "P2";
  /** Optional effort estimate to execute the action. Backward-compatible. */
  effort?: "Low" | "Medium" | "High";
}

/**
 * NexusReport — the canonical Oracle response shape.
 *
 * The CORE fields (always populated) are: businessName, industry,
 * futureProofScore, scoreVerdict, survivabilityStatement, threat_summary,
 * quantified_impact, aiDisruptionRisks, marketSignals, recommended_actions.
 *
 * The EXTENDED fields are optional — they may be populated when the model
 * has enough grounded context, otherwise the UI hides those sections.
 */
export interface NexusReport {
  businessName: string;
  industry: string;
  futureProofScore: number;
  scoreVerdict: string;
  survivabilityStatement: string;
  aiDisruptionRisks: AIDisruptionRisk[];
  marketSignals: MarketSignals;
  threat_summary: string;
  quantified_impact: string;
  recommended_actions: RecommendedAction[];

  // ---- Optional extended fields (rendered only when populated) ----
  workforceEvolution?: WorkforceEvolution;
  opportunityGaps?: OpportunityGap[];
  actionRoadmap?: ActionRoadmap;
  competitorMoves?: string[];
  regulatoryWatch?: string;
  reasoning_steps?: string[];

  // ---- Live web grounding (Pillar 1) — set after the Groq call ----
  /** Live web sources used to ground market signals (Tavily). Empty/undefined = AI-inferred. */
  sources?: { title: string; url: string }[];
  /** True when this report was grounded with live web search results. */
  groundedByWeb?: boolean;
}

// ----------------------------------------------------------------------------
// Database row types
// ----------------------------------------------------------------------------

export type InternalDataType = "sales" | "inventory" | "suppliers" | "contracts";
export type AlertSeverity = "Critical" | "High" | "Medium" | "Low";

export interface BusinessProfileRow {
  id: string;
  user_id: string | null;
  name: string | null;
  url: string | null;
  industry: string | null;
  external_report: NexusReport | null;
  future_proof_score: number | null;
  created_at: string;
}

export interface InternalDataRow {
  id: string;
  business_id: string | null;
  type: InternalDataType;
  data: Record<string, unknown>;
  uploaded_at: string;
}

export interface RiskAlertRow {
  id: string;
  business_id: string | null;
  title: string;
  severity: AlertSeverity;
  impact_score: number;
  recommendation: {
    summary?: string;
    actions?: string[];
  } | null;
  created_at: string;
}

export interface SimulationRow {
  id: string;
  business_id: string | null;
  scenario: string;
  before_metrics: ScenarioMetrics;
  after_metrics: ScenarioMetrics;
  ai_plan: ScenarioPlan;
  created_at: string;
}

// ----------------------------------------------------------------------------
// Scenario simulator
// ----------------------------------------------------------------------------

export interface ScenarioMetrics {
  revenue: number;
  margin: number;
  cashRunwayDays: number;
  customerRetention: number;
  supplyHealth: number;
}

export interface ScenarioPlan {
  headline: string;
  steps: { title: string; detail: string; horizon: string }[];
  riskDelta: number;
}

export type ScenarioKey =
  | "Red Sea Crisis"
  | "Raw Material Shortage"
  | "Demand Drop"
  | "Cyber Threat";

// ----------------------------------------------------------------------------
// OracleChat
// ----------------------------------------------------------------------------

export interface OracleResponse {
  threat_summary: string;
  quantified_impact: string;
  recommended_actions: RecommendedAction[];
  reasoning_steps?: string[];
  scoreVerdict?: string;
  futureProofScore?: number;
  /** Optional single KPI the operator should watch next. Backward-compatible. */
  key_metric?: string;
  /** Optional confidence in this analysis given the data quality. */
  confidence?: "Low" | "Medium" | "High";
}

// ----------------------------------------------------------------------------
// Young Founder Mode — startup-idea → structured founder playbook (Pillar 3)
// ----------------------------------------------------------------------------

export type FounderStage = "Idea" | "Prototype" | "Early Revenue" | "Scaling";

export interface FounderRiskFlag {
  risk: string;
  severity: "High" | "Medium" | "Low";
  mitigation: string;
}

export interface FounderLeanRoadmap {
  week1to2: string[];
  month1: string[];
  month3: string[];
}

export interface FounderFundingStrategy {
  bootstrap: string[];
  grantsAndCompetitions: string[];
  whenToRaise: string;
}

export interface FounderAiLeverage {
  tool: string;
  useCase: string;
}

export interface FounderResource {
  title: string;
  detail: string;
}

/**
 * FounderReport — the canonical Young Founder Mode response shape.
 *
 * validationScore reuses the 0–100 scoreColor bands so ScoreRing renders it
 * unchanged. Every array may be empty when the model cannot ground it; the UI
 * hides empty sections (same philosophy as NexusReport).
 */
export interface FounderReport {
  idea: string;
  stage: FounderStage;
  validationScore: number;
  verdict: string;
  oneLinePitch: string;
  marketSnapshot: string;
  riskFlags: FounderRiskFlag[];
  leanRoadmap: FounderLeanRoadmap;
  fundingStrategy: FounderFundingStrategy;
  aiLeverage: FounderAiLeverage[];
  first10Customers: string[];
  metricsToTrack: string[];
  resources: FounderResource[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "oracle";
  content: string;
  payload?: OracleResponse;
  ts: string;
}
