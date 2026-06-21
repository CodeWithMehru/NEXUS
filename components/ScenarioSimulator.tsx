"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bug,
  Flame,
  Loader2,
  PackageX,
  Ship,
  ShieldAlert,
  TrendingDown,
  Wand2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  ScenarioKey,
  ScenarioMetrics,
  ScenarioPlan,
} from "@/lib/types";

interface ScenarioSimulatorProps {
  businessId?: string | null;
  businessName?: string;
  industry?: string;
  baseline?: ScenarioMetrics;
  className?: string;
}

const SCENARIOS: {
  key: ScenarioKey;
  Icon: React.ElementType;
  blurb: string;
}[] = [
  {
    key: "Red Sea Crisis",
    Icon: Ship,
    blurb: "Global shipping rerouted around the Cape — supply chains squeezed.",
  },
  {
    key: "Raw Material Shortage",
    Icon: PackageX,
    blurb: "Critical input becomes scarce overnight — input cost spikes.",
  },
  {
    key: "Demand Drop",
    Icon: TrendingDown,
    blurb: "Macro shock — consumer demand falls 20–30% across the category.",
  },
  {
    key: "Cyber Threat",
    Icon: Bug,
    blurb: "Targeted ransomware breach — customer trust and ops on the line.",
  },
];

const DEFAULT_BASELINE: ScenarioMetrics = {
  revenue: 100,
  margin: 22,
  cashRunwayDays: 240,
  customerRetention: 88,
  supplyHealth: 82,
};

const METRIC_LABELS: Record<keyof ScenarioMetrics, string> = {
  revenue: "Revenue Index",
  margin: "Margin %",
  cashRunwayDays: "Cash Runway (days)",
  customerRetention: "Retention %",
  supplyHealth: "Supply Health",
};

/**
 * ScenarioSimulator — 4 panic buttons → /api/simulate → animated Recharts
 * before/after bars + Oracle's mitigation plan card.
 */
export function ScenarioSimulator({
  businessId,
  businessName,
  industry,
  baseline = DEFAULT_BASELINE,
  className,
}: ScenarioSimulatorProps) {
  const [active, setActive] = React.useState<ScenarioKey | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{
    scenario: ScenarioKey;
    before: ScenarioMetrics;
    after: ScenarioMetrics;
    plan: ScenarioPlan;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function run(scenario: ScenarioKey) {
    setActive(scenario);
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scenario,
          businessId,
          businessName,
          industry,
          baseline,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Simulation failed");
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }

  const chartData = React.useMemo(() => {
    if (!result) return [];
    return (Object.keys(result.before) as (keyof ScenarioMetrics)[]).map(
      (k) => ({
        metric: METRIC_LABELS[k],
        Before: result.before[k],
        After: result.after[k],
      }),
    );
  }, [result]);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Flame size={16} className="text-accent-red" />
            Scenario Simulator
          </CardTitle>
          <p className="mt-1 text-xs text-nexus-muted">
            Pull a panic button to simulate a real-world shock and see Oracle's
            mitigation plan.
          </p>
        </div>
        {result && (
          <Badge
            variant={result.plan.riskDelta < 0 ? "green" : "red"}
            className="gap-1"
          >
            <Wand2 size={10} />
            Risk {result.plan.riskDelta > 0 ? "+" : ""}
            {result.plan.riskDelta}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Panic buttons */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => run(s.key)}
              disabled={loading}
              className={cn(
                "panic-btn",
                active === s.key && "border-accent-red/80 bg-accent-red/15",
                loading && "opacity-60 cursor-wait",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <s.Icon size={18} className="text-accent-red" />
                {loading && active === s.key && (
                  <Loader2 size={14} className="animate-spin text-accent-red" />
                )}
              </div>
              <p className="font-display font-semibold leading-tight text-nexus-text">
                {s.key}
              </p>
              <p className="text-[11px] leading-snug text-nexus-muted">
                {s.blurb}
              </p>
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-lg border border-accent-red/40 bg-accent-red/10 p-3 text-sm text-accent-red">
            {error}
          </div>
        )}

        {/* Chart + plan */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={result.scenario}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 gap-4 lg:grid-cols-12"
            >
              {/* Chart */}
              <div className="lg:col-span-7 rounded-xl border border-nexus-border bg-nexus-card/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-display text-sm font-semibold">
                    Before vs After — {result.scenario}
                  </h4>
                  <span className="text-[10px] uppercase tracking-widest text-nexus-muted">
                    90-day projection
                  </span>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#2A2A3A"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="metric"
                        tick={{ fill: "#8A8AA0", fontSize: 11 }}
                        axisLine={{ stroke: "#2A2A3A" }}
                        tickLine={false}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fill: "#8A8AA0", fontSize: 11 }}
                        axisLine={{ stroke: "#2A2A3A" }}
                        tickLine={false}
                      />
                      <ReTooltip
                        cursor={{ fill: "rgba(55,138,221,0.06)" }}
                        contentStyle={{
                          background: "#13131A",
                          border: "1px solid #2A2A3A",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "#E6E6F0" }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 12, color: "#8A8AA0" }}
                      />
                      <Bar
                        dataKey="Before"
                        fill="#378ADD"
                        radius={[6, 6, 0, 0]}
                        animationDuration={900}
                      />
                      <Bar
                        dataKey="After"
                        radius={[6, 6, 0, 0]}
                        animationDuration={900}
                        animationBegin={200}
                      >
                        {chartData.map((d, i) => {
                          const drop = d.Before > d.After;
                          return (
                            <Cell
                              key={i}
                              fill={drop ? "#E24B4A" : "#1D9E75"}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Plan */}
              <div className="lg:col-span-5 rounded-xl border border-accent-blue/30 bg-accent-blue/5 p-4">
                <div className="mb-3">
                  <div className="section-eyebrow text-accent-blue">
                    Oracle Mitigation Plan
                  </div>
                  <h4 className="mt-1 font-display text-base font-semibold leading-tight">
                    {result.plan.headline}
                  </h4>
                </div>
                <ol className="space-y-2.5">
                  {result.plan.steps.map((s, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-nexus-border bg-nexus-card/70 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-nexus-text">
                          {i + 1}. {s.title}
                        </p>
                        <Badge variant="outline" className="text-[10px]">
                          {s.horizon}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-nexus-muted">
                        {s.detail}
                      </p>
                    </li>
                  ))}
                </ol>

                {result.scenario === "Cyber Threat" && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-accent-orange/30 bg-accent-orange/5 p-2.5 text-[11px] leading-relaxed text-accent-orange">
                    <ShieldAlert size={13} className="mt-0.5 shrink-0" />
                    <span>
                      <span className="font-semibold">
                        India compliance clock:
                      </span>{" "}
                      CERT-In incident report within 6 hours · DPDP Act 2023
                      breach notice to the Data Protection Board &amp; affected
                      users.
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!result && !loading && !error && (
          <div className="rounded-xl border border-dashed border-nexus-border bg-nexus-card/40 p-6 text-center text-sm text-nexus-muted">
            Press a panic button to simulate the shock.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ScenarioSimulator;
