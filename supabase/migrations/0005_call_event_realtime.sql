-- Option B2: enable Realtime on sales_call_events + fast phone matching
--
-- Two changes:
--   1. Publish sales_call_events on the supabase_realtime publication so the
--      browser can subscribe to INSERTs filtered by user_id (and RLS gates
--      visibility per user).
--   2. Add a generated digits-only contact_phone_digits column on
--      sales_assessments + index it, so the webhook handler can do O(log n)
--      lookups when a caller_number arrives.

-- ── 1. Realtime publication ────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE sales_call_events;

-- ── 2. Digits-only phone column for fast last-10-digit matching ────────────
ALTER TABLE sales_assessments
  ADD COLUMN contact_phone_digits text
  GENERATED ALWAYS AS (regexp_replace(coalesce(contact_phone, ''), '\D', '', 'g')) STORED;

-- Partial index — empty strings (no phone captured) are common and not useful
CREATE INDEX idx_sales_assessments_contact_phone_digits
  ON sales_assessments(contact_phone_digits)
  WHERE contact_phone_digits <> '';
