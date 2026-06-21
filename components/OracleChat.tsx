"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  Footprints,
  Gauge,
  Info,
  Loader2,
  Send,
  Sparkles,
  Target,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, scoreColor } from "@/lib/utils";
import type { ChatMessage, OracleResponse } from "@/lib/types";

interface OracleChatProps {
  businessName?: string;
  industry?: string;
  internalContext?: unknown;
  className?: string;
}

export interface OracleChatHandle {
  ask: (question: string) => Promise<void>;
  reset: () => void;
  scrollIntoView: () => void;
}

const SUGGESTED = [
  "Where am I bleeding margin?",
  "What's my biggest 90-day risk?",
  "How do I diversify my supplier base?",
  "Which SKU should I cut?",
];

const INTRO_MESSAGE: ChatMessage = {
  id: "intro",
  role: "oracle",
  content:
    "I am NEXUS AI Oracle — your data-grounded C-suite strategist for Indian SMEs in 2026. Upload data to The Vault and ask me anything; I'll only quantify what I can ground.",
  ts: new Date().toISOString(),
};

/**
 * OracleChat — sidebar chat that renders Groq's strict-JSON Oracle responses
 * as clean actionable cards. Sections collapse gracefully when data is thin.
 */
export const OracleChat = React.forwardRef<OracleChatHandle, OracleChatProps>(
  function OracleChat(
    { businessName, industry, internalContext, className },
    ref,
  ) {
    const [messages, setMessages] = React.useState<ChatMessage[]>([
      INTRO_MESSAGE,
    ]);
    const [input, setInput] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [messages, busy]);

    const ctxRef = React.useRef<unknown>(internalContext);
    React.useEffect(() => {
      ctxRef.current = internalContext;
    }, [internalContext]);

    const ask = React.useCallback(
      async (question: string) => {
        const q = question.trim();
        if (!q) return;
        setError(null);
        setInput("");
        const userMsg: ChatMessage = {
          id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: "user",
          content: q,
          ts: new Date().toISOString(),
        };
        setMessages((m) => [...m, userMsg]);
        setBusy(true);

        try {
          const res = await fetch("/api/oracle", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              question: q,
              businessName,
              industry,
              internalContext: ctxRef.current,
            }),
          });
          const json = await res.json();
          if (!res.ok)
            throw new Error(json?.error || "Oracle request failed");
          const oracle = json.oracle as OracleResponse;
          setMessages((m) => [
            ...m,
            {
              id: `o-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              role: "oracle",
              content: oracle.threat_summary,
              payload: oracle,
              ts: new Date().toISOString(),
            },
          ]);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Oracle failed");
        } finally {
          setBusy(false);
        }
      },
      [businessName, industry],
    );

    const reset = React.useCallback(() => {
      setMessages([INTRO_MESSAGE]);
      setInput("");
      setError(null);
      setBusy(false);
    }, []);

    const scrollIntoView = React.useCallback(() => {
      containerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, []);

    React.useImperativeHandle(
      ref,
      () => ({ ask, reset, scrollIntoView }),
      [ask, reset, scrollIntoView],
    );

    return (
      <Card ref={containerRef} className={cn("flex flex-col", className)}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain size={16} className="text-accent-blue" />
              OracleChat
            </CardTitle>
            <p className="mt-1 text-xs text-nexus-muted">
              Data-grounded · Groq · JSON-mode · ₹ INR
            </p>
          </div>
          <Badge variant="default" className="gap-1">
            <Sparkles size={10} />
            AI
          </Badge>
        </CardHeader>

        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto px-6 scrollbar-thin"
          style={{ maxHeight: "560px" }}
        >
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent-blue/15 border border-accent-blue/30 px-3.5 py-2 text-sm text-nexus-text">
                    {m.content}
                  </div>
                ) : (
                  <div className="w-full">
                    {m.payload ? (
                      <OraclePayloadCard payload={m.payload} />
                    ) : (
                      <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-nexus-border bg-nexus-card px-3.5 py-2 text-sm leading-relaxed text-nexus-text">
                        {m.content}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {busy && (
            <div className="flex items-center gap-2 text-xs text-nexus-muted">
              <Loader2 size={12} className="animate-spin" />
              Oracle is reasoning over your data…
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-xs text-accent-red">
              {error}
            </div>
          )}
        </div>

        <CardContent className="border-t border-nexus-border p-4">
          {messages.length <= 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="chip text-[11px]"
                  type="button"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the Oracle…"
              disabled={busy}
              className="flex-1 h-11"
            />
            <Button
              type="submit"
              size="icon"
              disabled={busy || !input.trim()}
              className="size-11 shrink-0 rounded-xl"
            >
              <Send size={16} />
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  },
);

// ----------------------------------------------------------------------------
// OraclePayloadCard — clean rendering with graceful empty-state collapse
// ----------------------------------------------------------------------------
function OraclePayloadCard({ payload }: { payload: OracleResponse }) {
  const verdict = payload.scoreVerdict?.toLowerCase() || "";
  const isLimited =
    verdict.includes("insufficient") ||
    verdict.includes("awaiting") ||
    (typeof payload.futureProofScore === "number" &&
      payload.futureProofScore < 30 &&
      payload.futureProofScore > 0);

  const isAwaiting = verdict.includes("awaiting");

  const hasScore =
    typeof payload.futureProofScore === "number" &&
    payload.futureProofScore > 0;
  const score = hasScore && payload.futureProofScore !== undefined
    ? scoreColor(payload.futureProofScore)
    : null;

  const hasThreat = nonEmpty(payload.threat_summary);
  const hasImpact = nonEmpty(payload.quantified_impact);
  const hasReasoning =
    Array.isArray(payload.reasoning_steps) &&
    payload.reasoning_steps.length > 0;
  const hasActions = payload.recommended_actions.length > 0;

  // Limited-data case → render a compact, single card.
  if (isLimited && !hasReasoning) {
    return (
      <div
        className={cn(
          "rounded-2xl rounded-bl-sm border p-4 text-sm leading-relaxed",
          isAwaiting
            ? "border-accent-blue/30 bg-accent-blue/5"
            : "border-accent-orange/30 bg-accent-orange/5",
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest">
            {isAwaiting ? (
              <>
                <Info size={11} className="text-accent-blue" />
                <span className="text-accent-blue">Awaiting Input</span>
              </>
            ) : (
              <>
                <AlertCircle size={11} className="text-accent-orange" />
                <span className="text-accent-orange">Insufficient Data</span>
              </>
            )}
          </div>
          {payload.scoreVerdict && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Gauge size={10} />
              {payload.scoreVerdict}
              {hasScore ? ` · ${payload.futureProofScore}/100` : ""}
            </Badge>
          )}
        </div>

        {hasThreat && (
          <p className="text-nexus-text">{payload.threat_summary}</p>
        )}
        {hasImpact && (
          <p className="mt-1.5 text-xs text-nexus-muted">
            {payload.quantified_impact}
          </p>
        )}

        {hasActions && (
          <div className="mt-3 space-y-2">
            {payload.recommended_actions.map((a, i) => (
              <ActionCard key={i} index={i + 1} action={a} compact />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full grounded response.
  return (
    <div className="space-y-3">
      {(hasThreat || hasImpact || payload.scoreVerdict) && (
        <div className="rounded-2xl rounded-bl-sm border border-nexus-border bg-nexus-card/80 p-3.5 text-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-nexus-muted">
              <TrendingDown size={11} className="text-accent-red" />
              Threat
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1">
              {payload.confidence && (
                <Badge
                  variant="outline"
                  className="gap-1 border-nexus-border text-[10px]"
                  title="Oracle confidence given your data quality"
                >
                  <Sparkles size={10} />
                  {payload.confidence} confidence
                </Badge>
              )}
              {payload.scoreVerdict && (
                <Badge
                  variant="outline"
                  className="gap-1 border-nexus-border text-[10px]"
                  style={
                    score
                      ? {
                          color: score.hex,
                          borderColor: `${score.hex}55`,
                          background: `${score.hex}1A`,
                        }
                      : undefined
                  }
                >
                  <Gauge size={10} />
                  {payload.scoreVerdict}
                  {hasScore ? ` · ${payload.futureProofScore}/100` : ""}
                </Badge>
              )}
            </div>
          </div>

          {hasThreat && (
            <p className="leading-relaxed text-nexus-text">
              {payload.threat_summary}
            </p>
          )}

          {hasImpact && (
            <div className="mt-3 rounded-lg border border-accent-orange/30 bg-accent-orange/5 p-2.5 text-xs">
              <div className="flex items-center gap-1.5">
                <Coins size={11} className="text-accent-orange" />
                <span className="section-eyebrow text-accent-orange">
                  Quantified Impact
                </span>
              </div>
              <p className="mt-1 leading-relaxed">
                {payload.quantified_impact}
              </p>
            </div>
          )}

          {nonEmpty(payload.key_metric) && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-accent-blue/30 bg-accent-blue/5 px-2.5 py-2 text-xs">
              <Target size={12} className="shrink-0 text-accent-blue" />
              <span className="text-nexus-muted">Watch this metric:</span>
              <span className="font-semibold text-accent-blue">
                {payload.key_metric}
              </span>
            </div>
          )}
        </div>
      )}

      {hasReasoning && payload.reasoning_steps && (
        <ReasoningSteps steps={payload.reasoning_steps} />
      )}

      {hasActions && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="section-eyebrow text-accent-blue">
              Recommended Actions
            </span>
            <Badge variant="outline" className="text-[10px]">
              {payload.recommended_actions.length} prioritized
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {payload.recommended_actions.map((a, i) => (
              <ActionCard key={i} index={i + 1} action={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
function ActionCard({
  index,
  action: a,
  compact = false,
}: {
  index: number;
  action: OracleResponse["recommended_actions"][number];
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "group rounded-xl border border-nexus-border transition-colors hover:bg-nexus-hover/60",
        compact
          ? "bg-nexus-card/80 p-2.5"
          : "bg-nexus-card/60 p-3",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-blue/15 font-display text-xs font-bold text-accent-blue">
          {index}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h5 className="text-sm font-semibold leading-snug text-nexus-text">
              {a.action}
            </h5>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
              {a.priority && (
                <Badge
                  variant={priorityVariant(a.priority)}
                  className="gap-1 text-[10px]"
                  title="Priority"
                >
                  {a.priority}
                </Badge>
              )}
              {nonEmpty(a.effort) && (
                <Badge
                  variant="outline"
                  className="gap-1 text-[10px]"
                  title="Effort to execute"
                >
                  <Gauge size={10} />
                  {a.effort}
                </Badge>
              )}
              {nonEmpty(a.timeline) && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Clock size={10} />
                  {a.timeline}
                </Badge>
              )}
            </div>
          </div>
          {nonEmpty(a.rationale) && (
            <p className="mt-1 text-xs leading-relaxed text-nexus-muted">
              <Target size={10} className="mr-1 inline-block opacity-70" />
              {a.rationale}
            </p>
          )}
          {nonEmpty(a.expected_impact) && !compact && (
            <div className="mt-2 flex items-start gap-1.5 rounded-md border border-accent-green/30 bg-accent-green/5 px-2 py-1.5">
              <CheckCircle2
                size={11}
                className="mt-0.5 shrink-0 text-accent-green"
              />
              <span className="text-[11px] font-medium leading-snug text-accent-green">
                {a.expected_impact}
              </span>
            </div>
          )}
          {nonEmpty(a.expected_impact) && compact && (
            <p className="mt-1 text-[11px] text-accent-green">
              <CheckCircle2
                size={10}
                className="mr-1 inline-block"
              />
              {a.expected_impact}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
function ReasoningSteps({ steps }: { steps: string[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-nexus-border bg-nexus-card/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-nexus-hover/40"
      >
        <div className="flex items-center gap-2">
          <Footprints size={12} className="text-accent-blue" />
          <span className="section-eyebrow text-accent-blue">
            How I reasoned
          </span>
          <Badge variant="outline" className="text-[10px]">
            {steps.length} steps
          </Badge>
        </div>
        <ChevronDown
          size={14}
          className={cn(
            "text-nexus-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ol
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-1.5 border-t border-nexus-border bg-nexus-bg/30 px-3 py-2.5 text-[12px] leading-relaxed text-nexus-text"
          >
            {steps.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-display text-[10px] font-bold text-accent-blue">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-nexus-muted">{s}</span>
              </li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  );
}

// ----------------------------------------------------------------------------
function priorityVariant(p: "P0" | "P1" | "P2"): "red" | "orange" | "outline" {
  if (p === "P0") return "red";
  if (p === "P1") return "orange";
  return "outline";
}

function nonEmpty(s: string | null | undefined): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

OracleChat.displayName = "OracleChat";

export default OracleChat;
