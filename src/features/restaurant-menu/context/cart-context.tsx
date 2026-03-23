'use client';

import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from 'react';
import type {
  AddCartItemInput,
  CartItem,
} from '@/features/restaurant-menu/types/restaurant-menu.types';
import { useAnalytics } from '@/lib/analytics';

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  addItem: (input: AddCartItemInput) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function buildCartItemKey(input: AddCartItemInput) {
  const addOnIds = (input.selectedAddOns || [])
    .map((addOn) => addOn.id)
    .sort()
    .join(',');
  const notes = input.notes?.trim() || '';

  return `${input.item.id}::${addOnIds}::${notes}`;
}

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { trackAddToCart } = useAnalytics();

  const addItem = (input: AddCartItemInput) => {
    const key = buildCartItemKey(input);

    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.key === key);

      // Track analytics event for add to cart
      trackAddToCart({
        item_name: input.item.name,
        item_id: input.item.id,
        price: input.item.price,
        quantity: input.quantity,
        category: input.item.categoryId || 'menu_item',
      });

      if (existingItem) {
        return currentItems.map((item) =>
          item.key === key
            ? {
                ...item,
                quantity: item.quantity + input.quantity,
              }
            : item,
        );
      }

      return [
        ...currentItems,
        {
          key,
          itemId: input.item.id,
          name: input.item.name,
          quantity: input.quantity,
          basePrice: input.item.price,
          image: input.item.image,
          notes: input.notes?.trim() || '',
          selectedAddOns: input.selectedAddOns || [],
        },
      ];
    });
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, itemCount, addItem }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }

  return context;
}
