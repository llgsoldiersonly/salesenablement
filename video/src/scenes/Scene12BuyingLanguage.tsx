import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT_IMPACT, FONT_BODY } from '../theme';
import { slideUp, fadeIn } from '../utils';
import { KeywordPill } from '../components/KeywordPill';

export const Scene12BuyingLanguage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const header = slideUp(frame, fps, 0);
  const sub = { opacity: fadeIn(frame, 20, 15) };
  const footer = { opacity: fadeIn(frame, 105, 20) };

  const keywords = [
    { text: 'review', delay: 22, color: T.purple },
    { text: 'rating', delay: 32, color: T.purpleLight },
    { text: 'testimonial', delay: 42, color: T.purple },
    { text: 'Is [brand] legit?', delay: 54, color: T.yellow },
    { text: 'Is [brand] a scam? No.', delay: 66, color: T.green },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 50%, #100028 0%, ${T.bg} 65%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 120px',
        textAlign: 'center',
      }}
    >
      <div style={{ ...header, marginBottom: 12 }}>
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 54,
            color: T.white,
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          Step 4 — Stuff the Caption With
        </span>
      </div>

      <div style={{ ...sub, marginBottom: 32 }}>
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 48,
            color: T.yellow,
            textTransform: 'uppercase',
            textShadow: `0 0 24px ${T.yellow}60`,
          }}
        >
          Buying Language
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 4,
          marginBottom: 32,
        }}
      >
        {keywords.map((kw) => (
          <KeywordPill key={kw.text} text={kw.text} delay={kw.delay} color={kw.color} />
        ))}
      </div>

      <div style={footer}>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 22,
            color: T.grayLight,
            fontStyle: 'italic',
          }}
        >
          That's what people TYPE into Google. That's what AI bots SCAN for.
          <br />
          You're feeding both at the same time.
        </span>
      </div>
    </AbsoluteFill>
  );
};
