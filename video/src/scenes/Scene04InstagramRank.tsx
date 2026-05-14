import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { spring, interpolate } from 'remotion';
import { T, FONT_IMPACT, FONT_BODY } from '../theme';
import { slideUp, fadeIn } from '../utils';

export const Scene04InstagramRank: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const igGradient = `linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)`;

  const headerStyle = slideUp(frame, fps, 0);
  const numStyle = {
    opacity: interpolate(frame, [20, 32], [0, 1], { extrapolateRight: 'clamp' }),
    transform: `scale(${interpolate(
      spring({ frame: Math.max(0, frame - 20), fps, config: { damping: 8, stiffness: 160 } }),
      [0, 1],
      [0.5, 1]
    )})`,
  };
  const tailStyle = slideUp(frame, fps, 40);
  const subStyle = { opacity: fadeIn(frame, 70, 20) };

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 60%, #200030 0%, ${T.bg} 65%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 100px',
        textAlign: 'center',
      }}
    >
      {/* Instagram badge */}
      <div
        style={{
          ...numStyle,
          background: igGradient,
          borderRadius: 24,
          padding: '8px 28px',
          marginBottom: 24,
          display: 'inline-block',
        }}
      >
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 22,
            fontWeight: 900,
            color: T.white,
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}
        >
          Instagram
        </span>
      </div>

      <div style={{ ...headerStyle, marginBottom: 8 }}>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 38,
            color: T.offWhite,
            fontWeight: 700,
          }}
        >
          is now the
        </span>
      </div>

      <div style={{ ...numStyle, marginBottom: 8 }}>
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 180,
            background: igGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 0.95,
            letterSpacing: -4,
          }}
        >
          #6
        </span>
      </div>

      <div style={{ ...tailStyle, marginBottom: 16 }}>
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 52,
            color: T.white,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          Most-Clicked Site in All of Google
        </span>
      </div>

      <div style={subStyle}>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 26,
            color: T.grayLight,
            fontStyle: 'italic',
          }}
        >
          And 99% of your competitors don't know it yet.
        </span>
      </div>
    </AbsoluteFill>
  );
};
