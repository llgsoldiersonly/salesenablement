import { supabase } from "./supabase.js";

export type NotificationType =
  | "coach_note"
  | "strategy_note"
  | "claim_takeover"
  | "follow_up_due";

export interface Notification {
  id: string;
  type: NotificationType | string;
  body: string;
  actorId: string | null;
  linkAssessmentId: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  body: string;
  actor_id: string | null;
  link_assessment_id: string | null;
  read_at: string | null;
  created_at: string;
}

export async function getNotifications(limit = 30): Promise<Notification[]> {
  const { data } = await supabase
    .from("sales_notifications")
    .select("id, user_id, type, body, actor_id, link_assessment_id, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as NotificationRow[]).map((r) => ({
    id: r.id,
    type: r.type,
    body: r.body,
    actorId: r.actor_id,
    linkAssessmentId: r.link_assessment_id,
    readAt: r.read_at,
    createdAt: r.created_at,
  }));
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase
    .from("sales_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;
  await supabase
    .from("sales_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", uid)
    .is("read_at", null);
}
