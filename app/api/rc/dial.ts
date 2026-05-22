/**
 * POST /api/rc/dial
 *
 * Authenticated. Body: { to: "+15551234567", leadId?: "..." }
 *
 * Triggers a 2-leg RingOut: RC dials the rep's phone, then bridges to the
 * prospect on answer. Returns the RingOut session id on success.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyAuth, unauthorizedResponse } from "../../server/verifyAuth.js";
import { placeRingOut, rcEnvReady } from "../../server/ringcentral.js";

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
  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!to) {
    res.status(400).json({ ok: false, error: "Missing 'to' phone number." });
    return;
  }

  try {
    const result = await placeRingOut(userId, to);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    console.error("[rc/dial] unexpected:", err);
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "unknown" });
  }
}

function safeParse(s: string): { to?: string; leadId?: string } | null {
  try { return JSON.parse(s); } catch { return null; }
}
