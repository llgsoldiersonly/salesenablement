-- Option B4: Persist RingCentral call recordings + transcripts
--
-- One row per recording. Foreign-keyed to sales_leads and sales_assessments
-- for fast lookups when the drawer renders. Audio is NOT stored here — we
-- store the RC URI + metadata, and stream playback through a server-side
-- proxy that adds the rep's access token.

CREATE TABLE sales_call_recordings (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rc_call_log_id      text        NOT NULL UNIQUE,             -- RC's id for the call-log entry
  rc_recording_id     text,                                    -- RC's id for the recording (if recorded)
  rc_session_id       text,                                    -- groups w/ sales_call_events.rc_session_id
  recording_uri       text,                                    -- RC content URI (requires auth to fetch)
  content_type        text,                                    -- "audio/mpeg" | "audio/wav"
  duration_seconds    int,
  call_started_at     timestamptz,
  call_direction      text,
  caller_number       text,
  callee_number       text,
  transcript_uri      text,                                    -- if RC provides a transcript URL
  transcript_text     text,                                    -- inline copy (post-fetch)

  fetched_by_user_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  matched_lead_id     uuid        REFERENCES sales_leads(id) ON DELETE SET NULL,
  matched_assessment_id uuid      REFERENCES sales_assessments(id) ON DELETE SET NULL,

  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_recordings_matched_lead       ON sales_call_recordings(matched_lead_id) WHERE matched_lead_id IS NOT NULL;
CREATE INDEX idx_call_recordings_session            ON sales_call_recordings(rc_session_id);
CREATE INDEX idx_call_recordings_call_started_at    ON sales_call_recordings(call_started_at DESC);

ALTER TABLE sales_call_recordings ENABLE ROW LEVEL SECURITY;

-- Same visibility rules as the underlying lead/assessment
CREATE POLICY "sales_call_recordings_self_or_admin" ON sales_call_recordings
  FOR SELECT TO authenticated
  USING (
    sales_is_admin()
    OR fetched_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM sales_leads l
      WHERE l.id = sales_call_recordings.matched_lead_id
        AND (
          l.owner_opener_id = auth.uid()
          OR l.owner_closer_id = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1 FROM sales_assessments a
      WHERE a.id = sales_call_recordings.matched_assessment_id
        AND (a.created_by = auth.uid() OR a.assigned_to = auth.uid())
    )
  );
