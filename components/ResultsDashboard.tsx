"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  ChevronRight,
  Eye,
  ExternalLink,
  FileDown,
  Gavel,
  Globe,
  Lightbulb,
  RotateCcw,
  Shield,
  Sparkles,
  Sparkle,
  Swords,
  TrendingUp,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ActionRoadmap from "@/components/ActionRoadmap";
import RiskBars from "@/components/RiskBars";
import ScoreRing from "@/components/ScoreRing";
import { scoreColor } from "@/lib/utils";
import type { NexusReport } from "@/lib/types";

interface ResultsDashboardProps {
  report: NexusReport;
  onReset: () => void;
  onOpenCommandCenter?: () => void;
}

/**
 * ResultsDashboard — Pillar 1 (External) results screen.
 *
 * Hides empty sections gracefully. With the v4 minimal schema, the model only
 * returns the CORE fields by default — workforceEvolution / opportunityGaps /
 * actionRoadmap / competitorMoves / regulatoryWatch are optional and only
 * render when populated.
 */
export function ResultsDashboard({
  report,
  onReset,
  onOpenCommandCenter,
}: ResultsDashboardProps) {
  const verdict = scoreColor(report.futureProofScore);
  const [confirmReset, setConfirmReset] = React.useState(false);

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  function handleResetClick() {
    if (confirmReset) {
      onReset();
    } else {
      setConfirmReset(true);
      window.setTimeout(() => setConfirmReset(false), 3000);
    }
  }

  // ---- Section presence flags --------------------------------------------
  const hasThreatSummary = nonEmpty(report.threat_summary);
  const hasQuantImpact = nonEmpty(report.quantified_impact);
  const hasSurvCard = hasThreatSummary || hasQuantImpact;

  const aiRisks = report.aiDisruptionRisks || [];
  const hasAiRisks = aiRisks.length > 0;

  const atRiskRoles = report.workforceEvolution?.atRiskRoles || [];
  const reskillingPaths = report.workforceEvolution?.reskillingPaths || [];
  const hasWorkforce = atRiskRoles.length > 0 || reskillingPaths.length > 0;

  const threats = report.marketSignals?.threats || [];
  const opportunities = report.marketSignals?.opportunities || [];
  const hasThreats = threats.length > 0;
  const hasOpportunities = opportunities.length > 0;

  const opportunityGaps = report.opportunityGaps || [];
  const hasGaps = opportunityGaps.length > 0;

  const ninetyDays = report.actionRoadmap?.ninetyDays || [];
  const oneYear = report.actionRoadmap?.oneYear || [];
  const threeYears = report.actionRoadmap?.threeYears || [];
  const hasRoadmap =
    ninetyDays.length > 0 || oneYear.length > 0 || threeYears.length > 0;

  const recommended = report.recommended_actions || [];
  const hasActions = recommended.length > 0;

  const competitorMoves = report.competitorMoves || [];
  const hasCompetitors = competitorMoves.length > 0;

  const hasRegulatory = nonEmpty(report.regulatoryWatch);

  const noContent =
    !hasSurvCard &&
    !hasAiRisks &&
    !hasWorkforce &&
    !hasThreats &&
    !hasOpportunities &&
    !hasGaps &&
    !hasRoadmap &&
    !hasActions &&
    !hasCompetitors &&
    !hasRegulatory;

  return (
    <div className="relative w-full pb-24">
      {/* Header / actions ----------------------------------------------------- */}
      <div className="no-print sticky top-0 z-30 -mx-4 mb-6 border-b border-nexus-border/60 bg-nexus-bg/80 px-4 py-4 backdrop-blur-xl">
        <div className="container flex flex-wrap items-center justify-between gap-3 px-0">
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-nexus-muted md:inline">
              External Intelligence · Pillar 1 · NEXUS Mode
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="gap-2"
            >
              <FileDown size={14} />
              Export PDF
            </Button>
            {onOpenCommandCenter && (
              <Button size="sm" onClick={onOpenCommandCenter} className="gap-2">
                Open Command Center
                <ChevronRight size={14} />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetClick}
              className={
                confirmReset
                  ? "gap-2 border-accent-red bg-accent-red/15 text-accent-red hover:bg-accent-red/20 hover:text-accent-red"
                  : "gap-2 border-accent-red/40 text-accent-red hover:bg-accent-red/10 hover:text-accent-red hover:border-accent-red/70"
              }
            >
              <RotateCcw size={14} />
              {confirmReset ? "Click again to confirm" : "New Analysis"}
            </Button>
          </div>
        </div>
      </div>

      {/* Headline ------------------------------------------------------------- */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="section-eyebrow mb-2">FutureProof Report</div>
        <h1 className="font-display text-3xl font-bold leading-tight md:text-5xl">
          {report.businessName}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-nexus-muted">
          {nonEmpty(report.industry) && report.industry !== "Not provided" && (
            <Badge variant="outline" className="border-nexus-border">
              {report.industry}
            </Badge>
          )}
          {nonEmpty(report.scoreVerdict) && (
            <>
              {nonEmpty(report.industry) &&
                report.industry !== "Not provided" && <span>·</span>}
              <span style={{ color: verdict.hex }} className="font-semibold">
                {report.scoreVerdict}
              </span>
            </>
          )}
          {report.groundedByWeb ? (
            <Badge
              variant="green"
              className="gap-1.5"
              title="Market signals grounded in live web search (Tavily)"
            >
              <Globe size={11} />
              Grounded by live web search
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1.5 border-nexus-border text-nexus-muted"
              title="No web search key configured — signals are AI-inferred"
            >
              <Sparkle size={11} />
              AI-inferred · live search optional
            </Badge>
          )}
        </div>
      </motion.section>

      {/* Score + survivability ----------------------------------------------- */}
      <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardContent className="flex items-center justify-center p-8">
            <ScoreRing score={report.futureProofScore} size={260} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles size={16} className="text-accent-blue" />
              Survivability Statement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            {nonEmpty(report.survivabilityStatement) && (
              <p className="text-base leading-relaxed text-nexus-text">
                {report.survivabilityStatement}
              </p>
            )}

            {hasSurvCard && (
              <div
                className={
                  hasThreatSummary && hasQuantImpact
                    ? "grid grid-cols-1 gap-3 md:grid-cols-2"
                    : "grid grid-cols-1 gap-3"
                }
              >
                {hasThreatSummary && (
                  <div className="rounded-xl border border-accent-red/30 bg-accent-red/5 p-4">
                    <div className="section-eyebrow text-accent-red">
                      Threat Summary
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed">
                      {report.threat_summary}
                    </p>
                  </div>
                )}
                {hasQuantImpact && (
                  <div className="rounded-xl border border-accent-orange/30 bg-accent-orange/5 p-4">
                    <div className="section-eyebrow text-accent-orange">
                      Quantified Impact
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed">
                      {report.quantified_impact}
                    </p>
                  </div>
                )}
              </div>
            )}

            {noContent && (
              <div className="rounded-xl border border-dashed border-nexus-border/60 bg-nexus-card/40 p-4 text-sm leading-relaxed text-nexus-muted">
                Limited grounded data for this target. Enter a real business
                name or open the Command Center and upload internal data to The
                Vault for a richer report.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* AI Disruption Risks + Workforce ------------------------------------ */}
      {(hasAiRisks || hasWorkforce) && (
        <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {hasAiRisks && (
            <Card
              className={hasWorkforce ? "lg:col-span-7" : "lg:col-span-12"}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-accent-orange" />
                  AI Disruption Risks by Function
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RiskBars risks={aiRisks} />
              </CardContent>
            </Card>
          )}

          {hasWorkforce && (
            <Card className={hasAiRisks ? "lg:col-span-5" : "lg:col-span-12"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users size={16} className="text-accent-blue" />
                  Workforce Evolution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {atRiskRoles.length > 0 && (
                  <div>
                    <div className="section-eyebrow mb-2 text-accent-red">
                      At-Risk Roles
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {atRiskRoles.map((r, i) => (
                        <Badge
                          key={`${r}-${i}`}
                          variant="red"
                          className="font-normal"
                        >
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {reskillingPaths.length > 0 && (
                  <div>
                    <div className="section-eyebrow mb-2 text-accent-green">
                      Reskilling Paths
                    </div>
                    <ul className="space-y-2 text-sm">
                      {reskillingPaths.map((r, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-green" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Market Signals ------------------------------------------------------ */}
      {(hasThreats || hasOpportunities) && (
        <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {hasThreats && (
            <Card className={!hasOpportunities ? "md:col-span-2" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield size={16} className="text-accent-red" />
                  Market Threats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 text-sm">
                  {threats.map((t, i) => (
                    <li
                      key={i}
                      className="flex gap-3 rounded-lg border border-accent-red/15 bg-accent-red/5 p-3 leading-relaxed"
                    >
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-accent-red" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {hasOpportunities && (
            <Card className={!hasThreats ? "md:col-span-2" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-accent-green" />
                  Market Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 text-sm">
                  {opportunities.map((o, i) => (
                    <li
                      key={i}
                      className="flex gap-3 rounded-lg border border-accent-green/15 bg-accent-green/5 p-3 leading-relaxed"
                    >
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-accent-green" />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Opportunity Gaps ---------------------------------------------------- */}
      {hasGaps && (
        <section className="mb-8">
          <div className="section-eyebrow mb-3">Opportunity Gaps</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {opportunityGaps.map((g, i) => (
              <Card key={i} className="glass-card-hover">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Lightbulb size={16} className="text-accent-yellow" />
                    {nonEmpty(g.revenueEstimate) && (
                      <Badge variant="yellow">{g.revenueEstimate}</Badge>
                    )}
                  </div>
                  <h4 className="mb-1.5 font-display text-base font-semibold">
                    {g.title}
                  </h4>
                  {nonEmpty(g.description) && (
                    <p className="text-sm leading-relaxed text-nexus-muted">
                      {g.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Action Roadmap ------------------------------------------------------ */}
      {hasRoadmap && report.actionRoadmap && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="section-eyebrow">Action Roadmap</div>
              <h3 className="font-display text-xl font-semibold">
                90 days · 1 year · 3 years
              </h3>
            </div>
          </div>
          <ActionRoadmap roadmap={report.actionRoadmap} />
        </section>
      )}

      {/* Recommended actions ------------------------------------------------- */}
      {hasActions && (
        <section className="mb-8">
          <div className="section-eyebrow mb-3">Recommended Actions</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {recommended.map((a, i) => (
              <Card key={i} className="glass-card-hover">
                <CardContent className="p-5">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h4 className="font-display text-base font-semibold leading-snug">
                      {a.action}
                    </h4>
                    {nonEmpty(a.timeline) && (
                      <Badge variant="default" className="shrink-0">
                        {a.timeline}
                      </Badge>
                    )}
                  </div>
                  {nonEmpty(a.rationale) && (
                    <p className="mb-3 text-sm leading-relaxed text-nexus-muted">
                      {a.rationale}
                    </p>
                  )}
                  {nonEmpty(a.expected_impact) && (
                    <div className="rounded-lg border border-accent-green/30 bg-accent-green/5 p-2.5 text-xs">
                      <span className="section-eyebrow text-accent-green">
                        Expected Impact
                      </span>
                      <p className="mt-1 text-nexus-text">
                        {a.expected_impact}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Competitor moves + regulatory -------------------------------------- */}
      {(hasCompetitors || hasRegulatory) && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {hasCompetitors && (
            <Card
              className={hasRegulatory ? "lg:col-span-7" : "lg:col-span-12"}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Swords size={16} className="text-accent-orange" />
                  Competitor Moves
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 text-sm">
                  {competitorMoves.map((c, i) => (
                    <li
                      key={i}
                      className="flex gap-3 rounded-lg border border-nexus-border bg-nexus-card/40 p-3 leading-relaxed"
                    >
                      <Briefcase
                        size={14}
                        className="mt-0.5 shrink-0 text-accent-orange"
                      />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {hasRegulatory && (
            <Card
              className={hasCompetitors ? "lg:col-span-5" : "lg:col-span-12"}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel size={16} className="text-accent-blue" />
                  Regulatory Watch
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-nexus-text">
                  {report.regulatoryWatch}
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Sources (live web grounding) --------------------------------------- */}
      {report.sources && report.sources.length > 0 && (
        <section className="mt-8">
          <div className="section-eyebrow mb-3 flex items-center gap-2">
            <Globe size={14} className="text-accent-green" />
            Sources · Live Web Grounding
          </div>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {report.sources.map((s, i) => (
              <li key={i}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 rounded-lg border border-nexus-border bg-nexus-card/40 p-3 text-sm leading-snug text-nexus-text transition-colors hover:border-accent-green/50 hover:bg-nexus-hover/40"
                >
                  <ExternalLink
                    size={14}
                    className="mt-0.5 shrink-0 text-accent-green"
                  />
                  <span className="min-w-0">
                    <span className="line-clamp-1 font-medium">{s.title}</span>
                    <span className="line-clamp-1 text-xs text-nexus-muted">
                      {s.url}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Footer CTA row ------------------------------------------------------ */}
      <div className="no-print mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {onOpenCommandCenter && (
          <Button size="xl" onClick={onOpenCommandCenter} className="gap-2">
            <Eye size={18} />
            Enter Command Center (Pillar 2)
            <ArrowRight size={18} />
          </Button>
        )}
        <Button
          size="xl"
          variant="outline"
          onClick={handleResetClick}
          className={
            confirmReset
              ? "gap-2 border-accent-red bg-accent-red/15 text-accent-red hover:bg-accent-red/20 hover:text-accent-red"
              : "gap-2 border-accent-red/40 text-accent-red hover:bg-accent-red/10 hover:text-accent-red hover:border-accent-red/70"
          }
        >
          <RotateCcw size={16} />
          {confirmReset
            ? "Click again to confirm"
            : "Reset & analyze new business"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function nonEmpty(s: string | null | undefined): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

export default ResultsDashboard;
