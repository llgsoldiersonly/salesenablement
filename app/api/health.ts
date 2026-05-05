/**
 * Vercel function: GET /api/health
 *
 * Diagnostics endpoint — confirms the function runtime is alive and reports
 * which env vars are set (without leaking values). Use this to triage
 * FUNCTION_INVOCATION_FAILED errors: if /api/health works, the platform is
 * fine and the bug is in /api/probe or /api/brief.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  res.status(200).json({
    ok: true,
    runtime: process.version,
    env: {
      ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
      DEEPGRAM_API_KEY: Boolean(process.env.DEEPGRAM_API_KEY),
      GOOGLE_PLACES_API_KEY: Boolean(process.env.GOOGLE_PLACES_API_KEY),
      SERPAPI_KEY: Boolean(process.env.SERPAPI_KEY),
    },
    timestamp: new Date().toISOString(),
  });
}
