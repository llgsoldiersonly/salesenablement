import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { spring, interpolate } from 'remotion';
import { T, FONT_IMPACT } from '../theme';
import { glowPulse } from '../utils';

export const Scene02Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: { damping: 8, stiffness: 300 } });
  const scale = interpolate(s, [0, 1], [0.1, 1]);
  const opacity = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: 'clamp' });

  const bgPulse = Math.sin(frame * 0.12) * 0.5 + 0.5;
  const bgGlow = interpolate(bgPulse, [0, 1], [0.15, 0.35]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, rgba(109,40,217,${bgGlow}) 0%, ${T.bg} 65%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 200,
            color: T.white,
            lineHeight: 0.9,
            letterSpacing: 10,
            textTransform: 'uppercase',
            textShadow: glowPulse(frame, T.purple, 20, 60),
          }}
        >
          LOOK…
        </div>
      </div>
    </AbsoluteFill>
  );
};
