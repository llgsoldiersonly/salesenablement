import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { T, FONT_IMPACT, FONT_BODY } from '../theme';
import { popIn, countUp, fadeIn } from '../utils';

interface BigStatProps {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  color?: string;
  delay?: number;
}

export const BigStat: React.FC<BigStatProps> = ({
  value,
  suffix = '',
  prefix = '',
  label,
  color = T.purple,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = popIn(frame, fps, delay);
  const displayed = countUp(frame, fps, value, delay, 40);

  return (
    <div style={{ ...style, textAlign: 'center', padding: '0 20px' }}>
      <div
        style={{
          fontFamily: FONT_IMPACT,
          fontSize: 96,
          color,
          lineHeight: 1,
          textShadow: `0 0 30px ${color}80`,
          letterSpacing: '-2px',
        }}
      >
        {prefix}{displayed.toLocaleString()}{suffix}
      </div>
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 22,
          color: T.grayLight,
          marginTop: 8,
          opacity: fadeIn(frame, delay + 10, 15),
          textTransform: 'uppercase',
          letterSpacing: 3,
        }}
      >
        {label}
      </div>
    </div>
  );
};
