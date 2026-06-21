"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BellRing,
  CircleAlert,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, severityColor, timeAgo } from "@/lib/utils";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import type { AlertSeverity, RiskAlertRow } from "@/lib/types";

interface AlertFeedProps {
  businessId?: string | null;
  className?: string;
}

const ICONS: Record<AlertSeverity, React.ElementType> = {
  Critical: ShieldAlert,
  High: AlertTriangle,
  Medium: CircleAlert,
  Low: BellRing,
};

/**
 * AlertFeed — realtime feed of risk_alerts. Falls back to a curated demo
 * stream if Supabase is not configured (so the UI is always alive).
 */
export function AlertFeed({ businessId, className }: AlertFeedProps) {
  const [alerts, setAlerts] = React.useState<RiskAlertRow[]>([]);
  const [connected, setConnected] = React.useState(false);

  // ------------------------------- live ----------------------------------
  React.useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createSupabaseBrowserClient();

    let cancelled = false;
    (async () => {
      let q = supabase
        .from("risk_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (businessId) q = q.eq("business_id", businessId);
      const { data } = await q;
      if (!cancelled && data) setAlerts(data as RiskAlertRow[]);
    })();

    const channel = supabase
      .channel("risk_alerts_feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "risk_alerts",
          ...(businessId ? { filter: `business_id=eq.${businessId}` } : {}),
        },
        (payload) => {
          setAlerts((prev) => [
            payload.new as RiskAlertRow,
            ...prev.slice(0, 19),
          ]);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnected(true);
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  // ---------------------------- demo fallback ----------------------------
  React.useEffect(() => {
    if (isSupabaseConfigured()) return;
    setConnected(true);
    setAlerts(DEMO_ALERTS);

    const id = window.setInterval(() => {
      const next = randomDemoAlert();
      setAlerts((prev) => [next, ...prev.slice(0, 19)]);
    }, 12_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Zap size={16} className="text-accent-orange" />
            AlertFeed
          </CardTitle>
          <p className="mt-1 text-xs text-nexus-muted">
            Realtime risk signals from across your operating envelope.
          </p>
        </div>
        <Badge
          variant={connected ? "green" : "outline"}
          className="font-normal"
        >
          <span
            className={cn(
              "mr-1.5 inline-block size-1.5 rounded-full",
              connected
                ? "bg-accent-green animate-pulse"
                : "bg-nexus-muted",
            )}
          />
          {connected ? "Live" : "Idle"}
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ul className="max-h-[480px] space-y-2 overflow-y-auto px-6 pb-6 scrollbar-thin">
          <AnimatePresence initial={false}>
            {alerts.map((a) => {
              const sev = severityColor(a.severity);
              const Icon = ICONS[a.severity] || BellRing;
              return (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.35 }}
                  className={cn(
                    "rounded-xl border p-3 backdrop-blur",
                    sev.tw,
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: `${sev.hex}26` }}
                    >
                      <Icon size={15} style={{ color: sev.hex }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-nexus-text">
                          {a.title}
                        </p>
                        <span className="shrink-0 text-[10px] uppercase tracking-wider text-nexus-muted">
                          {timeAgo(a.created_at)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-nexus-muted">
                        <span
                          className="font-semibold"
                          style={{ color: sev.hex }}
                        >
                          {a.severity}
                        </span>
                        <span>·</span>
                        <span>Impact {a.impact_score}/100</span>
                      </div>
                      {a.recommendation?.summary && (
                        <p className="mt-2 text-xs leading-relaxed text-nexus-text/90">
                          {a.recommendation.summary}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {alerts.length === 0 && (
            <li className="rounded-lg border border-dashed border-nexus-border p-6 text-center text-xs text-nexus-muted">
              No alerts yet. Streaming…
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Demo stream (used when Supabase is not configured)
// ----------------------------------------------------------------------------

const DEMO_TITLES: { title: string; severity: AlertSeverity; impact: number; rec: string }[] = [
  {
    title: "Tier-1 supplier in Shenzhen flagged for delivery slippage",
    severity: "High",
    impact: 76,
    rec: "Pre-buy 30-day buffer stock; activate secondary vendor in Vietnam.",
  },
  {
    title: "Ad-spend ROAS dropping 14% week-over-week on Meta",
    severity: "Medium",
    impact: 52,
    rec: "Shift 25% spend to retention; pause underperforming creatives.",
  },
  {
    title: "Brent crude up 7.2% — freight cost shock incoming",
    severity: "High",
    impact: 71,
    rec: "Lock 6-month fuel hedge on long-haul corridors.",
  },
  {
    title: "EU AI Act Article 5 enforcement begins next quarter",
    severity: "Critical",
    impact: 89,
    rec: "Audit AI systems; appoint a designated AI compliance officer.",
  },
  {
    title: "Net-promoter score dipped 6 points among Tier-1 customers",
    severity: "Medium",
    impact: 48,
    rec: "Launch a 'top 100 accounts' retention sprint.",
  },
  {
    title: "Cash conversion cycle extended by 4.2 days",
    severity: "Low",
    impact: 32,
    rec: "Tighten net-30 enforcement; offer 1.5% early-pay discount.",
  },
  {
    title: "Competitor launched AI-native pricing engine in our category",
    severity: "Critical",
    impact: 84,
    rec: "Deploy dynamic pricing pilot in 30 days; benchmark daily.",
  },
];

const DEMO_ALERTS: RiskAlertRow[] = DEMO_TITLES.map((t, i) => ({
  id: `demo-${i}`,
  business_id: null,
  title: t.title,
  severity: t.severity,
  impact_score: t.impact,
  recommendation: { summary: t.rec },
  created_at: new Date(Date.now() - (i + 1) * 9 * 60 * 1000).toISOString(),
}));

function randomDemoAlert(): RiskAlertRow {
  const t = DEMO_TITLES[Math.floor(Math.random() * DEMO_TITLES.length)];
  return {
    id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    business_id: null,
    title: t.title,
    severity: t.severity,
    impact_score: t.impact + Math.floor(Math.random() * 6 - 3),
    recommendation: { summary: t.rec },
    created_at: new Date().toISOString(),
  };
}

export default AlertFeed;
