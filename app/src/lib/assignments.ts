import { supabase } from "./supabase.js";

export async function assignLead(assessmentId: string, assigneeId: string | null): Promise<void> {
  await supabase.rpc("assign_assessment", {
    p_assessment_id: assessmentId,
    p_assignee_id: assigneeId,
  });
}
