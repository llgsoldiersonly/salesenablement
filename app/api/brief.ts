/**
 * Vercel function: POST /api/brief
 *
 * Thin adapter around handleBrief — passes Vercel's pre-parsed req.body
 * straight through. The streaming logic, prompt construction, and Anthropic
 * client all live in ../server/handler.ts so they remain framework-agnostic.
 *
 * Requires Pro plan (maxDuration > 10s). Brief generation typically runs
 * 30-60s with Opus 4.7.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { handleBrief } = await import("../server/handler");
    await handleBrief(req, res, req.body);
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
    console.error("[/api/brief] handler crashed:", msg);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/x-ndjson");
    }
    try {
      res.write(JSON.stringify({ type: "error", message: `brief crashed: ${msg}` }) + "\n");
    } catch {
      // ignore
    }
    res.end();
  }
}
