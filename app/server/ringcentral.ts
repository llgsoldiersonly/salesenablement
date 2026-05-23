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

/* ── OAuth scopes ─────────────────────────────────────────────────────── */

/**
 * Scopes the app requests at OAuth time. RingOut for click-to-dial,
 * SubscriptionWebhook for B1 webhooks, ReadCallLog for future B4 recording
 * attach. Add to the RC dev app's Permissions to make these grantable.
 */
export const DEFAULT_RC_SCOPES = ["RingOut", "SubscriptionWebhook", "ReadCallLog"];

/* ── OAuth URL builder ───────────────────────────────────────────────── */

export function buildAuthorizeUrl(state: string, scopes: string[] = DEFAULT_RC_SCOPES): string {
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

/* ── Webhook subscriptions (B1) ─────────────────────────────────────── */

export const WEBHOOK_RECEIVER_URL =
  process.env.RINGCENTRAL_WEBHOOK_URL ?? "https://www.llgbot.com/api/rc/webhook";

/** Event filter for live telephony events (used by B2 screen-pop + B3 flip). */
export const TELEPHONY_SESSION_FILTER = "/restapi/v1.0/account/~/extension/~/telephony/sessions";

/** RC's max subscription lifetime is 7 days (604800s). We renew daily. */
const SUBSCRIPTION_LIFETIME_SECONDS = 604800;
const SUBSCRIPTION_RENEW_BUFFER_HOURS = 48;

interface RcSubscriptionResponse {
  id: string;
  status: string;
  eventFilters: string[];
  expirationTime: string;
  deliveryMode: { transportType: string; address: string; verificationToken?: string };
}

/**
 * Create a webhook subscription for telephony events on this user's extension.
 * Stores the subscription_id + verification_token in rc_webhook_subscriptions.
 */
export async function createTelephonySubscription(userId: string): Promise<{
  ok: true;
  subscriptionId: string;
  expiresAt: string;
} | { ok: false; error: string }> {
  const creds = await getValidCredentials(userId);
  if (!creds) return { ok: false, error: "No valid RC credentials." };

  const verificationToken = crypto.randomBytes(24).toString("hex");

  const res = await fetch(`${RC_SERVER_URL}/restapi/v1.0/subscription`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      eventFilters: [TELEPHONY_SESSION_FILTER],
      deliveryMode: {
        transportType: "WebHook",
        address: WEBHOOK_RECEIVER_URL,
        verificationToken,
      },
      expiresIn: SUBSCRIPTION_LIFETIME_SECONDS,
    }),
  });

  if (!res.ok) {
    return { ok: false, error: `RC subscription create ${res.status}: ${await res.text()}` };
  }
  const body = (await res.json()) as RcSubscriptionResponse;

  const supabase = serviceClient();
  await supabase.from("rc_webhook_subscriptions").upsert(
    {
      user_id: userId,
      subscription_id: body.id,
      verification_token: verificationToken,
      event_filters: body.eventFilters,
      expires_at: body.expirationTime,
      status: body.status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return { ok: true, subscriptionId: body.id, expiresAt: body.expirationTime };
}

/** Renew an existing subscription before it expires (extends to +7 days). */
export async function renewTelephonySubscription(userId: string): Promise<boolean> {
  const supabase = serviceClient();
  const { data: subRow } = await supabase
    .from("rc_webhook_subscriptions")
    .select("subscription_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!subRow) return false;

  const creds = await getValidCredentials(userId);
  if (!creds) return false;

  const res = await fetch(
    `${RC_SERVER_URL}/restapi/v1.0/subscription/${subRow.subscription_id}/renew`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.accessToken}` },
    },
  );

  if (!res.ok) {
    // Subscription likely expired or was deleted on RC side — recreate it
    if (res.status === 404) {
      const fresh = await createTelephonySubscription(userId);
      return fresh.ok;
    }
    console.error("[rc] renew failed:", res.status, await res.text());
    return false;
  }
  const body = (await res.json()) as RcSubscriptionResponse;
  await supabase
    .from("rc_webhook_subscriptions")
    .update({
      expires_at: body.expirationTime,
      status: body.status,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  return true;
}

/** Delete a user's subscription at RC and remove our record of it. */
export async function deleteTelephonySubscription(userId: string): Promise<void> {
  const supabase = serviceClient();
  const { data: subRow } = await supabase
    .from("rc_webhook_subscriptions")
    .select("subscription_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!subRow) return;

  const creds = await getValidCredentials(userId);
  if (creds) {
    // Best-effort delete at RC. If it fails (token already expired), we still
    // delete our local row — the subscription will time out on RC's side.
    await fetch(`${RC_SERVER_URL}/restapi/v1.0/subscription/${subRow.subscription_id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${creds.accessToken}` },
    }).catch((err) => console.warn("[rc] DELETE subscription failed:", err));
  }
  await supabase.from("rc_webhook_subscriptions").delete().eq("user_id", userId);
}

/** Find the user whose subscription corresponds to a given subscription_id. */
export async function lookupSubscriptionOwner(
  subscriptionId: string,
): Promise<{ userId: string; verificationToken: string } | null> {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("rc_webhook_subscriptions")
    .select("user_id, verification_token")
    .eq("subscription_id", subscriptionId)
    .maybeSingle();
  if (error || !data) return null;
  return { userId: data.user_id, verificationToken: data.verification_token };
}

/** Subscriptions expiring within N hours that should be renewed. */
export async function getSubscriptionsDueForRenewal(): Promise<string[]> {
  const cutoff = new Date(Date.now() + SUBSCRIPTION_RENEW_BUFFER_HOURS * 3600 * 1000).toISOString();
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("rc_webhook_subscriptions")
    .select("user_id")
    .lte("expires_at", cutoff);
  if (error || !data) return [];
  return data.map((r) => (r as { user_id: string }).user_id);
}

/* ── Webhook event ingestion ─────────────────────────────────────────── */

interface RcTelephonySessionEvent {
  uuid?: string;
  event?: string;
  timestamp?: string;
  subscriptionId?: string;
  ownerId?: string;
  body?: {
    telephonySessionId?: string;
    sessionId?: string;
    sequence?: number;
    serverId?: string;
    parties?: Array<{
      id?: string;
      direction?: string;
      to?: { phoneNumber?: string; name?: string };
      from?: { phoneNumber?: string; name?: string };
      status?: { code?: string };
      missedCall?: boolean;
      conferenceRole?: string;
    }>;
    [k: string]: unknown;
  };
}

/**
 * Normalize a phone number to last-10 digits (US-style). Strips formatting,
 * country code, etc. — good enough for matching domestic prospects.
 */
function normalizePhoneToLast10(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits.slice(-10);
}

/**
 * Find a lead whose underlying assessment has a contact_phone matching the
 * given caller number (last-10 digits). Returns the most recently-updated
 * matching lead, or null.
 *
 * Future polish: also try decision-maker phone numbers once that's a field.
 */
async function findLeadByCallerNumber(
  callerNumber: string,
): Promise<{ leadId: string; assessmentId: string } | null> {
  const last10 = normalizePhoneToLast10(callerNumber);
  if (!last10) return null;

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("sales_assessments")
    .select("id, sales_leads(id)")
    .like("contact_phone_digits", `%${last10}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const leadRows = (data as { id: string; sales_leads: Array<{ id: string }> | { id: string } | null }).sales_leads;
  const leadId = Array.isArray(leadRows) ? leadRows[0]?.id : leadRows?.id;
  if (!leadId) return null;
  return { leadId, assessmentId: (data as { id: string }).id };
}

/**
 * Persist a single webhook event into sales_call_events. Extracts the key
 * fields from RC's nested payload so simple queries (e.g. "find all events
 * for caller X in the last hour") don't need JSON drilling. For inbound
 * events, also attempts to match the caller to a lead and stamps
 * matched_lead_id so the browser screen-pop has a target on first event.
 */
export async function recordCallEvent(
  userId: string,
  subscriptionId: string | null,
  payload: RcTelephonySessionEvent,
): Promise<void> {
  const body = payload.body ?? {};
  const firstParty = body.parties?.[0];
  const sessionId = body.telephonySessionId ?? body.sessionId ?? null;
  const direction = firstParty?.direction ?? null;
  const status = firstParty?.status?.code ?? null;
  const callerNumber = firstParty?.from?.phoneNumber ?? null;
  const calleeNumber = firstParty?.to?.phoneNumber ?? null;
  const partyId = firstParty?.id ?? null;

  // Match the prospect's number to a lead. For Inbound calls the prospect is
  // `caller_number`; for Outbound (RingOut) it's `callee_number`.
  const prospectNumber = direction === "Inbound" ? callerNumber : calleeNumber;
  let matchedLeadId: string | null = null;
  let matchedAssessmentId: string | null = null;
  if (prospectNumber) {
    const match = await findLeadByCallerNumber(prospectNumber);
    if (match) {
      matchedLeadId = match.leadId;
      matchedAssessmentId = match.assessmentId;
    }
  }

  const supabase = serviceClient();
  const { error } = await supabase.from("sales_call_events").insert({
    user_id: userId,
    rc_subscription_id: subscriptionId,
    rc_session_id: sessionId,
    rc_party_id: partyId,
    event_type: payload.event ?? "telephony.session",
    direction,
    status,
    caller_number: callerNumber,
    callee_number: calleeNumber,
    matched_lead_id: matchedLeadId,
    matched_assessment_id: matchedAssessmentId,
    raw: payload as unknown as Record<string, unknown>,
  });
  if (error) console.error("[rc] recordCallEvent insert failed:", error.message);
}

