-- Option B1: RingCentral webhook subscription + call event infrastructure
--
-- Foundation for the call-event-driven features of the Zoho cutover plan:
--   B2 screen-pop, B3 flip event + SMS, B4 recordings/transcripts attach.
--
-- One subscription per connected RC user. RC caps subscriptions at ~7 days;
-- a Vercel Cron renews them daily before they expire.

-- ── 1. Webhook subscriptions (per RC-connected user) ───────────────────────
CREATE TABLE rc_webhook_subscriptions (
  user_id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id    text        NOT NULL,           -- RC's id for the subscription
  verification_token text        NOT NULL,           -- we generated; RC echoes in events
  event_filters      text[]      NOT NULL DEFAULT '{}',
  expires_at         timestamptz NOT NULL,
  status             text        NOT NULL DEFAULT 'Active',  -- Active|Suspended|Cancelled|Failed
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rc_webhook_subs_expires_at ON rc_webhook_subscriptions(expires_at);
CREATE INDEX idx_rc_webhook_subs_subscription_id ON rc_webhook_subscriptions(subscription_id);

ALTER TABLE rc_webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can see their own subscription status; writes happen via service role
CREATE POLICY "rc_webhook_subs_self_select" ON rc_webhook_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ── 2. Call event log (all RC telephony events we receive) ─────────────────
CREATE TABLE sales_call_events (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rc_subscription_id  text,                                 -- which subscription delivered this
  rc_session_id       text,                                 -- RC telephonySessionId; groups events of one call
  rc_party_id         text,                                 -- RC partyId; one per leg of a call
  rc_call_id          text,                                 -- RC's call id (when available)
  event_type          text        NOT NULL,                 -- e.g. "telephony.session" | "call-log"
  direction           text,                                 -- "Inbound" | "Outbound"
  status              text,                                 -- "Setup" | "Proceeding" | "Answered" | "Disconnected" | etc.
  caller_number       text,                                 -- E.164 if available
  callee_number       text,
  raw                 jsonb       NOT NULL,                 -- full event payload from RC
  -- Optional links to our domain objects (populated by handlers, not RC)
  matched_lead_id     uuid        REFERENCES sales_leads(id) ON DELETE SET NULL,
  matched_assessment_id uuid      REFERENCES sales_assessments(id) ON DELETE SET NULL,
  received_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_call_events_user_received      ON sales_call_events(user_id, received_at DESC);
CREATE INDEX idx_sales_call_events_session            ON sales_call_events(rc_session_id) WHERE rc_session_id IS NOT NULL;
CREATE INDEX idx_sales_call_events_matched_lead       ON sales_call_events(matched_lead_id) WHERE matched_lead_id IS NOT NULL;
CREATE INDEX idx_sales_call_events_caller_number      ON sales_call_events(caller_number) WHERE caller_number IS NOT NULL;

ALTER TABLE sales_call_events ENABLE ROW LEVEL SECURITY;

-- A user can see events on calls they were a party to; admins see all
CREATE POLICY "sales_call_events_self_or_admin" ON sales_call_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR sales_is_admin());

-- Writes via service role only (the webhook handler), no client-side policy.

-- ── 3. Track which scopes a user has authorized ────────────────────────────
-- Existing rc_user_credentials.scope is a single string; keep it but add a
-- canonical array for easier scope checks.
ALTER TABLE rc_user_credentials
  ADD COLUMN scopes text[] NOT NULL DEFAULT '{}';
