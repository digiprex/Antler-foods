'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { Toaster, toast } from 'react-hot-toast';
import type {
  AddCartItemInput,
  CartItem,
} from '@/features/restaurant-menu/types/restaurant-menu.types';
import { useAnalytics } from '@/lib/analytics';

export const MENU_CART_STORAGE_KEY = 'restaurant-menu-cart-v1';
export const MENU_CART_UPDATED_EVENT = 'restaurant-menu-cart-updated';

interface StoredCartState {
  items?: unknown;
  cartNote?: unknown;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  cartNote: string;
  isHydrated: boolean;
  addItem: (input: AddCartItemInput) => void;
  updateItemQuantity: (key: string, quantity: number) => void;
  updateCartNote: (notes: string) => void;
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

function buildCartToastMessage(input: AddCartItemInput) {
  const quantityLabel = input.quantity > 1 ? `${input.quantity} x ` : '';
  const itemName = input.parentName ? `${input.parentName} — ${input.item.name}` : input.item.name;
  return `${quantityLabel}${itemName} added to cart`;
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

function readStoredCartState() {
  if (typeof window === 'undefined') {
    return {
      items: [] as CartItem[],
      cartNote: '',
    };
  }

  try {
    const raw = window.localStorage.getItem(MENU_CART_STORAGE_KEY);
    if (!raw) {
      return {
        items: [] as CartItem[],
        cartNote: '',
      };
    }

    const parsed = JSON.parse(raw) as StoredCartState;
    const items = Array.isArray(parsed.items) ? parsed.items.filter(isCartItem) : [];
    const cartNote = typeof parsed.cartNote === 'string' ? parsed.cartNote : '';

    return {
      items,
      cartNote,
    };
  } catch {
    return {
      items: [] as CartItem[],
      cartNote: '',
    };
  }
}

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartNote, setCartNote] = useState('');
  const { trackAddToCart } = useAnalytics();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredCartState();
    setItems(stored.items);
    setCartNote(stored.cartNote);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(MENU_CART_STORAGE_KEY, JSON.stringify({ items, cartNote }));
    window.dispatchEvent(
      new CustomEvent(MENU_CART_UPDATED_EVENT, {
        detail: {
          itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        },
      }),
    );
  }, [cartNote, isHydrated, items]);

  const addItem = (input: AddCartItemInput) => {
    const key = buildCartItemKey(input);

    toast.success(buildCartToastMessage(input), {
      id: `cart-${key}`,
      duration: 2200,
    });

    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.key === key);

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
          parentName: input.parentName || undefined,
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

  const updateCartNote = (notes: string) => {
    setCartNote(notes);
  };

  const removeItem = (key: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.key !== key));
  };

  const clearCart = () => {
    setItems([]);
    setCartNote('');
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
    <>
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 2200,
          style: {
            background: '#ffffff',
            color: '#111827',
            border: '1px solid #e7e5e4',
            borderRadius: '9999px',
            boxShadow: '0 16px 36px rgba(15, 23, 42, 0.12)',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '600',
          },
          success: {
            iconTheme: {
              primary: '#111827',
              secondary: '#ffffff',
            },
          },
        }}
      />
      <CartContext.Provider
        value={{
          items,
          itemCount,
          subtotal,
          cartNote,
          isHydrated,
          addItem,
          updateItemQuantity,
          updateCartNote,
          removeItem,
          clearCart,
          getItemQuantity,
        }}
      >
        {children}
      </CartContext.Provider>
    </>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }

  return context;
}
