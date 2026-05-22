-- Per-user RingCentral OAuth credentials
--
-- Stores access + refresh tokens for each rep that has connected their RC
-- account. Tokens never reach the browser — server-side endpoints fetch them
-- on behalf of the authenticated user, refresh when expired, and call RC.
--
-- One row per user (PK = user_id), foreign-keyed to auth.users so disconnect
-- on user delete is automatic.

CREATE TABLE rc_user_credentials (
  user_id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token       text        NOT NULL,
  refresh_token      text        NOT NULL,
  access_expires_at  timestamptz NOT NULL,
  refresh_expires_at timestamptz NOT NULL,

  -- Populated from the RC user profile after OAuth completes so we don't
  -- have to look them up on every dial.
  rc_user_id         text,
  rc_extension_id    text,
  rc_main_number     text,        -- the rep's primary RC phone number, used as RingOut "from"
  rc_account_id      text,
  scope              text,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rc_user_credentials_access_expires
  ON rc_user_credentials(access_expires_at);

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE rc_user_credentials ENABLE ROW LEVEL SECURITY;

-- Each user can only read/update their own row. Service-role bypass RLS by
-- default, which is what the OAuth callback function uses to insert.
CREATE POLICY "rc_credentials_self_select" ON rc_user_credentials
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "rc_credentials_self_delete" ON rc_user_credentials
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- INSERT + UPDATE only via service-role (the API callback / dial endpoint).
-- No client-side policies — clients should never write tokens directly.
