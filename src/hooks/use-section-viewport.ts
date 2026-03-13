'use client';

import { useEffect, useState } from 'react';
import type { SectionViewport } from '@/lib/section-style';

export function useSectionViewport(previewViewport?: SectionViewport) {
  const [viewport, setViewport] = useState<SectionViewport>(
    previewViewport || 'desktop',
  );

  useEffect(() => {
    if (previewViewport) {
      setViewport(previewViewport);
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const applyViewport = () => {
      setViewport(mediaQuery.matches ? 'mobile' : 'desktop');
    };

    applyViewport();
    mediaQuery.addEventListener('change', applyViewport);

    return () => mediaQuery.removeEventListener('change', applyViewport);
  }, [previewViewport]);

  return viewport;
}
