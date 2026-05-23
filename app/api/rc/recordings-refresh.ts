/**
 * POST /api/rc/recordings-refresh
 *
 * Authenticated. Body: { leadId, assessmentId, contactPhone }
 *
 * Queries RC's Call Log for the last 30 days, filters to calls involving
 * the lead's contact_phone, and upserts the recording metadata into
 * sales_call_recordings. Returns { added, total }.
 *
 * On-demand by design — the lead drawer has a "Refresh" button.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyAuth, unauthorizedResponse } from "../../server/verifyAuth.js";
import { fetchAndPersistRecordingsForLead, rcEnvReady } from "../../server/ringcentral.js";

function safeParse(s: string): { leadId?: string; assessmentId?: string; contactPhone?: string } | null {
  try { return JSON.parse(s); } catch { return null; }
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
  const userId = await verifyAuth(req);
  if (!userId) {
    unauthorizedResponse(res);
    return;
  }

  const body = (typeof req.body === "string" ? safeParse(req.body) : req.body) ?? {};
  const leadId = typeof body.leadId === "string" ? body.leadId : "";
  const assessmentId = typeof body.assessmentId === "string" ? body.assessmentId : "";
  const contactPhone = typeof body.contactPhone === "string" ? body.contactPhone : "";
  if (!leadId || !assessmentId || !contactPhone) {
    res.status(400).json({ ok: false, error: "Missing leadId, assessmentId, or contactPhone." });
    return;
  }

  try {
    const result = await fetchAndPersistRecordingsForLead(userId, leadId, assessmentId, contactPhone);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    console.error("[rc/recordings-refresh] unexpected:", err);
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "unknown" });
  }
}
