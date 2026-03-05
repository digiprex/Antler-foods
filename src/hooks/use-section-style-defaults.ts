'use client';

import { useMemo } from 'react';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import { getSectionStyleDefaults } from '@/lib/section-style';

export function useSectionStyleDefaults(restaurantId?: string | null) {
  const trimmedRestaurantId = restaurantId?.trim() || '';
  const apiEndpoint = trimmedRestaurantId
    ? `/api/global-style-config?restaurant_id=${encodeURIComponent(trimmedRestaurantId)}`
    : undefined;

  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: apiEndpoint || '/api/global-style-config',
    fetchOnMount: Boolean(apiEndpoint),
  });

  return useMemo(
    () => getSectionStyleDefaults(globalStyles),
    [globalStyles],
  );
}
