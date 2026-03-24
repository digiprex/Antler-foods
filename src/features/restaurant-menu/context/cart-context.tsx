'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import type {
  AddCartItemInput,
  CartItem,
} from '@/features/restaurant-menu/types/restaurant-menu.types';

export const MENU_CART_STORAGE_KEY = 'restaurant-menu-cart-v1';
export const MENU_CART_UPDATED_EVENT = 'restaurant-menu-cart-updated';

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isHydrated: boolean;
  addItem: (input: AddCartItemInput) => void;
  updateItemQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  getItemQuantity: (itemId: string) => number;
}

const CartContext = createContext<CartContextValue | null>(null);

function buildCartItemKey(input: AddCartItemInput) {
  const addOnIds = (input.selectedAddOns || [])
    .map((addOn) => addOn.id)
    .sort()
    .join(',');
  const notes = input.notes?.trim() || '';

  return `${input.item.id}::${input.item.price}::${addOnIds}::${notes}`;
}

function getCartItemTotal(item: CartItem) {
  const addOnTotal = item.selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
  return (item.basePrice + addOnTotal) * item.quantity;
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as CartItem;
  return (
    typeof candidate.key === 'string' &&
    typeof candidate.itemId === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.quantity === 'number' &&
    typeof candidate.basePrice === 'number' &&
    typeof candidate.image === 'string' &&
    typeof candidate.notes === 'string' &&
    Array.isArray(candidate.selectedAddOns)
  );
}

function readStoredItems() {
  if (typeof window === 'undefined') {
    return [] as CartItem[];
  }

  try {
    const raw = window.localStorage.getItem(MENU_CART_STORAGE_KEY);
    if (!raw) {
      return [] as CartItem[];
    }

    const parsed = JSON.parse(raw) as { items?: unknown };
    if (!Array.isArray(parsed.items)) {
      return [] as CartItem[];
    }

    return parsed.items.filter(isCartItem);
  } catch {
    return [] as CartItem[];
  }
}

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setItems(readStoredItems());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(MENU_CART_STORAGE_KEY, JSON.stringify({ items }));
    window.dispatchEvent(
      new CustomEvent(MENU_CART_UPDATED_EVENT, {
        detail: {
          itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        },
      }),
    );
  }, [isHydrated, items]);

  const addItem = (input: AddCartItemInput) => {
    const key = buildCartItemKey(input);

    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.key === key);

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

  const updateItemQuantity = (key: string, quantity: number) => {
    setItems((currentItems) => {
      if (quantity <= 0) {
        return currentItems.filter((item) => item.key !== key);
      }

      return currentItems.map((item) =>
        item.key === key
          ? {
              ...item,
              quantity,
            }
          : item,
      );
    });
  };

  const removeItem = (key: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.key !== key));
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + getCartItemTotal(item), 0);

  const getItemQuantity = (itemId: string) => {
    return items.reduce(
      (sum, item) => (item.itemId === itemId ? sum + item.quantity : sum),
      0,
    );
  };

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        isHydrated,
        addItem,
        updateItemQuantity,
        removeItem,
        clearCart,
        getItemQuantity,
      }}
    >
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