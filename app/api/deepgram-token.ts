/**
 * Vercel function: POST /api/deepgram-token
 *
 * Issues a token the browser uses to open a WebSocket to Deepgram.
 * The DEEPGRAM_API_KEY env var stays server-side.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleDeepgramToken } from "../server/deepgram-token-handler";

export const config = {
  maxDuration: 5,
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleDeepgramToken(req, res);
}
