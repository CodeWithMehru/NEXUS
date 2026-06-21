"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Calendar, Target, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionRoadmap as ActionRoadmapType } from "@/lib/types";

interface ActionRoadmapProps {
  roadmap: ActionRoadmapType;
  className?: string;
}

/**
 * ActionRoadmap — Kanban-style 3-column roadmap.
 * 90 Days (high urgency · red dot)
 * 1 Year  (medium urgency · orange dot)
 * 3 Years (long-term · blue dot)
 */
export function ActionRoadmap({ roadmap, className }: ActionRoadmapProps) {
  const columns = [
    {
      key: "ninetyDays",
      title: "90 Days",
      eyebrow: "Immediate",
      items: roadmap?.ninetyDays || [],
      dot: "#E24B4A",
      bgFrom: "from-accent-red/10",
      ring: "ring-accent-red/30",
      Icon: Calendar,
    },
    {
      key: "oneYear",
      title: "1 Year",
      eyebrow: "Tactical",
      items: roadmap?.oneYear || [],
      dot: "#EF9F27",
      bgFrom: "from-accent-orange/10",
      ring: "ring-accent-orange/30",
      Icon: Target,
    },
    {
      key: "threeYears",
      title: "3 Years",
      eyebrow: "Strategic",
      items: roadmap?.threeYears || [],
      dot: "#378ADD",
      bgFrom: "from-accent-blue/10",
      ring: "ring-accent-blue/30",
      Icon: Rocket,
    },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-3",
        className,
      )}
    >
      {columns.map((col, colIdx) => (
        <motion.div
          key={col.key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 * colIdx, duration: 0.5 }}
          className={cn(
            "relative rounded-2xl border border-nexus-border bg-gradient-to-b to-nexus-card/40 p-5 backdrop-blur",
            col.bgFrom,
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-lg ring-1",
                col.ring,
              )}
              style={{ background: `${col.dot}1A` }}
            >
              <col.Icon size={16} style={{ color: col.dot }} />
            </div>
            <div>
              <div className="section-eyebrow">{col.eyebrow}</div>
              <h3 className="font-display text-lg font-semibold leading-tight">
                {col.title}
              </h3>
            </div>
          </div>

          <ul className="space-y-2.5">
            {col.items.length === 0 ? (
              <li className="text-sm text-nexus-muted italic">
                No items returned for this horizon.
              </li>
            ) : (
              col.items.map((item, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.12 * colIdx + 0.06 * idx + 0.1,
                    duration: 0.4,
                  }}
                  className="group flex items-start gap-2.5 rounded-lg border border-nexus-border/60 bg-nexus-card/70 p-3 text-sm leading-relaxed text-nexus-text transition-colors hover:bg-nexus-hover hover:border-nexus-border"
                >
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full"
                    style={{
                      background: col.dot,
                      boxShadow: `0 0 10px ${col.dot}`,
                    }}
                  />
                  <span>{item}</span>
                </motion.li>
              ))
            )}
          </ul>
        </motion.div>
      ))}
    </div>
  );
}

export default ActionRoadmap;
