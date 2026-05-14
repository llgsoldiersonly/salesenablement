import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { interpolate } from 'remotion';
import { T, FONT_IMPACT, FONT_BODY } from '../theme';
import { slideUp, fadeIn } from '../utils';

export const Scene08FreePlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1 = slideUp(frame, fps, 0);
  const line2 = slideUp(frame, fps, 22);
  const line3 = slideUp(frame, fps, 50);
  const line4 = { opacity: fadeIn(frame, 75, 20) };

  const strikeWidth = interpolate(frame, [8, 40], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 55% 45%, #0d0025 0%, ${T.bg} 65%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 120px',
        textAlign: 'center',
      }}
    >
      <div style={{ ...line1, marginBottom: 8 }}>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 30,
            color: T.grayLight,
            textTransform: 'uppercase',
            letterSpacing: 3,
          }}
        >
          No need for a
        </span>
      </div>

      {/* Strikethrough price */}
      <div
        style={{
          ...line2,
          position: 'relative',
          display: 'inline-block',
          marginBottom: 36,
        }}
      >
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 72,
            color: T.red,
            opacity: 0.7,
            textTransform: 'uppercase',
          }}
        >
          $5,000/month Reputation Firm
        </span>
        {/* Animated strikethrough */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            height: 6,
            width: `${strikeWidth}%`,
            background: T.red,
            boxShadow: `0 0 12px ${T.red}`,
            borderRadius: 3,
          }}
        />
      </div>

      <div style={{ ...line3, marginBottom: 12 }}>
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 60,
            color: T.white,
            textTransform: 'uppercase',
          }}
        >
          Just an Instagram Account
        </span>
      </div>

      <div style={{ ...line4 }}>
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 52,
            color: T.green,
            textShadow: `0 0 24px ${T.green}60`,
            textTransform: 'uppercase',
          }}
        >
          + 15 Minutes a Day.
        </span>
      </div>
    </AbsoluteFill>
  );
};
