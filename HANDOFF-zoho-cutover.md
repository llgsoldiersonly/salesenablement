# Handoff — Zoho Cutover & RingCentral Integration Plan — 2026-05-22

**App:** LLG sales enablement (React + Supabase + Vercel) — https://www.llgbot.com
**Companion to:** [HANDOFF.md](./HANDOFF.md) (the build-state handoff). This doc covers the *strategy* decision: eliminating Zoho and going app + RingCentral only.

---

## ⭐ DECISION (2026-05-22, Nathan)

**Target direction is Option B.** Reasoning:

- Option B directly cures the bottleneck the user identified: post-flip knowledge stranded in a disconnected spreadsheet. Webhooks tie call events back to the lead record so flips, recordings, and notifications all attach to the right lead automatically.
- Option A is treated as a **prerequisite slice toward Option B**, not as the end state. We still ship A first (editable detail drawer + RingCentral click-to-dial + Flip-ready lane) because (a) it lets us turn Zoho off immediately, and (b) it puts the data model in place that Option B's webhook handlers will write into.
- Option C remains a future upgrade; **do not gate the Zoho cutover or Option B on it.**

**Status:** Decision recorded. Build NOT yet greenlit — Nathan wants to verify a few RingCentral specifics before opening the first PR. See "RingCentral specifics to VERIFY" below.

---

## TL;DR

**Goal:** Eliminate Zoho. Run the sales workflow on this app + RingCentral only.

**Verdict: viable and low-risk.** Zoho is not functioning as a CRM today — it hosts a click-to-ring button and an empty database. Reps don't live in it, there's no emailing, and flip notes never land in it (they sit in a disconnected spreadsheet). So the cutover loses nothing real. The only Zoho function that must be replaced is **click-to-dial**, which RingCentral does natively.

**Recommendation:** Ship **Option A** to turn Zoho off now, then layer **Option B** to fix the core bottleneck. Treat **Option C** as a later upgrade.

---

## Confirmed context (from the user)

- **The "flip" = a live warm transfer with listen-in.** Opener has the prospect on the line; closer gets a RingCentral message (or monitors a call-monitoring group) to **listen in**, then **takes over** the call. This maps exactly to RingCentral's Call Monitoring flow (Silent Monitor → Whisper → Barge → Takeover).
- **RingCentral API/developer access is available.** Integrations against call events, click-to-dial, and supervision are on the table.
- **Current bottleneck:** post-flip notes (DM name/title, gatekeeper notes, contact info, quoted value, "why this lead is good") are typed into a **spreadsheet** that is never synced to any CRM. The knowledge created around the flip is stranded.

---

## The reframe (why the cutover is safe)

Three layers each do one job; one is dead weight:

| Layer | Job today | Keep? |
|---|---|---|
| **RingCentral** | Phone system: dialing, warm transfer, listen-in/barge | ✅ Keep — doing real work |
| **Spreadsheet** | De facto system of record for flip notes | ❌ Replace with the app's lead record |
| **Zoho** | Hosts the click-to-ring button + an empty DB nobody fills | ❌ Eliminate |

Zoho's two nominal jobs — (1) click-to-dial and (2) storing lead notes — are both done better elsewhere. The notes already aren't in Zoho, so **there's zero migration loss.** The one job that must be re-homed is **click-to-dial**, which RingCentral provides directly (RingOut API or RingCentral Embeddable).

**The bottleneck is not "we have Zoho." It's that the flip is a phone event but the knowledge around it lives in a disconnected spreadsheet.** Fix the flip and the notes together.

---

## The three options (easy → deep)

### Option A — "App is the record, RingCentral stays the phone" (fastest, lowest risk) — DO FIRST
Make the app the single source of truth and kill the spreadsheet. No call-event integration yet.

- Replace Zoho's click-to-ring with a **click-to-dial button on each lead**, via RingCentral **RingOut API** — or drop in **RingCentral Embeddable** (their prebuilt softphone widget, embed in a corner of the app, minimal code).
- Build the **editable detail drawer** (already the #1 open follow-up in `HANDOFF.md`): openers capture DM name/title, gatekeeper notes, contact email/phone, and quoted value *during the call*, straight onto the lead.
- The flip stays as-is in RingCentral (warm transfer + listen-in). Difference: the closer opens the **same lead record** and sees everything. Opener moves the lead to a "Flip / ready for closer" lane.

**Why first:** mostly already-scoped work, deletes the spreadsheet immediately, almost no RingCentral engineering. **This alone lets you switch Zoho off.**

### Option B — "RingCentral events drive the app" (the sweet spot) — TARGET STATE ⭐
Everything in A, plus wire RingCentral **webhooks (telephony session notification events)** so calls and the app stay in sync.

- **Screen-pop:** on call connect, match the phone number → auto-open the right lead. Rep is on the record before "hello."
- **Flip becomes a logged event:** when the opener starts the warm transfer / listen-in, fire a RingCentral **SMS/message to the closer** ("Listen in on lead X → [link]") *and* stamp a flip event on the lead (opener → closer, timestamp). Closer taps the link → lands on the lead with the opener's notes while listening in.
- **Recordings/transcripts auto-attach** to the lead via the **Call Log API**.

**Why the sweet spot:** directly cures the bottleneck — flip captured, audited, notes follow the lead automatically — without fully controlling the phone from inside the app. Moderate build: webhook handlers as Vercel or Supabase edge functions + a RingCentral developer-app setup.

### Option C — "App orchestrates the call + supervision" (deepest) — LATER
Everything in B, plus the flip is *initiated from the app* using RingCentral **Call Control + Supervise API**.

- Opener clicks **"Flip to closer"** in the lead drawer → app calls the Supervise endpoint to pull the closer in as monitor/whisper (the listen-in → takeover flow), sends the notification, stamps the record — one button.
- Optionally route *all* dialing through the app so reps never leave it.

**Why cautious:** most powerful but most fragile and slowest. Needs call-monitoring groups, supervisor permissions, and RingCentral developer-app graduation/approval. A destination, not a starting point. **Do not gate the Zoho cutover on this.**

---

## Recommended sequence

1. **Option A** — turn Zoho off, end the spreadsheet.
2. **Option B** ⭐ — fix the flip-knowledge bottleneck properly. **← This is the chosen target.**
3. **Option C** — optional later "everything in one window" upgrade.

---

## RingCentral specifics to VERIFY before building

(Knowledge cutoff caveat — confirm against current RingCentral developer docs. These are the spots where licensing/approval can bite.)

- [ ] **Current RC plan tier** — confirm `CallControl` + `WebhookSubscriptions` + `RingOut` scopes are available. Verify with the LLG RingCentral rep or account admin.
- [ ] **Third-party API access enabled on the tenant** — some RC tenants disable this by default for security.
- [ ] **All reps (openers + closers) on the same RC tenant** — cross-tenant transfer/listen-in is harder.
- [ ] **Click-to-dial:** RingOut API vs. RingCentral Embeddable — pick one for Option A.
- [ ] **Call events:** Telephony Session Notification webhooks — event types for ring/answer/transfer/end; subscription setup.
- [ ] **Supervise / Call Monitoring API:** confirm the plan tier exposes it (the listen-in → whisper → barge → takeover feature for Option C).
- [ ] **Developer-app approval / "graduation":** the process to move a RingCentral app from sandbox to production webhooks. Typical timeline: 1-2 weeks for RC review.
- [ ] **Messaging API:** SMS/message-to-closer for the flip notification (Option B).
- [ ] **Call Log API:** pulling recordings/transcripts to attach to a lead (Option B).

---

## Cost expectations (verify against the answers above)

| Line item | Realistic monthly add | Notes |
|---|---|---|
| RC plan tier | $0 if current plan covers the scopes; otherwise potential per-user upgrade | The Advanced tier typically covers full API access. Core tier may need an upgrade. |
| API call usage | $0 | RC includes API calls in plan; no per-call billing at sales-org volume. |
| Vercel serverless (webhook handlers) | $0–$5 | Included in current Hobby/Pro plan. |
| Supabase rows (new `sales_call_events`, `rc_user_credentials` tables) | rounding error | |
| **Engineering** | one-time | A: ~2–3 days · B (incremental): ~4–5 days · C: ~3–4 more days |

---

## Cross-references into `HANDOFF.md`

- **Editable detail drawer** is already listed as the strongest first follow-up (`app/src/components/leads/LeadDetailDrawer.tsx` + an `<EditableField>` pattern) — this *is* Option A's notes-capture piece.
- **Email log** open follow-up (`sales_email_log` table) overlaps with replacing Zoho's missing emailing.
- The **8-lane pipeline** (Blank → Emailed → Spoke → Zoom Scheduled → Post Zoom → 2nd Zoom → Lost → Signed) needs a **"Flip / ready for closer"** concept — decide whether that's a new lane or a flag on existing lanes.
- Supabase project `lknwqzntctzxkiklfksi` is NOT MCP-accessible — any new tables (e.g. `sales_call_events`, flip-event audit) go through the Supabase Studio SQL Editor manually.

---

## Resume command (for Claude Code)

Read [HANDOFF.md](./HANDOFF.md) and this file. **Target is Option B**, but the entry slice is Option A. Start Option A: (1) build the editable detail drawer so openers capture findings during calls, (2) add a click-to-dial button per lead using RingCentral RingOut or Embeddable, (3) add a "Flip / ready for closer" state to the pipeline. Confirm the RingCentral API specifics in the checklist above before writing any webhook/supervision code. `git checkout main && git pull && git checkout -b feat/zoho-cutover-option-a`.
