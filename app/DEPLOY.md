# Deploying to Vercel

## One-time setup

### 1. Install the Vercel CLI

```bash
npm i -g vercel
```

### 2. Link the project

From `app/`:

```bash
vercel link
```

When prompted:
- **Set up and deploy?** Yes
- **Which scope?** Your team / personal account
- **Link to existing project?** No (first time) → create a new project
- **Project name?** `llg-sales-app` (or whatever)
- **In which directory is your code?** `.` (you're already in `app/`)
- **Override settings?** No — `vercel.json` handles it

### 3. Add environment variables

In the Vercel dashboard → Project → Settings → Environment Variables, or via CLI:

```bash
vercel env add ANTHROPIC_API_KEY        # required — for /api/brief
vercel env add DEEPGRAM_API_KEY          # required — for /api/deepgram-token
vercel env add GOOGLE_PLACES_API_KEY     # optional — probe falls back to mock
vercel env add SERPAPI_KEY               # optional — probe falls back to mock
vercel env add VITE_SUPABASE_URL         # required — auth + storage (browser)
vercel env add VITE_SUPABASE_ANON_KEY    # required — auth + storage (browser)
```

`VITE_*` vars are exposed to the browser bundle at build time — that's correct
for Supabase publishable keys; row-level security in Postgres is what protects
data, not key secrecy.

Set each for **Production**, **Preview**, and **Development** (or just Production if that's all you need).

### 4. Pro plan note

The `/api/brief` function has `maxDuration: 60` because brief generation
typically runs 30-60s with Opus 4.7. Vercel Hobby caps functions at 10s,
so brief generation will time out on the free tier. **Upgrade to Pro** to
unlock longer function durations.

`/api/probe` (30s max) and `/api/deepgram-token` (5s max) work on Hobby.

## Deploy

```bash
vercel              # preview deployment
vercel --prod       # production deployment
```

Or just push to the linked git branch — Vercel auto-deploys on every push.

## How it works

- **Frontend**: `vercel.json` tells Vercel to build with `npm run build` and serve from `dist/`. The SPA rewrite catches all non-`/api/*` paths and serves `index.html` so the client-side router works.
- **API**: every `.ts` file in `app/api/` becomes a serverless function at `/api/<filename>`. Each one is a thin wrapper around the matching handler in `app/server/` — the streaming logic, prompt construction, and orchestration all stay framework-agnostic so the same code can run under Vite dev, Vercel, Cloudflare Workers, or any Node host.
- **Streaming**: NDJSON streaming works out of the box on Vercel Node functions. The handlers set `Content-Type: application/x-ndjson` and `X-Accel-Buffering: no` to keep the response un-buffered.
- **Body parsing**: Vercel parses JSON request bodies automatically and exposes them on `req.body`. Each handler accepts an optional `preParsedBody` parameter so it works under both Vite (which doesn't pre-parse) and Vercel (which does).

## Local dev

`npm run dev` in `app/` continues to work exactly as before — Vite's
`configureServer` plugin mounts the same handlers at the same paths. The
Vercel functions in `app/api/` are only used in production.

## Custom domain

Vercel project → Settings → Domains → Add. Point your DNS at Vercel's
`A` and `CNAME` records.

## Logs & debugging

```bash
vercel logs --follow
```

Or in the Vercel dashboard → Deployment → Functions → click a function → Logs.
