import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT_IMPACT, FONT_BODY } from '../theme';
import { fadeIn } from '../utils';
import { StepCard } from '../components/StepCard';

export const Scene10Steps123: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 30% 50%, #0d0025 0%, ${T.bg} 65%)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 120px',
      }}
    >
      <div style={{ opacity: fadeIn(frame, 0, 12), marginBottom: 28 }}>
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 40,
            color: T.purple,
            textTransform: 'uppercase',
            letterSpacing: 4,
            textShadow: `0 0 20px ${T.purple}60`,
          }}
        >
          The 7-Step Play
        </span>
      </div>

      <StepCard
        number={1}
        title="Round up every review you've ever gotten."
        sub="Google · Yelp · Facebook · Email · Screenshot from texts — pull 'em all."
        delay={12}
      />
      <StepCard
        number={2}
        title="One review = one Instagram post."
        sub="Don't stack them. Don't get fancy. One at a time."
        delay={60}
      />
      <StepCard
        number={3}
        title='Caption it with this exact formula →'
        sub="[Your Brand Name] Review + paste the actual review."
        delay={110}
      />
    </AbsoluteFill>
  );
};
