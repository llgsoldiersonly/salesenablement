/**
 * Vercel function: POST /api/probe
 *
 * Thin adapter around handleProbe — fans out to site-scrape, Google Places,
 * and SerpAPI in parallel, streams NDJSON progress as each source completes.
 * Typical wall time: 5-15s.
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
    const { handleProbe } = await import("../server/probe-handler");
    await handleProbe(req, res, req.body);
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
    console.error("[/api/probe] handler crashed:", msg);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/x-ndjson");
    }
    try {
      res.write(JSON.stringify({ type: "error", message: `probe crashed: ${msg}` }) + "\n");
    } catch {
      // ignore — response may already be torn down
    }
    res.end();
  }
}
