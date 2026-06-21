"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, riskColor } from "@/lib/utils";
import type { AIDisruptionRisk } from "@/lib/types";

interface RiskBarsProps {
  risks: AIDisruptionRisk[];
  className?: string;
}

/**
 * RiskBars — horizontal bars for AI Disruption Risks.
 * Staggered entrance · color band by risk percent · tooltip with reason.
 */
export function RiskBars({ risks, className }: RiskBarsProps) {
  if (!risks || risks.length === 0) {
    return (
      <p className="text-sm text-nexus-muted">
        No risk vectors returned for this analysis.
      </p>
    );
  }

  const sorted = [...risks].sort((a, b) => b.riskPercent - a.riskPercent);

  return (
    <TooltipProvider delayDuration={150}>
      <div className={cn("space-y-3", className)}>
        {sorted.map((r, idx) => {
          const { hex } = riskColor(r.riskPercent);
          return (
            <motion.div
              key={`${r.function}-${idx}`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.07 * idx, duration: 0.5, ease: "easeOut" }}
              className="group"
            >
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium text-nexus-text">
                  {r.function}
                </span>
                <span
                  className="font-display tabular-nums font-semibold"
                  style={{ color: hex }}
                >
                  {Math.round(r.riskPercent)}%
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-nexus-hover/80 cursor-help">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: `${Math.max(2, r.riskPercent)}%` }}
                      transition={{
                        delay: 0.07 * idx + 0.1,
                        duration: 1.2,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${hex}aa, ${hex})`,
                        boxShadow: `0 0 18px -2px ${hex}80`,
                      }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-sm">
                  <p className="font-semibold mb-1 text-nexus-text">
                    {r.function} — {Math.round(r.riskPercent)}% disruption risk
                  </p>
                  <p className="text-nexus-muted leading-relaxed">
                    {r.reason || "No further detail provided."}
                  </p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

export default RiskBars;
