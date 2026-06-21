"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn, scoreColor } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: number;
  thickness?: number;
  label?: string;
  className?: string;
}

/**
 * ScoreRing — animated SVG circle (stroke-dashoffset).
 * Colors: 0–39 Red · 40–59 Orange · 60–79 Yellow · 80–100 Green.
 * Number animates with a CSS count-up.
 */
export function ScoreRing({
  score,
  size = 220,
  thickness = 14,
  label,
  className,
}: ScoreRingProps) {
  const safe = Math.max(0, Math.min(100, Math.round(score)));
  const { hex, label: verdict } = scoreColor(safe);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safe / 100);

  // Count-up the displayed integer
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 1100;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * safe));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [safe]);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]"
        aria-hidden
      >
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={hex} stopOpacity={0.85} />
            <stop offset="100%" stopColor={hex} stopOpacity={1} />
          </linearGradient>
          <filter id="ring-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2A2A3A"
          strokeWidth={thickness}
          fill="transparent"
        />
        {/* progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ring-grad)"
          strokeWidth={thickness}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          filter="url(#ring-glow)"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="font-display text-6xl font-bold leading-none tabular-nums score-number"
          style={{ color: hex }}
        >
          {display}
        </div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-nexus-muted">
          {label || "FutureProof Score"}
        </div>
        <div
          className="mt-2 text-xs font-semibold tracking-wide"
          style={{ color: hex }}
        >
          {verdict}
        </div>
      </div>
    </div>
  );
}

export default ScoreRing;
