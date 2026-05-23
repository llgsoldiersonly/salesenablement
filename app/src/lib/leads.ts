/**
 * Leads management — Supabase-backed.
 *
 * Sales_leads is 1:1 with sales_assessments. A DB trigger auto-creates a
 * lead row on every new assessment (and the migration backfills existing
 * ones), so the app never needs to insert leads manually — it only reads
 * and updates.
 *
 * Status moves are manual per product decision; only the underlying audit
 * fields (status_changed_at, first_interest_at, lost_at) are maintained by
 * a DB trigger.
 */

import { supabase } from "./supabase.js";

export type LeadStatus =
  | "blank"
  | "emailed"
  | "spoke_with_attorney"
  | "zoom_scheduled"
  | "post_zoom"
  | "second_zoom"
  | "lost_lead"
  | "signed";

export const LEAD_STATUS_ORDER: readonly LeadStatus[] = [
  "blank",
  "emailed",
  "spoke_with_attorney",
  "zoom_scheduled",
  "post_zoom",
  "second_zoom",
  "lost_lead",
  "signed",
] as const;

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  blank: "Blank",
  emailed: "Emailed",
  spoke_with_attorney: "Spoke with Attorney",
  zoom_scheduled: "Zoom Scheduled",
  post_zoom: "Post Zoom",
  second_zoom: "2nd Zoom",
  lost_lead: "Lost Lead",
  signed: "Signed",
};

/** Statuses that indicate the lead has progressed past initial contact.
 *  Used by the 16-day stale-deal sweeper (rule E). */
export const INTEREST_STATUSES: readonly LeadStatus[] = [
  "spoke_with_attorney",
  "zoom_scheduled",
  "post_zoom",
  "second_zoom",
  "signed",
] as const;

export interface Lead {
  id: string;
  assessment_id: string;
  status: LeadStatus;
  status_changed_at: string;
  first_interest_at: string | null;
  lost_at: string | null;
  ready_for_closer: boolean;
  ready_for_closer_at: string | null;
  priority: number;
  pinned: boolean;
  tags: string[];
  owner_opener_id: string | null;
  owner_closer_id: string | null;
  contact_address: string | null;
  decision_maker_name: string | null;
  decision_maker_title: string | null;
  decision_maker_confirmed: boolean;
  best_time_to_call: string | null;
  gatekeeper_notes: string | null;
  quoted_package: string | null;
  quoted_value_cents: number | null;
  win_confidence: number | null;
  signed_at: string | null;
  signed_package: string | null;
  signed_value_cents: number | null;
  lost_reason: string | null;
  last_flip_at: string | null;
  flipped_to_closer_id: string | null;
  flip_message_sent_at: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface LeadWithAssessment extends Lead {
  firm_name: string;
  firm_url: string;
  firm_city: string;
  firm_state: string;
  firm_practice_area: string;
  coverage_score: number | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_role: string | null;
}

const SELECT_WITH_ASSESSMENT = `
  *,
  sales_assessments!sales_leads_assessment_id_fkey(
    firm_name, firm_url, firm_city, firm_state, firm_practice_area,
    coverage_score, contact_name, contact_email, contact_phone, contact_role
  )
`;

interface LeadJoinRow extends Lead {
  sales_assessments: {
    firm_name: string;
    firm_url: string;
    firm_city: string;
    firm_state: string;
    firm_practice_area: string;
    coverage_score: number | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    contact_role: string | null;
  } | null;
}

function flatten(row: LeadJoinRow): LeadWithAssessment {
  const a = row.sales_assessments;
  return {
    ...row,
    firm_name: a?.firm_name ?? "",
    firm_url: a?.firm_url ?? "",
    firm_city: a?.firm_city ?? "",
    firm_state: a?.firm_state ?? "",
    firm_practice_area: a?.firm_practice_area ?? "",
    coverage_score: a?.coverage_score ?? null,
    contact_name: a?.contact_name ?? null,
    contact_email: a?.contact_email ?? null,
    contact_phone: a?.contact_phone ?? null,
    contact_role: a?.contact_role ?? null,
  };
}

export async function listLeads(): Promise<LeadWithAssessment[]> {
  const { data, error } = await supabase
    .from("sales_leads" as never)
    .select(SELECT_WITH_ASSESSMENT)
    .order("pinned", { ascending: false })
    .order("priority", { ascending: false })
    .order("status_changed_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("listLeads failed:", error.message);
    return [];
  }
  return (data ?? []).map((row) => flatten(row as unknown as LeadJoinRow));
}

export async function getLeadById(id: string): Promise<LeadWithAssessment | null> {
  const { data, error } = await supabase
    .from("sales_leads" as never)
    .select(SELECT_WITH_ASSESSMENT)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return flatten(data as unknown as LeadJoinRow);
}

export async function getLeadByAssessment(
  assessmentId: string,
): Promise<LeadWithAssessment | null> {
  const { data, error } = await supabase
    .from("sales_leads" as never)
    .select(SELECT_WITH_ASSESSMENT)
    .eq("assessment_id", assessmentId)
    .maybeSingle();
  if (error || !data) return null;
  return flatten(data as unknown as LeadJoinRow);
}

/**
 * Toggle the persistent "ready for closer" flag. Fires a sales_activity row
 * for audit so admins can see who marked what when.
 *
 * For the transient "live flip in progress" signal (call event-driven),
 * see the Option B webhook integration roadmap.
 */
export async function setReadyForCloser(
  leadId: string,
  ready: boolean,
): Promise<Lead | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;
  const { data, error } = await supabase
    .from("sales_leads" as never)
    .update({ ready_for_closer: ready, updated_by: userId } as never)
    .eq("id", leadId)
    .select("*")
    .single();
  if (error || !data) {
    console.error("setReadyForCloser failed:", error?.message);
    return null;
  }
  if (userId) {
    void supabase.from("sales_activity").insert({
      actor_id: userId,
      action: ready ? "lead.marked_ready_for_closer" : "lead.unmarked_ready_for_closer",
      target_id: leadId,
      target_type: "lead",
    });
  }
  return data as unknown as Lead;
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
): Promise<Lead | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;
  const { data, error } = await supabase
    .from("sales_leads" as never)
    .update({ status, updated_by: userId } as never)
    .eq("id", leadId)
    .select("*")
    .single();
  if (error || !data) {
    console.error("updateLeadStatus failed:", error?.message);
    return null;
  }
  return data as unknown as Lead;
}

/** Generic patch — caller supplies any subset of mutable fields.
 *  Server triggers handle status_changed_at / updated_at / history. */
export async function updateLead(
  leadId: string,
  patch: Partial<Omit<Lead, "id" | "assessment_id" | "created_at" | "created_by">>,
): Promise<Lead | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;
  const { data, error } = await supabase
    .from("sales_leads" as never)
    .update({ ...patch, updated_by: userId } as never)
    .eq("id", leadId)
    .select("*")
    .single();
  if (error || !data) {
    console.error("updateLead failed:", error?.message);
    return null;
  }
  return data as unknown as Lead;
}

/* ── Flip-to-closer (B3) ─────────────────────────────────────────────── */

export interface AvailableCloser {
  id: string;
  full_name: string | null;
  email: string;
  rc_connected: boolean;
}

/**
 * List closers + admins available to receive a flip. Returns those who have
 * connected RingCentral (so we know we can SMS them).
 */
export async function listAvailableClosers(): Promise<AvailableCloser[]> {
  const { data: profiles, error } = await supabase
    .from("sales_profiles")
    .select("id, full_name, email, role, active")
    .in("role", ["closer", "admin"])
    .eq("active", true);
  if (error || !profiles) {
    console.error("listAvailableClosers failed:", error?.message);
    return [];
  }
  const { data: creds } = await supabase
    .from("rc_user_credentials" as never)
    .select("user_id, rc_main_number");
  const credsArr = (creds ?? []) as unknown as Array<{
    user_id: string;
    rc_main_number: string | null;
  }>;
  const connectedSet = new Set(
    credsArr.filter((c) => c.rc_main_number).map((c) => c.user_id),
  );
  const profilesArr = profiles as unknown as Array<{
    id: string;
    full_name: string | null;
    email: string;
  }>;
  return profilesArr.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    rc_connected: connectedSet.has(p.id),
  }));
}

import { getAuthHeader } from "./authHeader.js";

export interface FlipResult {
  ok: boolean;
  smsId?: string;
  error?: string;
  hint?: string;
}

/** Trigger the soft flip — SMS to closer + lead-row stamp. */
export async function flipLead(leadId: string, closerId: string): Promise<FlipResult> {
  const auth = await getAuthHeader();
  const res = await fetch("/api/leads/flip", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ leadId, closerId }),
  });
  try {
    return (await res.json()) as FlipResult;
  } catch {
    return { ok: false, error: `Server returned ${res.status}` };
  }
}

export interface LeadStatusHistoryRow {
  id: string;
  lead_id: string;
  from_status: LeadStatus | null;
  to_status: LeadStatus;
  changed_at: string;
  changed_by: string | null;
  reason: string | null;
}

export interface AssessmentContactPatch {
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_role?: string | null;
}

/**
 * Update contact fields that live on the underlying assessment (not the lead).
 * The lead view inherits these via the JOIN in listLeads().
 */
export async function updateAssessmentContact(
  assessmentId: string,
  patch: AssessmentContactPatch,
): Promise<boolean> {
  const { error } = await supabase
    .from("sales_assessments")
    .update(patch)
    .eq("id", assessmentId);
  if (error) {
    console.error("updateAssessmentContact failed:", error.message);
    return false;
  }
  return true;
}

export async function getLeadStatusHistory(
  leadId: string,
): Promise<LeadStatusHistoryRow[]> {
  const { data, error } = await supabase
    .from("sales_lead_status_history" as never)
    .select("*")
    .eq("lead_id", leadId)
    .order("changed_at", { ascending: false });
  if (error) {
    console.error("getLeadStatusHistory failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as LeadStatusHistoryRow[];
}

/** Group a list of leads into the 8-stage Kanban layout, preserving order
 *  within each lane (already sorted by pinned/priority/status_changed_at). */
export function groupLeadsByStatus(
  leads: LeadWithAssessment[],
): Record<LeadStatus, LeadWithAssessment[]> {
  const empty = LEAD_STATUS_ORDER.reduce(
    (acc, s) => {
      acc[s] = [];
      return acc;
    },
    {} as Record<LeadStatus, LeadWithAssessment[]>,
  );
  for (const lead of leads) {
    empty[lead.status].push(lead);
  }
  return empty;
}
