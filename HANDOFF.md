# Handoff: Vercel `/api/probe` ERR_MODULE_NOT_FOUND — FIXED

**Date:** 2026-05-05
**Status:** ✅ Fix applied, pushed to `claude/fix-sales-app-api-BLpIz` and merged to `main`
**Awaiting:** Vercel auto-redeploy + smoke test

---

## TL;DR

Vercel functions were crashing with:

```
Cannot find module '/var/task/app/server/probe-handler'
imported from /var/task/app/api/probe.js
ERR_MODULE_NOT_FOUND
```

**Root cause:** `app/package.json` has `"type": "module"`, so the compiled
serverless functions run as **native Node ESM**. Native ESM requires
**explicit `.js` extensions on relative imports**. TypeScript source used
extensionless imports (e.g. `from "../server/probe-handler"`), which TS resolved
fine at typecheck time but Node ESM couldn't resolve at runtime.

**Fix:** Added `.js` to every relative import in `app/api/`, `app/server/`,
and the two `app/src/` files those depend on.

---

## What was changed

12 files, all in commit `<see latest>`:

| File | Change |
|---|---|
| `app/api/probe.ts` | `"../server/probe-handler"` → `"../server/probe-handler.js"` |
| `app/api/brief.ts` | `"../server/handler"` → `"../server/handler.js"` |
| `app/api/deepgram-token.ts` | `"../server/deepgram-token-handler"` → `"../server/deepgram-token-handler.js"` |
| `app/server/probe-handler.ts` | `"./probe/run"` → `"./probe/run.js"`, `"../src/types"` → `"../src/types/index.js"` |
| `app/server/handler.ts` | `"./prompts"` → `"./prompts.js"`, `"../src/types"` → `"../src/types/index.js"` |
| `app/server/prompts.ts` | `"../src/lib/packages"` → `"../src/lib/packages.js"`, `"../src/types"` → `"../src/types/index.js"` |
| `app/server/probe/run.ts` | `"./site-scrape"`, `"./places"`, `"./serp"`, `"../../src/types"` — all + `.js`/`/index.js` |
| `app/server/probe/places.ts` | `"../../src/types"` → `"../../src/types/index.js"` |
| `app/server/probe/serp.ts` | `"../../src/types"` → `"../../src/types/index.js"` |
| `app/server/probe/site-scrape.ts` | `"../../src/types"` → `"../../src/types/index.js"` |
| `app/src/lib/packages.ts` | `"../types"` → `"../types/index.js"` |

`app/server/deepgram-token-handler.ts` had no relative imports, no change.

## Why the source still typechecks

`app/tsconfig.json` uses `"moduleResolution": "Bundler"`, which understands
that `./foo.js` actually resolves to `./foo.ts` in source. Vite uses the same
convention for client code. So:

- `npx tsc --noEmit` → ✅ passes
- `npm run build` (= `tsc && vite build`) → ✅ passes
- Vercel `@vercel/node` compiles `.ts` → `.js` literally, and Node ESM finds
  the `.js` files at runtime — ✅ resolves correctly

## Verification done before push

```bash
cd app
npx tsc --noEmit              # ✅ no errors
npm run build                 # ✅ built in 2.34s, 297KB JS bundle
```

## Verification still needed (after Vercel redeploys)

1. **Health endpoint still 200:**
   ```bash
   curl https://<deployment>.vercel.app/api/health
   ```
   Already confirmed pre-fix: returns Node v24.14.1 + all 4 env-vars present.

2. **New Assessment runs end-to-end:**
   - Open the deployed app
   - Click "New Assessment"
   - Fill in firm details (state is now a dropdown — saves time)
   - Click "Run Assessment"
   - Expected: 3 source rows fill in (site-scrape, google-places, serp-local)
     within ~5-15s, then dashboard loads with the report

3. **If assessment still fails:** the dialog now surfaces the real NDJSON
   error message (commit `d5f7961` wrapped both probe and brief handlers in
   try/catch with dynamic imports + console.error). Paste that error to
   continue debugging.

4. **Brief generation needs Vercel Pro plan** — `/api/brief` has
   `maxDuration: 60` which exceeds Hobby's 10s ceiling. `/api/probe` at 30s
   also exceeds Hobby. Confirm Pro is active before generating a brief.

---

## Earlier debugging context (for the curious)

1. **Initial deploy failure** — Vite not detected. Fixed by setting Vercel
   Root Directory = `app` in project Settings.
2. **`vite: command not found`** — same Root Directory issue.
3. **`FUNCTION_INVOCATION_FAILED` with no detail** — added try/catch + dynamic
   imports in `app/api/probe.ts` and `app/api/brief.ts` (commit `d5f7961`).
   This surfaced `ERR_MODULE_NOT_FOUND`.
4. **ERR_MODULE_NOT_FOUND** — fixed by this commit (the `.js` extensions).

## Files added during debugging (kept)

- `app/api/health.ts` — `GET /api/health` returns runtime + env-var booleans.
  Useful diagnostic; no reason to remove.
- `app/api/probe.ts`, `app/api/brief.ts` — try/catch wrapper + dynamic imports.
  Keeps future module errors visible as NDJSON instead of generic 500s.

## Files / paths reference

```
app/
├── api/                          # Vercel serverless function entry points
│   ├── brief.ts                  # POST /api/brief (Anthropic stream, needs Pro)
│   ├── deepgram-token.ts         # POST /api/deepgram-token
│   ├── health.ts                 # GET  /api/health (diagnostics)
│   └── probe.ts                  # POST /api/probe (3-source NDJSON stream)
├── server/                       # Framework-agnostic handlers
│   ├── deepgram-token-handler.ts
│   ├── handler.ts                # handleBrief
│   ├── prompts.ts
│   ├── probe-handler.ts          # handleProbe
│   └── probe/
│       ├── places.ts
│       ├── run.ts                # runProbe async generator
│       ├── serp.ts
│       └── site-scrape.ts
├── src/                          # Vite client app
│   ├── types/index.ts            # Imported by server/* (now via .js)
│   └── lib/packages.ts           # Imported by server/prompts.ts (now via .js)
├── package.json                  # "type": "module" — DO NOT REMOVE
├── tsconfig.json                 # moduleResolution: "Bundler"
└── vercel.json                   # framework: vite, SPA rewrite
```

## Important things to know going forward

- **Always use `.js` on new relative imports inside `server/` and `api/`.**
  TypeScript will rewrite to `.ts` for typecheck. Forgetting this will
  reproduce the same crash.
- **`/api/brief` needs Vercel Pro.** Both probe (30s) and brief (60s) exceed
  Hobby's 10s `maxDuration`.
- **Streaming over Vercel Node functions works** but only if you write
  responses incrementally with `res.write()` — both probe and brief do this.
- **Cheerio v1.x is ESM** and bundles fine under `@vercel/node`. If a future
  cheerio upgrade breaks the bundle, that's a known compat area.
- **Closer Cockpit / Deepgram transcription** is a separate feature; should
  start working once `/api/deepgram-token` deploys with this fix (it had the
  same ESM bug).

## Open / pending items

- **Confirm Pro plan is active** for brief generation
- **Roadmap (not yet started):** territory dashboard, Zoho CRM sync, PDF
  export, Supabase persistence, mobile, brief templates
