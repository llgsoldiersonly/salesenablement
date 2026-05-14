import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { spring, interpolate } from 'remotion';
import { T, FONT_IMPACT, FONT_BODY } from '../theme';
import { fadeIn, glowPulse } from '../utils';

export const Scene16Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoS = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const logoScale = interpolate(logoS, [0, 1], [0.6, 1]);

  const brandOpacity = fadeIn(frame, 25, 20);
  const urlOpacity = fadeIn(frame, 40, 20);
  const taglineOpacity = fadeIn(frame, 60, 20);
  const ctaOpacity = fadeIn(frame, 80, 20);

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
      {/* Glow background */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${T.purpleGlow}25 0%, transparent 70%)`,
          boxShadow: glowPulse(frame, T.purple, 30, 60, 0.06),
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          position: 'relative',
          zIndex: 2,
        }}
      >
        <Img
          src={staticFile('llg-logo.png')}
          style={{ width: 180, height: 180, objectFit: 'contain' }}
        />
      </div>

      {/* Brand */}
      <div style={{ opacity: brandOpacity, position: 'relative', zIndex: 2, marginTop: 16 }}>
        <div
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 48,
            color: T.white,
            letterSpacing: 8,
            textTransform: 'uppercase',
            textShadow: `0 0 30px ${T.purple}`,
            textAlign: 'center',
          }}
        >
          Legal Leads Group
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          opacity: urlOpacity,
          width: 300,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${T.purple}, transparent)`,
          margin: '16px 0',
          position: 'relative',
          zIndex: 2,
        }}
      />

      {/* URL */}
      <div style={{ opacity: urlOpacity, position: 'relative', zIndex: 2 }}>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 30,
            color: T.purpleLight,
            letterSpacing: 5,
            textAlign: 'center',
            fontWeight: 700,
          }}
        >
          lucrativelegal.com
        </div>
      </div>

      {/* Tagline */}
      <div style={{ opacity: taglineOpacity, position: 'relative', zIndex: 2, marginTop: 20 }}>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 22,
            color: T.grayLight,
            textAlign: 'center',
            fontStyle: 'italic',
            letterSpacing: 2,
          }}
        >
          Get More Clients. Dominate Google.
        </div>
      </div>

      {/* CTA */}
      <div style={{ opacity: ctaOpacity, position: 'relative', zIndex: 2, marginTop: 28 }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${T.purpleGlow}, ${T.purple})`,
            borderRadius: 100,
            padding: '14px 44px',
            fontFamily: FONT_IMPACT,
            fontSize: 26,
            color: T.white,
            letterSpacing: 4,
            textTransform: 'uppercase',
            boxShadow: `0 0 30px ${T.purple}60`,
          }}
        >
          Book a Free Strategy Call
        </div>
      </div>
    </AbsoluteFill>
  );
};
