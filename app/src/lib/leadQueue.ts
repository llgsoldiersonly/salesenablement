/**
 * Lead Queue — what closers see when they sign in.
 *
 * Returns recent assessments (created by openers) along with their most-recent
 * call status, so a closer can pick a fresh lead and start a call without
 * hunting through the report list.
 */

import { supabase } from "./supabase.js";
import type { ProbeReport } from "../types/index.js";
import type { Database } from "./database.types.js";

export type CallOutcome = Database["public"]["Enums"]["sales_call_outcome"];

export type LeadStatus =
  | "open"
  | "in_progress"
  | "won"
  | "lost"
  | "follow_up"
  | "no_decision"
  | "callback"
  | "not_interested";

export interface LeadQueueItem {
  assessmentId: string;
  report: ProbeReport;
  createdAt: string;
  openerId: string;
  openerName: string | null;
  status: LeadStatus;
  lastCallAt: string | null;
  lastCallCloserId: string | null;
  callCount: number;
  coverageScore: number | null;
  nextActionAt: string | null;
  lastActivityAt: string;
  claimedById: string | null;
  claimedByName: string | null;
  claimedUntil: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactRole: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
}

interface AssessmentRow {
  id: string;
  created_at: string;
  created_by: string;
  report: unknown;
  coverage_score: number | null;
  claimed_by: string | null;
  claimed_until: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_role: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
}

interface CallRow {
  assessment_id: string;
  closer_id: string | null;
  outcome: CallOutcome | null;
  created_at: string;
  next_action_at: string | null;
}

interface NoteRow {
  assessment_id: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
}

function outcomeToStatus(outcome: CallOutcome | null): LeadStatus {
  switch (outcome) {
    case "closed_won": return "won";
    case "closed_lost": return "lost";
    case "follow_up_scheduled": return "follow_up";
    case "no_decision": return "no_decision";
    case "callback_requested": return "callback";
    case "not_interested": return "not_interested";
    case null: return "in_progress";
  }
}

export interface LeadQueuePage {
  items: LeadQueueItem[];
  hasMore: boolean;
  nextCursor: string | null;
}

export async function getLeadQueue(
  options: { limit?: number; before?: string | null } = {},
): Promise<LeadQueuePage> {
  const limit = options.limit ?? 50;
  let q = supabase
    .from("sales_assessments")
    .select(
      "id, created_at, created_by, report, coverage_score, claimed_by, claimed_until, contact_name, contact_phone, contact_email, contact_role, assigned_to, assigned_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit + 1); // fetch one extra to detect hasMore

  if (options.before) {
    q = q.lt("created_at", options.before);
  }

  const { data: assessments } = await q;

  const allRows = (assessments ?? []) as AssessmentRow[];
  const hasMore = allRows.length > limit;
  const rows = hasMore ? allRows.slice(0, limit) : allRows;
  if (rows.length === 0) return { items: [], hasMore: false, nextCursor: null };

  const assessmentIds = rows.map((r) => r.id);
  const openerIds = Array.from(
    new Set([
      ...rows.map((r) => r.created_by),
      ...rows.map((r) => r.claimed_by).filter((id): id is string => !!id),
      ...rows.map((r) => r.assigned_to).filter((id): id is string => !!id),
    ]),
  );

  const [callsRes, notesRes, profilesRes] = await Promise.all([
    supabase
      .from("sales_calls")
      .select("assessment_id, closer_id, outcome, created_at, next_action_at")
      .in("assessment_id", assessmentIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("sales_assessment_notes")
      .select("assessment_id, created_at")
      .in("assessment_id", assessmentIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("sales_profiles")
      .select("id, full_name, email")
      .in("id", openerIds),
  ]);

  const calls = (callsRes.data ?? []) as CallRow[];
  const notes = (notesRes.data ?? []) as NoteRow[];
  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const callsByAssessment = new Map<string, CallRow[]>();
  calls.forEach((c) => {
    const list = callsByAssessment.get(c.assessment_id) ?? [];
    list.push(c);
    callsByAssessment.set(c.assessment_id, list);
  });

  const latestNoteByAssessment = new Map<string, string>();
  notes.forEach((n) => {
    if (!latestNoteByAssessment.has(n.assessment_id)) {
      latestNoteByAssessment.set(n.assessment_id, n.created_at);
    }
  });

  const items: LeadQueueItem[] = rows.map((row) => {
    const myCalls = callsByAssessment.get(row.id) ?? [];
    const latest = myCalls[0];
    const opener = profileById.get(row.created_by);

    const status: LeadStatus = latest
      ? outcomeToStatus(latest.outcome)
      : "open";

    // Pull the soonest upcoming next_action_at across all calls (most recent
    // call wins if there are duplicates — model only sets it on the latest).
    const nextActionAt =
      myCalls.find((c) => c.next_action_at !== null)?.next_action_at ?? null;

    const noteAt = latestNoteByAssessment.get(row.id);
    const lastActivityAt = [
      latest?.created_at,
      noteAt,
      row.created_at,
    ]
      .filter((d): d is string => !!d)
      .sort()
      .at(-1)!;

    const claimer = row.claimed_by ? profileById.get(row.claimed_by) : undefined;
    const claimActive =
      row.claimed_by &&
      row.claimed_until &&
      new Date(row.claimed_until).getTime() > Date.now();

    return {
      assessmentId: row.id,
      report: row.report as ProbeReport,
      createdAt: row.created_at,
      openerId: row.created_by,
      openerName: opener?.full_name ?? opener?.email ?? null,
      status,
      lastCallAt: latest?.created_at ?? null,
      lastCallCloserId: latest?.closer_id ?? null,
      callCount: myCalls.length,
      coverageScore: row.coverage_score,
      nextActionAt,
      lastActivityAt,
      claimedById: claimActive ? row.claimed_by : null,
      claimedByName: claimActive ? claimer?.full_name ?? claimer?.email ?? null : null,
      claimedUntil: claimActive ? row.claimed_until : null,
      contactName: row.contact_name,
      contactPhone: row.contact_phone,
      contactEmail: row.contact_email,
      contactRole: row.contact_role,
      assignedToId: row.assigned_to,
      assignedToName: row.assigned_to
        ? profileById.get(row.assigned_to)?.full_name
            ?? profileById.get(row.assigned_to)?.email
            ?? null
        : null,
      assignedAt: row.assigned_at,
    };
  });

  return {
    items,
    hasMore,
    nextCursor: hasMore ? rows[rows.length - 1].created_at : null,
  };
}
