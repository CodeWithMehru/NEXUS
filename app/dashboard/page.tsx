"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import CommandCenter from "@/components/CommandCenter";
import type { NexusReport } from "@/lib/types";

const STORAGE_KEY = "nexus:lastReport";

/**
 * /dashboard — Command Center (Pillar 2 · Vanguard Mode).
 *
 * Hydrates the most recent NexusReport from sessionStorage so the operator
 * can flow seamlessly from External Pillar → Internal Pillar.
 *
 * The Reset button (rendered inside CommandCenter) bubbles a callback that:
 *   1. Clears sessionStorage (`nexus:lastReport`)
 *   2. Resets local state (uploads, alerts, simulator results, oracle messages)
 *   3. Navigates back to /  (a fresh landing screen, no residue)
 */
export default function DashboardPage() {
  const router = useRouter();
  const [report, setReport] = React.useState<NexusReport | null>(null);
  const [businessId, setBusinessId] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

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
      /* sessionStorage unavailable */
    } finally {
      setHydrated(true);
    }
  }, []);

  function handleReset() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setReport(null);
    setBusinessId(null);
    router.replace("/");
  }

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-5 animate-spin text-accent-blue" />
      </main>
    );
  }

  return (
    <main className="container relative px-4 py-6 md:py-10">
      <CommandCenter
        report={report}
        businessId={businessId}
        onReset={handleReset}
      />
    </main>
  );
}
