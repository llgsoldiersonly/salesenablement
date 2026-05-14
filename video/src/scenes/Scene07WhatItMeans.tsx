import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT_IMPACT, FONT_BODY } from '../theme';
import { slideUp, fadeIn } from '../utils';

const Benefit: React.FC<{ icon: string; text: string; delay: number; color?: string }> = ({
  icon,
  text,
  delay,
  color = T.purpleLight,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = slideUp(frame, fps, delay);
  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        marginBottom: 20,
      }}
    >
      <span style={{ fontSize: 40 }}>{icon}</span>
      <span
        style={{
          fontFamily: FONT_BODY,
          fontSize: 32,
          fontWeight: 700,
          color,
        }}
      >
        {text}
      </span>
    </div>
  );
};

export const Scene07WhatItMeans: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const header = slideUp(frame, fps, 0);
  const free = { opacity: fadeIn(frame, 110, 20) };

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 40% 50%, #150030 0%, ${T.bg} 65%)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 140px',
      }}
    >
      <div style={{ ...header, marginBottom: 36 }}>
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 50,
            color: T.yellow,
            textTransform: 'uppercase',
            letterSpacing: 2,
            display: 'block',
          }}
        >
          Here's What That Means for You…
        </span>
      </div>

      <Benefit icon="🛡️" text="Bury bad press." delay={20} color={T.purpleLight} />
      <Benefit icon="🔎" text='Outrank "is this a scam?" searches.' delay={40} color={T.white} />
      <Benefit
        icon="🤖"
        text="Flood Google AND the AI bots with proof."
        delay={60}
        color={T.purpleLight}
      />

      <div
        style={{
          ...free,
          marginTop: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 64,
            color: T.green,
            textShadow: `0 0 30px ${T.green}60`,
            textTransform: 'uppercase',
          }}
        >
          For Free.
        </span>
      </div>
    </AbsoluteFill>
  );
};
