'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MenuCustomerProfile } from '@/features/restaurant-menu/lib/customer-profile';

interface MenuCustomerSessionResponse {
  authenticated?: boolean;
  customer?: MenuCustomerProfile | null;
}

export function useMenuCustomerAuth(restaurantId?: string | null) {
  const [customerProfile, setCustomerProfile] =
    useState<MenuCustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!restaurantId) {
        setCustomerProfile(null);
        setIsLoading(false);
        return null;
      }

      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/menu-auth/session?restaurantId=${encodeURIComponent(restaurantId)}`,
          {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            signal,
          },
        );

        const payload = (await response.json().catch(() => null)) as
          | MenuCustomerSessionResponse
          | null;
        const nextCustomer = response.ok && payload?.authenticated
          ? payload.customer || null
          : null;

        setCustomerProfile(nextCustomer);
        return nextCustomer;
      } catch (error) {
        if (signal?.aborted) {
          return null;
        }

        console.error('[Menu Auth] Failed to refresh customer session:', error);
        setCustomerProfile(null);
        return null;
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [restaurantId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const applyCustomerProfile = useCallback((customer: MenuCustomerProfile | null) => {
    setCustomerProfile(customer);
  }, []);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/menu-auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
      setCustomerProfile(null);
    } finally {
      setIsLoggingOut(false);
    }
  }, []);

  return {
    customerProfile,
    hasCustomerSession: Boolean(customerProfile),
    isGuestCustomer: customerProfile?.isGuest === true,
    isLoading,
    isLoggingOut,
    applyCustomerProfile,
    refresh,
    logout,
  };
}
