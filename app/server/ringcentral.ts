/**
 * RingCentral integration helpers (server-side only).
 *
 * - HMAC-signed OAuth state (anti-CSRF, ties redirect back to the user_id).
 * - Token exchange + refresh against RC's OAuth endpoint.
 * - getValidAccessToken: fetches a user's tokens, refreshes if expired,
 *   returns a usable access token + their RC `from` phone number.
 * - placeRingOut: invokes RC's RingOut API to dial a prospect.
 *
 * RC's auth + token endpoints differ slightly between production
 * (https://platform.ringcentral.com) and sandbox
 * (https://platform.devtest.ringcentral.com). Set RINGCENTRAL_SERVER_URL.
 */

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const RC_SERVER_URL = process.env.RINGCENTRAL_SERVER_URL ?? "https://platform.ringcentral.com";
const RC_CLIENT_ID = process.env.RINGCENTRAL_CLIENT_ID ?? "";
const RC_CLIENT_SECRET = process.env.RINGCENTRAL_CLIENT_SECRET ?? "";
const RC_REDIRECT_URI =
  process.env.RINGCENTRAL_REDIRECT_URI ?? "https://www.llgbot.com/api/rc/oauth-callback";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const STATE_SECRET = SUPABASE_SERVICE_ROLE_KEY; // already a high-entropy server secret
const STATE_TTL_MS = 10 * 60 * 1000;

const REFRESH_BUFFER_MS = 60 * 1000; // refresh tokens 60s before they expire

export function rcEnvReady(): boolean {
  return Boolean(RC_CLIENT_ID && RC_CLIENT_SECRET && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function serviceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/* ── State signing (HMAC-SHA256) ─────────────────────────────────────── */

export function signState(userId: string): string {
  const ts = Date.now().toString();
  const nonce = crypto.randomBytes(12).toString("base64url");
  const payload = `${userId}.${ts}.${nonce}`;
  const sig = crypto.createHmac("sha256", STATE_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyState(state: string): { userId: string } | null {
  const parts = state.split(".");
  if (parts.length !== 4) return null;
  const [userId, tsStr, nonce, sig] = parts;
  const expected = crypto.createHmac("sha256", STATE_SECRET).update(`${userId}.${tsStr}.${nonce}`).digest("base64url");
  // Constant-time compare
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const ts = Number(tsStr);
  if (Number.isNaN(ts) || Date.now() - ts > STATE_TTL_MS) return null;
  return { userId };
}

/* ── OAuth URL builder ───────────────────────────────────────────────── */

export function buildAuthorizeUrl(state: string, scopes: string[] = ["RingOut"]): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: RC_CLIENT_ID,
    redirect_uri: RC_REDIRECT_URI,
    state,
    scope: scopes.join(" "),
  });
  return `${RC_SERVER_URL}/restapi/oauth/authorize?${params.toString()}`;
}

/* ── Token exchange + refresh ────────────────────────────────────────── */

interface RcTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;          // access token lifetime, seconds
  refresh_token_expires_in: number; // refresh token lifetime, seconds
  scope: string;
  token_type: string;
}

async function rcTokenRequest(body: URLSearchParams): Promise<RcTokenResponse> {
  const authHeader = "Basic " + Buffer.from(`${RC_CLIENT_ID}:${RC_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${RC_SERVER_URL}/restapi/oauth/token`, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RC token endpoint ${res.status}: ${text}`);
  }
  return (await res.json()) as RcTokenResponse;
}

export async function exchangeCodeForTokens(code: string): Promise<RcTokenResponse> {
  return rcTokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: RC_REDIRECT_URI,
    }),
  );
}

async function refreshTokens(refreshToken: string): Promise<RcTokenResponse> {
  return rcTokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
}

/* ── Stored credentials access ───────────────────────────────────────── */

export interface RcCredentialsRow {
  user_id: string;
  access_token: string;
  refresh_token: string;
  access_expires_at: string;
  refresh_expires_at: string;
  rc_user_id: string | null;
  rc_extension_id: string | null;
  rc_main_number: string | null;
  rc_account_id: string | null;
  scope: string | null;
}

export async function getCredentialsRow(userId: string): Promise<RcCredentialsRow | null> {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("rc_user_credentials")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[rc] getCredentialsRow error:", error.message);
    return null;
  }
  return (data as RcCredentialsRow | null) ?? null;
}

export async function deleteCredentials(userId: string): Promise<boolean> {
  const supabase = serviceClient();
  const { error } = await supabase.from("rc_user_credentials").delete().eq("user_id", userId);
  if (error) {
    console.error("[rc] deleteCredentials error:", error.message);
    return false;
  }
  return true;
}

interface RcUserProfile {
  id: number;
  account: { id: number };
  extensionNumber: string;
  contact?: { firstName?: string; lastName?: string; email?: string };
  phoneNumbers?: Array<{
    phoneNumber: string;
    usageType: string; // "MainCompanyNumber" | "DirectNumber" | etc.
    primary?: boolean;
  }>;
}

async function fetchRcUserProfile(accessToken: string): Promise<RcUserProfile> {
  const res = await fetch(`${RC_SERVER_URL}/restapi/v1.0/account/~/extension/~`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`RC profile fetch ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as RcUserProfile;
}

function pickPrimaryNumber(profile: RcUserProfile): string | null {
  const phones = profile.phoneNumbers ?? [];
  // Prefer a "DirectNumber" marked primary; fall back to any DirectNumber; then any number
  return (
    phones.find((p) => p.usageType === "DirectNumber" && p.primary)?.phoneNumber ??
    phones.find((p) => p.usageType === "DirectNumber")?.phoneNumber ??
    phones[0]?.phoneNumber ??
    null
  );
}

/**
 * Called from the OAuth callback. Stores newly-issued tokens + populates the
 * cached RC profile fields. Uses upsert so reconnect overwrites cleanly.
 */
export async function persistFreshTokens(
  userId: string,
  tokens: RcTokenResponse,
): Promise<void> {
  const profile = await fetchRcUserProfile(tokens.access_token);
  const supabase = serviceClient();
  const now = Date.now();
  const { error } = await supabase
    .from("rc_user_credentials")
    .upsert(
      {
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        access_expires_at: new Date(now + tokens.expires_in * 1000).toISOString(),
        refresh_expires_at: new Date(now + tokens.refresh_token_expires_in * 1000).toISOString(),
        rc_user_id: String(profile.id),
        rc_extension_id: String(profile.id),
        rc_account_id: String(profile.account.id),
        rc_main_number: pickPrimaryNumber(profile),
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error) throw new Error(`Persist tokens failed: ${error.message}`);
}

/**
 * Returns a fresh access token + the rep's RC `from` number, refreshing the
 * stored access token if it's about to expire. Returns null if the user has
 * never connected or the refresh token is no longer valid (forces reconnect).
 */
export async function getValidCredentials(
  userId: string,
): Promise<{ accessToken: string; fromNumber: string | null } | null> {
  const row = await getCredentialsRow(userId);
  if (!row) return null;

  const accessExp = new Date(row.access_expires_at).getTime();
  if (accessExp - Date.now() > REFRESH_BUFFER_MS) {
    return { accessToken: row.access_token, fromNumber: row.rc_main_number };
  }

  // Refresh needed
  const refreshExp = new Date(row.refresh_expires_at).getTime();
  if (refreshExp <= Date.now()) {
    // Refresh token itself expired — user must reconnect
    await deleteCredentials(userId);
    return null;
  }

  try {
    const fresh = await refreshTokens(row.refresh_token);
    const supabase = serviceClient();
    const now = Date.now();
    await supabase
      .from("rc_user_credentials")
      .update({
        access_token: fresh.access_token,
        refresh_token: fresh.refresh_token,
        access_expires_at: new Date(now + fresh.expires_in * 1000).toISOString(),
        refresh_expires_at: new Date(now + fresh.refresh_token_expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    return { accessToken: fresh.access_token, fromNumber: row.rc_main_number };
  } catch (err) {
    console.error("[rc] refresh failed:", err);
    return null;
  }
}

/* ── RingOut ─────────────────────────────────────────────────────────── */

export interface RingOutResult {
  ok: true;
  ringOutId: string;
  status: string;
}

export interface RingOutError {
  ok: false;
  error: string;
  hint?: string;
}

/**
 * Place a 2-leg RingOut call. RC dials the rep's phone first; when they
 * answer, RC bridges to the prospect.
 *
 * `fromNumber` is the rep's RC phone (looked up at OAuth time); `toNumber` is
 * the prospect. Both should be E.164 (+15551234567) but RC tolerates other
 * common formats too.
 */
export async function placeRingOut(
  userId: string,
  toNumber: string,
): Promise<RingOutResult | RingOutError> {
  const creds = await getValidCredentials(userId);
  if (!creds) {
    return {
      ok: false,
      error: "RingCentral not connected for this user.",
      hint: "Open the user menu and click Connect RingCentral.",
    };
  }
  if (!creds.fromNumber) {
    return {
      ok: false,
      error: "No RingCentral phone number on file for this user.",
      hint: "Reconnect RingCentral to refresh your phone numbers.",
    };
  }

  const res = await fetch(`${RC_SERVER_URL}/restapi/v1.0/account/~/extension/~/ring-out`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { phoneNumber: creds.fromNumber },
      to: { phoneNumber: toNumber },
      callerId: { phoneNumber: creds.fromNumber },
      playPrompt: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    let hint: string | undefined;
    if (res.status === 401) hint = "Token expired and refresh failed. Reconnect RingCentral.";
    if (res.status === 403) hint = "Your RingCentral plan may not include RingOut. Check with your RC admin.";
    return { ok: false, error: `RingCentral returned ${res.status}: ${text}`, hint };
  }

  const body = (await res.json()) as { id: string; status?: { callStatus?: string } };
  return { ok: true, ringOutId: body.id, status: body.status?.callStatus ?? "InProgress" };
}
