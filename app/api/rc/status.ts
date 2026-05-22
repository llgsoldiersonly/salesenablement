/**
 * GET /api/rc/status
 *
 * Authenticated. Returns whether the current user has a valid RC connection
 * and, if so, the cached display fields (RC phone number) without leaking
 * tokens.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyAuth, unauthorizedResponse } from "../../server/verifyAuth.js";
import { getCredentialsRow, rcEnvReady } from "../../server/ringcentral.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!rcEnvReady()) {
    res.status(200).json({ connected: false, configured: false });
    return;
  }
  const userId = await verifyAuth(req);
  if (!userId) {
    unauthorizedResponse(res);
    return;
  }

  const row = await getCredentialsRow(userId);
  if (!row) {
    res.status(200).json({ connected: false, configured: true });
    return;
  }

  const refreshExpiresAt = new Date(row.refresh_expires_at).getTime();
  const expired = refreshExpiresAt <= Date.now();
  res.status(200).json({
    connected: !expired,
    configured: true,
    rcMainNumber: row.rc_main_number,
    refreshExpiresAt: row.refresh_expires_at,
    accessExpiresAt: row.access_expires_at,
  });
}
