import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT_BODY } from '../theme';
import { popIn } from '../utils';

interface KeywordPillProps {
  text: string;
  delay?: number;
  color?: string;
}

export const KeywordPill: React.FC<KeywordPillProps> = ({
  text,
  delay = 0,
  color = T.purple,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = popIn(frame, fps, delay);

  return (
    <div
      style={{
        ...style,
        display: 'inline-block',
        background: `${color}22`,
        border: `1px solid ${color}66`,
        borderRadius: 100,
        padding: '10px 22px',
        fontFamily: FONT_BODY,
        fontSize: 20,
        fontWeight: 700,
        color,
        textShadow: `0 0 10px ${color}60`,
        boxShadow: `0 0 12px ${color}30`,
        margin: '6px 8px',
      }}
    >
      {text}
    </div>
  );
};
