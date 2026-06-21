"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  Loader2,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PrivacyNote from "@/components/PrivacyNote";
import ResultsDashboard from "@/components/ResultsDashboard";
import { cn } from "@/lib/utils";
import type { NexusReport } from "@/lib/types";

const LOADING_MESSAGES = [
  "Scanning the web for real data...",
  "Running AI disruption analysis...",
  "Calculating FutureProof Score...",
  "Compiling your survival report...",
];

const EXAMPLE_CHIPS = ["Try: Zomato", "Try: Paytm", "Try: Reliance Retail"];

const STORAGE_KEY = "nexus:lastReport";

export default function LandingPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [shake, setShake] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadingIdx, setLoadingIdx] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<NexusReport | null>(null);
  const [businessId, setBusinessId] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  // On first mount: rehydrate the most recent report so the user can hit Back
  // from /dashboard and still see it. The Reset button wipes this completely.
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          report: NexusReport;
          businessId: string | null;
        };
        if (parsed?.report) {
          setReport(parsed.report);
          setBusinessId(parsed.businessId || null);
        }
      }
    } catch {
      /* sessionStorage may be unavailable */
    } finally {
      setHydrated(true);
    }
  }, []);

  // Cycling loading messages — every 2 seconds (per spec).
  React.useEffect(() => {
    if (!loading) return;
    setLoadingIdx(0);
    const id = window.setInterval(() => {
      setLoadingIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => window.clearInterval(id);
  }, [loading]);

  async function analyze(input: string) {
    const trimmed = input.trim();
    if (!trimmed) {
      setShake(true);
      window.setTimeout(() => setShake(false), 500);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze-external", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Analysis failed");
      setReport(json.report as NexusReport);
      setBusinessId(json.businessId || null);
      try {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ report: json.report, businessId: json.businessId }),
        );
      } catch {
        /* storage may be unavailable */
      }
      // Scroll to top so the report header is visible.
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    analyze(query);
  }

  /**
   * reset — fully wipes the session.
   * Clears: sessionStorage, in-memory report, businessId, query, error.
   * After reset the user lands on a clean home screen ready to analyze a
   * brand new business with zero residue.
   */
  function reset() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setReport(null);
    setBusinessId(null);
    setError(null);
    setQuery("");
    setLoading(false);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openCommandCenter() {
    router.push("/dashboard");
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  // Avoid the brief flash of the landing form while we rehydrate from session.
  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-nexus-bg">
        <Loader2 className="size-5 animate-spin text-accent-blue" />
      </main>
    );
  }

  if (report) {
    return (
      <main className="container relative px-4 py-6 md:py-10">
        <ResultsDashboard
          report={report}
          onReset={reset}
          onOpenCommandCenter={openCommandCenter}
        />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background grid + glow */}
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-radial-glow" />

      <div className="container relative flex min-h-screen flex-col px-4 py-8">
        {/* Top bar */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg border border-nexus-border bg-nexus-card/60 backdrop-blur">
              <BrainCircuit size={16} className="text-accent-blue" />
            </div>
            <div className="font-display text-base font-semibold tracking-tight">
              NEXUS<span className="text-accent-blue"> AI</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/founder")}
              className="gap-1.5 text-accent-green hover:text-accent-green hover:bg-accent-green/10"
            >
              <Rocket size={14} />
              Young Founder
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openCommandCenter}
              className="gap-1.5"
            >
              <ShieldCheck size={14} />
              Command Center
            </Button>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge
              variant="outline"
              className="mb-6 gap-1.5 border-accent-blue/30 bg-accent-blue/5 text-accent-blue"
            >
              <Sparkles size={11} />
              Antifragile Intelligence · Brainwave 2026
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7 }}
            className="font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl"
          >
            Will your business{" "}
            <span className="gradient-text">survive the next 5 years?</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.7 }}
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-nexus-muted md:text-lg"
          >
            NEXUS AI is the AI Nervous System for antifragile businesses and the
            brains of tomorrow. Get a ruthless C-suite analysis — live
            web-grounded market signals, AI disruption risks, and a 90-day /
            1-year / 3-year action roadmap. Building something new?{" "}
            <button
              type="button"
              onClick={() => router.push("/founder")}
              className="font-semibold text-accent-green underline-offset-2 hover:underline"
            >
              Try Young Founder Mode →
            </button>
          </motion.p>

          {/* Input */}
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, duration: 0.7 }}
            onSubmit={handleSubmit}
            className={cn("mt-10 w-full", shake && "animate-shake")}
          >
            <div className="relative mx-auto flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-nexus-border bg-nexus-card/60 p-2 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              <Search size={18} className="ml-3 shrink-0 text-nexus-muted" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
                placeholder="Enter Business Name or URL — e.g. zomato.com"
                aria-label="Business name or URL"
                className="h-12 flex-1 border-0 bg-transparent text-base placeholder:text-nexus-muted focus-visible:ring-0"
              />
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="h-12 shrink-0 gap-2 px-5 rounded-xl"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    Run Analysis
                    <ArrowRight size={16} />
                  </>
                )}
              </Button>
            </div>

            {/* Example chips */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {EXAMPLE_CHIPS.map((c) => {
                const value = c.replace(/^Try:\s*/i, "");
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setQuery(value);
                      analyze(value);
                    }}
                    className="chip"
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </motion.form>

          {/* Loading state */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-8 flex items-center gap-3 rounded-full border border-nexus-border bg-nexus-card/70 px-4 py-2 text-sm backdrop-blur"
              >
                <Loader2 size={14} className="animate-spin text-accent-blue" />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={loadingIdx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.4 }}
                    className="text-nexus-text"
                  >
                    {LOADING_MESSAGES[loadingIdx]}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 max-w-md rounded-xl border border-accent-red/40 bg-accent-red/10 p-4 text-sm text-accent-red"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Footer pillars */}
        <footer className="mx-auto mt-12 grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
          <PillarCard
            title="Pillar 1 · External Intelligence"
            subtitle="Nexus Mode"
            blurb="Market signals, AI disruption risks, competitor moves, regulatory pressure — fused into a single FutureProof Score."
            color="#378ADD"
          />
          <PillarCard
            title="Pillar 2 · Internal Resilience"
            subtitle="Vanguard Mode"
            blurb="Upload your sales, inventory, suppliers & contracts. Oracle Agent + Scenario Simulator pressure-test your operations."
            color="#1D9E75"
            cta={{ label: "Open Command Center", onClick: openCommandCenter }}
          />
        </footer>

        {/* Young Founder Mode — secondary, full-width CTA (Brains of Tomorrow) */}
        <motion.button
          type="button"
          onClick={() => router.push("/founder")}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="group glass-card mx-auto mt-4 flex w-full max-w-5xl items-center justify-between gap-4 overflow-hidden p-5 text-left transition-colors hover:border-accent-green/50"
        >
          <div className="flex items-center gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-green/15 text-accent-green">
              <Rocket size={20} />
            </div>
            <div>
              <div className="section-eyebrow text-accent-green">
                New · Empowering the Brains of Tomorrow
              </div>
              <h3 className="mt-0.5 font-display text-lg font-semibold">
                Young Founder Mode — validate a startup idea in 30 seconds
              </h3>
              <p className="mt-1 text-sm text-nexus-muted">
                Validation Score, lean launch roadmap, funding strategy & your
                first 10 customers — built for students and first-time founders.
              </p>
            </div>
          </div>
          <ArrowRight
            size={20}
            className="hidden shrink-0 text-accent-green transition-transform group-hover:translate-x-1 sm:block"
          />
        </motion.button>

        <p className="mt-8 text-center text-xs text-nexus-muted">
          NEXUS AI · Empowering Brains of Tomorrow · Built for Brainwave 2026
        </p>
        <PrivacyNote variant="footer" className="mt-2" />
      </div>
    </main>
  );
}

function PillarCard({
  title,
  subtitle,
  blurb,
  color,
  cta,
}: {
  title: string;
  subtitle: string;
  blurb: string;
  color: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div
      className="glass-card relative overflow-hidden p-5"
      style={{
        boxShadow: `0 0 0 1px ${color}22 inset`,
      }}
    >
      <div
        className="absolute -right-8 -top-8 size-32 rounded-full opacity-30 blur-2xl"
        style={{ background: color }}
      />
      <div className="relative">
        <div className="section-eyebrow" style={{ color }}>
          {subtitle}
        </div>
        <h3 className="mt-1 font-display text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-nexus-muted">{blurb}</p>
        {cta && (
          <Button
            onClick={cta.onClick}
            variant="ghost"
            size="sm"
            className="mt-3 -ml-2 gap-1"
            style={{ color }}
          >
            {cta.label}
            <ArrowRight size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}
