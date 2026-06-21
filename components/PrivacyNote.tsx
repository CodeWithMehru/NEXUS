"use client";

import * as React from "react";
import { Lock, ShieldCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * PRIVACY_POINTS — the single source of truth for what we promise about data.
 * Copy must stay ACCURATE to the implementation:
 *   - AI/API keys live only on the server (Groq, Tavily, Supabase service role).
 *   - Uploaded files are parsed for analysis and held in your session.
 *   - Persistence to Supabase is optional, best-effort, and scoped to a workspace.
 *   - Data is never sold or used to train models.
 *   - Reset clears everything.
 */
export const PRIVACY_POINTS: string[] = [
  "AI & database keys run only on the server — they never reach your browser.",
  "Uploaded files are parsed for analysis and held in your current session.",
  "Saving to the database is optional, best-effort, and scoped to your workspace.",
  "Your data is never sold or used to train AI models.",
  "Reset wipes everything instantly.",
];

const SHORT = "Server-side keys · session-held data · never sold or used to train · Reset clears all.";

type PrivacyVariant = "inline" | "tooltip" | "footer";

interface PrivacyNoteProps {
  variant?: PrivacyVariant;
  className?: string;
}

/**
 * PrivacyNote — reusable "Data Privacy & Security" affordance.
 *
 *   inline   → a short shielded line (used in The Vault header)
 *   footer   → a centered footer line (landing page)
 *   tooltip  → a shield icon button that reveals the full point list on hover
 *              (Command Center header, next to Reset)
 */
export function PrivacyNote({ variant = "inline", className }: PrivacyNoteProps) {
  if (variant === "tooltip") {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Data privacy & security"
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-lg border border-nexus-border bg-nexus-card/60 text-accent-green transition-colors hover:border-accent-green/60",
                className,
              )}
            >
              <ShieldCheck size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-accent-green">
              <Lock size={11} />
              Data Privacy &amp; Security
            </p>
            <ul className="space-y-1 text-[11px] leading-relaxed text-nexus-muted">
              {PRIVACY_POINTS.map((p) => (
                <li key={p} className="flex gap-1.5">
                  <span className="mt-1 size-1 shrink-0 rounded-full bg-accent-green" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "footer") {
    return (
      <p
        className={cn(
          "flex items-center justify-center gap-1.5 text-center text-[11px] text-nexus-muted",
          className,
        )}
      >
        <ShieldCheck size={12} className="text-accent-green" />
        {SHORT}
      </p>
    );
  }

  // inline
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-xs text-nexus-muted",
        className,
      )}
    >
      <ShieldCheck size={12} className="mt-0.5 shrink-0 text-accent-green" />
      <span>{SHORT}</span>
    </p>
  );
}

export default PrivacyNote;
