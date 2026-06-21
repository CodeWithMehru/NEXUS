import Link from "next/link";
import { ArrowRight, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border border-nexus-border bg-nexus-card/60 backdrop-blur">
        <BrainCircuit className="text-accent-blue" />
      </div>
      <h1 className="mt-6 font-display text-5xl font-bold tracking-tight">
        404
      </h1>
      <p className="mt-2 text-nexus-muted">
        That signal isn't on our radar.
      </p>
      <Button asChild className="mt-6 gap-2">
        <Link href="/">
          Back to NEXUS
          <ArrowRight size={14} />
        </Link>
      </Button>
    </main>
  );
}
