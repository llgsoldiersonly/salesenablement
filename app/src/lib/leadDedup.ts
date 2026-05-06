import { supabase } from "./supabase.js";
import type { ProbeReport } from "../types/index.js";

export interface ExistingLead {
  id: string;
  firmName: string;
  createdAt: string;
  createdBy: string;
  createdByName: string | null;
  report: ProbeReport;
}

/** Mirror the Postgres generated column logic so the client can preview matches. */
export function normalizeUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

interface AssessmentRow {
  id: string;
  firm_name: string;
  created_at: string;
  created_by: string;
  report: unknown;
  sales_profiles: { full_name: string | null; email: string } | null;
}

export async function findExistingLeadByUrl(url: string): Promise<ExistingLead | null> {
  const normalized = normalizeUrl(url);
  if (!normalized) return null;

  const { data } = await supabase
    .from("sales_assessments")
    .select(
      "id, firm_name, created_at, created_by, report, sales_profiles!sales_assessments_created_by_fkey(full_name, email)",
    )
    .eq("firm_url_normalized", normalized)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as AssessmentRow;
  return {
    id: row.id,
    firmName: row.firm_name,
    createdAt: row.created_at,
    createdBy: row.created_by,
    createdByName: row.sales_profiles?.full_name ?? row.sales_profiles?.email ?? null,
    report: row.report as ProbeReport,
  };
}
