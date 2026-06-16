#!/bin/bash
set -e

echo "Setting up PatientProfit video..."
mkdir -p video/src/scenes video/src/hooks video/out

# package.json
cat > video/package.json << 'EOF'
{
  "name": "patientprofit-video",
  "version": "1.0.0",
  "scripts": {
    "start": "npx remotion studio",
    "build": "npx remotion render PPVideoVertical out/vertical.mp4 --gl=swangle",
    "build-landscape": "npx remotion render PPVideo out/landscape.mp4 --gl=swangle"
  },
  "dependencies": {
    "@remotion/google-fonts": "^4.0.461",
    "@remotion/transitions": "^4.0.461",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "remotion": "^4.0.257"
  },
  "devDependencies": {
    "@remotion/cli": "^4.0.257",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.4.5"
  }
}
EOF

# tsconfig.json
cat > video/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "lib": ["dom", "esnext"],
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "jsx": "react-jsx",
    "skipLibCheck": true
  },
  "include": [
    "src/index.ts",
    "src/Root.tsx",
    "src/AgentsVideo.tsx",
    "src/theme.ts",
    "src/hooks/**/*.ts",
    "src/scenes/Scene01.tsx",
    "src/scenes/Scene02.tsx",
    "src/scenes/Scene03.tsx",
    "src/scenes/Scene04.tsx",
    "src/scenes/Scene05.tsx"
  ]
}
EOF

# src/index.ts
cat > video/src/index.ts << 'EOF'
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';
registerRoot(RemotionRoot);
EOF

# src/theme.ts
cat > video/src/theme.ts << 'EOF'
import { loadFont, fontFamily } from "@remotion/google-fonts/Inter";
loadFont("normal", { weights: ["400", "600", "800"], subsets: ["latin"] });
export const INTER = fontFamily;
export const C = {
  bg: "#0a0a0a",
  white: "#ffffff",
  accent: "#6366f1",
  accentDim: "#6366f140",
  accentBright: "#818cf8",
  success: "#22c55e",
  muted: "#9ca3af",
  card: "#141414",
  cardBorder: "#2a2a2a",
} as const;
export const SAFE = { top: 150, bottom: 170, side: 60 } as const;
EOF

# src/hooks/useScale.ts
cat > video/src/hooks/useScale.ts << 'EOF'
import { useVideoConfig } from 'remotion';
export function useScale() {
  const { width } = useVideoConfig();
  return width / 1920;
}
export function useIsVertical() {
  const { width, height } = useVideoConfig();
  return height > width;
}
EOF

# src/Root.tsx
cat > video/src/Root.tsx << 'EOF'
import React from 'react';
import { Composition } from 'remotion';
import { AgentsVideo } from './AgentsVideo';
const TOTAL_FRAMES = 912;
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PPVideoVertical"
        component={AgentsVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
EOF

# src/AgentsVideo.tsx
cat > video/src/AgentsVideo.tsx << 'EOF'
import React from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Scene01 } from "./scenes/Scene01";
import { Scene02 } from "./scenes/Scene02";
import { Scene03 } from "./scenes/Scene03";
import { Scene04 } from "./scenes/Scene04";
import { Scene05 } from "./scenes/Scene05";

const SCENE_DURATION = 192;
const TRANSITION_DURATION = 12;

export const AgentsVideo: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATION}>
        <Scene01 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        presentation={fade()}
      />
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATION}>
        <Scene02 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        presentation={fade()}
      />
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATION}>
        <Scene03 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        presentation={fade()}
      />
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATION}>
        <Scene04 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        presentation={fade()}
      />
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATION}>
        <Scene05 />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
EOF

echo "Writing scenes..."

# src/scenes/Scene01.tsx
cat > video/src/scenes/Scene01.tsx << 'EOF'
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { spring, interpolate } from "remotion";
import { C, INTER, SAFE } from "../theme";

function useSpringIn(delay = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - delay);
  const s = spring({ frame: f, fps, config: { damping: 200 } });
  return {
    opacity: interpolate(f, [0, 6], [0, 1], { extrapolateRight: "clamp" }),
    transform: `scale(${interpolate(s, [0, 1], [0.85, 1])}) translateY(${interpolate(s, [0, 1], [30, 0])}px)`,
  };
}

const ChatbotSVG: React.FC = () => (
  <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
    <rect x="20" y="20" width="140" height="90" rx="14" fill="#1e1e1e" stroke="#333" strokeWidth="2" />
    <rect x="38" y="44" width="80" height="9" rx="4" fill="#444" />
    <rect x="38" y="61" width="60" height="9" rx="4" fill="#333" />
    <rect x="38" y="78" width="70" height="9" rx="4" fill="#3a3a3a" />
    <path d="M 40 110 L 28 128 L 60 110 Z" fill="#1e1e1e" stroke="#333" strokeWidth="2" strokeLinejoin="round" />
    <line x1="90" y1="140" x2="90" y2="165" stroke="#555" strokeWidth="3" strokeLinecap="round" />
    <polyline points="82,157 90,166 98,157" stroke="#555" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const AgentSVG: React.FC = () => {
  const frame = useCurrentFrame();
  const rotation = interpolate(frame, [0, 90], [0, 360], { extrapolateRight: "clamp" });
  const glow = Math.sin(frame * 0.15) * 0.5 + 0.5;
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
      <circle cx="90" cy="85" r="55" fill={`${C.accent}${Math.round(interpolate(glow,[0,1],[15,30])).toString(16).padStart(2,'0')}`} />
      <polygon points="90,32 136,58 136,112 90,138 44,112 44,58" fill="#1a1a2e" stroke={C.accent} strokeWidth="2.5" />
      <text x="90" y="92" textAnchor="middle" fill={C.accent} fontFamily={INTER} fontWeight="800" fontSize="18" letterSpacing="1">AI</text>
      <g transform={`rotate(${rotation}, 90, 85)`}>
        <circle cx="90" cy="30" r="5" fill={C.accentBright} />
      </g>
      <path d="M 148 85 A 58 58 0 1 1 90 27" stroke={C.accentBright} strokeWidth="3" strokeLinecap="round" fill="none" />
      <polyline points="86,20 90,28 98,22" stroke={C.accentBright} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
};

export const Scene01: React.FC = () => {
  const headlineStyle = useSpringIn(0);
  const leftStyle = useSpringIn(10);
  const rightStyle = useSpringIn(22);
  const copyStyle = useSpringIn(36);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <div style={{ position:"absolute", top:SAFE.top, bottom:SAFE.bottom, left:SAFE.side, right:SAFE.side, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ ...headlineStyle, textAlign:"center", width:"100%" }}>
          <div style={{ fontFamily:INTER, fontSize:64, fontWeight:800, color:C.white, lineHeight:1.1 }}>
            What Is an <span style={{ color:C.accent }}>AI Agent?</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:24, width:"100%", flex:1, alignItems:"center", justifyContent:"center", marginTop:40, marginBottom:40 }}>
          <div style={{ ...leftStyle, flex:1, background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:24, padding:"32px 20px", display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
            <ChatbotSVG />
            <div style={{ fontFamily:INTER, fontSize:28, fontWeight:700, color:C.muted }}>Chatbot</div>
            <div style={{ fontFamily:INTER, fontSize:24, fontWeight:400, color:C.muted, textAlign:"center", lineHeight:1.4 }}>Waits for commands</div>
          </div>
          <div style={{ fontFamily:INTER, fontSize:28, fontWeight:800, color:C.muted }}>VS</div>
          <div style={{ ...rightStyle, flex:1, background:"#0d0d1f", border:`1.5px solid ${C.accent}`, borderRadius:24, padding:"32px 20px", display:"flex", flexDirection:"column", alignItems:"center", gap:16, boxShadow:`0 0 32px ${C.accent}30` }}>
            <AgentSVG />
            <div style={{ fontFamily:INTER, fontSize:28, fontWeight:700, color:C.accent }}>Agent</div>
            <div style={{ fontFamily:INTER, fontSize:24, fontWeight:400, color:C.white, textAlign:"center", lineHeight:1.4 }}>Acts autonomously</div>
          </div>
        </div>
        <div style={{ ...copyStyle, textAlign:"center", width:"100%" }}>
          <div style={{ fontFamily:INTER, fontSize:36, fontWeight:400, color:C.muted, lineHeight:1.5 }}>
            A chatbot responds. An agent <span style={{ color:C.white, fontWeight:600 }}>thinks, plans, and acts</span> on its own.
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
EOF


# src/scenes/Scene02.tsx
cat > video/src/scenes/Scene02.tsx << 'EOF'
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { spring, interpolate } from "remotion";
import { C, INTER, SAFE } from "../theme";

const NODES = [
  { id: "PERCEIVE", x: 380, y: 80,  color: "#38bdf8", label: "PERCEIVE" },
  { id: "THINK",   x: 660, y: 310, color: C.accent,  label: "THINK"   },
  { id: "ACT",     x: 660, y: 590, color: C.success,  label: "ACT"     },
  { id: "OBSERVE", x: 100, y: 450, color: "#f59e0b",  label: "OBSERVE" },
];
const ARROWS = [
  { d: "M 440 110 Q 640 130 640 285", from: 0, to: 1 },
  { d: "M 660 370 Q 720 490 700 565", from: 1, to: 2 },
  { d: "M 620 615 Q 300 700 150 495", from: 2, to: 3 },
  { d: "M 105 395 Q 80 160 330 105",  from: 3, to: 0 },
];
const NODE_R = 58;

function drawPath(frame: number, startFrame: number, endFrame: number) {
  const progress = interpolate(frame, [startFrame, endFrame], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return interpolate(progress, [0, 1], [800, 0]);
}

export const Scene02: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headlineStyle = {
    opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" }),
    transform: `translateY(${interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [40, 0])}px)`,
  };
  const copyStyle = { opacity: interpolate(frame, [80, 95], [0, 1], { extrapolateRight: "clamp" }) };
  const nodeDelays = [8, 22, 36, 50];
  const arrowOffsets = [
    drawPath(frame, 18, 34),
    drawPath(frame, 32, 48),
    drawPath(frame, 46, 62),
    drawPath(frame, 60, 76),
  ];
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <div style={{ position:"absolute", top:SAFE.top, bottom:SAFE.bottom, left:SAFE.side, right:SAFE.side, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ ...headlineStyle, textAlign:"center", width:"100%" }}>
          <div style={{ fontFamily:INTER, fontSize:60, fontWeight:800, color:C.white, lineHeight:1.1 }}>
            The <span style={{ color:C.accent }}>Agent Loop</span>
          </div>
        </div>
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", width:"100%" }}>
          <svg width="800" height="720" viewBox="0 0 800 720" style={{ overflow:"visible" }}>
            <defs>
              {NODES.map((n) => (
                <marker key={n.id} id={`arrow-${n.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={n.color} />
                </marker>
              ))}
            </defs>
            {ARROWS.map((arrow, i) => (
              <path key={i} d={arrow.d} stroke={NODES[arrow.to].color} strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="800" strokeDashoffset={arrowOffsets[i]} markerEnd={`url(#arrow-${NODES[arrow.to].id})`} opacity={0.8} />
            ))}
            {NODES.map((node, i) => {
              const s = spring({ frame: Math.max(0, frame - nodeDelays[i]), fps, config: { damping: 200 } });
              const scale = interpolate(s, [0, 1], [0, 1]);
              const opacity = interpolate(Math.max(0, frame - nodeDelays[i]), [0, 6], [0, 1], { extrapolateRight: "clamp" });
              return (
                <g key={node.id} transform={`translate(${node.x}, ${node.y}) scale(${scale})`} style={{ transformOrigin:`${node.x}px ${node.y}px` }} opacity={opacity}>
                  <circle cx="0" cy="0" r={NODE_R + 12} fill={`${node.color}18`} />
                  <circle cx="0" cy="0" r={NODE_R} fill="#111" stroke={node.color} strokeWidth="2.5" />
                  <text x="0" y="7" textAnchor="middle" fill={node.color} fontFamily={INTER} fontWeight="800" fontSize="17" letterSpacing="1">{node.label}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div style={{ ...copyStyle, textAlign:"center", width:"100%" }}>
          <div style={{ fontFamily:INTER, fontSize:36, fontWeight:400, color:C.muted, lineHeight:1.5 }}>
            Perceive the environment. Think. Act. <span style={{ color:C.white, fontWeight:600 }}>Then do it again.</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
EOF


# src/scenes/Scene03.tsx
cat > video/src/scenes/Scene03.tsx << 'EOF'
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { spring, interpolate } from "remotion";
import { C, INTER, SAFE } from "../theme";

const TOOLS = [
  { label: "Web Search", emoji: "🔍", x: 380, y: 60,  delay: 18, lineEnd: [380, 130] },
  { label: "Code Exec",  emoji: "💻", x: 660, y: 310, delay: 30, lineEnd: [620, 290] },
  { label: "File Access",emoji: "📁", x: 380, y: 560, delay: 42, lineEnd: [380, 490] },
  { label: "APIs",       emoji: "🌐", x: 100, y: 310, delay: 54, lineEnd: [160, 310] },
];
const CENTER = { x: 380, y: 310 };
const TOOL_R = 70;

function springIn(frame: number, fps: number, delay = 0) {
  const f = Math.max(0, frame - delay);
  const s = spring({ frame: f, fps, config: { damping: 200 } });
  return {
    opacity: interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" }),
    scale: interpolate(s, [0, 1], [0, 1]),
  };
}
function lineProgress(frame: number, delay: number) {
  return interpolate(frame, [delay, delay + 16], [800, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

export const Scene03: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headlineStyle = {
    opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" }),
    transform: `translateY(${interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [40, 0])}px)`,
  };
  const centerS = spring({ frame: Math.max(0, frame - 6), fps, config: { damping: 200 } });
  const centerScale = interpolate(centerS, [0, 1], [0, 1]);
  const toolStyles = TOOLS.map((t) => springIn(frame, fps, t.delay));
  const lineOffsets = TOOLS.map((t) => lineProgress(frame, t.delay - 6));
  const activateProgress = TOOLS.map((t) => interpolate(frame, [t.delay + 10, t.delay + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <div style={{ position:"absolute", top:SAFE.top, bottom:SAFE.bottom, left:SAFE.side, right:SAFE.side, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ ...headlineStyle, textAlign:"center" }}>
          <div style={{ fontFamily:INTER, fontSize:64, fontWeight:800, color:C.white, lineHeight:1.1 }}>
            Agents Use <span style={{ color:C.accent }}>Tools</span>
          </div>
        </div>
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", width:"100%" }}>
          <svg width="800" height="660" viewBox="0 0 760 640" style={{ overflow:"visible" }}>
            {TOOLS.map((tool, i) => (
              <line key={tool.label} x1={CENTER.x} y1={CENTER.y} x2={tool.lineEnd[0]} y2={tool.lineEnd[1]} stroke={activateProgress[i] > 0.5 ? C.success : C.accent} strokeWidth="2" strokeDasharray="800" strokeDashoffset={lineOffsets[i]} strokeLinecap="round" opacity={0.7} />
            ))}
            <g transform={`translate(${CENTER.x}, ${CENTER.y}) scale(${centerScale})`}>
              <circle cx="0" cy="0" r="62" fill={`${C.accent}25`} />
              <polygon points="0,-52 45,-26 45,26 0,52 -45,26 -45,-26" fill="#0d0d1f" stroke={C.accent} strokeWidth="2.5" />
              <text x="0" y="-6" textAnchor="middle" fill={C.white} fontFamily={INTER} fontWeight="800" fontSize="14">AGENT</text>
              <text x="0" y="14" textAnchor="middle" fill={C.accentBright} fontFamily={INTER} fontWeight="400" fontSize="12">CORE</text>
            </g>
            {TOOLS.map((tool, i) => {
              const { opacity, scale } = toolStyles[i];
              const isActive = activateProgress[i] > 0.5;
              const borderColor = isActive ? C.success : C.accent;
              return (
                <g key={tool.label} transform={`translate(${tool.x}, ${tool.y}) scale(${scale})`} opacity={opacity}>
                  <circle cx="0" cy="0" r={TOOL_R + 8} fill={isActive ? `${C.success}18` : `${C.accent}18`} />
                  <circle cx="0" cy="0" r={TOOL_R} fill="#111" stroke={borderColor} strokeWidth="2" />
                  <text x="0" y="-10" textAnchor="middle" fontSize="32">{tool.emoji}</text>
                  <text x="0" y="22" textAnchor="middle" fill={isActive ? C.success : C.white} fontFamily={INTER} fontWeight="600" fontSize="15">{tool.label}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div style={{ opacity: interpolate(frame, [65, 80], [0, 1], { extrapolateRight: "clamp" }), textAlign:"center" }}>
          <div style={{ fontFamily:INTER, fontSize:36, fontWeight:400, color:C.muted, lineHeight:1.5 }}>
            Real-world tools transform an agent from a <span style={{ color:C.white, fontWeight:600 }}>talker into a doer.</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
EOF


# src/scenes/Scene04.tsx
cat > video/src/scenes/Scene04.tsx << 'EOF'
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { spring, interpolate } from "remotion";
import { C, INTER, SAFE } from "../theme";

const STEPS = [
  { label: "🎯  GOAL",   sub: "Book 10 new patients",    color: C.accent,   delay: 10 },
  { label: "🔍  STEP 1", sub: "Search Google reviews",   color: "#38bdf8",  delay: 24 },
  { label: "📝  STEP 2", sub: "Draft Instagram caption",  color: "#a78bfa",  delay: 38 },
  { label: "📤  STEP 3", sub: "Schedule & publish post",  color: "#f59e0b",  delay: 52 },
  { label: "✅  RESULT", sub: "Task complete — repeat",   color: C.success,  delay: 66 },
];

function stepSpring(frame: number, fps: number, delay: number) {
  const f = Math.max(0, frame - delay);
  const s = spring({ frame: f, fps, config: { damping: 200 } });
  return {
    opacity: interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" }),
    transform: `translateX(${interpolate(s, [0, 1], [80, 0])}px)`,
  };
}
function checkmarkStyle(frame: number, fps: number, delay: number) {
  const showAt = delay + 12;
  const f = Math.max(0, frame - showAt);
  const s = spring({ frame: f, fps, config: { damping: 200 } });
  return {
    opacity: interpolate(f, [0, 5], [0, 1], { extrapolateRight: "clamp" }),
    transform: `scale(${interpolate(s, [0, 1], [0, 1])})`,
  };
}

export const Scene04: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headlineStyle = {
    opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" }),
    transform: `translateY(${interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [40, 0])}px)`,
  };
  const stepsCompleted = Math.floor(interpolate(frame, [66, 96], [0, 3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const counterStyle = { opacity: interpolate(frame, [70, 84], [0, 1], { extrapolateRight: "clamp" }) };
  const stepStyles = STEPS.map((s) => stepSpring(frame, fps, s.delay));
  const checkStyles = STEPS.map((s) => checkmarkStyle(frame, fps, s.delay));
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <div style={{ position:"absolute", top:SAFE.top, bottom:SAFE.bottom, left:SAFE.side, right:SAFE.side, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ ...headlineStyle, textAlign:"center", width:"100%" }}>
          <div style={{ fontFamily:INTER, fontSize:60, fontWeight:800, color:C.white, lineHeight:1.1 }}>
            <span style={{ color:C.accent }}>Memory</span> &amp; <span style={{ color:C.accentBright }}>Planning</span>
          </div>
        </div>
        <div style={{ flex:1, width:"100%", display:"flex", flexDirection:"column", justifyContent:"center", gap:12 }}>
          {STEPS.map((step, i) => (
            <div key={step.label} style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ ...stepStyles[i], flex:1, background:`${step.color}12`, border:`1.5px solid ${step.color}60`, borderRadius:16, padding:"18px 20px", display:"flex", flexDirection:"column", gap:4 }}>
                <div style={{ fontFamily:INTER, fontSize:28, fontWeight:700, color:step.color }}>{step.label}</div>
                <div style={{ fontFamily:INTER, fontSize:24, fontWeight:400, color:C.muted }}>{step.sub}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ ...checkStyles[i], fontSize:28, color:C.success, minWidth:36, textAlign:"center" }}>✓</div>
              )}
            </div>
          ))}
        </div>
        <div style={{ ...counterStyle, textAlign:"center", width:"100%", marginTop:8 }}>
          <div style={{ fontFamily:INTER, fontSize:40, fontWeight:800, color:C.success, fontVariantNumeric:"tabular-nums" }}>
            {stepsCompleted}<span style={{ fontSize:28, color:C.muted, fontWeight:400 }}> / 3 steps completed</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
EOF


# src/scenes/Scene05.tsx
cat > video/src/scenes/Scene05.tsx << 'EOF'
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { spring, interpolate } from "remotion";
import { C, INTER, SAFE } from "../theme";

const PARTICLES = [
  { x: 0.12, size: 14, delay: 0,  drift: 18  },
  { x: 0.25, size: 8,  delay: 6,  drift: -12 },
  { x: 0.38, size: 18, delay: 3,  drift: 8   },
  { x: 0.50, size: 10, delay: 10, drift: -20 },
  { x: 0.62, size: 16, delay: 2,  drift: 14  },
  { x: 0.75, size: 7,  delay: 8,  drift: -8  },
  { x: 0.88, size: 12, delay: 5,  drift: 22  },
  { x: 0.18, size: 9,  delay: 14, drift: -16 },
  { x: 0.44, size: 15, delay: 1,  drift: 10  },
  { x: 0.68, size: 6,  delay: 12, drift: -24 },
  { x: 0.82, size: 11, delay: 7,  drift: 16  },
  { x: 0.32, size: 13, delay: 4,  drift: -6  },
];

export const Scene05: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const headlineS = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 200 } });
  const headlineStyle = {
    opacity: interpolate(Math.max(0, frame - 10), [0, 8], [0, 1], { extrapolateRight: "clamp" }),
    transform: `translateY(${interpolate(headlineS, [0, 1], [50, 0])}px)`,
  };
  const statS = spring({ frame: Math.max(0, frame - 35), fps, config: { damping: 200 } });
  const statStyle = {
    opacity: interpolate(Math.max(0, frame - 35), [0, 8], [0, 1], { extrapolateRight: "clamp" }),
    transform: `scale(${interpolate(statS, [0, 1], [0.7, 1])})`,
  };
  const count = Math.floor(interpolate(frame, [40, 90], [0, 1000], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const ctaStyle = { opacity: interpolate(frame, [100, 118], [0, 1], { extrapolateRight: "clamp" }) };
  const subS = spring({ frame: Math.max(0, frame - 80), fps, config: { damping: 200 } });
  const subStyle = {
    opacity: interpolate(Math.max(0, frame - 80), [0, 8], [0, 1], { extrapolateRight: "clamp" }),
    transform: `translateY(${interpolate(subS, [0, 1], [30, 0])}px)`,
  };
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      {PARTICLES.map((p, i) => {
        const f = Math.max(0, frame - p.delay);
        const baseY = height + 40;
        const travel = interpolate(f, [0, 160], [0, height + 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const opacity = interpolate(f, [0, 12, 130, 160], [0, 0.6, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const cx = width * p.x + interpolate(f, [0, 160], [0, p.drift], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const cy = baseY - travel;
        return (
          <div key={i} style={{ position:"absolute", left:cx - p.size/2, top:cy - p.size/2, width:p.size, height:p.size, borderRadius:"50%", background:C.accent, opacity, boxShadow:`0 0 ${p.size*2}px ${C.accent}80` }} />
        );
      })}
      <div style={{ position:"absolute", top:SAFE.top, bottom:SAFE.bottom, left:SAFE.side, right:SAFE.side, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ ...headlineStyle, textAlign:"center", width:"100%" }}>
          <div style={{ fontFamily:INTER, fontSize:64, fontWeight:800, color:C.white, lineHeight:1.1 }}>
            The Future Runs on <span style={{ color:C.accent }}>Agents</span>
          </div>
        </div>
        <div style={{ ...statStyle, textAlign:"center" }}>
          <div style={{ fontFamily:INTER, fontSize:120, fontWeight:800, color:C.accent, lineHeight:1, fontVariantNumeric:"tabular-nums", textShadow:`0 0 60px ${C.accent}60` }}>
            {count.toLocaleString()}<span style={{ fontSize:56, color:C.accentBright }}>+</span>
          </div>
          <div style={{ fontFamily:INTER, fontSize:36, fontWeight:400, color:C.muted, marginTop:8 }}>tasks automated / day</div>
        </div>
        <div style={{ ...subStyle, textAlign:"center", width:"100%" }}>
          <div style={{ fontFamily:INTER, fontSize:38, fontWeight:600, color:C.white, lineHeight:1.4 }}>
            AI agents don't replace you —<br /><span style={{ color:C.accentBright }}>they multiply you.</span>
          </div>
        </div>
        <div style={{ ...ctaStyle, textAlign:"center", width:"100%" }}>
          <div style={{ display:"inline-block", fontFamily:INTER, fontSize:40, fontWeight:800, color:"#0a0a0a", background:"#f59e0b", borderRadius:16, padding:"16px 40px", letterSpacing:0.5, boxShadow:"0 0 40px #f59e0b60" }}>
            mypatientprofit.com
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
EOF

echo ""
echo "All files written! Installing dependencies..."
cd video && npm install
echo ""
echo "Done! Run: npm start"
echo "Then open the forwarded port 3000 in your browser."
