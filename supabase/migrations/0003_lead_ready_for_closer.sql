-- A3: ready_for_closer flag
--
-- Persistent "this lead is queued for closer pickup" signal, orthogonal to
-- the 8-stage status pipeline. Set by the opener after they've done their
-- work (DM confirmed, gatekeeper notes captured, Zoom scheduled etc.).
-- Cleared automatically when status reaches a terminal state (lost / signed)
-- or manually toggled off.
--
-- A separate transient "live flip in progress" signal will come with Option B
-- (RingCentral webhooks) — this migration only handles the persistent state.

ALTER TABLE sales_leads
  ADD COLUMN ready_for_closer    boolean      NOT NULL DEFAULT false,
  ADD COLUMN ready_for_closer_at timestamptz;

-- Partial index — most leads will NOT be ready, so only index the ones that are
CREATE INDEX idx_sales_leads_ready_for_closer
  ON sales_leads(ready_for_closer)
  WHERE ready_for_closer = true;

-- ── Extend the on-update trigger ──────────────────────────────────────────
-- Replaces the function body; the existing trigger reference still fires.
-- Additions:
--   • Stamp ready_for_closer_at on toggle
--   • Auto-clear ready_for_closer when status reaches lost_lead or signed
CREATE OR REPLACE FUNCTION sales_lead_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
  interest_statuses sales_lead_status[] := ARRAY[
    'spoke_with_attorney', 'zoom_scheduled', 'post_zoom', 'second_zoom', 'signed'
  ]::sales_lead_status[];
BEGIN
  NEW.updated_at := now();

  -- ready_for_closer toggle: stamp the timestamp; null it on toggle-off
  IF NEW.ready_for_closer IS DISTINCT FROM OLD.ready_for_closer THEN
    NEW.ready_for_closer_at := CASE WHEN NEW.ready_for_closer THEN now() ELSE NULL END;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();

    IF NEW.first_interest_at IS NULL AND NEW.status = ANY(interest_statuses) THEN
      NEW.first_interest_at := now();
    END IF;

    IF NEW.status = 'lost_lead' AND OLD.lost_at IS NULL THEN
      NEW.lost_at := now();
    END IF;

    -- Auto-clear ready-for-closer when reaching a terminal status
    IF (NEW.status = 'lost_lead' OR NEW.status = 'signed') AND NEW.ready_for_closer = true THEN
      NEW.ready_for_closer := false;
      NEW.ready_for_closer_at := NULL;
    END IF;

    INSERT INTO sales_lead_status_history (lead_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, COALESCE(NEW.updated_by, OLD.updated_by));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
