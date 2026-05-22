/**
 * POST /api/rc/disconnect
 *
 * Authenticated. Removes the user's stored RC credentials. Does NOT revoke
 * the token at RC's end (the access token will expire in <60min anyway and
 * the refresh token can't be re-used without our client_secret).
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyAuth, unauthorizedResponse } from "../../server/verifyAuth.js";
import { deleteCredentials, deleteTelephonySubscription } from "../../server/ringcentral.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const userId = await verifyAuth(req);
  if (!userId) {
    unauthorizedResponse(res);
    return;
  }
  // Delete the webhook subscription first (needs valid tokens to call RC).
  // Best-effort; if it fails we still proceed with credential deletion.
  await deleteTelephonySubscription(userId).catch((err) =>
    console.warn("[rc/disconnect] delete subscription failed:", err),
  );
  const ok = await deleteCredentials(userId);
  res.status(ok ? 200 : 500).json({ ok });
}
