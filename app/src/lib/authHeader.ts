/**
 * Returns the Authorization header for authenticated server requests.
 * All API endpoints (/api/brief, /api/ask, /api/deepgram-token) require
 * a valid Supabase session token.
 */

import { supabase } from "./supabase.js";

export async function getAuthHeader(): Promise<{ Authorization: string } | Record<never, never>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
