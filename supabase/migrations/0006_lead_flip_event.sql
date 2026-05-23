-- Option B3: Flip event + SMS to closer
--
-- When an opener flips a live call to a closer, three things happen:
--   (1) An SMS goes to the closer's RC number with a deep link to the lead.
--   (2) The lead row is stamped with the flip target + timestamp.
--   (3) A row is written to sales_call_events with event_type='flip.initiated'.
--
-- The destination closer's RC number needs to be reachable. We use the
-- rc_user_credentials.rc_main_number cached at OAuth time.

ALTER TABLE sales_leads
  ADD COLUMN last_flip_at         timestamptz,
  ADD COLUMN flipped_to_closer_id uuid REFERENCES sales_profiles(id),
  ADD COLUMN flip_message_sent_at timestamptz;

-- Partial index — only useful when populated
CREATE INDEX idx_sales_leads_last_flip_at
  ON sales_leads(last_flip_at DESC)
  WHERE last_flip_at IS NOT NULL;
