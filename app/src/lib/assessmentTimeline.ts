/**
 * Activity timeline — merges every event on a single assessment into one
 * chronological feed: lead created, brief generated, calls logged, notes
 * posted. Used by the Activity tab so anyone picking up a lead can see the
 * full chain at a glance.
 */

import { supabase } from "./supabase.js";
import type { Database } from "./database.types.js";

export type CallOutcome = Database["public"]["Enums"]["sales_call_outcome"];

export type TimelineEventType =
  | "assessment_created"
  | "brief_generated"
  | "call_ended"
  | "note_added";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  at: string;
  actorId: string | null;
  actorName: string | null;
  // Type-specific fields
  callOutcome?: CallOutcome | null;
  callDurationSeconds?: number | null;
  callContractValueCents?: number | null;
  callPackageSold?: string | null;
  callNotes?: string | null;
  noteBody?: string;
  briefTokens?: { input: number; output: number; cacheRead: number; cacheWrite: number };
}

interface AssessmentRow {
  id: string;
  created_at: string;
  created_by: string;
}

interface BriefRow {
  id: string;
  generated_by: string;
  created_at: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens: number | null;
  cache_write_tokens: number | null;
}

interface CallRow {
  id: string;
  closer_id: string | null;
  opener_id: string;
  outcome: CallOutcome | null;
  duration_seconds: number | null;
  contract_value_cents: number | null;
  package_sold: string | null;
  notes: string | null;
  ended_at: string | null;
  started_at: string;
}

interface NoteRow {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
}

export async function getAssessmentTimeline(assessmentId: string): Promise<TimelineEvent[]> {
  const [assessmentRes, briefsRes, callsRes, notesRes] = await Promise.all([
    supabase
      .from("sales_assessments")
      .select("id, created_at, created_by")
      .eq("id", assessmentId)
      .maybeSingle(),
    supabase
      .from("sales_briefs")
      .select("id, generated_by, created_at, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens")
      .eq("assessment_id", assessmentId)
      .order("created_at", { ascending: true }),
    supabase
      .from("sales_calls")
      .select("id, closer_id, opener_id, outcome, duration_seconds, contract_value_cents, package_sold, notes, ended_at, started_at")
      .eq("assessment_id", assessmentId)
      .order("started_at", { ascending: true }),
    supabase
      .from("sales_assessment_notes")
      .select("id, author_id, body, created_at")
      .eq("assessment_id", assessmentId)
      .order("created_at", { ascending: true }),
  ]);

  const assessment = assessmentRes.data as AssessmentRow | null;
  const briefs = (briefsRes.data ?? []) as BriefRow[];
  const calls = (callsRes.data ?? []) as CallRow[];
  const notes = (notesRes.data ?? []) as NoteRow[];

  const profileIds = Array.from(
    new Set(
      [
        assessment?.created_by,
        ...briefs.map((b) => b.generated_by),
        ...calls.flatMap((c) => [c.opener_id, c.closer_id]),
        ...notes.map((n) => n.author_id),
      ].filter((id): id is string => !!id),
    ),
  );

  const { data: profiles } = profileIds.length
    ? await supabase
        .from("sales_profiles")
        .select("id, full_name, email")
        .in("id", profileIds)
    : { data: [] };

  const byId = new Map(((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]));
  const nameOf = (id: string | null | undefined) => {
    if (!id) return null;
    const p = byId.get(id);
    return p?.full_name ?? p?.email ?? null;
  };

  const events: TimelineEvent[] = [];

  if (assessment) {
    events.push({
      id: `assessment:${assessment.id}`,
      type: "assessment_created",
      at: assessment.created_at,
      actorId: assessment.created_by,
      actorName: nameOf(assessment.created_by),
    });
  }

  briefs.forEach((b) => {
    events.push({
      id: `brief:${b.id}`,
      type: "brief_generated",
      at: b.created_at,
      actorId: b.generated_by,
      actorName: nameOf(b.generated_by),
      briefTokens: {
        input: b.input_tokens ?? 0,
        output: b.output_tokens ?? 0,
        cacheRead: b.cache_read_tokens ?? 0,
        cacheWrite: b.cache_write_tokens ?? 0,
      },
    });
  });

  calls.forEach((c) => {
    const actor = c.closer_id ?? c.opener_id;
    events.push({
      id: `call:${c.id}`,
      type: "call_ended",
      at: c.ended_at ?? c.started_at,
      actorId: actor,
      actorName: nameOf(actor),
      callOutcome: c.outcome,
      callDurationSeconds: c.duration_seconds,
      callContractValueCents: c.contract_value_cents,
      callPackageSold: c.package_sold,
      callNotes: c.notes,
    });
  });

  notes.forEach((n) => {
    events.push({
      id: `note:${n.id}`,
      type: "note_added",
      at: n.created_at,
      actorId: n.author_id,
      actorName: nameOf(n.author_id),
      noteBody: n.body,
    });
  });

  // Newest first
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return events;
}
