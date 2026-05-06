/**
 * Closer call history — fetches all calls where the current user was the
 * closer (or opener, since solo reps handle both), plus summary stats.
 */

import { supabase } from "./supabase.js";
import type { Database } from "./database.types.js";

export type CallOutcome = Database["public"]["Enums"]["sales_call_outcome"];

export interface HistoryCall {
  id: string;
  assessmentId: string;
  firmName: string;
  firmCity: string;
  firmState: string;
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

export interface CloserStats {
  totalCalls: number;
  won: number;
  lost: number;
  winRate: number;
  revenueCents: number;
  avgDurationMinutes: number;
}

interface CallRow {
  id: string;
  assessment_id: string;
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

interface AssessmentRow {
  id: string;
  firm_name: string;
  firm_city: string;
  firm_state: string;
}

export async function getCloserHistory(userId: string): Promise<{
  calls: HistoryCall[];
  stats: CloserStats;
}> {
  const [closerCallsRes, openerCallsRes] = await Promise.all([
    supabase
      .from("sales_calls")
      .select("id, assessment_id, outcome, contract_value_cents, package_sold, duration_seconds, notes, objections_hit, triggers_hit, started_at, ended_at")
      .eq("closer_id", userId)
      .order("started_at", { ascending: false }),
    supabase
      .from("sales_calls")
      .select("id, assessment_id, outcome, contract_value_cents, package_sold, duration_seconds, notes, objections_hit, triggers_hit, started_at, ended_at")
      .eq("opener_id", userId)
      .is("closer_id", null)
      .order("started_at", { ascending: false }),
  ]);

  const allCalls = [
    ...((closerCallsRes.data ?? []) as CallRow[]),
    ...((openerCallsRes.data ?? []) as CallRow[]),
  ].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

  const deduped = Array.from(new Map(allCalls.map((c) => [c.id, c])).values());

  if (deduped.length === 0) {
    return { calls: [], stats: { totalCalls: 0, won: 0, lost: 0, winRate: 0, revenueCents: 0, avgDurationMinutes: 0 } };
  }

  const assessmentIds = Array.from(new Set(deduped.map((c) => c.assessment_id)));
  const { data: assessments } = await supabase
    .from("sales_assessments")
    .select("id, firm_name, firm_city, firm_state")
    .in("id", assessmentIds);

  const byId = new Map(
    ((assessments ?? []) as AssessmentRow[]).map((a) => [a.id, a]),
  );

  const calls: HistoryCall[] = deduped.map((c) => {
    const a = byId.get(c.assessment_id);
    return {
      id: c.id,
      assessmentId: c.assessment_id,
      firmName: a?.firm_name ?? "Unknown firm",
      firmCity: a?.firm_city ?? "",
      firmState: a?.firm_state ?? "",
      outcome: c.outcome,
      contractValueCents: c.contract_value_cents,
      packageSold: c.package_sold,
      durationSeconds: c.duration_seconds,
      notes: c.notes,
      objectionsHit: c.objections_hit,
      triggersHit: c.triggers_hit,
      startedAt: c.started_at,
      endedAt: c.ended_at,
    };
  });

  const won = calls.filter((c) => c.outcome === "closed_won").length;
  const lost = calls.filter((c) => c.outcome === "closed_lost").length;
  const revenueCents = calls.reduce((s, c) => s + (c.contractValueCents ?? 0), 0);
  const totalSec = calls.reduce((s, c) => s + (c.durationSeconds ?? 0), 0);
  const withDuration = calls.filter((c) => (c.durationSeconds ?? 0) > 0).length;

  return {
    calls,
    stats: {
      totalCalls: calls.length,
      won,
      lost,
      winRate: calls.length > 0 ? Math.round((won / calls.length) * 100) : 0,
      revenueCents,
      avgDurationMinutes: withDuration > 0 ? Math.round(totalSec / withDuration / 60) : 0,
    },
  };
}
