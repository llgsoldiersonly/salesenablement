/**
 * RingCentral client helpers.
 *
 * Talks to /api/rc/* endpoints. Tokens never reach the browser — the server
 * handles OAuth, refresh, and the actual RingOut API call.
 */

import { getAuthHeader } from "./authHeader.js";

export interface RcStatus {
  connected: boolean;
  configured: boolean;
  rcMainNumber?: string | null;
  refreshExpiresAt?: string;
  accessExpiresAt?: string;
}

export async function getRcStatus(): Promise<RcStatus> {
  const auth = await getAuthHeader();
  const res = await fetch("/api/rc/status", { headers: auth });
  if (!res.ok) return { connected: false, configured: false };
  return (await res.json()) as RcStatus;
}

/**
 * Kick off the OAuth flow. Asks the server for a signed authorize URL and
 * redirects the browser there. RC will return to /api/rc/oauth-callback,
 * which finishes the exchange and redirects to /leads?rc=connected.
 */
export async function connectRingCentral(): Promise<void> {
  const auth = await getAuthHeader();
  const res = await fetch("/api/rc/auth-init", { method: "POST", headers: auth });
  if (!res.ok) {
    throw new Error(`Could not start RC connection (${res.status})`);
  }
  const { authorizeUrl } = (await res.json()) as { authorizeUrl: string };
  window.location.href = authorizeUrl;
}

export async function disconnectRingCentral(): Promise<boolean> {
  const auth = await getAuthHeader();
  const res = await fetch("/api/rc/disconnect", { method: "POST", headers: auth });
  return res.ok;
}

export interface DialResult {
  ok: boolean;
  ringOutId?: string;
  status?: string;
  error?: string;
  hint?: string;
}

/* ── Recordings ─────────────────────────────────────────────────────── */

export interface CallRecording {
  id: string;
  rc_call_log_id: string;
  recording_uri: string | null;
  content_type: string | null;
  duration_seconds: number | null;
  call_started_at: string | null;
  call_direction: string | null;
  caller_number: string | null;
  callee_number: string | null;
  transcript_text: string | null;
}

export interface RefreshRecordingsResult {
  ok: boolean;
  added?: number;
  total?: number;
  error?: string;
  hint?: string;
}

export async function refreshRecordingsForLead(
  leadId: string,
  assessmentId: string,
  contactPhone: string,
): Promise<RefreshRecordingsResult> {
  const auth = await getAuthHeader();
  const res = await fetch("/api/rc/recordings-refresh", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ leadId, assessmentId, contactPhone }),
  });
  try {
    return (await res.json()) as RefreshRecordingsResult;
  } catch {
    return { ok: false, error: `Server returned ${res.status}` };
  }
}

export function recordingStreamUrl(recordingId: string): string {
  return `/api/rc/recording-stream?recordingId=${encodeURIComponent(recordingId)}`;
}

/** Trigger a 2-leg RingOut. Server returns once RC has accepted the request. */
export async function dialPhone(to: string, leadId?: string): Promise<DialResult> {
  const auth = await getAuthHeader();
  const res = await fetch("/api/rc/dial", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ to, leadId }),
  });
  let body: DialResult;
  try {
    body = (await res.json()) as DialResult;
  } catch {
    return { ok: false, error: `Server returned ${res.status}` };
  }
  return body;
}
