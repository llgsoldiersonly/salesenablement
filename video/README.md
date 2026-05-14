# Legal Leads Group — Instagram Reputation Play Video

82-second kinetic-typography video built with [Remotion](https://www.remotion.dev/).

## Quick Start

```bash
cd video
npm install
npm start          # Opens Remotion Studio to scrub through scenes
```

## Render

```bash
npm run build          # → out/landscape.mp4  (1920×1080 — YouTube/LinkedIn)
npm run build-vertical # → out/vertical.mp4   (1080×1920 — Reels/Shorts/TikTok)
```

## Scene Timing

| # | Scene | Start | Duration |
|---|-------|-------|----------|
| 01 | Legal Leads Group intro | 0:00 | 3s |
| 02 | "LOOK…" hook | 0:03 | 3s |
| 03 | Google cheat code / 99% miss it | 0:06 | 5s |
| 04 | Instagram #6 most-clicked | 0:11 | 6s |
| 05 | Stats: 7.1B clicks · +17% · 1.6B keywords | 0:17 | 6s |
| 06 | AI bots: ChatGPT · Gemini · AI Overviews | 0:23 | 5s |
| 07 | What it means (bury bad press, outrank scams) | 0:28 | 6s |
| 08 | FREE / no $5K/month firm | 0:34 | 5s |
| 09 | "Here's the exact play" | 0:39 | 3s |
| 10 | Steps 1–3 | 0:42 | 8s |
| 11 | Caption formula card | 0:50 | 6s |
| 12 | Buying language keyword pills (Step 4) | 0:56 | 5s |
| 13 | Steps 5–7 | 1:01 | 6s |
| 14 | 30-day result scenarios | 1:07 | 5s |
| 15 | "NOW GO POST." | 1:12 | 5s |
| 16 | Outro — logo + lucrativelegal.com | 1:17 | 5s |

## Customisation

| What to change | Where |
|----------------|-------|
| Brand colors | `src/theme.ts` |
| Logo file | Replace `public/llg-logo.png` |
| Fonts | Change `FONT_IMPACT` / `FONT_BODY` in `src/theme.ts` |
| Copy / timing | Individual scene files in `src/scenes/` |
| Add voiceover | Drop mp3 in `public/`, add `<Audio src={staticFile('vo.mp3')} />` in `src/Video.tsx` |

## Logo Note

Replace `public/llg-logo.png` with the purple "LEGAL LEADS GROUP" logo for the correct branding.
