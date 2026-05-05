/**
 * Vercel function: POST /api/probe
 *
 * Thin adapter around handleProbe — fans out to site-scrape, Google Places,
 * and SerpAPI in parallel, streams NDJSON progress as each source completes.
 * Typical wall time: 5-15s.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleProbe } from "../server/probe-handler";

export const config = {
  maxDuration: 30,
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  await handleProbe(req, res, req.body);
}
