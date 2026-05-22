/**
 * POST /api/rc/auth-init
 *
 * Authenticated. Returns a RingCentral OAuth authorize URL with a signed
 * state parameter binding the user_id. The client redirects the browser to
 * the returned URL; RC returns to /api/rc/oauth-callback.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyAuth, unauthorizedResponse } from "../../server/verifyAuth.js";
import { buildAuthorizeUrl, rcEnvReady, signState } from "../../server/ringcentral.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!rcEnvReady()) {
    res.status(500).json({ error: "RingCentral env vars not configured on the server." });
    return;
  }
  const userId = await verifyAuth(req);
  if (!userId) {
    unauthorizedResponse(res);
    return;
  }

  const state = signState(userId);
  const authorizeUrl = buildAuthorizeUrl(state);
  res.status(200).json({ authorizeUrl });
}
