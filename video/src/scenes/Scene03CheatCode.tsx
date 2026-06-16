import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT_IMPACT, FONT_BODY } from '../theme';
import { slideUp, fadeIn } from '../utils';

export const Scene03CheatCode: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1 = slideUp(frame, fps, 0);
  const line2 = slideUp(frame, fps, 18);
  const line3 = slideUp(frame, fps, 50);
  const line4 = slideUp(frame, fps, 68);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, #1a0040 0%, ${T.bg} 65%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 120px',
        textAlign: 'center',
      }}
    >
      <div style={{ ...line1, marginBottom: 12 }}>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 32,
            color: T.grayLight,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          Google just handed you
        </span>
      </div>

      <div style={{ ...line2, marginBottom: 32 }}>
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 96,
            color: T.purple,
            letterSpacing: 2,
            textShadow: `0 0 40px ${T.purple}80`,
            textTransform: 'uppercase',
          }}
        >
          The Cheat Code.
        </span>
      </div>

      <div style={{ ...line3, marginBottom: 8, opacity: fadeIn(frame, 50, 15) }}>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 36,
            color: T.offWhite,
            fontWeight: 700,
          }}
        >
          And 99% of business owners
        </span>
      </div>

      <div style={{ ...line4, opacity: fadeIn(frame, 68, 15) }}>
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 54,
            color: T.red,
            textShadow: `0 0 20px ${T.red}60`,
            textTransform: 'uppercase',
          }}
        >
          Are About to Miss It.
        </span>
      </div>
    </AbsoluteFill>
  );
};
