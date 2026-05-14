import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT_IMPACT, FONT_BODY } from '../theme';
import { fadeIn } from '../utils';
import { StepCard } from '../components/StepCard';

export const Scene13Steps567: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 70% 50%, #0d0025 0%, ${T.bg} 65%)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 120px',
      }}
    >
      <StepCard
        number={5}
        title="Hit publish. Google indexes it."
        sub="ChatGPT crawls it. Gemini sees it. Your post is now living rent-free in search results."
        delay={0}
      />
      <StepCard
        number={6}
        title="Repeat. Every. Single. Day."
        sub="One review. One post. One caption. Stack 'em like firewood."
        delay={50}
      />
      <StepCard
        number={7}
        title="Sit back in 30 days…"
        sub="Watch your wall of glowing reviews dominate every search."
        delay={100}
      />
    </AbsoluteFill>
  );
};
