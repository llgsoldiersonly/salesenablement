/**
 * Shared JWT verifier for all server-side API handlers.
 *
 * Reads the Supabase access token from the Authorization: Bearer header and
 * verifies it against the Supabase Auth service using the service-role key.
 *
 * Returns the authenticated user ID, or null if the token is missing/invalid.
 *
 * In development (NODE_ENV !== "production") when the service key isn't
 * configured, returns a dev-bypass sentinel so the app still works locally
 * without Supabase secrets. In production it rejects all requests without
 * a valid token.
 */

import { createClient } from "@supabase/supabase-js";
import type { IncomingMessage } from "node:http";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const IS_PROD = process.env.NODE_ENV === "production";

export async function verifyAuth(req: IncomingMessage): Promise<string | null> {
  const authHeader = req.headers["authorization"] ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  // No token at all
  if (!token) {
    // In dev without a service key, allow through so local dev doesn't break
    if (!IS_PROD && !SUPABASE_SERVICE_ROLE_KEY) {
      console.warn("[verifyAuth] No token + no service key — bypassing auth in dev mode.");
      return "dev-user";
    }
    return null;
  }

  // Service key not configured (shouldn't happen in prod)
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    if (!IS_PROD) {
      console.warn("[verifyAuth] SUPABASE_SERVICE_ROLE_KEY not set — bypassing auth in dev mode.");
      return "dev-user";
    }
    console.error("[verifyAuth] SUPABASE_SERVICE_ROLE_KEY not configured in production!");
    return null;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch (err) {
    console.error("[verifyAuth] Unexpected error:", err);
    return null;
  }
}

export function unauthorizedResponse(res: import("node:http").ServerResponse, ndjson = false): void {
  res.statusCode = 401;
  if (ndjson) {
    res.setHeader("Content-Type", "application/x-ndjson");
    res.write(JSON.stringify({ type: "error", message: "Unauthorized. Please sign in." }) + "\n");
  } else {
    res.setHeader("Content-Type", "application/json");
    res.write(JSON.stringify({ error: "Unauthorized. Please sign in." }));
  }
  res.end();
}
