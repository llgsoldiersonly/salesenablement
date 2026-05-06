/**
 * Invitations — admins gate signups by pre-approving emails.
 *
 * Flow:
 *   1. Admin calls inviteTeammate(email, role) — adds to sales_invitations
 *   2. Admin shares the app URL with the invitee (Slack/email/etc)
 *   3. Invitee enters email on SignIn → is_email_allowed RPC confirms they're invited
 *   4. They get the magic link, click it, the signup trigger sees the invite
 *      and creates their profile with the role specified in the invite
 *   5. Invite is marked accepted_at
 *
 * If a non-invited email tries to sign in, the SignIn screen shows a friendly
 * error before sending the magic link, and the DB trigger rejects it as a
 * defense-in-depth fallback.
 */

import { supabase } from "./supabase.js";
import type { Database } from "./database.types.js";

export type SalesRole = Database["public"]["Enums"]["sales_role"];

export interface Invitation {
  id: string;
  email: string;
  role: SalesRole;
  invitedBy: string | null;
  invitedByName: string | null;
  invitedAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

export async function inviteTeammate(email: string, role: SalesRole): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const { error } = await supabase
    .from("sales_invitations")
    .insert({ email: trimmed, role });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That email already has an invitation. Revoke it first to re-invite." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function getInvitations(): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from("sales_invitations")
    .select(
      "id, email, role, invited_by, invited_at, accepted_at, revoked_at, sales_profiles!sales_invitations_invited_by_fkey(full_name, email)",
    )
    .order("invited_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as Array<{
    id: string;
    email: string;
    role: SalesRole;
    invited_by: string | null;
    invited_at: string;
    accepted_at: string | null;
    revoked_at: string | null;
    sales_profiles: { full_name: string | null; email: string } | null;
  }>).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    invitedBy: row.invited_by,
    invitedByName: row.sales_profiles?.full_name ?? row.sales_profiles?.email ?? null,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
  }));
}

export async function revokeInvitation(id: string): Promise<void> {
  await supabase
    .from("sales_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
}

export async function deleteInvitation(id: string): Promise<void> {
  await supabase.from("sales_invitations").delete().eq("id", id);
}

export async function isEmailAllowed(email: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_email_allowed", {
    p_email: email.trim(),
  });
  if (error) {
    // Fail open in dev (RPC may not be deployed) — the trigger is the real gate
    console.error("is_email_allowed failed:", error.message);
    return true;
  }
  return Boolean(data);
}
