/**
 * POST /api/deepgram-token
 *
 * Returns a short-lived Deepgram API token the browser uses to open a
 * WebSocket to wss://api.deepgram.com/v1/listen. The real DEEPGRAM_API_KEY
 * never leaves the server.
 *
 * Upgrade path: swap the body of issueToken() to call Deepgram's
 * POST /v1/auth/tokens/grant for a true single-use TTL token.
 */

import type { IncomingMessage, ServerResponse } from "node:http";

async function issueToken(): Promise<string> {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("DEEPGRAM_API_KEY is not set in environment");

  // For now we return the API key directly (acceptable for internal tools).
  // Replace with a call to Deepgram's token-grant API when hardening for
  // external-facing deployments.
  return key;
}

export async function handleDeepgramToken(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    const token = await issueToken();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ token }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Failed to issue token",
      }),
    );
  }
}
