/**
 * Assessment storage — Supabase-backed.
 *
 * Replaces the prior localStorage layer. Every assessment is tied to a
 * sales_profiles row via created_by, and RLS ensures users only see what
 * their role allows (own + assigned for openers/closers, all for admins).
 *
 * Public API kept compatible with the old localStorage shape so existing
 * callers (App.tsx, LoadReportDialog, NewAssessmentDialog) continue to work
 * after switching the imports to async.
 *
 * "Active" report id is still tracked in localStorage (per-device UI state,
 * not data) so we don't write to the DB on every tab click.
 */

import { supabase } from "./supabase.js";
import type { ProbeReport } from "../types/index.js";

const ACTIVE_KEY = "llg.activeAssessment.v2";

export interface StoredReport {
  id: string;
  loadedAt: string;
  report: ProbeReport;
  createdBy: string;
  createdByName: string | null;
}

interface AssessmentRow {
  id: string;
  created_at: string;
  created_by: string;
  report: unknown;
  sales_profiles?: { full_name: string | null; email: string } | null;
}

function rowToStored(row: AssessmentRow): StoredReport {
  const profile = row.sales_profiles;
  return {
    id: row.id,
    loadedAt: row.created_at,
    report: row.report as ProbeReport,
    createdBy: row.created_by,
    createdByName: profile?.full_name ?? profile?.email ?? null,
  };
}

const SELECT_WITH_PROFILE =
  "id, created_at, created_by, report, sales_profiles!sales_assessments_created_by_fkey(full_name, email)";

export async function listReports(): Promise<StoredReport[]> {
  const { data, error } = await supabase
    .from("sales_assessments")
    .select(SELECT_WITH_PROFILE)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    // eslint-disable-next-line no-console
    console.error("listReports failed:", error.message);
    return [];
  }
  return (data ?? []).map((row) => rowToStored(row as unknown as AssessmentRow));
}

export async function saveReport(report: ProbeReport): Promise<StoredReport | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    // eslint-disable-next-line no-console
    console.error("saveReport: not signed in");
    return null;
  }

  const { data, error } = await supabase
    .from("sales_assessments")
    .insert({
      created_by: userId,
      firm_name: report.firm.name,
      firm_url: report.firm.url,
      firm_city: report.firm.city,
      firm_state: report.firm.state,
      firm_practice_area: report.firm.practiceArea,
      report: report as unknown as never,
      coverage_score: report.coverageScore,
      brief_input_ready: report.briefInputReady,
    })
    .select(SELECT_WITH_PROFILE)
    .single();

  if (error || !data) {
    // eslint-disable-next-line no-console
    console.error("saveReport failed:", error?.message);
    return null;
  }

  setActiveReport(data.id);

  // Fire-and-forget activity log for admin reporting
  void supabase.from("sales_activity").insert({
    actor_id: userId,
    action: "assessment.created",
    target_id: data.id,
    target_type: "assessment",
    metadata: { firm_name: report.firm.name, coverage_score: report.coverageScore },
  });

  return rowToStored(data as unknown as AssessmentRow);
}

export async function getActiveReport(): Promise<StoredReport | null> {
  const id = localStorage.getItem(ACTIVE_KEY);
  if (!id) return null;
  const { data, error } = await supabase
    .from("sales_assessments")
    .select(SELECT_WITH_PROFILE)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    localStorage.removeItem(ACTIVE_KEY);
    return null;
  }
  return rowToStored(data as unknown as AssessmentRow);
}

export function setActiveReport(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await supabase.from("sales_assessments").delete().eq("id", id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error("deleteReport failed:", error.message);
    return;
  }
  if (localStorage.getItem(ACTIVE_KEY) === id) {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

/**
 * Validate parsed JSON looks like a ProbeReport. Used by LoadReportDialog
 * to accept paste-imported reports before saving.
 */
export function isProbeReport(value: unknown): value is ProbeReport {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.firm === "object" &&
    v.firm != null &&
    typeof (v.firm as Record<string, unknown>).name === "string" &&
    typeof v.sources === "object" &&
    v.sources != null &&
    typeof v.coverageScore === "number"
  );
}
