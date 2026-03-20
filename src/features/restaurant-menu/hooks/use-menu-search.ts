'use client';

import { useDeferredValue, useState } from 'react';
import { filterCategoriesByQuery } from '@/features/restaurant-menu/lib/menu-selectors';
import type { MenuCategory } from '@/features/restaurant-menu/types/restaurant-menu.types';

export function useMenuSearch(categories: MenuCategory[]) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const filteredCategories = filterCategoriesByQuery(categories, deferredQuery);

  return {
    query,
    setQuery,
    filteredCategories,
  };
}
