import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { spring, interpolate } from 'remotion';
import { T, FONT_IMPACT, FONT_BODY } from '../theme';
import { fadeIn, slideUp, glowPulse, popIn } from '../utils';

export const Scene16EngagementCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgPulse = Math.sin(frame * 0.1) * 0.5 + 0.5;

  // Header slides up first
  const header = slideUp(frame, fps, 0);

  // Two action rows pop in sequentially
  const row1 = popIn(frame, fps, 22);
  const row2 = popIn(frame, fps, 48);

  // "FREE" word springs in big
  const freeS = spring({ frame: Math.max(0, frame - 75), fps, config: { damping: 7, stiffness: 200 } });
  const freeScale = interpolate(freeS, [0, 1], [0.3, 1]);
  const freeOpacity = interpolate(frame, [75, 85], [0, 1], { extrapolateRight: 'clamp' });

  // Guide title
  const guide = { opacity: fadeIn(frame, 95, 20) };

  // Arrow bounce
  const arrowY = interpolate(Math.sin(frame * 0.18) * 0.5 + 0.5, [0, 1], [0, 10]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, #1d0045 0%, ${T.bg} 65%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 100px',
      }}
    >
      {/* Pulsing glow backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 60%, ${T.purple}${interpolate(bgPulse,[0,1],[8,18]).toFixed(0).padStart(2,'0')} 0%, transparent 60%)`,
        }}
      />

      {/* Top label */}
      <div style={{ ...header, marginBottom: 28, textAlign: 'center', zIndex: 2 }}>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 26,
            color: T.grayLight,
            textTransform: 'uppercase',
            letterSpacing: 4,
          }}
        >
          Want the full playbook?
        </span>
      </div>

      {/* Action 1 — FOLLOW */}
      <div
        style={{
          ...row1,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          background: `linear-gradient(135deg, #1e004a, #120030)`,
          border: `2px solid ${T.purple}`,
          borderRadius: 20,
          padding: '22px 48px',
          width: '100%',
          maxWidth: 860,
          marginBottom: 16,
          boxShadow: `0 0 40px ${T.purple}40`,
        }}
      >
        <span style={{ fontSize: 44 }}>➕</span>
        <div>
          <div
            style={{
              fontFamily: FONT_IMPACT,
              fontSize: 52,
              color: T.white,
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            Follow
          </div>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 20,
              color: T.grayLight,
              marginTop: 4,
            }}
          >
            so you never miss a strategy drop
          </div>
        </div>
      </div>

      {/* Action 2 — COMMENT LEADS */}
      <div
        style={{
          ...row2,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          background: `linear-gradient(135deg, #1e004a, #120030)`,
          border: `2px solid ${T.yellow}`,
          borderRadius: 20,
          padding: '22px 48px',
          width: '100%',
          maxWidth: 860,
          marginBottom: 28,
          boxShadow: `0 0 40px ${T.yellow}30`,
        }}
      >
        <span style={{ fontSize: 44 }}>💬</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: FONT_IMPACT,
              fontSize: 42,
              color: T.white,
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            Comment{' '}
            <span
              style={{
                color: T.yellow,
                background: `${T.yellow}22`,
                padding: '4px 16px',
                borderRadius: 8,
                textShadow: `0 0 20px ${T.yellow}80`,
                border: `1px solid ${T.yellow}60`,
              }}
            >
              "LEADS"
            </span>
          </div>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 20,
              color: T.grayLight,
              marginTop: 6,
            }}
          >
            and we'll send it straight to you
          </div>
        </div>
      </div>

      {/* Reward */}
      <div
        style={{
          zIndex: 2,
          textAlign: 'center',
          opacity: freeOpacity,
          transform: `scale(${freeScale})`,
        }}
      >
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 28,
            color: T.grayLight,
            textTransform: 'uppercase',
            letterSpacing: 3,
          }}
        >
          Get the
        </span>{' '}
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 52,
            color: T.green,
            textTransform: 'uppercase',
            textShadow: `0 0 24px ${T.green}60`,
          }}
        >
          FREE
        </span>
      </div>

      <div style={{ ...guide, zIndex: 2, textAlign: 'center', marginTop: 6 }}>
        <div
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 46,
            color: T.white,
            textTransform: 'uppercase',
            letterSpacing: 3,
            textShadow: glowPulse(frame, T.purple, 10, 30, 0.08),
          }}
        >
          Google Cheat Code Guide
        </div>
      </div>

      {/* Bouncing arrow pointing at the comment box */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          zIndex: 2,
          transform: `translateY(${arrowY}px)`,
          opacity: fadeIn(frame, 110, 15),
        }}
      >
        <span
          style={{
            fontFamily: FONT_IMPACT,
            fontSize: 32,
            color: T.yellow,
            textShadow: `0 0 16px ${T.yellow}80`,
          }}
        >
          ↑ Comment "LEADS" right now ↑
        </span>
      </div>
    </AbsoluteFill>
  );
};
