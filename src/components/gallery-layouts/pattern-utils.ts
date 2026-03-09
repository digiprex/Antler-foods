import type { CSSProperties } from 'react';

interface TilePattern {
  gridColumn: string;
  gridRow?: string;
  minHeight?: string;
}

function getPattern<T>(patterns: T[], index: number): T {
  return patterns[index % patterns.length];
}

export function getMosaicTilePattern(
  total: number,
  index: number,
): CSSProperties {
  const presets: Record<number, TilePattern[]> = {
    1: [{ gridColumn: 'span 12', minHeight: 'clamp(22rem, 52vw, 34rem)' }],
    2: [
      { gridColumn: 'span 6', minHeight: 'clamp(18rem, 42vw, 30rem)' },
      { gridColumn: 'span 6', minHeight: 'clamp(18rem, 42vw, 30rem)' },
    ],
    3: [
      { gridColumn: 'span 7', gridRow: 'span 4', minHeight: 'clamp(22rem, 44vw, 32rem)' },
      { gridColumn: 'span 5', gridRow: 'span 2', minHeight: 'clamp(10rem, 18vw, 14rem)' },
      { gridColumn: 'span 5', gridRow: 'span 2', minHeight: 'clamp(10rem, 18vw, 14rem)' },
    ],
    4: [
      { gridColumn: 'span 7', gridRow: 'span 4', minHeight: 'clamp(22rem, 44vw, 32rem)' },
      { gridColumn: 'span 5', gridRow: 'span 2', minHeight: 'clamp(10rem, 18vw, 14rem)' },
      { gridColumn: 'span 3', gridRow: 'span 2', minHeight: 'clamp(10rem, 18vw, 14rem)' },
      { gridColumn: 'span 2', gridRow: 'span 2', minHeight: 'clamp(10rem, 18vw, 14rem)' },
    ],
    5: [
      { gridColumn: 'span 6', gridRow: 'span 4', minHeight: 'clamp(22rem, 44vw, 32rem)' },
      { gridColumn: 'span 3', gridRow: 'span 2', minHeight: 'clamp(10rem, 18vw, 14rem)' },
      { gridColumn: 'span 3', gridRow: 'span 2', minHeight: 'clamp(10rem, 18vw, 14rem)' },
      { gridColumn: 'span 4', gridRow: 'span 2', minHeight: 'clamp(11rem, 18vw, 15rem)' },
      { gridColumn: 'span 2', gridRow: 'span 2', minHeight: 'clamp(11rem, 18vw, 15rem)' },
    ],
  };

  const defaultPattern: TilePattern[] = [
    { gridColumn: 'span 6', gridRow: 'span 4', minHeight: 'clamp(22rem, 44vw, 32rem)' },
    { gridColumn: 'span 3', gridRow: 'span 2', minHeight: 'clamp(10rem, 18vw, 14rem)' },
    { gridColumn: 'span 3', gridRow: 'span 2', minHeight: 'clamp(10rem, 18vw, 14rem)' },
    { gridColumn: 'span 2', gridRow: 'span 2', minHeight: 'clamp(9rem, 16vw, 13rem)' },
    { gridColumn: 'span 4', gridRow: 'span 2', minHeight: 'clamp(11rem, 18vw, 15rem)' },
    { gridColumn: 'span 3', gridRow: 'span 2', minHeight: 'clamp(10rem, 18vw, 14rem)' },
  ];

  return getPattern(presets[total] || defaultPattern, index);
}

export function getEditorialTilePattern(
  total: number,
  index: number,
): CSSProperties {
  const presets: Record<number, TilePattern[]> = {
    1: [{ gridColumn: 'span 12', minHeight: 'clamp(24rem, 54vw, 36rem)' }],
    2: [
      { gridColumn: 'span 12', minHeight: 'clamp(20rem, 44vw, 30rem)' },
      { gridColumn: 'span 12', minHeight: 'clamp(14rem, 32vw, 22rem)' },
    ],
    3: [
      { gridColumn: 'span 12', gridRow: 'span 4', minHeight: 'clamp(21rem, 42vw, 30rem)' },
      { gridColumn: 'span 6', gridRow: 'span 3', minHeight: 'clamp(12rem, 20vw, 16rem)' },
      { gridColumn: 'span 6', gridRow: 'span 3', minHeight: 'clamp(12rem, 20vw, 16rem)' },
    ],
    4: [
      { gridColumn: 'span 12', gridRow: 'span 4', minHeight: 'clamp(21rem, 42vw, 30rem)' },
      { gridColumn: 'span 4', gridRow: 'span 3', minHeight: 'clamp(11rem, 18vw, 15rem)' },
      { gridColumn: 'span 4', gridRow: 'span 3', minHeight: 'clamp(11rem, 18vw, 15rem)' },
      { gridColumn: 'span 4', gridRow: 'span 3', minHeight: 'clamp(11rem, 18vw, 15rem)' },
    ],
  };

  const defaultPattern: TilePattern[] = [
    { gridColumn: 'span 12', gridRow: 'span 4', minHeight: 'clamp(21rem, 42vw, 30rem)' },
    { gridColumn: 'span 5', gridRow: 'span 3', minHeight: 'clamp(12rem, 18vw, 16rem)' },
    { gridColumn: 'span 3', gridRow: 'span 3', minHeight: 'clamp(12rem, 18vw, 16rem)' },
    { gridColumn: 'span 4', gridRow: 'span 3', minHeight: 'clamp(12rem, 18vw, 16rem)' },
    { gridColumn: 'span 4', gridRow: 'span 2', minHeight: 'clamp(11rem, 16vw, 14rem)' },
    { gridColumn: 'span 4', gridRow: 'span 2', minHeight: 'clamp(11rem, 16vw, 14rem)' },
  ];

  return getPattern(presets[total] || defaultPattern, index);
}

export function getCircularOffset(
  index: number,
  activeIndex: number,
  total: number,
  windowSize: number,
) {
  const forward = (index - activeIndex + total) % total;
  const backward = (activeIndex - index + total) % total;

  if (forward === 0) {
    return 0;
  }

  if (forward <= windowSize) {
    return forward;
  }

  if (backward <= windowSize) {
    return -backward;
  }

  return null;
}
