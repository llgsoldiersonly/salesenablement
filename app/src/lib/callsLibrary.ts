import { supabase } from "./supabase.js";
import type { Database } from "./database.types.js";

export type CallOutcome = Database["public"]["Enums"]["sales_call_outcome"];

export interface LibraryCall {
  id: string;
  assessmentId: string;
  firmName: string;
  firmCity: string;
  firmState: string;
  closerId: string | null;
  closerName: string | null;
  openerId: string;
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
  assessment_id: string;
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

interface AssessmentRow {
  id: string;
  firm_name: string;
  firm_city: string;
  firm_state: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
}

export interface CallsLibraryFilters {
  closerId?: string | null;
  outcome?: CallOutcome | null;
  packageSold?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
}

export async function getCallsLibrary(filters: CallsLibraryFilters = {}): Promise<LibraryCall[]> {
  let q = supabase
    .from("sales_calls")
    .select(
      "id, assessment_id, closer_id, opener_id, outcome, contract_value_cents, package_sold, duration_seconds, notes, objections_hit, triggers_hit, started_at, ended_at",
    )
    .order("started_at", { ascending: false })
    .limit(500);

  if (filters.closerId) q = q.eq("closer_id", filters.closerId);
  if (filters.outcome) q = q.eq("outcome", filters.outcome);
  if (filters.packageSold) q = q.eq("package_sold", filters.packageSold);
  if (filters.fromDate) q = q.gte("started_at", filters.fromDate);
  if (filters.toDate) q = q.lte("started_at", filters.toDate);

  const { data } = await q;
  const rows = (data ?? []) as CallRow[];
  if (rows.length === 0) return [];

  const assessmentIds = Array.from(new Set(rows.map((r) => r.assessment_id)));
  const profileIds = Array.from(
    new Set(
      rows.flatMap((r) => [r.opener_id, r.closer_id]).filter((id): id is string => !!id),
    ),
  );

  const [assessmentsRes, profilesRes] = await Promise.all([
    supabase
      .from("sales_assessments")
      .select("id, firm_name, firm_city, firm_state")
      .in("id", assessmentIds),
    supabase
      .from("sales_profiles")
      .select("id, full_name, email")
      .in("id", profileIds),
  ]);

  const assessmentById = new Map(
    ((assessmentsRes.data ?? []) as AssessmentRow[]).map((a) => [a.id, a]),
  );
  const profileById = new Map(
    ((profilesRes.data ?? []) as ProfileRow[]).map((p) => [p.id, p]),
  );
  const nameOf = (id: string | null) => {
    if (!id) return null;
    const p = profileById.get(id);
    return p?.full_name ?? p?.email ?? null;
  };

  return rows.map((r) => {
    const a = assessmentById.get(r.assessment_id);
    return {
      id: r.id,
      assessmentId: r.assessment_id,
      firmName: a?.firm_name ?? "—",
      firmCity: a?.firm_city ?? "",
      firmState: a?.firm_state ?? "",
      closerId: r.closer_id,
      closerName: nameOf(r.closer_id),
      openerId: r.opener_id,
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
    };
  });
}

export function callsToCsv(calls: LibraryCall[]): string {
  const header = [
    "started_at",
    "firm_name",
    "city",
    "state",
    "closer",
    "opener",
    "outcome",
    "package_sold",
    "contract_value_dollars",
    "duration_seconds",
    "objections",
    "triggers",
    "notes",
  ];
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = Array.isArray(v) ? v.join("|") : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = calls.map((c) =>
    [
      c.startedAt,
      c.firmName,
      c.firmCity,
      c.firmState,
      c.closerName ?? "",
      c.openerName ?? "",
      c.outcome ?? "",
      c.packageSold ?? "",
      c.contractValueCents != null ? (c.contractValueCents / 100).toFixed(2) : "",
      c.durationSeconds ?? "",
      c.objectionsHit ?? [],
      c.triggersHit ?? [],
      c.notes ?? "",
    ]
      .map(escape)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}
