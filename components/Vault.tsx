"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Box,
  CheckCircle2,
  ChevronDown,
  Database,
  FileSpreadsheet,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  Truck,
  UploadCloud,
  Users2,
  X,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PrivacyNote from "@/components/PrivacyNote";
import { cn } from "@/lib/utils";
import type { InternalDataType } from "@/lib/types";

export interface VaultUpload {
  id: string;
  type: InternalDataType;
  filename: string;
  rowCount: number;
  sizeBytes: number;
  totals: Record<string, number | string>;
  sample: Record<string, unknown>[];
  uploadedAt: string;
}

interface VaultProps {
  businessId?: string | null;
  uploads: VaultUpload[];
  onUploadsChange: (uploads: VaultUpload[]) => void;
  /**
   * Fired when the user clicks the prominent "Analyze with Oracle" button.
   * Receives the latest uploads array — parent decides what to do with it
   * (typically: imperatively call OracleChat.ask(...)).
   */
  onAnalyze?: (uploads: VaultUpload[]) => Promise<void> | void;
  /** Whether the parent is currently running the Oracle analysis. */
  analyzing?: boolean;
  className?: string;
}

const TYPE_META: Record<
  InternalDataType,
  { label: string; Icon: React.ElementType; color: string }
> = {
  sales: { label: "Sales", Icon: FileSpreadsheet, color: "#1D9E75" },
  inventory: { label: "Inventory", Icon: Box, color: "#EF9F27" },
  suppliers: { label: "Suppliers", Icon: Truck, color: "#378ADD" },
  contracts: { label: "Contracts", Icon: Users2, color: "#EDC54B" },
};

/**
 * Vault — file ingestion zone for the Internal Pillar.
 * Supports CSV / PDF / TXT, classifies by type, posts to /api/upload.
 *
 * UX flow:
 *   1. Pick a type chip (sales / inventory / suppliers / contracts)
 *   2. Drop or browse files          → POST /api/upload  → row appears with preview
 *   3. (Optional) toggle row preview to inspect the first 5 parsed rows
 *   4. Click the prominent green "Analyze with Oracle" CTA → onAnalyze(uploads)
 */
export function Vault({
  businessId,
  uploads,
  onUploadsChange,
  onAnalyze,
  analyzing = false,
  className,
}: VaultProps) {
  const [type, setType] = React.useState<InternalDataType>("sales");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);
    try {
      for (const file of list) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("type", type);
        if (businessId) fd.append("businessId", businessId);

        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Upload failed");

        const upload: VaultUpload = {
          id: json.persisted || `local-${Date.now()}-${file.name}`,
          type: json.type,
          filename: json.filename,
          rowCount: json.rowCount,
          sizeBytes: file.size,
          totals: json.totals || {},
          sample: json.sample || [],
          uploadedAt: new Date().toISOString(),
        };
        onUploadsChange([upload, ...uploads]);
        setExpandedId(upload.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeUpload(id: string) {
    onUploadsChange(uploads.filter((u) => u.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function clearAll() {
    onUploadsChange([]);
    setExpandedId(null);
  }

  const totalRows = uploads.reduce((s, u) => s + (u.rowCount || 0), 0);
  const totalBytes = uploads.reduce((s, u) => s + (u.sizeBytes || 0), 0);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud size={16} className="text-accent-blue" />
            The Vault
          </CardTitle>
          <p className="mt-1 text-xs text-nexus-muted">
            Upload sales, inventory, suppliers, or contracts.
          </p>
          <PrivacyNote variant="inline" className="mt-1.5" />
        </div>
        <Badge variant="outline">
          {uploads.length} dataset{uploads.length === 1 ? "" : "s"}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Type tabs */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_META) as InternalDataType[]).map((t) => {
            const meta = TYPE_META[t];
            const active = t === type;
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                  active
                    ? "border-transparent text-white"
                    : "border-nexus-border text-nexus-muted hover:text-nexus-text hover:border-nexus-border",
                )}
                style={
                  active
                    ? {
                        background: `${meta.color}25`,
                        color: meta.color,
                        borderColor: `${meta.color}55`,
                      }
                    : undefined
                }
              >
                <meta.Icon size={13} />
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* Dropzone */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            dragOver
              ? "border-accent-blue bg-accent-blue/5"
              : "border-nexus-border bg-nexus-card/40 hover:border-accent-blue/50 hover:bg-nexus-hover/40",
            (busy || analyzing) && "pointer-events-none opacity-60",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.pdf,.txt,text/csv,application/pdf,text/plain"
            multiple
            disabled={busy || analyzing}
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files);
            }}
            className="hidden"
          />
          {busy ? (
            <Loader2 size={28} className="animate-spin text-accent-blue" />
          ) : (
            <UploadCloud size={28} className="text-accent-blue" />
          )}
          <div className="space-y-1">
            <p className="font-medium text-nexus-text">
              {busy
                ? "Ingesting into the Vault…"
                : "Drop CSV / PDF or click to upload"}
            </p>
            <p className="text-xs text-nexus-muted">
              Max 10 MB · Type:{" "}
              <span className="text-nexus-text">{TYPE_META[type].label}</span>
            </p>
          </div>
        </label>

        {error && (
          <div className="rounded-lg border border-accent-red/40 bg-accent-red/10 p-3 text-sm text-accent-red">
            {error}
          </div>
        )}

        {/* List of uploaded datasets */}
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {uploads.map((u) => {
              const meta = TYPE_META[u.type];
              const isExpanded = expandedId === u.id;
              return (
                <motion.li
                  key={u.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="overflow-hidden rounded-xl border border-nexus-border bg-nexus-card/60"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : u.id)}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-nexus-hover/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: `${meta.color}1A` }}
                      >
                        <meta.Icon size={16} style={{ color: meta.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-nexus-text">
                          {u.filename}
                        </p>
                        <p className="text-xs text-nexus-muted">
                          {meta.label} · {u.rowCount.toLocaleString()} rows
                          {u.sizeBytes
                            ? ` · ${formatBytes(u.sizeBytes)}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <CheckCircle2
                        size={14}
                        className="text-accent-green"
                        aria-label="ingested"
                      />
                      <ChevronDown
                        size={14}
                        className={cn(
                          "text-nexus-muted transition-transform",
                          isExpanded && "rotate-180",
                        )}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeUpload(u.id);
                        }}
                        className="size-7 opacity-60 hover:opacity-100"
                        aria-label="Remove"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="border-t border-nexus-border bg-nexus-bg/30"
                      >
                        <div className="space-y-3 p-3">
                          <PreviewTable rows={u.sample} />
                          <Totals totals={u.totals} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {uploads.length === 0 && (
            <li className="flex items-center gap-2 rounded-lg border border-dashed border-nexus-border/60 p-3 text-xs text-nexus-muted">
              <FileText size={14} />
              The Vault is empty. Upload data to feed the Oracle.
            </li>
          )}
        </ul>
      </CardContent>

      {/* ------------------------------------------------------------------ */}
      {/* Prominent CTA — "Analyze with Oracle"                              */}
      {/* ------------------------------------------------------------------ */}
      {uploads.length > 0 && onAnalyze && (
        <div className="border-t border-nexus-border bg-gradient-to-b from-transparent to-accent-green/5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Database size={14} className="text-accent-green" />
                <span className="section-eyebrow text-accent-green">
                  Ready for Internal Scan
                </span>
              </div>
              <p className="mt-1 text-sm text-nexus-text">
                <span className="font-semibold">{uploads.length}</span> dataset
                {uploads.length === 1 ? "" : "s"} ·{" "}
                <span className="font-semibold">
                  {totalRows.toLocaleString()}
                </span>{" "}
                rows · {formatBytes(totalBytes)} ingested
              </p>
              <p className="mt-1 text-[11px] text-nexus-muted">
                Oracle will quote your numbers verbatim and flag insufficient
                data honestly.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                disabled={analyzing}
                className="gap-1.5 text-nexus-muted hover:text-accent-red"
              >
                <Trash2 size={13} />
                Clear
              </Button>
              <button
                type="button"
                disabled={analyzing}
                onClick={() => onAnalyze(uploads)}
                className={cn(
                  "group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl border border-accent-green/60 bg-accent-green px-5 text-sm font-semibold text-white shadow-[0_0_28px_-6px_rgba(29,158,117,0.65)] transition-all",
                  "hover:border-accent-green hover:bg-accent-green/90 hover:shadow-[0_0_36px_-4px_rgba(29,158,117,0.85)]",
                  "active:translate-y-px",
                  "disabled:cursor-wait disabled:opacity-70",
                )}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                />
                {analyzing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Scanning your data…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Run Full Internal Scan
                    <Zap size={14} className="opacity-80" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Preview helpers
// ----------------------------------------------------------------------------
function PreviewTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows || rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-nexus-border/60 px-3 py-2 text-xs text-nexus-muted">
        No preview rows available for this file.
      </p>
    );
  }
  const columns = Object.keys(rows[0] || {}).slice(0, 6);
  return (
    <div className="overflow-x-auto rounded-md border border-nexus-border">
      <table className="w-full min-w-[500px] text-left text-xs">
        <thead className="bg-nexus-hover/60 text-nexus-muted">
          <tr>
            {columns.map((c) => (
              <th key={c} className="whitespace-nowrap px-2.5 py-1.5 font-medium uppercase tracking-wider">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 5).map((r, i) => (
            <tr
              key={i}
              className="border-t border-nexus-border/60 odd:bg-nexus-card/40"
            >
              {columns.map((c) => (
                <td
                  key={c}
                  className="whitespace-nowrap px-2.5 py-1.5 text-nexus-text"
                >
                  {formatCell(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Totals({ totals }: { totals: Record<string, number | string> }) {
  const entries = Object.entries(totals).filter(
    ([k]) => k !== "rowCount" && k !== "type",
  );
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.slice(0, 6).map(([k, v]) => (
        <Badge
          key={k}
          variant="outline"
          className="font-normal text-[10px] tracking-wide text-nexus-muted"
        >
          {k.replace(/^sum_/, "Σ ")}:{" "}
          <span className="ml-1 text-nexus-text">{String(v)}</span>
        </Badge>
      ))}
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") {
    return v.length > 32 ? `${v.slice(0, 31)}…` : v;
  }
  if (typeof v === "number") {
    return Number.isInteger(v) ? v.toString() : v.toFixed(2);
  }
  if (typeof v === "boolean") return v ? "true" : "false";
  try {
    const s = JSON.stringify(v);
    return s.length > 32 ? `${s.slice(0, 31)}…` : s;
  } catch {
    return String(v);
  }
}

function formatBytes(n: number): string {
  if (!n || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export default Vault;
