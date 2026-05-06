/**
 * Vercel function: POST /api/ask
 *
 * Real-time AI coaching for closers mid-call. Accepts a question + firm context,
 * streams an NDJSON response via handleAsk. Typically responds in 2-5s.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = {
  maxDuration: 30,
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { handleAsk } = await import("../server/ask-handler.js");
    await handleAsk(req, res, req.body);
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
    console.error("[/api/ask] handler crashed:", msg);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/x-ndjson");
    }
    try {
      res.write(JSON.stringify({ type: "error", message: `ask crashed: ${msg}` }) + "\n");
    } catch {
      // ignore
    }
    res.end();
  }
}
