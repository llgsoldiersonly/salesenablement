import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT_IMPACT, FONT_BODY } from '../theme';
import { slideUp, fadeIn, popIn } from '../utils';

const AiBadge: React.FC<{ name: string; color: string; delay: number }> = ({
  name,
  color,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = popIn(frame, fps, delay);
  return (
    <div
      style={{
        ...style,
        background: `${color}20`,
        border: `2px solid ${color}80`,
        borderRadius: 16,
        padding: '18px 36px',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          fontFamily: FONT_IMPACT,
          fontSize: 36,
          color,
          textShadow: `0 0 16px ${color}80`,
          letterSpacing: 2,
        }}
      >
        {name}
      </span>
    </div>
  );
};

export const Scene06AIBots: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const header = slideUp(frame, fps, 0);
  const footer = { opacity: fadeIn(frame, 80, 20) };

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 50%, #001030 0%, ${T.bg} 65%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        padding: '0 80px',
      }}
    >
      <div style={header}>
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 58,
            color: T.white,
            textAlign: 'center',
            display: 'block',
          }}
        >
          It's showing up everywhere
        </span>
      </div>

      <div style={{ display: 'flex', gap: 30, justifyContent: 'center' }}>
        <AiBadge name="ChatGPT" color="#10A37F" delay={20} />
        <AiBadge name="Gemini" color="#4285F4" delay={36} />
        <AiBadge name="AI Overviews" color={T.purple} delay={52} />
      </div>

      <div style={footer}>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 32,
            color: T.offWhite,
            fontWeight: 700,
            textAlign: 'center',
            display: 'block',
          }}
        >
          …look.
        </span>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 26,
            color: T.grayLight,
            textAlign: 'center',
            display: 'block',
            marginTop: 12,
          }}
        >
          Your brand can live rent-free in all of them.
        </span>
      </div>
    </AbsoluteFill>
  );
};
