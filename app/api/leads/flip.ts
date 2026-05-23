/**
 * POST /api/leads/flip
 *
 * Authenticated. Body: { leadId: string, closerId: string }
 *
 * The "soft" flip: doesn't move the live RC call (the opener still does the
 * actual warm transfer in RC's UI). What this endpoint does:
 *   1. Look up the destination closer's RC main_number
 *   2. Send an SMS from the opener's RC: "Listen in on {firm}: <deep link>"
 *   3. Stamp the lead with flipped_to_closer_id + flip_message_sent_at
 *   4. Set ready_for_closer = true on the lead
 *   5. Log to sales_activity for audit
 *
 * The closer's screen-pop (B2) does the rest — when they click the SMS
 * link, /leads opens the matched lead automatically.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { verifyAuth, unauthorizedResponse } from "../../server/verifyAuth.js";
import { rcEnvReady, sendSms } from "../../server/ringcentral.js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL ?? "https://www.llgbot.com";

function safeParse(s: string): { leadId?: string; closerId?: string } | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!rcEnvReady()) {
    res.status(500).json({ ok: false, error: "RingCentral env vars not configured." });
    return;
  }
  const openerId = await verifyAuth(req);
  if (!openerId) {
    unauthorizedResponse(res);
    return;
  }

  const body = (typeof req.body === "string" ? safeParse(req.body) : req.body) ?? {};
  const leadId = typeof body.leadId === "string" ? body.leadId : "";
  const closerId = typeof body.closerId === "string" ? body.closerId : "";
  if (!leadId || !closerId) {
    res.status(400).json({ ok: false, error: "Missing leadId or closerId." });
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Look up the lead + closer's RC number in parallel
  const [leadQuery, closerQuery] = await Promise.all([
    supabase
      .from("sales_leads")
      .select("id, assessment_id, sales_assessments(firm_name)")
      .eq("id", leadId)
      .maybeSingle(),
    supabase
      .from("rc_user_credentials")
      .select("rc_main_number")
      .eq("user_id", closerId)
      .maybeSingle(),
  ]);

  if (leadQuery.error || !leadQuery.data) {
    res.status(404).json({ ok: false, error: "Lead not found." });
    return;
  }
  if (closerQuery.error || !closerQuery.data?.rc_main_number) {
    res.status(400).json({
      ok: false,
      error: "Destination closer hasn't connected RingCentral yet.",
      hint: "Ask them to open the app and click Connect RingCentral.",
    });
    return;
  }

  const lead = leadQuery.data as {
    id: string;
    assessment_id: string;
    sales_assessments: { firm_name: string } | { firm_name: string }[] | null;
  };
  const firmName = Array.isArray(lead.sales_assessments)
    ? lead.sales_assessments[0]?.firm_name
    : lead.sales_assessments?.firm_name;

  const closerNumber = (closerQuery.data as { rc_main_number: string }).rc_main_number;
  const deepLink = `${PUBLIC_APP_URL}/leads?openLead=${leadId}`;

  // Send the SMS
  const smsResult = await sendSms(
    openerId,
    closerNumber,
    `📞 Live flip: ${firmName ?? "lead"} — listen in. Lead context: ${deepLink}`,
  );
  if (!smsResult.ok) {
    res.status(502).json({ ok: false, error: smsResult.error, hint: smsResult.hint });
    return;
  }

  // Stamp the lead + mark ready_for_closer = true
  const now = new Date().toISOString();
  await supabase
    .from("sales_leads")
    .update({
      flipped_to_closer_id: closerId,
      flip_message_sent_at: now,
      last_flip_at: now,
      ready_for_closer: true,
      owner_closer_id: closerId,
      updated_by: openerId,
    })
    .eq("id", leadId);

  // Audit log
  void supabase.from("sales_activity").insert({
    actor_id: openerId,
    action: "lead.flipped",
    target_id: leadId,
    target_type: "lead",
    metadata: { closer_id: closerId, sms_id: smsResult.messageId },
  });

  // Log to sales_call_events so the closer's screen-pop has a record
  void supabase.from("sales_call_events").insert({
    user_id: closerId,
    event_type: "flip.initiated",
    direction: "Inbound",
    status: "Ringing",
    matched_lead_id: leadId,
    matched_assessment_id: lead.assessment_id,
    raw: {
      flip_from: openerId,
      sms_id: smsResult.messageId,
      deep_link: deepLink,
    },
  });

  res.status(200).json({ ok: true, smsId: smsResult.messageId });
}
