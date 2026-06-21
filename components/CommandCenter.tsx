"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  CircleDollarSign,
  Factory,
  Gauge,
  RotateCcw,
  ShieldHalf,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AlertFeed from "@/components/AlertFeed";
import OracleChat, { OracleChatHandle } from "@/components/OracleChat";
import PrivacyNote from "@/components/PrivacyNote";
import ScenarioSimulator from "@/components/ScenarioSimulator";
import Vault, { VaultUpload } from "@/components/Vault";
import { cn, riskColor } from "@/lib/utils";
import type { NexusReport } from "@/lib/types";

interface CommandCenterProps {
  report?: NexusReport | null;
  businessId?: string | null;
  onReset?: () => void;
  className?: string;
}

interface RiskCardSpec {
  key: string;
  label: string;
  Icon: React.ElementType;
  base: number;
}

const BASE_RISKS: RiskCardSpec[] = [
  { key: "supply", label: "Supply Chain Risk", Icon: Factory, base: 64 },
  { key: "demand", label: "Demand Volatility", Icon: TrendingDown, base: 58 },
  { key: "sentiment", label: "Market Sentiment", Icon: Activity, base: 47 },
  { key: "margin", label: "Margin Threat", Icon: CircleDollarSign, base: 52 },
];

/**
 * CommandCenter — Pillar 2 (Internal) full UI.
 *
 *   ┌────────────────────────────────────────────────────────────┐
 *   │  Risk Cards x4   +   Overall Risk Gauge                    │
 *   ├──────────────────────────────────┬─────────────────────────┤
 *   │  The Vault   (file ingest)        │                         │
 *   │   └── "Analyze with Oracle" CTA   │  OracleChat (sidebar)   │
 *   │  Scenario Simulator               │                         │
 *   │  AlertFeed (realtime)             │                         │
 *   └──────────────────────────────────┴─────────────────────────┘
 */
export function CommandCenter({
  report,
  businessId,
  onReset,
  className,
}: CommandCenterProps) {
  const [uploads, setUploads] = React.useState<VaultUpload[]>([]);
  const [analyzing, setAnalyzing] = React.useState(false);
  const oracleRef = React.useRef<OracleChatHandle>(null);

  // Derive risk-card numbers from the external report if available.
  const risks = React.useMemo(() => {
    if (!report) return BASE_RISKS.map((r) => ({ ...r, value: r.base }));
    const externalAvg =
      report.aiDisruptionRisks?.reduce(
        (sum, r) => sum + (r.riskPercent || 0),
        0,
      ) / Math.max(1, report.aiDisruptionRisks?.length || 1);
    const score = report.futureProofScore || 50;
    const inverse = 100 - score;
    return [
      { ...BASE_RISKS[0], value: clamp(externalAvg + 4) },
      { ...BASE_RISKS[1], value: clamp(inverse - 6) },
      { ...BASE_RISKS[2], value: clamp(inverse - 12) },
      { ...BASE_RISKS[3], value: clamp(externalAvg - 4) },
    ];
  }, [report]);

  const overall = Math.round(
    risks.reduce((s, r) => s + r.value, 0) / risks.length,
  );

  // Internal context blob used for OracleChat & external context propagation.
  const internalContext = React.useMemo(() => {
    return uploads.map((u) => ({
      type: u.type,
      filename: u.filename,
      rowCount: u.rowCount,
      totals: u.totals,
      sample: u.sample,
    }));
  }, [uploads]);

  // -------------------------------------------------------------------------
  // Vault → Oracle analysis bridge
  // -------------------------------------------------------------------------
  const handleAnalyzeWithOracle = React.useCallback(
    async (current: VaultUpload[]) => {
      if (!current.length) return;
      setAnalyzing(true);

      // Compose a structured prompt from the uploaded datasets.
      const summary = current
        .map(
          (u) =>
            `• ${u.type.toUpperCase()} — ${u.filename} (${u.rowCount.toLocaleString()} rows)`,
        )
        .join("\n");
      const totals = current
        .map((u) => `${u.type}: ${JSON.stringify(u.totals)}`)
        .join(" | ");

      const question = `Run a Full Internal Resilience Scan strictly grounded in the data I just uploaded to the Vault.

Datasets:
${summary}

Aggregate signals:
${totals}

Identify the top 5 internal risks ranked by quantified business impact. For each, propose a specific 30 / 60 / 90-day mitigation. Quote my numbers verbatim — do NOT invent revenue figures, customer counts, supplier names, or competitor names that are not in the snapshot. If the data above is too thin to draw a confident conclusion, say so honestly and use qualitative language ("low / moderate / high impact") instead of fake ₹ figures.`;

      try {
        // Imperatively trigger the OracleChat sidebar so the user sees the
        // streaming reasoning + the JSON-rendered actionable cards.
        oracleRef.current?.scrollIntoView();
        await oracleRef.current?.ask(question);
      } finally {
        setAnalyzing(false);
      }
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Reset — full UI clear, optionally bubbled to parent (page-level reset)
  // -------------------------------------------------------------------------
  const handleReset = React.useCallback(() => {
    setUploads([]);
    setAnalyzing(false);
    oracleRef.current?.reset();
    if (onReset) onReset();
  }, [onReset]);

  return (
    <div className={cn("relative w-full", className)}>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-nexus-border/60 bg-nexus-bg/80 px-4 py-4 backdrop-blur-xl">
        <div className="container flex flex-wrap items-center justify-between gap-3 px-0">
          <div className="flex items-center gap-3">
            <Link href="/" className="chip hover:border-accent-blue/60">
              <ArrowLeft size={12} />
              Back
            </Link>
            <div>
              <div className="section-eyebrow">Pillar 2 · Vanguard Mode</div>
              <h1 className="font-display text-xl font-bold leading-tight md:text-2xl">
                Command Center
                {report?.businessName && (
                  <span className="ml-2 text-nexus-muted font-normal">
                    · {report.businessName}
                  </span>
                )}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="green" className="gap-1.5">
              <span className="size-1.5 rounded-full bg-accent-green animate-pulse" />
              Operational
            </Badge>
            <PrivacyNote variant="tooltip" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 border-accent-red/40 text-accent-red hover:bg-accent-red/10 hover:text-accent-red hover:border-accent-red/70"
            >
              <RotateCcw size={13} />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Risk cards row + Overall gauge */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {risks.map((r, i) => {
          const c = riskColor(r.value);
          return (
            <motion.div
              key={r.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="lg:col-span-2"
            >
              <Card className="glass-card-hover h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex size-9 items-center justify-center rounded-lg"
                      style={{ background: `${c.hex}1F` }}
                    >
                      <r.Icon size={16} style={{ color: c.hex }} />
                    </div>
                    <span
                      className="font-display text-2xl font-bold tabular-nums"
                      style={{ color: c.hex }}
                    >
                      {Math.round(r.value)}
                      <span className="text-xs font-medium text-nexus-muted">
                        /100
                      </span>
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-nexus-muted">
                    {r.label}
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-nexus-hover">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${r.value}%` }}
                      transition={{ duration: 1.1, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: c.hex }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {/* Overall risk gauge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="lg:col-span-4"
        >
          <Card className="h-full">
            <CardContent className="flex items-center gap-5 p-5">
              <OverallGauge value={overall} />
              <div>
                <div className="section-eyebrow">Overall Risk</div>
                <p className="mt-1 font-display text-3xl font-bold">
                  {overall}/100
                </p>
                <p className="text-xs leading-relaxed text-nexus-muted">
                  Composite of supply, demand, sentiment & margin signals.
                </p>
                {report && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 -ml-2 gap-1 text-accent-blue"
                  >
                    <Gauge size={12} />
                    FutureProof Score: {report.futureProofScore}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Main grid */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left column */}
        <div className="space-y-4 lg:col-span-8">
          <Vault
            businessId={businessId}
            uploads={uploads}
            onUploadsChange={setUploads}
            onAnalyze={handleAnalyzeWithOracle}
            analyzing={analyzing}
          />
          <ScenarioSimulator
            businessId={businessId}
            businessName={report?.businessName}
            industry={report?.industry}
          />
          <AlertFeed businessId={businessId} />
        </div>

        {/* Right column — Oracle */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-24">
            <OracleChat
              ref={oracleRef}
              businessName={report?.businessName}
              industry={report?.industry}
              internalContext={internalContext}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// ----------------------------------------------------------------------------
// OverallGauge — circular progress (value 0-100). Reuses ScoreRing-style ring.
// ----------------------------------------------------------------------------
function OverallGauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const c = riskColor(v);
  const size = 110;
  const thickness = 9;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - v / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2A2A3A"
          strokeWidth={thickness}
          fill="transparent"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={c.hex}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <ShieldHalf size={18} style={{ color: c.hex }} />
        <span
          className="mt-1 font-display text-xs font-bold tracking-wider"
          style={{ color: c.hex }}
        >
          RISK
        </span>
      </div>
    </div>
  );
}

function clamp(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default CommandCenter;
