/**
 * GET /api/rc/oauth-callback?code=...&state=...
 *
 * RingCentral redirects the browser here after the user authorizes. We
 * verify the signed state (anti-CSRF, ties to user_id), exchange the code
 * for tokens, fetch + cache the RC user profile, and redirect the browser
 * to /leads with a success/error flag.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createTelephonySubscription,
  exchangeCodeForTokens,
  persistFreshTokens,
  rcEnvReady,
  verifyState,
} from "../../server/ringcentral.js";

function redirectWithFlag(res: VercelResponse, flag: string, errMsg?: string): void {
  const params = new URLSearchParams({ rc: flag });
  if (errMsg) params.set("err", errMsg);
  res.setHeader("Location", `/leads?${params.toString()}`);
  res.status(302).end();
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!rcEnvReady()) {
    redirectWithFlag(res, "error", "Server not configured");
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const rcError = typeof req.query.error === "string" ? req.query.error : "";

  if (rcError) {
    redirectWithFlag(res, "error", rcError);
    return;
  }
  if (!code || !state) {
    redirectWithFlag(res, "error", "Missing code or state");
    return;
  }

  const verified = verifyState(state);
  if (!verified) {
    redirectWithFlag(res, "error", "Invalid or expired state");
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await persistFreshTokens(verified.userId, tokens);
    // Fire-and-forget: create a telephony webhook subscription. If it fails
    // (e.g. scope wasn't granted), the user is still connected for click-to-
    // dial; webhooks just won't fire. They can disconnect + reconnect later
    // with the full scope set.
    void createTelephonySubscription(verified.userId).then((result) => {
      if (!result.ok) {
        console.warn("[rc/oauth-callback] subscription create failed:", result.error);
      }
    });
    redirectWithFlag(res, "connected");
  } catch (err) {
    console.error("[rc/oauth-callback] failed:", err);
    const msg = err instanceof Error ? err.message : "unknown";
    redirectWithFlag(res, "error", msg.slice(0, 200));
  }
}
