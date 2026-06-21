import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import {
  createSupabaseAdminClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import type { InternalDataType } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST /api/upload
 * Pillar 2 — The Vault.
 *
 * multipart/form-data:
 *   file:       File (.csv, .pdf, .txt)
 *   type:       'sales' | 'inventory' | 'suppliers' | 'contracts'
 *   businessId: optional uuid
 *
 * Returns { rows, sample, totals, persisted }
 *  - rows:    parsed records from CSV (or 1 PDF/text record)
 *  - sample:  first 5 records (for prompt context)
 *  - totals:  derived totals/aggregates
 *  - persisted: row id in internal_data when Supabase is configured
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart body." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  const typeRaw = (form.get("type") || "sales").toString();
  const businessId = (form.get("businessId") || "").toString().trim() || null;

  const ALLOWED: InternalDataType[] = [
    "sales",
    "inventory",
    "suppliers",
    "contracts",
  ];
  const type: InternalDataType = ALLOWED.includes(typeRaw as InternalDataType)
    ? (typeRaw as InternalDataType)
    : "sales";

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file uploaded." },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json(
      { error: "File is empty." },
      { status: 400 },
    );
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large. Limit 10 MB." },
      { status: 413 },
    );
  }

  const filename = file.name.toLowerCase();
  let rows: Record<string, unknown>[] = [];

  if (filename.endsWith(".csv") || file.type === "text/csv") {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    rows = (parsed.data || []).filter(
      (r) => r && typeof r === "object" && Object.keys(r).length > 0,
    );
  } else if (filename.endsWith(".pdf") || file.type === "application/pdf") {
    // Lightweight PDF capture — store the raw text excerpt.
    // (Full PDF parsing is omitted to keep the dependency footprint lean.)
    const buf = await file.arrayBuffer();
    const text = new TextDecoder("utf-8", { fatal: false }).decode(
      new Uint8Array(buf).slice(0, 32_000),
    );
    rows = [
      {
        filename: file.name,
        sizeBytes: file.size,
        excerpt: text.replace(/[^\x20-\x7E\n]/g, " ").slice(0, 4000),
        ingestedAt: new Date().toISOString(),
      },
    ];
  } else {
    // Fallback: read as text.
    const text = await file.text();
    rows = [
      {
        filename: file.name,
        sizeBytes: file.size,
        content: text.slice(0, 4000),
      },
    ];
  }

  const totals = computeTotals(rows, type);
  const sample = rows.slice(0, 5);

  let persistedId: string | null = null;
  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createSupabaseAdminClient();
      const { data, error } = await supabase
        .from("internal_data")
        .insert({
          business_id: businessId,
          type,
          data: { filename: file.name, rowCount: rows.length, totals, rows },
        })
        .select("id")
        .single();
      if (!error && data?.id) persistedId = data.id;
    } catch {
      /* swallow */
    }
  }

  return NextResponse.json({
    type,
    filename: file.name,
    rowCount: rows.length,
    sample,
    totals,
    persisted: persistedId,
  });
}

/**
 * computeTotals — derive a few useful aggregate signals per dataset type.
 * Used both for the UI (Vault summary) and as Oracle prompt context.
 */
function computeTotals(
  rows: Record<string, unknown>[],
  type: InternalDataType,
): Record<string, number | string> {
  if (rows.length === 0) return { rowCount: 0 };

  const numericKeys = pickNumericKeys(rows);

  const sums: Record<string, number> = {};
  for (const r of rows) {
    for (const k of numericKeys) {
      const n = Number(r[k]);
      if (Number.isFinite(n)) sums[k] = (sums[k] || 0) + n;
    }
  }

  const totals: Record<string, number | string> = {
    rowCount: rows.length,
    type,
  };
  Object.entries(sums).forEach(([k, v]) => {
    totals[`sum_${k}`] = Math.round(v * 100) / 100;
  });

  return totals;
}

function pickNumericKeys(rows: Record<string, unknown>[]): string[] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0] || {});
  return keys.filter((k) => {
    let numericCount = 0;
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
      const n = Number(rows[i]?.[k]);
      if (Number.isFinite(n)) numericCount++;
    }
    return numericCount >= Math.min(rows.length, 50) * 0.6;
  });
}
