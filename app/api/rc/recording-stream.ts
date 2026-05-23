/**
 * GET /api/rc/recording-stream?recordingId=<sales_call_recordings.id>
 *
 * Authenticated. Streams recording audio from RC through our server, so the
 * browser <audio> element doesn't need to hold the access token. RLS on
 * sales_call_recordings ensures only authorized users can fetch.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { verifyAuth, unauthorizedResponse } from "../../server/verifyAuth.js";
import { fetchRecordingStream, rcEnvReady } from "../../server/ringcentral.js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!rcEnvReady()) {
    res.status(500).json({ error: "RingCentral env vars not configured." });
    return;
  }
  const userId = await verifyAuth(req);
  if (!userId) {
    unauthorizedResponse(res);
    return;
  }

  const recordingId = typeof req.query.recordingId === "string" ? req.query.recordingId : "";
  if (!recordingId) {
    res.status(400).json({ error: "Missing recordingId" });
    return;
  }

  // Re-validate access via RLS by using the user's JWT via service role + check
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Fetch the row with service role (we'll authorize manually since proxy
  // needs the URI). Check that the user can see the recording.
  const { data: recording, error } = await supabase
    .from("sales_call_recordings")
    .select("recording_uri, content_type, fetched_by_user_id, matched_lead_id, matched_assessment_id")
    .eq("id", recordingId)
    .maybeSingle();
  if (error || !recording) {
    res.status(404).json({ error: "Recording not found" });
    return;
  }

  const rec = recording as {
    recording_uri: string | null;
    content_type: string | null;
    fetched_by_user_id: string;
    matched_lead_id: string | null;
    matched_assessment_id: string | null;
  };

  if (!rec.recording_uri) {
    res.status(404).json({ error: "Recording URI is empty" });
    return;
  }

  // Authorization: user must be the fetcher, OR own the lead, OR be admin.
  // Mirror the RLS policy on sales_call_recordings.
  if (rec.fetched_by_user_id !== userId) {
    const checks = await Promise.all([
      supabase.rpc("sales_is_admin"),
      rec.matched_lead_id
        ? supabase
            .from("sales_leads")
            .select("id")
            .eq("id", rec.matched_lead_id)
            .or(`owner_opener_id.eq.${userId},owner_closer_id.eq.${userId}`)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const isAdmin = checks[0]?.data === true;
    const isOwner = !!(checks[1] as { data: unknown }).data;
    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  // Stream from RC. We use the fetched_by user's token so the call log
  // visibility matches who recorded it.
  const result = await fetchRecordingStream(rec.fetched_by_user_id, rec.recording_uri);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  // Pipe through. Set content-type from RC if present, else from our metadata.
  const ct = result.res.headers.get("content-type") ?? rec.content_type ?? "audio/mpeg";
  res.setHeader("Content-Type", ct);
  res.setHeader("Cache-Control", "private, max-age=300");

  const buf = Buffer.from(await result.res.arrayBuffer());
  res.status(200).send(buf);
}
