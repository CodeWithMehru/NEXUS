"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Rocket,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import FounderInsights from "@/components/FounderInsights";
import { cn } from "@/lib/utils";
import type { FounderReport, FounderStage } from "@/lib/types";

const LOADING_MESSAGES = [
  "Pressure-testing your idea...",
  "Mapping your first 10 customers...",
  "Drafting your lean launch roadmap...",
  "Scoring founder-market fit...",
];

const STAGES: FounderStage[] = ["Idea", "Prototype", "Early Revenue", "Scaling"];

const EXAMPLES = [
  "An app that helps college students split rent and bills",
  "AI tutor for NEET aspirants in regional languages",
  "ONDC-based hyperlocal grocery for tier-2 towns",
];

const FEATURE_CHIPS = [
  "Validation Score",
  "Lean Roadmap",
  "Funding Strategy",
  "First 10 Customers",
  "AI Tools",
];

const STORAGE_KEY = "nexus:lastFounder";

/**
 * /founder — Young Founder Mode (Pillar 3 · "Brains of Tomorrow").
 *
 * Mirrors the landing page: rehydrates the last founder report from
 * sessionStorage, cycles loading messages, shakes on empty submit. Posts the
 * idea + stage to /api/founder and renders FounderInsights.
 */
export default function FounderPage() {
  const [idea, setIdea] = React.useState("");
  const [stage, setStage] = React.useState<FounderStage>("Idea");
  const [shake, setShake] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadingIdx, setLoadingIdx] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<FounderReport | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { report: FounderReport };
        if (parsed?.report) setReport(parsed.report);
      }
    } catch {
      /* sessionStorage may be unavailable */
    } finally {
      setHydrated(true);
    }
  }, []);

  React.useEffect(() => {
    if (!loading) return;
    setLoadingIdx(0);
    const id = window.setInterval(() => {
      setLoadingIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => window.clearInterval(id);
  }, [loading]);

  async function analyze(input: string, s: FounderStage) {
    const trimmed = input.trim();
    if (!trimmed) {
      setShake(true);
      window.setTimeout(() => setShake(false), 500);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/founder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idea: trimmed, stage: s }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Analysis failed");
      setReport(json.report as FounderReport);
      try {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ report: json.report }),
        );
      } catch {
        /* storage may be unavailable */
      }
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
    analyze(idea, stage);
  }

  function reset() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setReport(null);
    setError(null);
    setIdea("");
    setStage("Idea");
    setLoading(false);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-nexus-bg">
        <Loader2 className="size-5 animate-spin text-accent-green" />
      </main>
    );
  }

  if (report) {
    return (
      <main className="container relative px-4 py-6 md:py-10">
        <FounderInsights report={report} onReset={reset} />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-radial-glow" />

      <div className="container relative flex min-h-screen flex-col px-4 py-8">
        {/* Top bar */}
        <header className="flex items-center justify-between">
          <Link href="/" className="chip hover:border-accent-green/60">
            <ArrowLeft size={12} />
            Back to NEXUS
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg border border-nexus-border bg-nexus-card/60 backdrop-blur">
              <Rocket size={16} className="text-accent-green" />
            </div>
            <div className="font-display text-base font-semibold tracking-tight">
              Young Founder<span className="text-accent-green"> Mode</span>
            </div>
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
              className="mb-6 gap-1.5 border-accent-green/30 bg-accent-green/5 text-accent-green"
            >
              <Sparkles size={11} />
              Empowering the Brains of Tomorrow
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7 }}
            className="font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl"
          >
            Got an idea?{" "}
            <span className="gradient-text">Pressure-test it in 30 seconds.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.7 }}
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-nexus-muted md:text-lg"
          >
            Built for students and first-time founders. Get a Validation Score, a
            lean launch roadmap, a funding strategy, and your first 10
            customers — grounded in the Indian startup ecosystem.
          </motion.p>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, duration: 0.7 }}
            onSubmit={handleSubmit}
            className={cn("mt-10 w-full max-w-2xl", shake && "animate-shake")}
          >
            <div className="rounded-2xl border border-nexus-border bg-nexus-card/60 p-3 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                disabled={loading}
                rows={3}
                placeholder="Describe your startup idea — the problem, who it's for, and your wedge."
                aria-label="Startup idea"
                className="w-full resize-none rounded-xl border-0 bg-transparent px-3 py-2 text-base text-nexus-text placeholder:text-nexus-muted focus:outline-none focus:ring-0"
              />

              {/* Stage selector */}
              <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
                <span className="text-xs text-nexus-muted">Stage:</span>
                {STAGES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={loading}
                    onClick={() => setStage(s)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                      stage === s
                        ? "border-accent-green/55 bg-accent-green/20 text-accent-green"
                        : "border-nexus-border text-nexus-muted hover:text-nexus-text",
                    )}
                  >
                    {s}
                  </button>
                ))}
                <div className="ml-auto">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading}
                    className="h-11 gap-2 rounded-xl bg-accent-green text-white hover:bg-accent-green/90"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        Validate Idea
                        <ArrowRight size={16} />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Example chips */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {EXAMPLES.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIdea(c);
                    analyze(c, stage);
                  }}
                  className="chip text-left"
                >
                  {c}
                </button>
              ))}
            </div>

            {/* What you'll get */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-nexus-muted">
                You&apos;ll get
              </span>
              {FEATURE_CHIPS.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1.5 rounded-full border border-nexus-border/70 bg-nexus-card/40 px-3 py-1 text-xs text-nexus-muted"
                >
                  <Check size={11} className="text-accent-green" />
                  {f}
                </span>
              ))}
            </div>
          </motion.form>

          {/* Loading */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-8 flex items-center gap-3 rounded-full border border-nexus-border bg-nexus-card/70 px-4 py-2 text-sm backdrop-blur"
              >
                <Loader2 size={14} className="animate-spin text-accent-green" />
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

        <p className="mt-8 text-center text-xs text-nexus-muted">
          Young Founder Mode · Empowering Brains of Tomorrow · Built for Brainwave
          2026
        </p>
      </div>
    </main>
  );
}
