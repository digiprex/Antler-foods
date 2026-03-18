'use client';

import { useEffect, useRef, useState } from 'react';

export function useActiveCategory(categoryIds: string[]) {
  const [activeCategoryId, setActiveCategoryId] = useState(categoryIds[0] || '');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    setActiveCategoryId(categoryIds[0] || '');
  }, [categoryIds.join('|')]);

  useEffect(() => {
    if (!categoryIds.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) =>
              Math.abs(left.boundingClientRect.top) -
              Math.abs(right.boundingClientRect.top),
          )[0];

        if (visibleEntry) {
          setActiveCategoryId(visibleEntry.target.id.replace('menu-section-', ''));
        }
      },
      {
        rootMargin: '-220px 0px -55% 0px',
        threshold: [0.1, 0.35, 0.6],
      },
    );

    categoryIds.forEach((id) => {
      const element = sectionRefs.current[id];

      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [categoryIds.join('|')]);

  return {
    activeCategoryId,
    setActiveCategoryId,
    registerSectionRef: (categoryId: string) => (element: HTMLElement | null) => {
      sectionRefs.current[categoryId] = element;
    },
    scrollToCategory: (categoryId: string) => {
      const element = sectionRefs.current[categoryId];

      if (!element) {
        return;
      }

      setActiveCategoryId(categoryId);
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    },
  };
}
