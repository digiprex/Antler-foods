'use client';

import { useCart } from '@/features/restaurant-menu/context/cart-context';

export function useMenuCart() {
  return useCart();
}
