import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { T } from './theme';
import { Scene01Intro } from './scenes/Scene01Intro';
import { Scene02Hook } from './scenes/Scene02Hook';
import { Scene03CheatCode } from './scenes/Scene03CheatCode';
import { Scene04InstagramRank } from './scenes/Scene04InstagramRank';
import { Scene05StatStack } from './scenes/Scene05StatStack';
import { Scene06AIBots } from './scenes/Scene06AIBots';
import { Scene07WhatItMeans } from './scenes/Scene07WhatItMeans';
import { Scene08FreePlay } from './scenes/Scene08FreePlay';
import { Scene09ThePlay } from './scenes/Scene09ThePlay';
import { Scene10Steps123 } from './scenes/Scene10Steps123';
import { Scene11CaptionFormula } from './scenes/Scene11CaptionFormula';
import { Scene12BuyingLanguage } from './scenes/Scene12BuyingLanguage';
import { Scene13Steps567 } from './scenes/Scene13Steps567';
import { Scene14ThirtyDays } from './scenes/Scene14ThirtyDays';
import { Scene15NowGoPost } from './scenes/Scene15NowGoPost';
import { Scene16EngagementCTA } from './scenes/Scene16EngagementCTA';
import { Scene16Outro } from './scenes/Scene16Outro';

// Timing table (all values in frames at 30fps)
// Scene | Start | Duration
// 01    |     0 |  90  (3s)  — Intro / Logo
// 02    |    90 |  90  (3s)  — "LOOK…"
// 03    |   180 | 150  (5s)  — Cheat Code / 99%
// 04    |   330 | 180  (6s)  — Instagram #6
// 05    |   510 | 180  (6s)  — Stats: 7.1B · +17% · 1.6B
// 06    |   690 | 150  (5s)  — AI Bots
// 07    |   840 | 180  (6s)  — What It Means
// 08    |  1020 | 150  (5s)  — FREE / no $5K firm
// 09    |  1170 |  90  (3s)  — "The Exact Play"
// 10    |  1260 | 240  (8s)  — Steps 1-3
// 11    |  1500 | 180  (6s)  — Caption Formula
// 12    |  1680 | 150  (5s)  — Buying Language (Step 4)
// 13    |  1830 | 180  (6s)  — Steps 5-7
// 14    |  2010 | 150  (5s)  — 30 Days
// 15    |  2160 | 150  (5s)  — NOW GO POST
// 16    |  2310 | 180  (6s)  — Engagement CTA ("Follow + Comment LEADS")
// 17    |  2490 | 150  (5s)  — Outro
// Total: 2640 frames = 88 seconds

export const LLGVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: T.bg }}>
      <Sequence from={0}    durationInFrames={90}><Scene01Intro /></Sequence>
      <Sequence from={90}   durationInFrames={90}><Scene02Hook /></Sequence>
      <Sequence from={180}  durationInFrames={150}><Scene03CheatCode /></Sequence>
      <Sequence from={330}  durationInFrames={180}><Scene04InstagramRank /></Sequence>
      <Sequence from={510}  durationInFrames={180}><Scene05StatStack /></Sequence>
      <Sequence from={690}  durationInFrames={150}><Scene06AIBots /></Sequence>
      <Sequence from={840}  durationInFrames={180}><Scene07WhatItMeans /></Sequence>
      <Sequence from={1020} durationInFrames={150}><Scene08FreePlay /></Sequence>
      <Sequence from={1170} durationInFrames={90}><Scene09ThePlay /></Sequence>
      <Sequence from={1260} durationInFrames={240}><Scene10Steps123 /></Sequence>
      <Sequence from={1500} durationInFrames={180}><Scene11CaptionFormula /></Sequence>
      <Sequence from={1680} durationInFrames={150}><Scene12BuyingLanguage /></Sequence>
      <Sequence from={1830} durationInFrames={180}><Scene13Steps567 /></Sequence>
      <Sequence from={2010} durationInFrames={150}><Scene14ThirtyDays /></Sequence>
      <Sequence from={2160} durationInFrames={150}><Scene15NowGoPost /></Sequence>
      <Sequence from={2310} durationInFrames={180}><Scene16EngagementCTA /></Sequence>
      <Sequence from={2490} durationInFrames={150}><Scene16Outro /></Sequence>
    </AbsoluteFill>
  );
};
