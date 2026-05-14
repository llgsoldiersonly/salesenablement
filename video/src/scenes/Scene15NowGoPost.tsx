import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { spring, interpolate } from 'remotion';
import { T, FONT_IMPACT, FONT_BODY } from '../theme';
import { glowPulse, fadeIn, slideUp } from '../utils';

export const Scene15NowGoPost: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: { damping: 7, stiffness: 250 } });
  const scale = interpolate(s, [0, 1], [0.2, 1]);
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  const bgPulse = Math.sin(frame * 0.14) * 0.5 + 0.5;
  const bgAlpha = interpolate(bgPulse, [0, 1], [0.25, 0.5]);

  const ring1Size = interpolate(bgPulse, [0, 1], [460, 640]);
  const ring2Size = interpolate(bgPulse, [0, 1], [640, 820]);

  const sub1 = slideUp(frame, fps, 48);
  const sub2 = slideUp(frame, fps, 68);
  const tag = { opacity: fadeIn(frame, 88, 20) };

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, rgba(109,40,217,${bgAlpha}) 0%, ${T.bg} 60%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Concentric pulsing rings */}
      {[ring1Size, ring2Size].map((size, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: '50%',
            border: `${i === 0 ? 2 : 1}px solid ${T.purple}`,
            opacity: interpolate(bgPulse, [0, 1], [i === 0 ? 0.4 : 0.15, i === 0 ? 0.15 : 0.05]),
          }}
        />
      ))}

      {/* Main headline */}
      <div style={{ opacity, transform: `scale(${scale})`, textAlign: 'center', zIndex: 2 }}>
        <div
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 76,
            color: T.grayLight,
            letterSpacing: 8,
            textTransform: 'uppercase',
            marginBottom: -8,
          }}
        >
          Now
        </div>
        <div
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 148,
            color: T.white,
            textTransform: 'uppercase',
            lineHeight: 0.92,
            textShadow: glowPulse(frame, T.purple, 30, 80, 0.1),
            letterSpacing: 6,
          }}
        >
          GO POST.
        </div>
      </div>

      {/* Engagement sub-lines */}
      <div style={{ ...sub1, marginTop: 36, zIndex: 2, textAlign: 'center' }}>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 28,
            fontWeight: 700,
            color: T.yellow,
          }}
        >
          ❤️ Like this if it helped you.
        </span>
      </div>

      <div style={{ ...sub2, marginTop: 12, zIndex: 2, textAlign: 'center' }}>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 26,
            fontWeight: 700,
            color: T.purpleLight,
          }}
        >
          🔁 Share it with someone who's missing this.
        </span>
      </div>

      {/* Teaser for next slide */}
      <div
        style={{
          ...tag,
          marginTop: 28,
          zIndex: 2,
          background: `${T.purple}22`,
          border: `1px solid ${T.purple}60`,
          borderRadius: 100,
          padding: '10px 30px',
        }}
      >
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 20,
            color: T.purpleLight,
            letterSpacing: 1,
          }}
        >
          👇 Want the full guide? Keep reading.
        </span>
      </div>
    </AbsoluteFill>
  );
};
