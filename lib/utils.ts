import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn — Tailwind class merger. Standard shadcn/ui helper.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Map a 0–100 FutureProof score to its semantic verdict color.
 * 0–39  → Red    (Vulnerable)
 * 40–59 → Orange (At Risk)
 * 60–79 → Yellow (Stable)
 * 80–100→ Green  (Future Proof)
 */
export function scoreColor(score: number): {
  hex: string;
  tw: string;
  label: string;
} {
  if (score >= 80)
    return { hex: "#1D9E75", tw: "text-accent-green", label: "Future Proof" };
  if (score >= 60)
    return { hex: "#EDC54B", tw: "text-accent-yellow", label: "Stable" };
  if (score >= 40)
    return { hex: "#EF9F27", tw: "text-accent-orange", label: "At Risk" };
  return { hex: "#E24B4A", tw: "text-accent-red", label: "Vulnerable" };
}

/**
 * Map a risk percentage (0–100) to its color band.
 * Lower percent = lower risk = greener.
 */
export function riskColor(pct: number): { hex: string; tw: string } {
  if (pct >= 75) return { hex: "#E24B4A", tw: "bg-accent-red" };
  if (pct >= 50) return { hex: "#EF9F27", tw: "bg-accent-orange" };
  if (pct >= 25) return { hex: "#EDC54B", tw: "bg-accent-yellow" };
  return { hex: "#1D9E75", tw: "bg-accent-green" };
}

/**
 * Severity → color mapping for risk_alerts feed.
 */
export function severityColor(
  severity: "Critical" | "High" | "Medium" | "Low",
) {
  switch (severity) {
    case "Critical":
      return { hex: "#E24B4A", tw: "text-accent-red bg-accent-red/10 border-accent-red/30" };
    case "High":
      return { hex: "#EF9F27", tw: "text-accent-orange bg-accent-orange/10 border-accent-orange/30" };
    case "Medium":
      return { hex: "#EDC54B", tw: "text-accent-yellow bg-accent-yellow/10 border-accent-yellow/30" };
    case "Low":
      return { hex: "#1D9E75", tw: "text-accent-green bg-accent-green/10 border-accent-green/30" };
  }
}

export function timeAgo(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Safely truncate a string for tooltips / headers.
 */
export function truncate(s: string, n = 80): string {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
