import { supabase } from "./supabase.js";
import type { Database } from "./database.types.js";

export type CallOutcome = Database["public"]["Enums"]["sales_call_outcome"];

export interface PriorCall {
  id: string;
  closerId: string | null;
  openerId: string;
  closerName: string | null;
  openerName: string | null;
  outcome: CallOutcome | null;
  contractValueCents: number | null;
  packageSold: string | null;
  durationSeconds: number | null;
  notes: string | null;
  objectionsHit: string[] | null;
  triggersHit: string[] | null;
  startedAt: string;
  endedAt: string | null;
}

interface CallRow {
  id: string;
  closer_id: string | null;
  opener_id: string;
  outcome: CallOutcome | null;
  contract_value_cents: number | null;
  package_sold: string | null;
  duration_seconds: number | null;
  notes: string | null;
  objections_hit: string[] | null;
  triggers_hit: string[] | null;
  started_at: string;
  ended_at: string | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
}

/**
 * Returns prior calls on a single assessment, newest first, with closer/opener
 * display names joined in. Used by the "Prior Activity" panel a closer sees
 * when opening a lead that's been worked before.
 */
export async function getCallsForAssessment(assessmentId: string): Promise<PriorCall[]> {
  const { data } = await supabase
    .from("sales_calls")
    .select(
      "id, closer_id, opener_id, outcome, contract_value_cents, package_sold, duration_seconds, notes, objections_hit, triggers_hit, started_at, ended_at",
    )
    .eq("assessment_id", assessmentId)
    .order("started_at", { ascending: false });

  const rows = (data ?? []) as CallRow[];
  if (rows.length === 0) return [];

  const profileIds = Array.from(
    new Set(rows.flatMap((r) => [r.opener_id, r.closer_id]).filter((id): id is string => !!id)),
  );
  const { data: profiles } = await supabase
    .from("sales_profiles")
    .select("id, full_name, email")
    .in("id", profileIds);

  const byId = new Map(((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]));
  const nameOf = (id: string | null) => {
    if (!id) return null;
    const p = byId.get(id);
    return p?.full_name ?? p?.email ?? null;
  };

  return rows.map((r) => ({
    id: r.id,
    closerId: r.closer_id,
    openerId: r.opener_id,
    closerName: nameOf(r.closer_id),
    openerName: nameOf(r.opener_id),
    outcome: r.outcome,
    contractValueCents: r.contract_value_cents,
    packageSold: r.package_sold,
    durationSeconds: r.duration_seconds,
    notes: r.notes,
    objectionsHit: r.objections_hit,
    triggersHit: r.triggers_hit,
    startedAt: r.started_at,
    endedAt: r.ended_at,
  }));
}
