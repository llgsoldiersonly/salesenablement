# Handoff — 2026-05-22 19:30 UTC

**Branch:** `main` (clean, no uncommitted changes)
**Production URL:** https://www.llgbot.com (and https://salesenablement.vercel.app)
**Supabase project:** `lknwqzntctzxkiklfksi` — lives inside the user's `llgsoldiersonly's Org` but currently surfaces in their Supabase dashboard under the project named *"myinjuryvalue"*. The MCP-connected Supabase token does NOT have access to this project — any future migrations must be applied manually via the Supabase Studio SQL Editor.
**Git identity in this repo:** `Nathan Unger <nathan.u@lucrativelegal.com>`

> **Companion strategy doc**: [HANDOFF-zoho-cutover.md](./HANDOFF-zoho-cutover.md) — Zoho elimination plan + RingCentral integration roadmap. **Target state is Option B** (per Nathan, 2026-05-22). Option A is the prerequisite slice. Build NOT yet greenlit; verify RingCentral specifics first.

---

## Goal
Ship a working in-app Leads Management portal that replaces a disorganized Zoho CRM, plus modernize the app's visual design per the TypeUI design system the user supplied.

## What Was Done

**Functional features**
- **Light/dark theme toggle** with localStorage persistence — `src/lib/theme.tsx`, button in TopBar, FOUC-free via inline script in `index.html`. (PR #9, merged)
- **`sales_leads` data model**, 1:1 with `sales_assessments`, with `sales_lead_status_history` audit table. Auto-create trigger fires on every new assessment; backfill applied to existing rows. Status update trigger maintains `status_changed_at` / `first_interest_at` / `lost_at`. RLS mirrors assessment visibility. — `supabase/migrations/0001_sales_leads.sql`, applied manually to Supabase. (PR #10, merged + applied to live DB)
- **Leads helper library** with types, status enum, and CRUD — `app/src/lib/leads.ts`.
- **`/leads` portal** — peer to `/admin` and `/closers`, accessible to openers + closers + admins. Spreadsheet view with sortable columns + inline status dropdown + pin star + stale ⚠ on 16d+, Kanban view with 8 lanes matching the user's pipeline (Blank → Emailed → Spoke → Zoom Scheduled → Post Zoom → 2nd Zoom → Lost → Signed), detail drawer with status timeline + sections for sales context / contact / DM / gatekeeper notes / outcome. View choice persisted per-rep. Stage filter chips + search box at top. — `app/src/components/LeadsApp.tsx` + `app/src/components/leads/*`. (PR #11, merged)
- **Prominent labeled Leads button** in TopBar — replaces the subtle ◰ icon, visible on every breakpoint. (PR #12, merged)
- **OTP 6-digit code fallback** for sign-in to bypass Microsoft 365 Safe Links consuming magic-link tokens. Existing link path still default; code path is an alternative. — `app/src/components/SignIn.tsx`. (PR #13, merged)

**Design system migration to TypeUI tokens** (LLG terracotta orange preserved in the brand slot):
- **Foundation** — Inter font replaces Nunito Sans; surface flips from neumorphic gray `#ecf0f3` to clean white; shadows go from dual-direction emboss to modern elevation scale; expanded color/border/foreground tokens. (PR #14, merged)
- **#1 Buttons** — variant palette (brand/secondary/tertiary/success/danger/warning/dark/ghost), glint effect on filled variants, 4px focus rings, disabled state per spec. `neutral` kept as alias. (PR #15, merged)
- **#2 Badges + StatusBadge** — Badge variant set per spec; lead status pills polished. (PR #16, merged)
- **#3 Tables** — Leads spreadsheet wrapped in proper bordered card per tables.md. (PR #17, merged)
- **#4 Inputs** — new shared `<Input>` + `<Textarea>` components with hover/focus per spec. SignIn + LeadsApp search migrated. (PR #18, merged)
- **#5 Modals** — new `<Modal>` primitive with backdrop+blur, ESC close, body scroll lock. CalendarSyncDialog + LoadReportDialog migrated. (PR #19, merged)

## Key Decisions
- **Lead status moves are MANUAL.** No auto-progression from call outcomes. Triggers only maintain audit fields. — User explicitly chose this over the proposed auto-progression to prevent automation overwriting reps' manual updates.
- **16-day stale-deal rule is the one exception.** Any lead that ever reached `spoke_with_attorney` or later, then went 16d with no status change, should auto-flip to `lost_lead` and surface a closer follow-up. — `first_interest_at` column is wired up; the actual scheduled sweeper is NOT yet built.
- **Two equal views (Spreadsheet + Kanban) with per-rep view persistence.** No "primary view." — User asked for equal toggle.
- **Brand orange (#F05A28) preserved through the TypeUI redesign.** — TypeUI's spec brand is blue; we kept LLG's orange in the brand token slot rather than rebranding.
- **Zoho CRM integration abandoned.** User confirmed the existing Zoho is disorganized enough that integrating was higher-cost than building in-app. The leads portal is the replacement.
- **Production deployment lives on a Vercel team (`llg-team`) and Supabase project (`lknwqzntctzxkiklfksi`)** that Claude's MCP cannot directly access. Migrations and Vercel env vars must be applied by the user.

## Open Follow-ups

### High-value next slices (functional)
- [ ] **Editable detail drawer** — reps need to capture gatekeeper notes, decision-maker name/title, contact email/phone, quoted values *during calls*. Currently the drawer is display-only. Affects `app/src/components/leads/LeadDetailDrawer.tsx` + adds an `<EditableField>` pattern.
- [ ] **Drag-and-drop on Kanban** — currently status moves only via the dropdown inside the card detail drawer. Drag-drop would feel native. Affects `app/src/components/leads/LeadsKanbanView.tsx`. Library option: `@dnd-kit`.
- [ ] **Email log** — adds a "Log email" button on each lead + a `sales_email_log` table. Unlocks the `Emailed` status to auto-progress when a rep clicks the button.
- [ ] **16-day stale-deal sweeper** — scheduled job (cron via Vercel Cron or Supabase scheduled function) that finds leads where `first_interest_at IS NOT NULL` AND `status_changed_at < now() - interval '16 days'` AND `status NOT IN ('lost_lead','signed')` and flips them to `lost_lead` with `lost_reason = 'stale - no contact in 16 days'`, then notifies the assigned closer.
- [ ] **Mobile-adapted Kanban** — currently the only mobile experience is horizontal scroll. Better: swipe between lanes, single lane visible at a time.

### Email deliverability for sign-in (USER ACTIONS REQUIRED)
- [ ] **Verify Supabase email template includes `{{ .Token }}`** — Supabase Dashboard → Auth → Email Templates → Magic Link. Without this, the new OTP-code UI loads but the email won't contain a code.
- [ ] **Update SPF DNS record at IONOS for llgbot.com** — change TXT record to `v=spf1 include:_spf-us.ionos.com include:amazonses.com ~all`. Resend (the actual SMTP sender) goes through AWS SES; current SPF only authorizes IONOS, so Outlook downgrades trust.
- [ ] **M365 Defender Safe Links allow-list** — add `*.llgbot.com/*` and `*.supabase.co/*` to "Do not rewrite the following URLs" so the magic-link path works for users in the lucrativelegal.com tenant.

### Design system tail
- [ ] **EndCallDialog + NewAssessmentDialog** → migrate to `<Modal>` primitive (both currently inline, ~275 + ~411 lines).
- [ ] **10+ remaining input call sites** → migrate to `<Input>` for proper hover/focus.
- [ ] **CallsLibraryView and other tables** → wrap per `tables.md`.
- [ ] **Hardcoded `bg-[#FEF2F2]` error backgrounds** in a few dialogs → swap to `bg-danger-soft`.

### From the pre-launch audit (deferred, prioritize based on real-use feedback)
- [ ] Persist Deepgram call transcripts to Supabase storage (currently last-10-utterances only, then discarded)
- [ ] Cost meter for Deepgram + Claude API spend in admin
- [ ] Move hardcoded package pricing out of `app/src/lib/packages.ts` into an admin-editable table
- [ ] Build gatekeeper-handling features (script variants, objection battlecard, "best time to call back" capture) — flagged as #1 opener gap
- [ ] Audit-log retention policy (`sales_activity` accumulates forever)
- [ ] Verify RLS on `sales_activity`, `sales_calls`, `sales_profiles`, `coach_notes`

## Current State

Open `https://www.llgbot.com` in an incognito window — every visible surface should reflect the new TypeUI aesthetic (Inter font, clean white background, modern elevation, brand-orange glint on CTAs). The Leads portal at `/leads` is functional end-to-end: the DB trigger auto-creates a lead for every new assessment, both views (spreadsheet + Kanban) render correctly, sort/filter/search work, status moves persist via inline dropdown, and the detail drawer opens cleanly with a status timeline. The Sign-in page exposes the OTP-code path as the primary action; the link path still works as a fallback. There is **nothing in-progress mid-rewrite** — every PR opened in this session has been merged and Vercel has deployed. The two known untested edges are the Supabase email template (the `{{ .Token }}` template variable must be present for the code-entry UI to actually show users a code) and the IONOS SPF record (without `amazonses.com` included, Outlook may downgrade trust on emails from `noreply@llgbot.com`). Both fixes require user action — neither can be applied from inside this repo. The lead view only has 2 rows of data (matching 2 assessments) — when the team starts running real assessments, the leads will populate automatically.

## Resume Command

Open `https://www.llgbot.com/leads` in an incognito window, then ask Nathan which deferred item from "Open Follow-ups → High-value next slices" to prioritize next (editable detail drawer is the strongest first candidate since reps can't capture findings during calls without it), then `git checkout main && git pull && git checkout -b feat/<short-slice-name>` and begin.
