import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT_IMPACT, FONT_BODY } from '../theme';
import { slideUp, fadeIn } from '../utils';

const Scenario: React.FC<{ icon: string; query: string; answer: string; delay: number }> = ({
  icon,
  query,
  answer,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = slideUp(frame, fps, delay);
  return (
    <div
      style={{
        ...style,
        background: `linear-gradient(135deg, #120030, #0a001a)`,
        border: `1px solid ${T.purpleDark}`,
        borderRadius: 16,
        padding: '20px 28px',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 20,
          color: T.grayLight,
          marginBottom: 8,
        }}
      >
        {icon} Someone {query}
      </div>
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 22,
          fontWeight: 700,
          color: T.green,
        }}
      >
        → {answer}
      </div>
    </div>
  );
};

export const Scene14ThirtyDays: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const header = slideUp(frame, fps, 0);
  const punchline = { opacity: fadeIn(frame, 105, 20) };

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, #0f0030 0%, ${T.bg} 65%)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 140px',
      }}
    >
      <div style={{ ...header, marginBottom: 30 }}>
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 68,
            color: T.white,
            textTransform: 'uppercase',
            letterSpacing: 2,
            textShadow: `0 0 30px ${T.purple}60`,
          }}
        >
          Sit Back in 30 Days.
        </span>
      </div>

      <Scenario
        icon="🔍"
        query='Googles "is [your brand] a scam?"'
        answer="Your wall of glowing reviews is the first result."
        delay={25}
      />
      <Scenario
        icon="🤖"
        query='asks ChatGPT "should I trust [your brand]?"'
        answer="AI cites your reviews as proof you're legit."
        delay={65}
      />

      <div style={punchline}>
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 48,
            color: T.yellow,
            textTransform: 'uppercase',
            textShadow: `0 0 20px ${T.yellow}60`,
          }}
        >
          That's how the $10K/month reputation firms do it.
        </span>
        <br />
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 44,
            color: T.green,
            textTransform: 'uppercase',
          }}
        >
          That's how you're gonna do it — for free.
        </span>
      </div>
    </AbsoluteFill>
  );
};
