import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { spring, interpolate } from 'remotion';
import { T, FONT_IMPACT } from '../theme';
import { glowPulse } from '../utils';

export const Scene09ThePlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: { damping: 10, stiffness: 120 } });
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const scale = interpolate(s, [0, 1], [0.7, 1]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, #1f0050 0%, ${T.bg} 65%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ opacity, transform: `scale(${scale})`, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 42,
            color: T.grayLight,
            letterSpacing: 6,
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          Here's
        </div>
        <div
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 110,
            color: T.white,
            textTransform: 'uppercase',
            letterSpacing: 4,
            textShadow: glowPulse(frame, T.purple, 20, 50),
            lineHeight: 0.9,
          }}
        >
          The Exact Play
        </div>
        <div
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 42,
            color: T.purple,
            letterSpacing: 6,
            textTransform: 'uppercase',
            marginTop: 16,
            textShadow: `0 0 20px ${T.purple}80`,
          }}
        >
          ↓
        </div>
      </div>
    </AbsoluteFill>
  );
};
