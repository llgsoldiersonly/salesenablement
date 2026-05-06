import { supabase } from "./supabase.js";

export interface CoachNote {
  id: string;
  repId: string;
  authorId: string;
  authorName: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

interface NoteRow {
  id: string;
  rep_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
}

export async function getNotesForRep(repId: string): Promise<CoachNote[]> {
  const { data } = await supabase
    .from("sales_coach_notes")
    .select("id, rep_id, author_id, body, created_at, updated_at")
    .eq("rep_id", repId)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as NoteRow[];
  if (rows.length === 0) return [];

  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const { data: profiles } = await supabase
    .from("sales_profiles")
    .select("id, full_name, email")
    .in("id", authorIds);

  const byId = new Map(((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]));

  return rows.map((r) => {
    const author = byId.get(r.author_id);
    return {
      id: r.id,
      repId: r.rep_id,
      authorId: r.author_id,
      authorName: author?.full_name ?? author?.email ?? null,
      body: r.body,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });
}

export async function getMyNotes(repId: string): Promise<CoachNote[]> {
  return getNotesForRep(repId);
}

export async function addCoachNote(repId: string, body: string): Promise<CoachNote | null> {
  const { data: userData } = await supabase.auth.getUser();
  const authorId = userData.user?.id;
  if (!authorId) return null;

  const { data } = await supabase
    .from("sales_coach_notes")
    .insert({ rep_id: repId, author_id: authorId, body })
    .select("id, rep_id, author_id, body, created_at, updated_at")
    .single();

  if (!data) return null;
  const row = data as NoteRow;

  const { data: profile } = await supabase
    .from("sales_profiles")
    .select("full_name, email")
    .eq("id", authorId)
    .maybeSingle();

  const p = profile as ProfileRow | null;

  return {
    id: row.id,
    repId: row.rep_id,
    authorId: row.author_id,
    authorName: p?.full_name ?? p?.email ?? null,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateCoachNote(id: string, body: string): Promise<void> {
  await supabase.from("sales_coach_notes").update({ body }).eq("id", id);
}

export async function deleteCoachNote(id: string): Promise<void> {
  await supabase.from("sales_coach_notes").delete().eq("id", id);
}
