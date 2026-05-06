import { supabase } from "./supabase.js";

export type ClaimResult =
  | { ok: true; claimedUntil: string }
  | { ok: false; reason: "already_claimed" | "unknown"; message: string };

export async function claimLead(assessmentId: string, force = false): Promise<ClaimResult> {
  const { data, error } = await supabase.rpc("claim_assessment", {
    p_assessment_id: assessmentId,
    p_minutes: 15,
    p_force: force,
  });
  if (error) {
    if (error.message.toLowerCase().includes("already claimed")) {
      return { ok: false, reason: "already_claimed", message: error.message };
    }
    return { ok: false, reason: "unknown", message: error.message };
  }
  return { ok: true, claimedUntil: data as string };
}

export async function releaseLead(assessmentId: string): Promise<void> {
  await supabase.rpc("release_assessment", { p_assessment_id: assessmentId });
}
