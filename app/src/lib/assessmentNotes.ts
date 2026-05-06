import { supabase } from "./supabase.js";

export interface AssessmentNote {
  id: string;
  assessmentId: string;
  authorId: string;
  authorName: string | null;
  authorRole: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

interface NoteRow {
  id: string;
  assessment_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
}

export async function getNotesForAssessment(assessmentId: string): Promise<AssessmentNote[]> {
  const { data } = await supabase
    .from("sales_assessment_notes")
    .select("id, assessment_id, author_id, body, created_at, updated_at")
    .eq("assessment_id", assessmentId)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as NoteRow[];
  if (rows.length === 0) return [];

  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const { data: profiles } = await supabase
    .from("sales_profiles")
    .select("id, full_name, email, role")
    .in("id", authorIds);

  const byId = new Map(((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]));

  return rows.map((r) => {
    const author = byId.get(r.author_id);
    return {
      id: r.id,
      assessmentId: r.assessment_id,
      authorId: r.author_id,
      authorName: author?.full_name ?? author?.email ?? null,
      authorRole: author?.role ?? null,
      body: r.body,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });
}

export async function addAssessmentNote(
  assessmentId: string,
  body: string,
): Promise<AssessmentNote | null> {
  const { data: userData } = await supabase.auth.getUser();
  const authorId = userData.user?.id;
  if (!authorId) return null;

  const { data } = await supabase
    .from("sales_assessment_notes")
    .insert({ assessment_id: assessmentId, author_id: authorId, body })
    .select("id, assessment_id, author_id, body, created_at, updated_at")
    .single();

  if (!data) return null;
  const row = data as NoteRow;

  const { data: profile } = await supabase
    .from("sales_profiles")
    .select("full_name, email, role")
    .eq("id", authorId)
    .maybeSingle();

  const p = profile as { full_name: string | null; email: string; role: string } | null;

  return {
    id: row.id,
    assessmentId: row.assessment_id,
    authorId: row.author_id,
    authorName: p?.full_name ?? p?.email ?? null,
    authorRole: p?.role ?? null,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateAssessmentNote(id: string, body: string): Promise<void> {
  await supabase.from("sales_assessment_notes").update({ body }).eq("id", id);
}

export async function deleteAssessmentNote(id: string): Promise<void> {
  await supabase.from("sales_assessment_notes").delete().eq("id", id);
}
