import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { spring, interpolate } from 'remotion';
import { T, FONT_IMPACT, FONT_BODY } from '../theme';
import { fadeIn, slideUp } from '../utils';

export const Scene11CaptionFormula: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const header = slideUp(frame, fps, 0);
  const cardScale = spring({ frame: Math.max(0, frame - 18), fps, config: { damping: 12, stiffness: 100 } });
  const cardStyle = {
    opacity: interpolate(frame, [18, 30], [0, 1], { extrapolateRight: 'clamp' }),
    transform: `scale(${interpolate(cardScale, [0, 1], [0.85, 1])})`,
  };

  const line2Opacity = fadeIn(frame, 55, 15);
  const line3Opacity = fadeIn(frame, 75, 15);
  const footerOpacity = fadeIn(frame, 110, 20);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 60% 50%, #120028 0%, ${T.bg} 65%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 120px',
      }}
    >
      <div style={{ ...header, marginBottom: 32, textAlign: 'center' }}>
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 50,
            color: T.yellow,
            textTransform: 'uppercase',
            letterSpacing: 3,
          }}
        >
          The Exact Caption Formula
        </span>
      </div>

      {/* Formula card */}
      <div
        style={{
          ...cardStyle,
          background: `linear-gradient(135deg, #1a0040, #0d0025)`,
          border: `2px solid ${T.purple}`,
          borderRadius: 20,
          padding: '36px 52px',
          width: '100%',
          maxWidth: 860,
          boxShadow: `0 0 40px ${T.purple}40`,
        }}
      >
        <div
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 42,
            color: T.purple,
            textTransform: 'uppercase',
            letterSpacing: 3,
            marginBottom: 16,
            textShadow: `0 0 20px ${T.purple}60`,
          }}
        >
          [Your Brand Name] Review
        </div>
        <div
          style={{
            opacity: line2Opacity,
            fontFamily: FONT_BODY,
            fontSize: 24,
            color: T.grayLight,
            marginBottom: 12,
            fontStyle: 'italic',
          }}
        >
          Then paste the actual review underneath.
        </div>
        <div
          style={{
            opacity: line3Opacity,
            borderTop: `1px solid ${T.purpleDark}60`,
            paddingTop: 16,
            fontFamily: FONT_BODY,
            fontSize: 20,
            color: T.offWhite,
            lineHeight: 1.7,
          }}
        >
          "⭐⭐⭐⭐⭐ They completely transformed our online presence.
          <br />
          I now get 3–5 new client calls every week just from Google.
          <br />— Sarah M., Personal Injury Attorney"
        </div>
      </div>

      <div
        style={{
          opacity: footerOpacity,
          marginTop: 24,
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 22,
            color: T.grayLight,
            fontStyle: 'italic',
          }}
        >
          Simple. Repeatable. Powerful.
        </span>
      </div>
    </AbsoluteFill>
  );
};
