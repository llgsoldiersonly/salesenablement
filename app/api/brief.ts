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
import { handleBrief } from "../server/handler";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  await handleBrief(req, res, req.body);
}
