import { interpolate, spring } from 'remotion';

export function fadeIn(frame: number, start = 0, duration = 15) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

export function fadeOut(frame: number, total: number, duration = 15) {
  return interpolate(frame, [total - duration, total], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

export function slideUp(frame: number, fps: number, delay = 0) {
  const f = Math.max(0, frame - delay);
  const s = spring({ frame: f, fps, config: { damping: 14, stiffness: 120 } });
  return {
    opacity: interpolate(f, [0, 8], [0, 1], { extrapolateRight: 'clamp' }),
    transform: `translateY(${interpolate(s, [0, 1], [60, 0])}px)`,
  };
}

export function popIn(frame: number, fps: number, delay = 0) {
  const f = Math.max(0, frame - delay);
  const s = spring({ frame: f, fps, config: { damping: 10, stiffness: 200 } });
  return {
    opacity: interpolate(f, [0, 5], [0, 1], { extrapolateRight: 'clamp' }),
    transform: `scale(${interpolate(s, [0, 1], [0.3, 1])})`,
  };
}

export function countUp(frame: number, fps: number, target: number, delay = 0, duration = 45) {
  const f = Math.max(0, frame - delay);
  const progress = interpolate(f, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  return Math.floor(progress * target);
}

export function glowPulse(frame: number, color: string, minBlur = 10, maxBlur = 40, speed = 0.05) {
  const pulse = Math.sin(frame * speed) * 0.5 + 0.5;
  const blur = minBlur + pulse * (maxBlur - minBlur);
  return `0 0 ${blur}px ${color}, 0 0 ${blur * 2}px ${color}40`;
}
