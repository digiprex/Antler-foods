import type { CSSProperties } from 'react';

interface TilePattern {
  columnSpan: number;
  rowSpan?: number;
  tabletColumnSpan?: number;
  tabletRowSpan?: number;
  mobileColumnSpan?: number;
  mobileRowSpan?: number;
}

function getPattern<T>(patterns: T[], index: number): T {
  return patterns[index % patterns.length];
}

function toTileStyle(pattern: TilePattern): CSSProperties {
  const style = {
    '--tile-column-span': String(pattern.columnSpan),
    '--tile-row-span': String(pattern.rowSpan ?? 1),
    '--tile-tablet-column-span': String(
      pattern.tabletColumnSpan ?? pattern.columnSpan,
    ),
    '--tile-tablet-row-span': String(
      pattern.tabletRowSpan ?? pattern.rowSpan ?? 1,
    ),
    '--tile-mobile-column-span': String(
      pattern.mobileColumnSpan ?? pattern.tabletColumnSpan ?? pattern.columnSpan,
    ),
    '--tile-mobile-row-span': String(
      pattern.mobileRowSpan ?? pattern.tabletRowSpan ?? pattern.rowSpan ?? 1,
    ),
  };

  return style as CSSProperties;
}

export function getMosaicTilePattern(
  total: number,
  index: number,
): CSSProperties {
  const presets: Record<number, TilePattern[]> = {
    1: [
      {
        columnSpan: 12,
        rowSpan: 5,
        tabletColumnSpan: 6,
        tabletRowSpan: 5,
        mobileColumnSpan: 2,
        mobileRowSpan: 3,
      },
    ],
    2: [
      {
        columnSpan: 6,
        rowSpan: 4,
        tabletColumnSpan: 3,
        tabletRowSpan: 4,
        mobileColumnSpan: 2,
        mobileRowSpan: 2,
      },
      {
        columnSpan: 6,
        rowSpan: 4,
        tabletColumnSpan: 3,
        tabletRowSpan: 4,
        mobileColumnSpan: 2,
        mobileRowSpan: 2,
      },
    ],
    3: [
      {
        columnSpan: 7,
        rowSpan: 4,
        tabletColumnSpan: 6,
        tabletRowSpan: 4,
        mobileColumnSpan: 2,
        mobileRowSpan: 2,
      },
      {
        columnSpan: 5,
        rowSpan: 2,
        tabletColumnSpan: 3,
        tabletRowSpan: 2,
        mobileColumnSpan: 1,
        mobileRowSpan: 1,
      },
      {
        columnSpan: 5,
        rowSpan: 2,
        tabletColumnSpan: 3,
        tabletRowSpan: 2,
        mobileColumnSpan: 1,
        mobileRowSpan: 1,
      },
    ],
    4: [
      {
        columnSpan: 7,
        rowSpan: 4,
        tabletColumnSpan: 6,
        tabletRowSpan: 4,
        mobileColumnSpan: 2,
        mobileRowSpan: 2,
      },
      {
        columnSpan: 5,
        rowSpan: 2,
        tabletColumnSpan: 3,
        tabletRowSpan: 2,
        mobileColumnSpan: 1,
        mobileRowSpan: 1,
      },
      {
        columnSpan: 3,
        rowSpan: 2,
        tabletColumnSpan: 3,
        tabletRowSpan: 2,
        mobileColumnSpan: 1,
        mobileRowSpan: 1,
      },
      {
        columnSpan: 2,
        rowSpan: 2,
        tabletColumnSpan: 6,
        tabletRowSpan: 2,
        mobileColumnSpan: 2,
        mobileRowSpan: 1,
      },
    ],
    5: [
      {
        columnSpan: 6,
        rowSpan: 4,
        tabletColumnSpan: 6,
        tabletRowSpan: 4,
        mobileColumnSpan: 2,
        mobileRowSpan: 2,
      },
      {
        columnSpan: 3,
        rowSpan: 2,
        tabletColumnSpan: 3,
        tabletRowSpan: 2,
        mobileColumnSpan: 1,
        mobileRowSpan: 1,
      },
      {
        columnSpan: 3,
        rowSpan: 2,
        tabletColumnSpan: 3,
        tabletRowSpan: 2,
        mobileColumnSpan: 1,
        mobileRowSpan: 1,
      },
      {
        columnSpan: 4,
        rowSpan: 2,
        tabletColumnSpan: 3,
        tabletRowSpan: 2,
        mobileColumnSpan: 1,
        mobileRowSpan: 1,
      },
      {
        columnSpan: 2,
        rowSpan: 2,
        tabletColumnSpan: 3,
        tabletRowSpan: 2,
        mobileColumnSpan: 1,
        mobileRowSpan: 1,
      },
    ],
  };

  const defaultPattern: TilePattern[] = [
    {
      columnSpan: 6,
      rowSpan: 4,
      tabletColumnSpan: 6,
      tabletRowSpan: 4,
      mobileColumnSpan: 2,
      mobileRowSpan: 2,
    },
    {
      columnSpan: 3,
      rowSpan: 2,
      tabletColumnSpan: 3,
      tabletRowSpan: 2,
      mobileColumnSpan: 1,
      mobileRowSpan: 1,
    },
    {
      columnSpan: 3,
      rowSpan: 2,
      tabletColumnSpan: 3,
      tabletRowSpan: 2,
      mobileColumnSpan: 1,
      mobileRowSpan: 1,
    },
    {
      columnSpan: 2,
      rowSpan: 2,
      tabletColumnSpan: 3,
      tabletRowSpan: 2,
      mobileColumnSpan: 1,
      mobileRowSpan: 1,
    },
    {
      columnSpan: 4,
      rowSpan: 2,
      tabletColumnSpan: 6,
      tabletRowSpan: 2,
      mobileColumnSpan: 2,
      mobileRowSpan: 1,
    },
    {
      columnSpan: 3,
      rowSpan: 2,
      tabletColumnSpan: 3,
      tabletRowSpan: 2,
      mobileColumnSpan: 1,
      mobileRowSpan: 1,
    },
  ];

  return toTileStyle(getPattern(presets[total] || defaultPattern, index));
}

export function getEditorialTilePattern(
  total: number,
  index: number,
): CSSProperties {
  const presets: Record<number, TilePattern[]> = {
    1: [
      {
        columnSpan: 12,
        rowSpan: 5,
        tabletColumnSpan: 6,
        tabletRowSpan: 5,
        mobileColumnSpan: 2,
        mobileRowSpan: 3,
      },
    ],
    2: [
      {
        columnSpan: 12,
        rowSpan: 4,
        tabletColumnSpan: 6,
        tabletRowSpan: 4,
        mobileColumnSpan: 2,
        mobileRowSpan: 2,
      },
      {
        columnSpan: 12,
        rowSpan: 3,
        tabletColumnSpan: 6,
        tabletRowSpan: 3,
        mobileColumnSpan: 2,
        mobileRowSpan: 2,
      },
    ],
    3: [
      {
        columnSpan: 12,
        rowSpan: 4,
        tabletColumnSpan: 6,
        tabletRowSpan: 4,
        mobileColumnSpan: 2,
        mobileRowSpan: 2,
      },
      {
        columnSpan: 6,
        rowSpan: 3,
        tabletColumnSpan: 3,
        tabletRowSpan: 2,
        mobileColumnSpan: 1,
        mobileRowSpan: 1,
      },
      {
        columnSpan: 6,
        rowSpan: 3,
        tabletColumnSpan: 3,
        tabletRowSpan: 2,
        mobileColumnSpan: 1,
        mobileRowSpan: 1,
      },
    ],
    4: [
      {
        columnSpan: 12,
        rowSpan: 4,
        tabletColumnSpan: 6,
        tabletRowSpan: 4,
        mobileColumnSpan: 2,
        mobileRowSpan: 2,
      },
      {
        columnSpan: 4,
        rowSpan: 3,
        tabletColumnSpan: 3,
        tabletRowSpan: 2,
        mobileColumnSpan: 1,
        mobileRowSpan: 1,
      },
      {
        columnSpan: 4,
        rowSpan: 3,
        tabletColumnSpan: 3,
        tabletRowSpan: 2,
        mobileColumnSpan: 1,
        mobileRowSpan: 1,
      },
      {
        columnSpan: 4,
        rowSpan: 3,
        tabletColumnSpan: 6,
        tabletRowSpan: 2,
        mobileColumnSpan: 2,
        mobileRowSpan: 1,
      },
    ],
  };

  const defaultPattern: TilePattern[] = [
    {
      columnSpan: 12,
      rowSpan: 4,
      tabletColumnSpan: 6,
      tabletRowSpan: 4,
      mobileColumnSpan: 2,
      mobileRowSpan: 2,
    },
    {
      columnSpan: 5,
      rowSpan: 3,
      tabletColumnSpan: 3,
      tabletRowSpan: 2,
      mobileColumnSpan: 1,
      mobileRowSpan: 1,
    },
    {
      columnSpan: 3,
      rowSpan: 3,
      tabletColumnSpan: 3,
      tabletRowSpan: 2,
      mobileColumnSpan: 1,
      mobileRowSpan: 1,
    },
    {
      columnSpan: 4,
      rowSpan: 3,
      tabletColumnSpan: 6,
      tabletRowSpan: 2,
      mobileColumnSpan: 2,
      mobileRowSpan: 1,
    },
    {
      columnSpan: 4,
      rowSpan: 2,
      tabletColumnSpan: 3,
      tabletRowSpan: 2,
      mobileColumnSpan: 1,
      mobileRowSpan: 1,
    },
    {
      columnSpan: 4,
      rowSpan: 2,
      tabletColumnSpan: 3,
      tabletRowSpan: 2,
      mobileColumnSpan: 1,
      mobileRowSpan: 1,
    },
  ];

  return toTileStyle(getPattern(presets[total] || defaultPattern, index));
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
