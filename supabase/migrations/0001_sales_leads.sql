-- Slice 1: Leads Management data model
--
-- Adds sales_leads + sales_lead_status_history with auto-create trigger so
-- every existing and future sales_assessments row gets a paired lead row.
-- Status moves are MANUAL (per product decision C); the only automation here
-- is the auto-create trigger, the status-change audit trigger, and the
-- backfill at the end. The 16-day stale-deal sweeper (decision E) is a
-- separate scheduled job and will land in a later slice.
--
-- This migration is additive and idempotent-safe to re-run against a fresh
-- database, but DO NOT re-run on a database where it already applied — the
-- CREATE TYPE / CREATE TABLE statements will error and abort the rest.

-- ── 1. Status enum ──────────────────────────────────────────────────────
CREATE TYPE sales_lead_status AS ENUM (
  'blank',
  'emailed',
  'spoke_with_attorney',
  'zoom_scheduled',
  'post_zoom',
  'second_zoom',
  'lost_lead',
  'signed'
);

-- ── 2. Main leads table (1:1 with sales_assessments) ────────────────────
CREATE TABLE sales_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL UNIQUE
    REFERENCES sales_assessments(id) ON DELETE CASCADE,

  -- Pipeline state
  status sales_lead_status NOT NULL DEFAULT 'blank',
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  first_interest_at timestamptz,  -- first time we hit spoke_with_attorney or later (drives the 16-day sweeper)
  lost_at timestamptz,

  -- Display / triage
  priority smallint NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),
  pinned boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',

  -- Ownership (independent of assessment.assigned_to so handoffs are clean)
  owner_opener_id uuid REFERENCES sales_profiles(id),
  owner_closer_id uuid REFERENCES sales_profiles(id),

  -- Contact extras (assessment already stores name/email/phone/role; this
  -- adds the fields the assessment doesn't have)
  contact_address text,
  decision_maker_name text,
  decision_maker_title text,
  decision_maker_confirmed boolean NOT NULL DEFAULT false,
  best_time_to_call text,
  gatekeeper_notes text,

  -- Sales context
  quoted_package text,
  quoted_value_cents bigint,
  win_confidence smallint CHECK (win_confidence BETWEEN 1 AND 5),

  -- Outcome
  signed_at date,
  signed_package text,
  signed_value_cents bigint,
  lost_reason text,

  -- Operational
  source text,

  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES sales_profiles(id),
  updated_by uuid REFERENCES sales_profiles(id)
);

CREATE INDEX idx_sales_leads_status              ON sales_leads(status);
CREATE INDEX idx_sales_leads_status_changed_at   ON sales_leads(status_changed_at DESC);
CREATE INDEX idx_sales_leads_owner_opener        ON sales_leads(owner_opener_id) WHERE owner_opener_id IS NOT NULL;
CREATE INDEX idx_sales_leads_owner_closer        ON sales_leads(owner_closer_id) WHERE owner_closer_id IS NOT NULL;
CREATE INDEX idx_sales_leads_first_interest_at   ON sales_leads(first_interest_at) WHERE first_interest_at IS NOT NULL;

-- ── 3. Status history (audit trail of every status move) ────────────────
CREATE TABLE sales_lead_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES sales_leads(id) ON DELETE CASCADE,
  from_status sales_lead_status,
  to_status sales_lead_status NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid REFERENCES sales_profiles(id),
  reason text
);

CREATE INDEX idx_lead_status_history_lead ON sales_lead_status_history(lead_id, changed_at DESC);

-- ── 4. Auto-create lead row on every new assessment ─────────────────────
CREATE OR REPLACE FUNCTION sales_create_lead_for_assessment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO sales_leads (assessment_id, owner_opener_id, created_by, updated_by)
  VALUES (NEW.id, NEW.created_by, NEW.created_by, NEW.created_by)
  ON CONFLICT (assessment_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_sales_assessment_create_lead
AFTER INSERT ON sales_assessments
FOR EACH ROW
EXECUTE FUNCTION sales_create_lead_for_assessment();

-- ── 5. Maintain status_changed_at / first_interest_at / lost_at on UPDATE
--      and append a row to sales_lead_status_history.
CREATE OR REPLACE FUNCTION sales_lead_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
  interest_statuses sales_lead_status[] := ARRAY[
    'spoke_with_attorney', 'zoom_scheduled', 'post_zoom', 'second_zoom', 'signed'
  ]::sales_lead_status[];
BEGIN
  NEW.updated_at := now();

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();

    IF NEW.first_interest_at IS NULL AND NEW.status = ANY(interest_statuses) THEN
      NEW.first_interest_at := now();
    END IF;

    IF NEW.status = 'lost_lead' AND OLD.lost_at IS NULL THEN
      NEW.lost_at := now();
    END IF;

    INSERT INTO sales_lead_status_history (lead_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, COALESCE(NEW.updated_by, OLD.updated_by));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sales_leads_status_change
BEFORE UPDATE ON sales_leads
FOR EACH ROW
EXECUTE FUNCTION sales_lead_on_status_change();

-- ── 6. Backfill: pair every existing assessment with a blank lead ───────
INSERT INTO sales_leads (assessment_id, owner_opener_id, created_by, updated_by)
SELECT id, created_by, created_by, created_by
FROM sales_assessments a
WHERE NOT EXISTS (
  SELECT 1 FROM sales_leads l WHERE l.assessment_id = a.id
);

-- ── 7. RLS — mirror the existing assessment visibility rules ────────────
ALTER TABLE sales_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_lead_status_history ENABLE ROW LEVEL SECURITY;

-- SELECT: admin sees all; otherwise the user must be an owner of the lead
-- OR have access to the underlying assessment.
CREATE POLICY "sales_leads_select" ON sales_leads
FOR SELECT TO authenticated USING (
  sales_is_admin()
  OR owner_opener_id = auth.uid()
  OR owner_closer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM sales_assessments a
    WHERE a.id = sales_leads.assessment_id
      AND (a.created_by = auth.uid() OR a.assigned_to = auth.uid())
  )
);

-- UPDATE: same visibility rule. Triggers handle audit fields.
CREATE POLICY "sales_leads_update" ON sales_leads
FOR UPDATE TO authenticated USING (
  sales_is_admin()
  OR owner_opener_id = auth.uid()
  OR owner_closer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM sales_assessments a
    WHERE a.id = sales_leads.assessment_id
      AND (a.created_by = auth.uid() OR a.assigned_to = auth.uid())
  )
);

-- INSERT: the only legitimate insert path is the SECURITY DEFINER trigger.
-- We allow admins to insert manually for tooling/recovery scenarios.
CREATE POLICY "sales_leads_insert_admin" ON sales_leads
FOR INSERT TO authenticated WITH CHECK (sales_is_admin());

-- Status history is read-only from app; written exclusively by the trigger.
CREATE POLICY "sales_lead_status_history_select" ON sales_lead_status_history
FOR SELECT TO authenticated USING (
  sales_is_admin()
  OR EXISTS (
    SELECT 1 FROM sales_leads l
    WHERE l.id = sales_lead_status_history.lead_id
      AND (
        l.owner_opener_id = auth.uid()
        OR l.owner_closer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM sales_assessments a
          WHERE a.id = l.assessment_id
            AND (a.created_by = auth.uid() OR a.assigned_to = auth.uid())
        )
      )
  )
);
