/**
 * Order and Order Items Type Definitions
 * 
 * TypeScript interfaces for the orders and order_items database tables
 */

export interface Order {
  order_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  customer_id: string;
  location_id: string;
  status: string;
  restaurant_id: string;
  sub_total: number;
  cart_total: number;
  coupon_used?: string | null;
  gift_card_used?: string | null;
  fulfillment_type?: string | null;
  payment_status?: string | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  scheduled_for?: string | null;
  tax_total?: number | null;
  tip_total?: number | null;
  discount_total?: number | null;
  order_note?: string | null;
  delivery_address?: string | null;
  // Structured delivery address fields
  delivery_place_id?: string | null;
  delivery_address_line1?: string | null;
  delivery_address_line2?: string | null;
  delivery_city?: string | null;
  delivery_state?: string | null;
  delivery_postal_code?: string | null;
  delivery_country_code?: string | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  delivery_house_flat_floor?: string | null;
  delivery_landmark?: string | null;
  delivery_instructions?: string | null;
  delivery_address_label?: string | null;
  delivery_address_source?: string | null;
  placed_at?: string | null;
  order_number?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  offer_applied?: OfferApplied | null;
  order_items?: OrderItem[];
}

export interface OfferApplied {
  type: 'auto_offer';
  code?: string | null;
  title: string;
  description?: string | null;
  discountType: 'percent' | 'amount';
  value: number;
  discountAmount: number;
}

export interface OrderItem {
  order_item_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  item_name: string;
  menu_id: string;
  item_id: string;
  order_id: string;
  item_price: number;
  quantity?: number | null;
  line_total?: number | null;
  selected_modifiers?: any | null; // JSONB type
  base_item_price?: number | null;
  modifier_total?: number | null;
  item_note?: string | null;
}

// Order status constants
export const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export type OrderStatus = typeof ORDER_STATUSES[keyof typeof ORDER_STATUSES];

// Payment status constants
export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUSES[keyof typeof PAYMENT_STATUSES];

// Fulfillment type constants
export const FULFILLMENT_TYPES = {
  PICKUP: 'pickup',
  DELIVERY: 'delivery',
  DINE_IN: 'dine_in',
} as const;

export type FulfillmentType = typeof FULFILLMENT_TYPES[keyof typeof FULFILLMENT_TYPES];

// Payment method constants
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  ONLINE: 'online',
  WALLET: 'wallet',
  UPI: 'upi',
  BANK_TRANSFER: 'bank_transfer',
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

// Form interfaces for creating/updating orders
export interface CreateOrderRequest {
  customer_id: string;
  location_id: string;
  restaurant_id: string;
  status: OrderStatus;
  sub_total: number;
  cart_total: number;
  coupon_used?: string;
  gift_card_used?: string;
  fulfillment_type?: FulfillmentType;
  payment_status?: PaymentStatus;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_email?: string;
  contact_phone?: string;
  scheduled_for?: string;
  tax_total?: number;
  tip_total?: number;
  discount_total?: number;
  order_note?: string;
  delivery_address?: string;
  payment_method?: PaymentMethod;
  payment_reference?: string;
  order_items: CreateOrderItemRequest[];
}

export interface CreateOrderItemRequest {
  item_name: string;
  menu_id: string;
  item_id: string;
  item_price: number;
  quantity?: number;
  line_total?: number;
  selected_modifiers?: any;
  base_item_price?: number;
  modifier_total?: number;
  item_note?: string;
}

export interface UpdateOrderRequest {
  order_id: string;
  status?: OrderStatus;
  fulfillment_type?: FulfillmentType;
  payment_status?: PaymentStatus;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_email?: string;
  contact_phone?: string;
  scheduled_for?: string;
  order_note?: string;
  delivery_address?: string;
  payment_method?: PaymentMethod;
  payment_reference?: string;
}

export interface OrdersResponse {
  success: boolean;
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

export interface OrderFilters {
  status?: string;
  payment_status?: string;
  fulfillment_type?: string;
  date_from?: string;
  date_to?: string;
  customer_name?: string;
  order_number?: string;
}

// Helper functions for order management
export const getOrderStatusColor = (status: string): string => {
  switch (status) {
    case ORDER_STATUSES.PENDING:
      return 'bg-yellow-100 text-yellow-800';
    case ORDER_STATUSES.CONFIRMED:
      return 'bg-blue-100 text-blue-800';
    case ORDER_STATUSES.PREPARING:
      return 'bg-orange-100 text-orange-800';
    case ORDER_STATUSES.READY:
      return 'bg-purple-100 text-purple-800';
    case ORDER_STATUSES.OUT_FOR_DELIVERY:
      return 'bg-indigo-100 text-indigo-800';
    case ORDER_STATUSES.DELIVERED:
    case ORDER_STATUSES.COMPLETED:
      return 'bg-green-100 text-green-800';
    case ORDER_STATUSES.CANCELLED:
    case ORDER_STATUSES.REFUNDED:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getPaymentStatusColor = (status: string): string => {
  switch (status) {
    case PAYMENT_STATUSES.PENDING:
    case PAYMENT_STATUSES.PROCESSING:
      return 'bg-yellow-100 text-yellow-800';
    case PAYMENT_STATUSES.PAID:
      return 'bg-green-100 text-green-800';
    case PAYMENT_STATUSES.FAILED:
      return 'bg-red-100 text-red-800';
    case PAYMENT_STATUSES.REFUNDED:
    case PAYMENT_STATUSES.PARTIALLY_REFUNDED:
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const formatOrderTotal = (order: Order): number => {
  return order.cart_total || 0;
};

export const formatOrderItemsCount = (order: Order): number => {
  return order.order_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
};

// Delivery address types
export interface DeliveryAddressInput {
  formattedAddress: string;
  placeId?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  houseFlatFloor?: string;
  landmark?: string;
  instructions?: string;
  label?: string;
  source?: string;
}
