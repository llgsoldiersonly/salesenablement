import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { spring, interpolate } from 'remotion';
import { T, FONT_IMPACT } from '../theme';
import { glowPulse, fadeIn } from '../utils';

export const Scene15NowGoPost: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: { damping: 7, stiffness: 250 } });
  const scale = interpolate(s, [0, 1], [0.2, 1]);
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  const bgPulse = Math.sin(frame * 0.15) * 0.5 + 0.5;
  const bgAlpha = interpolate(bgPulse, [0, 1], [0.2, 0.5]);

  const subOpacity = fadeIn(frame, 45, 20);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, rgba(109,40,217,${bgAlpha}) 0%, ${T.bg} 60%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Pulsing outer ring */}
      <div
        style={{
          position: 'absolute',
          width: interpolate(bgPulse, [0, 1], [500, 700]),
          height: interpolate(bgPulse, [0, 1], [500, 700]),
          borderRadius: '50%',
          border: `2px solid ${T.purple}`,
          opacity: interpolate(bgPulse, [0, 1], [0.3, 0.1]),
        }}
      />

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
            fontSize: 80,
            color: T.grayLight,
            letterSpacing: 8,
            textTransform: 'uppercase',
            marginBottom: -10,
          }}
        >
          Now
        </div>
        <div
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 160,
            color: T.white,
            textTransform: 'uppercase',
            lineHeight: 0.9,
            textShadow: glowPulse(frame, T.purple, 30, 80, 0.1),
            letterSpacing: 6,
          }}
        >
          GO POST.
        </div>
      </div>

      <div style={{ opacity: subOpacity, marginTop: 40 }}>
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 32,
            color: T.purple,
            letterSpacing: 4,
            textTransform: 'uppercase',
            textShadow: `0 0 16px ${T.purple}`,
          }}
        >
          One review. One post. Every day.
        </span>
      </div>
    </AbsoluteFill>
  );
};
