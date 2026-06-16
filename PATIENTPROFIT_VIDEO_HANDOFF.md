# PatientProfit AI Agents Video — Handoff Guide

## What This Is

A 30-second vertical (1080×1920) Remotion video for TikTok and Instagram Reels.
Title: **"How AI Agents Work"** — 5-scene educational explainer targeting cosmetic
dentists, plastic surgeons, and high-ticket non-insurance medical professionals.
Ends with a `mypatientprofit.com` CTA.

---

## Project Location

The video source lives in a `video/` subdirectory inside the PatientProfit repo:

```
/workspaces/PatientProfit/
├── video/                  ← Remotion project root
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── Root.tsx
│       ├── AgentsVideo.tsx
│       ├── theme.ts
│       ├── hooks/
│       │   └── useScale.ts
│       └── scenes/
│           ├── Scene01.tsx   — Chatbot vs Agent
│           ├── Scene02.tsx   — The Agent Loop
│           ├── Scene03.tsx   — Agents Use Tools
│           ├── Scene04.tsx   — Memory & Planning
│           └── Scene05.tsx   — The Future Is Agentic
```

---

## One-Command Setup (Codespaces)

In the Codespaces terminal, make sure you're at the repo root first:

```bash
cd /workspaces/PatientProfit
```

Then run the self-installing script from the salesenablement repo:

```bash
curl -fsSL https://raw.githubusercontent.com/llgsoldiersonly/salesenablement/claude/check-remotion-skill-5A4yD/pp-video-setup.sh | bash
```

This script:
1. Creates all directories
2. Writes every source file via heredocs
3. Runs `npm install` automatically

---

## Running the Preview

```bash
cd /workspaces/PatientProfit/video
npm start
```

Codespaces will detect port **3000** and show a notification — click **"Open in Browser"**.
Or go to the **PORTS** tab and click the globe icon next to port 3000.

You'll see the Remotion Studio with the `PPVideoVertical` composition.
Scrub the timeline to preview all 5 scenes.

---

## Rendering the Final MP4

```bash
cd /workspaces/PatientProfit/video
npm run build
```

Output: `video/out/vertical.mp4`

To download: right-click the file in the VS Code Explorer panel → **Download**.

> Note: The build script uses `--gl=swangle` (software renderer) which is
> required in Codespaces since there's no GPU. Local machines with a GPU
> can change this to `--gl=angle` for faster renders.

---

## Video Specs

| Property | Value |
|----------|-------|
| Resolution | 1080 × 1920 (9:16 vertical) |
| FPS | 30 |
| Duration | 912 frames ≈ 30.4 seconds |
| Format | MP4 (H.264 via Remotion renderer) |
| Transitions | 4 × fade transitions, 12 frames each |
| Font | Inter (via @remotion/google-fonts) |

---

## Scene Breakdown

### Scene 01 — "What Is an AI Agent?" (frames 0–192)
**Purpose:** Hook. Contrast chatbot vs agent.

- Left card: static ChatbotSVG (speech bubble + down arrow) labeled "Waits for commands"
- Right card: animated AgentSVG (hexagon + rotating orbit dot + pulsing glow) labeled "Acts autonomously"
- Both cards spring in with `spring({ damping: 200 })`
- Bottom copy: "A chatbot responds. An agent thinks, plans, and acts on its own."

**Key animations:**
- `useSpringIn(delay)` — scale 0.85→1 + translateY 30→0
- AgentSVG orbit dot rotates 0→360° over 90 frames
- Hex glow pulses via `Math.sin(frame * 0.15)`

---

### Scene 02 — "The Agent Loop" (frames 180–372, overlapping 12 frames)
**Purpose:** Show the perceive/think/act/observe cycle.

- 4 SVG nodes: PERCEIVE (sky blue), THINK (indigo), ACT (green), OBSERVE (amber)
- Curved bezier arrow paths draw themselves via `strokeDashoffset` animation
- Each node pops in with a spring scale 0→1

**Key animations:**
- `drawPath(frame, startFrame, endFrame)` — plain function (not a hook), returns dashoffset 800→0
- Arrow colors match the destination node color
- SVG arrow markers (`<marker>`) defined in `<defs>` for arrowheads

---

### Scene 03 — "Agents Use Tools" (frames 360–552, overlapping 12 frames)
**Purpose:** Show the 4 external tools an agent can use.

- Central hexagon labeled "AGENT CORE"
- 4 tool nodes radiating outward: 🔍 Web Search, 💻 Code Exec, 📁 File Access, 🌐 APIs
- Lines draw from center to each tool; lines turn green when tool "activates"
- Tool nodes flip from indigo border → green border on activation

**Key animations:**
- `springIn(frame, fps, delay)` — plain function returning opacity + scale
- `lineProgress(frame, delay)` — dashoffset 800→0
- `activateProgress` — interpolate 0→1 between delay+10 and delay+20 frames

---

### Scene 04 — "Memory & Planning" (frames 540–732, overlapping 12 frames)
**Purpose:** Show a concrete agent workflow relevant to the audience.

- 5 step cards slide in from right: GOAL, STEP 1, STEP 2, STEP 3, RESULT
- Each card has a label (emoji + name) and subtitle
- Green checkmark pops in 12 frames after each card
- Count-up counter at bottom: "0 / 3 steps completed" → "3 / 3 steps completed"

**Step content:**
```
🎯 GOAL    — Book 10 new patients
🔍 STEP 1  — Search Google reviews
📝 STEP 2  — Draft Instagram caption
📤 STEP 3  — Schedule & publish post
✅ RESULT  — Task complete — repeat
```

**Key animations:**
- `stepSpring(frame, fps, delay)` — translateX 80→0 via spring
- `checkmarkStyle(frame, fps, delay)` — scale 0→1 via spring, delayed by +12 frames
- Count-up: `Math.floor(interpolate(frame, [66, 96], [0, 3]))`

---

### Scene 05 — "The Future Is Agentic" (frames 720–912, overlapping 12 frames)
**Purpose:** Big emotional finish + CTA.

- 12 indigo particle circles drift upward from the bottom with horizontal drift
- "The Future Runs on Agents" headline springs in
- Giant count-up number: 0 → 1,000+ (tasks automated / day)
- Sub-line: "AI agents don't replace you — they multiply you."
- Amber `mypatientprofit.com` pill button fades in last

**Key animations:**
- Particles: deterministic positions (no `Math.random()`), opacity fades in then out
- Count-up: `Math.floor(interpolate(frame, [40, 90], [0, 1000]))`
- `textShadow: \`0 0 60px ${C.accent}60\`` on the large number for glow
- `fontVariantNumeric: "tabular-nums"` prevents layout shift during count-up

---

## Theme Colors

```ts
C.bg          = "#0a0a0a"   // near-black background
C.white       = "#ffffff"
C.accent      = "#6366f1"   // indigo (primary brand color)
C.accentBright= "#818cf8"   // lighter indigo
C.success     = "#22c55e"   // green (completion / active)
C.muted       = "#9ca3af"   // gray (secondary text)
C.card        = "#141414"   // card background
C.cardBorder  = "#2a2a2a"   // card border
```

CTA color: `#f59e0b` (amber/gold)

---

## Safe Zone

All content is constrained to:

```ts
SAFE.top    = 150px   // avoids TikTok/Reels top UI chrome
SAFE.bottom = 170px   // avoids like/comment/share buttons
SAFE.side   = 60px    // avoids edge clipping
```

This is enforced by the `position: absolute` wrapper div in every scene.

---

## Architecture

### `Root.tsx`
Registers a single Remotion composition: `PPVideoVertical` at 1080×1920, 912 frames, 30fps.

### `AgentsVideo.tsx`
The main composition. Uses `TransitionSeries` from `@remotion/transitions` with
`fade()` presentations and `linearTiming({ durationInFrames: 12 })` between each scene.

```tsx
<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={192}><Scene01 /></TransitionSeries.Sequence>
  <TransitionSeries.Transition timing={linearTiming({ durationInFrames: 12 })} presentation={fade()} />
  <TransitionSeries.Sequence durationInFrames={192}><Scene02 /></TransitionSeries.Sequence>
  // ... repeat for Scenes 03, 04, 05
</TransitionSeries>
```

### `theme.ts`
Loads Inter font at module level via `@remotion/google-fonts/Inter`. Exports `C` (colors),
`INTER` (font family string), and `SAFE` (safe zone margins).

### Animation pattern used throughout
```ts
// Spring animation (snappy, no bounce)
const s = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 200 } });

// Opacity fade-in
const opacity = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });

// Spring-driven transform
const transform = `translateY(${interpolate(s, [0, 1], [40, 0])}px)`;
```

**Important:** Custom animation functions that call `useCurrentFrame()` or `useVideoConfig()`
must be named `useXxx` and called at the top level of a component — not inside `.map()`.
Functions that take `frame` and `fps` as parameters are plain functions and CAN be called
inside `.map()`. This distinction is enforced in Scene03, Scene04.

---

## Dependencies

```json
{
  "remotion": "^4.0.257",
  "@remotion/cli": "^4.0.257",
  "@remotion/transitions": "^4.0.461",
  "@remotion/google-fonts": "^4.0.461",
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "typescript": "^5.4.5"
}
```

TypeScript config uses `"skipLibCheck": true` to avoid dom-webcodecs type conflicts
with Remotion's internal types.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm error Missing script: "start"` | You're in the repo root, not `video/`. Run `cd video` first. |
| `Could not read package.json: ENOENT` | Same — `cd /workspaces/PatientProfit/video` |
| Render fails with GL error | Change `--gl=angle` to `--gl=swangle` in package.json build script |
| Font not loading in Studio | Normal on first load — Remotion fetches Inter from Google Fonts; wait a second |
| Port 3000 not forwarding | In PORTS tab, right-click port 3000 → "Port Visibility" → Public |
| `TransitionSeries` import error | Make sure `@remotion/transitions` is installed: `npm install @remotion/transitions` |
| TypeScript errors from old scenes | The tsconfig `include` list only covers Scene01–Scene05; old Scene*Intro files are excluded |

---

## Making Changes

### To edit copy / headlines
Open the relevant `Scene0X.tsx` file and change the string literals directly.
Remotion Studio hot-reloads — changes appear in the preview within ~1 second.

### To change timing
Each scene is 192 frames (6.4s at 30fps). To make a scene longer, increase the
`durationInFrames` in `AgentsVideo.tsx` AND update `TOTAL_FRAMES` in `Root.tsx`.

Formula: `TOTAL_FRAMES = (N_scenes × scene_duration) - (N_transitions × transition_duration)`

### To change colors
Edit `src/theme.ts`. The `C` object is imported by every scene.

### To add a scene
1. Create `src/scenes/Scene06.tsx` following the same pattern
2. Import it in `AgentsVideo.tsx`
3. Add a new `TransitionSeries.Sequence` + `TransitionSeries.Transition` block
4. Update `TOTAL_FRAMES` in `Root.tsx`
5. Add `"src/scenes/Scene06.tsx"` to the `include` array in `tsconfig.json`

---

## Git Status

The video files were built locally but **not yet pushed to the PatientProfit GitHub remote**
due to missing push credentials in the build environment. The setup script at:

```
https://raw.githubusercontent.com/llgsoldiersonly/salesenablement/claude/check-remotion-skill-5A4yD/pp-video-setup.sh
```

...reconstructs the entire `video/` directory from scratch and is the canonical
source of truth until the files are committed directly in the PatientProfit repo.

After running the setup script in Codespaces, commit the files:

```bash
cd /workspaces/PatientProfit
git add video/
git commit -m "Add 5-scene AI Agents educational video (vertical 1080x1920)"
git push
```
