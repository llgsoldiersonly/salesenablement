import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT_IMPACT, FONT_BODY } from '../theme';
import { fadeIn } from '../utils';
import { BigStat } from '../components/BigStat';

export const Scene05StatStack: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = fadeIn(frame, 0, 15);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 30%, #0d0030 0%, ${T.bg} 65%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
      }}
    >
      <div style={{ opacity: headerOpacity, marginBottom: 40, textAlign: 'center' }}>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 28,
            color: T.grayLight,
            textTransform: 'uppercase',
            letterSpacing: 4,
          }}
        >
          The Numbers Don't Lie
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 60,
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <BigStat value={71} suffix="B" label="clicks / month" color={T.purple} delay={10} />
        </div>

        <div
          style={{
            width: 1,
            height: 120,
            background: `${T.purpleDark}60`,
            marginTop: 20,
          }}
        />

        <div style={{ textAlign: 'center' }}>
          <BigStat value={17} suffix="%" prefix="↑" label="up from last month" color={T.green} delay={30} />
        </div>

        <div
          style={{
            width: 1,
            height: 120,
            background: `${T.purpleDark}60`,
            marginTop: 20,
          }}
        />

        <div style={{ textAlign: 'center' }}>
          <BigStat value={16} suffix="B" label="keywords ranked" color={T.purpleLight} delay={50} />
        </div>
      </div>

      <div
        style={{
          opacity: fadeIn(frame, 90, 20),
          marginTop: 40,
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 24,
            color: T.yellow,
            fontWeight: 700,
          }}
        >
          ⚡ And it's showing up everywhere ChatGPT, Gemini, and AI Overviews look.
        </span>
      </div>
    </AbsoluteFill>
  );
};
