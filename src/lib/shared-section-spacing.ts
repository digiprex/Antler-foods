import type { CSSProperties } from 'react';
import type { SectionViewport } from '@/lib/section-style';

export interface SharedSectionSpacing {
  sectionPadding: string;
  sectionGap: string;
}

export function resolveSharedSectionSpacing(
  viewport: SectionViewport | 'desktop' | 'mobile',
): SharedSectionSpacing {
  if (viewport === 'mobile') {
    return {
      sectionPadding: '2rem',
      sectionGap: '1rem',
    };
  }

  return {
    sectionPadding: '5rem',
    sectionGap: '2rem',
  };
}

export function removeSectionContentWidth(
  contentStyle?: CSSProperties,
): CSSProperties {
  return {
    ...(contentStyle || {}),
    width: undefined,
    maxWidth: undefined,
    marginInline: undefined,
  };
}

