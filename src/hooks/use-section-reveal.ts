'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { SectionScrollRevealAnimation } from '@/types/section-style.types';

interface UseSectionRevealOptions {
  enabled?: boolean;
  animation?: SectionScrollRevealAnimation;
  isPreview?: boolean;
}

function getHiddenState(animation: SectionScrollRevealAnimation): CSSProperties {
  switch (animation) {
    case 'fade':
      return {
        opacity: 0,
      };
    case 'slide-up':
      return {
        opacity: 0,
        transform: 'translate3d(0, 30px, 0)',
      };
    case 'soft-reveal':
      return {
        opacity: 0,
        transform: 'translate3d(0, 20px, 0) scale(0.985)',
        filter: 'blur(10px)',
      };
    case 'fade-up':
    default:
      return {
        opacity: 0,
        transform: 'translate3d(0, 18px, 0)',
      };
  }
}

export function useSectionReveal({
  enabled = false,
  animation = 'fade-up',
  isPreview = false,
}: UseSectionRevealOptions) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true);
      return;
    }

    setIsVisible(false);

    if (isPreview) {
      const frame = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });

      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    const element = ref.current;
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [animation, enabled, isPreview]);

  const style = useMemo<CSSProperties>(() => {
    if (!enabled) {
      return {};
    }

    return {
      ...(isVisible ? { opacity: 1, transform: 'translate3d(0, 0, 0)', filter: 'blur(0px)' } : getHiddenState(animation)),
      transition:
        animation === 'soft-reveal'
          ? 'opacity 720ms cubic-bezier(0.22, 1, 0.36, 1), transform 720ms cubic-bezier(0.22, 1, 0.36, 1), filter 720ms cubic-bezier(0.22, 1, 0.36, 1)'
          : 'opacity 560ms cubic-bezier(0.22, 1, 0.36, 1), transform 560ms cubic-bezier(0.22, 1, 0.36, 1), filter 560ms cubic-bezier(0.22, 1, 0.36, 1)',
      willChange: 'opacity, transform, filter',
    };
  }, [animation, enabled, isVisible]);

  return {
    ref,
    isVisible,
    style,
  };
}
