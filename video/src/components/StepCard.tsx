import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT_IMPACT, FONT_BODY } from '../theme';
import { slideUp, fadeIn } from '../utils';

interface StepCardProps {
  number: number;
  title: string;
  sub?: string;
  delay?: number;
}

export const StepCard: React.FC<StepCardProps> = ({ number, title, sub, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = slideUp(frame, fps, delay);

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 20,
        background: `linear-gradient(135deg, ${T.bgCard}, #1a003a)`,
        border: `1px solid ${T.purpleDark}`,
        borderRadius: 16,
        padding: '20px 28px',
        boxShadow: `0 0 20px ${T.purpleDark}40`,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontFamily: FONT_IMPACT,
          fontSize: 48,
          color: T.purple,
          lineHeight: 1,
          minWidth: 52,
          textShadow: `0 0 20px ${T.purple}80`,
        }}
      >
        {number}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 24,
            fontWeight: 700,
            color: T.white,
            lineHeight: 1.3,
          }}
        >
          {title}
        </div>
        {sub && (
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 18,
              color: T.grayLight,
              marginTop: 6,
              opacity: fadeIn(frame, delay + 12, 10),
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
};
