import { supabase } from "./supabase.js";

export type Rating = -1 | 1;

export interface BriefFeedbackSummary {
  myRating: Rating | null;
  upCount: number;
  downCount: number;
}

interface FeedbackRow {
  id: string;
  brief_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
}

export async function getBriefFeedback(briefId: string): Promise<BriefFeedbackSummary> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id ?? null;

  const { data } = await supabase
    .from("sales_brief_feedback")
    .select("id, brief_id, user_id, rating, comment")
    .eq("brief_id", briefId);

  const rows = (data ?? []) as FeedbackRow[];
  const upCount = rows.filter((r) => r.rating === 1).length;
  const downCount = rows.filter((r) => r.rating === -1).length;
  const mine = uid ? rows.find((r) => r.user_id === uid) : undefined;

  return {
    myRating: mine ? ((mine.rating === 1 ? 1 : -1) as Rating) : null,
    upCount,
    downCount,
  };
}

export async function setBriefFeedback(
  briefId: string,
  assessmentId: string,
  rating: Rating,
  comment?: string,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;

  await supabase.from("sales_brief_feedback").upsert(
    {
      brief_id: briefId,
      assessment_id: assessmentId,
      user_id: uid,
      rating,
      comment: comment?.trim() || null,
    },
    { onConflict: "brief_id,user_id" },
  );
}

export async function clearBriefFeedback(briefId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;
  await supabase
    .from("sales_brief_feedback")
    .delete()
    .eq("brief_id", briefId)
    .eq("user_id", uid);
}
