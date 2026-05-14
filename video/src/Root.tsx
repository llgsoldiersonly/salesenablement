import React from 'react';
import { Composition } from 'remotion';
import { LLGVideo } from './Video';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Landscape 16:9 — YouTube, LinkedIn, Facebook */}
      <Composition
        id="LLGVideo"
        component={LLGVideo}
        durationInFrames={2640}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* Vertical 9:16 — Reels, Shorts, TikTok */}
      <Composition
        id="LLGVideoVertical"
        component={LLGVideo}
        durationInFrames={2640}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
