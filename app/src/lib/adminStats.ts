import { supabase } from "./supabase.js";
import type { SalesProfile } from "./auth.js";
import type { Database } from "./database.types.js";

export type Period = "week" | "month";
export type SalesRole = Database["public"]["Enums"]["sales_role"];

export interface EmployeeStats {
  profile: SalesProfile;
  assessments: number;
  calls: number;
  won: number;
  lost: number;
  revenueCents: number;
  winRate: number;
  avgCallMinutes: number;
  topObjections: string[];
}

export interface ActivityItem {
  id: string;
  actorName: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

function periodStart(period: Period): string {
  const d = new Date();
  if (period === "week") {
    d.setDate(d.getDate() - d.getDay());
  } else {
    d.setDate(1);
  }
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getTeamStats(period: Period): Promise<EmployeeStats[]> {
  const since = periodStart(period);

  const [profilesRes, assessmentsRes, callsRes] = await Promise.all([
    supabase.from("sales_profiles").select("*").eq("active", true).order("full_name"),
    supabase.from("sales_assessments").select("created_by").gte("created_at", since),
    supabase
      .from("sales_calls")
      .select("opener_id, closer_id, outcome, duration_seconds, contract_value_cents, objections_hit")
      .gte("created_at", since),
  ]);

  const profiles = (profilesRes.data ?? []) as SalesProfile[];
  const assessments = assessmentsRes.data ?? [];
  const calls = callsRes.data ?? [];

  return profiles.map((profile) => {
    const myAssessments = assessments.filter((a) => a.created_by === profile.id).length;
    const myCalls = calls.filter(
      (c) => c.opener_id === profile.id || c.closer_id === profile.id,
    );
    const myWon = myCalls.filter((c) => c.outcome === "closed_won");
    const myLost = myCalls.filter((c) => c.outcome === "closed_lost");
    const revenueCents = myWon.reduce((s, c) => s + (c.contract_value_cents ?? 0), 0);
    const winRate =
      myCalls.length > 0 ? Math.round((myWon.length / myCalls.length) * 100) : 0;
    const totalSec = myCalls.reduce((s, c) => s + (c.duration_seconds ?? 0), 0);
    const avgCallMinutes =
      myCalls.length > 0 ? Math.round(totalSec / myCalls.length / 60) : 0;

    const objCount: Record<string, number> = {};
    myCalls.forEach((c) =>
      ((c.objections_hit as string[] | null) ?? []).forEach((o) => {
        objCount[o] = (objCount[o] ?? 0) + 1;
      }),
    );
    const topObjections = Object.entries(objCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);

    return {
      profile,
      assessments: myAssessments,
      calls: myCalls.length,
      won: myWon.length,
      lost: myLost.length,
      revenueCents,
      winRate,
      avgCallMinutes,
      topObjections,
    };
  });
}

export async function getAllProfiles(): Promise<SalesProfile[]> {
  const { data } = await supabase
    .from("sales_profiles")
    .select("*")
    .order("full_name");
  return (data ?? []) as SalesProfile[];
}

export async function updateProfileRole(id: string, role: SalesRole): Promise<void> {
  await supabase.from("sales_profiles").update({ role }).eq("id", id);
}

export async function setProfileActive(id: string, active: boolean): Promise<void> {
  await supabase.from("sales_profiles").update({ active }).eq("id", id);
}

export async function getRecentActivity(limit = 30): Promise<ActivityItem[]> {
  const { data } = await supabase
    .from("sales_activity")
    .select(
      "id, action, metadata, created_at, sales_profiles!sales_activity_actor_id_fkey(full_name, email)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return [];

  return (data as unknown as Array<{
    id: string;
    action: string;
    metadata: Record<string, unknown> | null;
    created_at: string;
    sales_profiles: { full_name: string | null; email: string } | null;
  }>).map((row) => ({
    id: row.id,
    actorName: row.sales_profiles?.full_name ?? row.sales_profiles?.email ?? "Unknown",
    action: row.action,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }));
}
