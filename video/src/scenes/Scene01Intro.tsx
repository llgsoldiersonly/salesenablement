import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT_IMPACT, FONT_BODY } from '../theme';
import { fadeIn, popIn, glowPulse } from '../utils';
import { spring, interpolate } from 'remotion';

export const Scene01Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const logoStyle = {
    transform: `scale(${interpolate(logoScale, [0, 1], [0.4, 1])})`,
    opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' }),
  };

  const textOpacity = fadeIn(frame, 25, 20);
  const urlOpacity = fadeIn(frame, 45, 20);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, #1a0040 0%, ${T.bg} 70%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Background glow rings */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${T.purpleGlow}20 0%, transparent 70%)`,
          boxShadow: glowPulse(frame, T.purple, 40, 80),
        }}
      />

      {/* Logo */}
      <div style={{ ...logoStyle, position: 'relative', zIndex: 2 }}>
        <Img
          src={staticFile('llg-logo.png')}
          style={{ width: 240, height: 240, objectFit: 'contain' }}
        />
      </div>

      {/* Brand name */}
      <div
        style={{
          opacity: textOpacity,
          position: 'relative',
          zIndex: 2,
          marginTop: 20,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 52,
            color: T.white,
            letterSpacing: 8,
            textShadow: `0 0 30px ${T.purple}`,
            textTransform: 'uppercase',
          }}
        >
          Legal Leads Group
        </div>
      </div>

      {/* URL */}
      <div
        style={{
          opacity: urlOpacity,
          position: 'relative',
          zIndex: 2,
          marginTop: 14,
        }}
      >
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 24,
            color: T.purpleLight,
            letterSpacing: 4,
            textTransform: 'lowercase',
          }}
        >
          lucrativelegal.com
        </div>
      </div>
    </AbsoluteFill>
  );
};
