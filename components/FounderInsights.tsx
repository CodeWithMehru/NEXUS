"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Coins,
  Compass,
  FileDown,
  Gift,
  GraduationCap,
  Map,
  Megaphone,
  Quote,
  RotateCcw,
  Rocket,
  ShieldAlert,
  Sparkles,
  Wand2,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ScoreRing from "@/components/ScoreRing";
import { cn } from "@/lib/utils";
import type { FounderReport, FounderRiskFlag } from "@/lib/types";

interface FounderInsightsProps {
  report: FounderReport;
  onReset: () => void;
}

/** Resource-card accent rotation (blue/green/yellow) — no red (reads as danger). */
const RESOURCE_ACCENTS = ["#378ADD", "#1D9E75", "#EDC54B"];

/**
 * FounderInsights — Young Founder Mode results screen (Pillar 3).
 *
 * Mirrors ResultsDashboard: sticky header, ScoreRing (Validation Score), and a
 * set of sections that each hide gracefully when the model could not ground
 * them. Risk-flag colors use Badge variants directly (High/Medium/Low) — the
 * shared severityColor helper expects "Critical" and is not used here.
 */
export function FounderInsights({ report, onReset }: FounderInsightsProps) {
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

  const lr = report.leanRoadmap;
  const fs = report.fundingStrategy;

  const hasPitch = nonEmpty(report.oneLinePitch);
  const hasSnapshot = nonEmpty(report.marketSnapshot);
  const hasRisks = report.riskFlags.length > 0;
  const hasRoadmap =
    lr.week1to2.length > 0 || lr.month1.length > 0 || lr.month3.length > 0;
  const hasFunding =
    fs.bootstrap.length > 0 ||
    fs.grantsAndCompetitions.length > 0 ||
    nonEmpty(fs.whenToRaise);
  const hasAi = report.aiLeverage.length > 0;
  const hasCustomers = report.first10Customers.length > 0;
  const hasMetrics = report.metricsToTrack.length > 0;
  const hasResources = report.resources.length > 0;

  return (
    <div className="relative w-full pb-24">
      {/* Header / actions */}
      <div className="no-print sticky top-0 z-30 -mx-4 mb-6 border-b border-nexus-border/60 bg-nexus-bg/80 px-4 py-4 backdrop-blur-xl">
        <div className="container flex flex-wrap items-center justify-between gap-3 px-0">
          <div className="section-eyebrow flex items-center gap-2 text-accent-green">
            <Rocket size={14} />
            Young Founder Insights · Brains of Tomorrow
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
              {confirmReset ? "Click again to confirm" : "New Idea"}
            </Button>
          </div>
        </div>
      </div>

      {/* Headline */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="section-eyebrow mb-2">Founder Playbook</div>
        <h1 className="font-display text-2xl font-bold leading-tight md:text-4xl">
          {report.idea}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-nexus-muted">
          <Badge variant="outline" className="border-nexus-border">
            {report.stage} stage
          </Badge>
          {nonEmpty(report.verdict) && (
            <>
              <span>·</span>
              <span className="font-semibold text-accent-green">
                {report.verdict}
              </span>
            </>
          )}
        </div>
      </motion.section>

      {/* Score + pitch / snapshot */}
      <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardContent className="flex items-center justify-center p-8">
            <ScoreRing
              score={report.validationScore}
              size={240}
              label="Validation Score"
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Compass size={16} className="text-accent-blue" />
              Reality Check
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {hasPitch && (
              <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/5 p-4">
                <div className="section-eyebrow text-accent-blue">
                  One-Line Pitch
                </div>
                <p className="mt-1.5 flex gap-2 text-base leading-relaxed text-nexus-text">
                  <Quote size={16} className="mt-1 shrink-0 text-accent-blue" />
                  {report.oneLinePitch}
                </p>
              </div>
            )}
            {hasSnapshot && (
              <p className="text-sm leading-relaxed text-nexus-muted">
                {report.marketSnapshot}
              </p>
            )}
            {!hasPitch && !hasSnapshot && (
              <div className="rounded-xl border border-dashed border-nexus-border/60 bg-nexus-card/40 p-4 text-sm leading-relaxed text-nexus-muted">
                Describe the problem you&apos;re solving, who it&apos;s for, and
                why now — then run it again for a sharper playbook.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Risk flags */}
      {hasRisks && (
        <section className="mb-8">
          <div className="section-eyebrow mb-3 flex items-center gap-2">
            <ShieldAlert size={14} className="text-accent-orange" />
            Founder Risk Flags
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {report.riskFlags.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.4 }}
              >
                <Card className="glass-card-hover h-full transition-transform hover:-translate-y-0.5">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold leading-snug text-nexus-text">
                        {f.risk}
                      </h4>
                      <Badge
                        variant={severityVariant(f.severity)}
                        className="shrink-0"
                      >
                        {f.severity}
                      </Badge>
                    </div>
                    {nonEmpty(f.mitigation) && (
                      <p className="text-xs leading-relaxed text-nexus-muted">
                        <CheckCircle2
                          size={11}
                          className="mr-1 inline-block text-accent-green"
                        />
                        {f.mitigation}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Lean launch roadmap */}
      {hasRoadmap && (
        <section className="mb-8">
          <div className="mb-3">
            <div className="section-eyebrow flex items-center gap-2">
              <Map size={14} className="text-accent-green" />
              Lean Launch Roadmap
            </div>
            <h3 className="font-display text-xl font-semibold">
              2 weeks · 1 month · 3 months
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <RoadmapColumn
              title="Weeks 1–2"
              eyebrow="Validate"
              items={lr.week1to2}
              dot="#E24B4A"
              bgFrom="from-accent-red/10"
              ring="ring-accent-red/30"
              Icon={CalendarClock}
            />
            <RoadmapColumn
              title="Month 1"
              eyebrow="Build MVP"
              items={lr.month1}
              dot="#EF9F27"
              bgFrom="from-accent-orange/10"
              ring="ring-accent-orange/30"
              Icon={Wrench}
            />
            <RoadmapColumn
              title="Month 3"
              eyebrow="First Revenue"
              items={lr.month3}
              dot="#1D9E75"
              bgFrom="from-accent-green/10"
              ring="ring-accent-green/30"
              Icon={Rocket}
            />
          </div>
        </section>
      )}

      {/* Funding strategy + AI leverage */}
      {(hasFunding || hasAi) && (
        <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {hasFunding && (
            <Card className={hasAi ? "lg:col-span-7" : "lg:col-span-12"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins size={16} className="text-accent-yellow" />
                  Funding Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fs.bootstrap.length > 0 && (
                  <BulletGroup
                    label="Bootstrap First"
                    color="text-accent-green"
                    dot="#1D9E75"
                    items={fs.bootstrap}
                  />
                )}
                {fs.grantsAndCompetitions.length > 0 && (
                  <BulletGroup
                    label="Grants & Competitions"
                    color="text-accent-yellow"
                    dot="#EDC54B"
                    items={fs.grantsAndCompetitions}
                    Icon={Gift}
                  />
                )}
                {nonEmpty(fs.whenToRaise) && (
                  <div className="rounded-lg border border-accent-blue/30 bg-accent-blue/5 p-3 text-sm leading-relaxed">
                    <span className="section-eyebrow text-accent-blue">
                      When to Raise
                    </span>
                    <p className="mt-1 text-nexus-text">{fs.whenToRaise}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {hasAi && (
            <Card className={hasFunding ? "lg:col-span-5" : "lg:col-span-12"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles size={16} className="text-accent-blue" />
                  AI Leverage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {report.aiLeverage.map((a, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.4 }}
                    className="flex items-start gap-3 rounded-lg border border-nexus-border bg-nexus-card/60 p-3 transition-colors hover:border-accent-blue/40 hover:bg-nexus-hover/50"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-blue/15 text-accent-blue">
                      <Wand2 size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-nexus-text">
                        {a.tool}
                      </p>
                      {nonEmpty(a.useCase) && (
                        <p className="mt-0.5 text-xs leading-relaxed text-nexus-muted">
                          {a.useCase}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* First 10 customers + metrics */}
      {(hasCustomers || hasMetrics) && (
        <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {hasCustomers && (
            <Card className={!hasMetrics ? "md:col-span-2" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone size={16} className="text-accent-green" />
                  First 10 Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 text-sm">
                  {report.first10Customers.map((c, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: Math.min(i * 0.05, 0.4),
                        duration: 0.4,
                      }}
                      className="flex items-start gap-3 rounded-lg border border-accent-green/15 bg-accent-green/5 p-3 leading-relaxed"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-accent-green/15 font-display text-xs font-bold text-accent-green">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{c}</span>
                    </motion.li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {hasMetrics && (
            <Card className={!hasCustomers ? "md:col-span-2" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Compass size={16} className="text-accent-blue" />
                  Metrics That Matter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {report.metricsToTrack.map((m, i) => (
                    <Badge key={i} variant="default" className="font-normal">
                      {m}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Resources */}
      {hasResources && (
        <section className="mb-8">
          <div className="section-eyebrow mb-3 flex items-center gap-2">
            <GraduationCap size={14} className="text-accent-blue" />
            Founder Resources · India
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {report.resources.map((r, i) => {
              const accent = RESOURCE_ACCENTS[i % RESOURCE_ACCENTS.length];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: Math.min(i * 0.05, 0.4),
                    duration: 0.4,
                  }}
                  className="group glass-card relative h-full overflow-hidden p-4 transition-transform hover:-translate-y-0.5"
                  style={{ boxShadow: `0 0 0 1px ${accent}22 inset` }}
                >
                  {/* Corner glow blob (PillarCard pattern) */}
                  <div
                    className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-20 blur-2xl transition-opacity duration-200 group-hover:opacity-40"
                    style={{ background: accent }}
                  />
                  <div className="relative flex items-start gap-3">
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${accent}1A`, color: accent }}
                    >
                      <BookOpen size={16} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold leading-snug text-nexus-text">
                        {r.title}
                      </h4>
                      {nonEmpty(r.detail) && (
                        <p className="mt-1 text-xs leading-relaxed text-nexus-muted">
                          {r.detail}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <div className="no-print mt-10 flex justify-center">
        <Button
          size="xl"
          variant="outline"
          onClick={handleResetClick}
          className={
            confirmReset
              ? "gap-2 border-accent-red bg-accent-red/15 text-accent-red hover:bg-accent-red/20 hover:text-accent-red"
              : "gap-2 border-accent-green/40 text-accent-green hover:bg-accent-green/10 hover:text-accent-green hover:border-accent-green/70"
          }
        >
          <ArrowRight size={16} />
          {confirmReset ? "Click again to confirm" : "Validate another idea"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function RoadmapColumn({
  title,
  eyebrow,
  items,
  dot,
  bgFrom,
  ring,
  Icon,
}: {
  title: string;
  eyebrow: string;
  items: string[];
  dot: string;
  bgFrom: string;
  ring: string;
  Icon: React.ElementType;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-nexus-border bg-gradient-to-b to-nexus-card/40 p-5 backdrop-blur",
        bgFrom,
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg ring-1",
            ring,
          )}
          style={{ background: `${dot}1A` }}
        >
          <Icon size={16} style={{ color: dot }} />
        </div>
        <div>
          <div className="section-eyebrow">{eyebrow}</div>
          <h3 className="font-display text-lg font-semibold leading-tight">
            {title}
          </h3>
        </div>
      </div>
      <ul className="space-y-2.5">
        {items.length === 0 ? (
          <li className="text-sm italic text-nexus-muted">
            Nothing for this horizon yet.
          </li>
        ) : (
          items.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 rounded-lg border border-nexus-border/60 bg-nexus-card/70 p-3 text-sm leading-relaxed text-nexus-text"
            >
              <span
                className="mt-1.5 size-1.5 shrink-0 rounded-full"
                style={{ background: dot, boxShadow: `0 0 10px ${dot}` }}
              />
              <span>{item}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
function BulletGroup({
  label,
  color,
  dot,
  items,
  Icon,
}: {
  label: string;
  color: string;
  dot: string;
  items: string[];
  Icon?: React.ElementType;
}) {
  return (
    <div>
      <div className={cn("section-eyebrow mb-2 flex items-center gap-1.5", color)}>
        {Icon && <Icon size={12} />}
        {label}
      </div>
      <ul className="space-y-2 text-sm">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span
              className="mt-1.5 size-1.5 shrink-0 rounded-full"
              style={{ background: dot }}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
function severityVariant(
  s: FounderRiskFlag["severity"],
): "red" | "orange" | "green" {
  if (s === "High") return "red";
  if (s === "Medium") return "orange";
  return "green";
}

function nonEmpty(s: string | null | undefined): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

export default FounderInsights;
