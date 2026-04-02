import 'server-only';

import { randomBytes } from 'crypto';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { evaluateMenuOffers } from '@/features/restaurant-menu/lib/menu-offers';
import { validateMenuCouponCode } from '@/features/restaurant-menu/lib/server/menu-coupons';
import { validateMenuGiftCardCode } from '@/features/restaurant-menu/lib/server/menu-gift-cards';
import { loadActiveMenuOffers } from '@/features/restaurant-menu/lib/server/menu-offers';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_REGEX = /^\+?[0-9()\-\s]{7,20}$/;
const GET_ITEMS_FOR_ORDER = `
  query GetItemsForOrder($item_ids: [uuid!]!) {
    items(
      where: {
        item_id: { _in: $item_ids }
        is_deleted: { _eq: false }
      }
    ) {
      item_id
      name
      pickup_price
      delivery_price
      category_id
      in_stock
      is_available
      modifiers
    }
  }
`;

const GET_CATEGORIES_FOR_ORDER = `
  query GetCategoriesForOrder($category_ids: [uuid!]!) {
    categories(where: { category_id: { _in: $category_ids } }) {
      category_id
      menu_id
    }
  }
`;

const GET_MENUS_FOR_ORDER = `
  query GetMenusForOrder($menu_ids: [uuid!]!, $restaurant_id: uuid!) {
    menu(
      where: {
        menu_id: { _in: $menu_ids }
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
      }
    ) {
      menu_id
      restaurant_id
    }
  }
`;

const GET_MODIFIER_ITEMS_FOR_ORDER = `
  query GetModifierItemsForOrder($modifier_item_ids: [uuid!]!) {
    modifier_items(
      where: {
        modifier_item_id: { _in: $modifier_item_ids }
        is_deleted: { _eq: false }
      }
    ) {
      modifier_item_id
      modifier_group_id
      name
      price
    }
  }
`;

const INSERT_ORDER = `
  mutation InsertOrder($object: orders_insert_input!) {
    insert_orders_one(object: $object) {
      order_id
      order_number
      status
      sub_total
      cart_total
      tax_total
      tip_total
    }
  }
`;

const UPDATE_ORDER_PAYMENT = `
  mutation UpdateOrderPayment($order_id: uuid!, $payment_reference: String!, $payment_method: String!, $payment_status: String!) {
    update_orders_by_pk(
      pk_columns: { order_id: $order_id },
      _set: {
        payment_reference: $payment_reference,
        payment_method: $payment_method,
        payment_status: $payment_status,
      }
    ) {
      order_id
    }
  }
`;

const INSERT_ORDER_ITEMS = `
  mutation InsertOrderItems($objects: [order_items_insert_input!]!) {
    insert_order_items(objects: $objects) {
      affected_rows
      returning {
        order_item_id
        order_id
      }
    }
  }
`;

interface ItemRecord {
  item_id?: string | null;
  name?: string | null;
  pickup_price?: number | string | null;
  delivery_price?: number | string | null;
  category_id?: string | null;
  in_stock?: boolean | null;
  is_available?: boolean | null;
  modifiers?: unknown;
}

interface CategoryRecord {
  category_id?: string | null;
  menu_id?: string | null;
}

interface MenuRecord {
  menu_id?: string | null;
  restaurant_id?: string | null;
}

interface ModifierItemRecord {
  modifier_item_id?: string | null;
  modifier_group_id?: string | null;
  name?: string | null;
  price?: number | string | null;
}

interface InsertOrderRecord {
  order_id?: string | null;
  order_number?: string | null;
  status?: string | null;
  sub_total?: number | string | null;
  cart_total?: number | string | null;
  tax_total?: number | string | null;
  tip_total?: number | string | null;
}

interface GetItemsForOrderResponse {
  items?: ItemRecord[];
}

interface GetCategoriesForOrderResponse {
  categories?: CategoryRecord[];
}

interface GetMenusForOrderResponse {
  menu?: MenuRecord[];
}

interface GetModifierItemsForOrderResponse {
  modifier_items?: ModifierItemRecord[];
}

interface InsertOrderResponse {
  insert_orders_one?: InsertOrderRecord | null;
}

interface InsertOrderItemsResponse {
  insert_order_items?: {
    affected_rows?: number | null;
  } | null;
}

interface OrderContactInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface OrderModifierInput {
  id?: string;
  name?: string;
  price?: number;
  modifierGroupId?: string;
  modifierGroupName?: string;
}

interface OrderCartItemInput {
  key?: string;
  itemId: string;
  name?: string;
  quantity: number;
  basePrice?: number;
  notes?: string;
  selectedAddOns?: OrderModifierInput[];
}

interface DeliveryAddressData {
  formattedAddress?: string;
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

interface PlaceMenuOrderInput {
  customerId: string;
  restaurantId: string;
  locationId?: string | null;
  fulfillmentType: 'pickup' | 'delivery';
  scheduleDayId?: string | null;
  scheduleTime?: string | null;
  deliveryAddress?: string | null;
  deliveryAddressData?: DeliveryAddressData | null;
  contact: OrderContactInput;
  items: OrderCartItemInput[];
  tipAmount?: number;
  deliveryFeeAmount?: number | null;
  deliveryProvider?: string | null;
  deliveryQuote?: string | null;
  deliveryQuoteId?: string | null;
  couponCode?: string | null;
  giftCardCode?: string | null;
  orderNote?: string | null;
}

export interface PlaceMenuOrderResult {
  orderId: string;
  orderNumber: string;
  subtotal: number;
  deliveryFee: number;
  taxTotal: number;
  tipTotal: number;
  discountTotal: number;
  total: number;
  offerApplied: {
    type: 'auto_offer';
    code: string | null;
    title: string;
    description: string | null;
    discountType: 'percent' | 'amount';
    value: number;
    discountAmount: number;
  } | null;
}

interface NormalizedModifier {
  modifierItemId: string;
  modifierGroupId: string | null;
  modifierGroupName: string | null;
  name: string;
  price: number;
}

interface NormalizedCartItem {
  itemId: string;
  name: string | null;
  quantity: number;
  itemNote: string | null;
  selectedAddOns: NormalizedModifier[];
}

interface OrderLineDraft {
  menuId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  baseItemPrice: number;
  modifierTotal: number;
  lineTotal: number;
  itemNote: string | null;
  selectedModifiers: Array<{
    id: string;
    name: string;
    price: number;
    modifierGroupId: string | null;
    modifierGroupName: string | null;
  }>;
}

export class MenuOrderError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function placeMenuOrder(input: PlaceMenuOrderInput): Promise<PlaceMenuOrderResult> {
  const restaurantId = requireUuid(input.restaurantId, 'A valid restaurant id is required.');
  const customerId = requireUuid(input.customerId, 'A valid customer session is required.');
  const locationId = normalizeUuid(input.locationId) || restaurantId;
  const fulfillmentType = requireFulfillmentType(input.fulfillmentType);
  const contact = normalizeContact(input.contact);
  const items = normalizeCartItems(input.items);
  const tipAmount = nonNegativeCurrency(input.tipAmount ?? 0, 'Tip amount is invalid.');
  const deliveryFeeAmount = nonNegativeCurrency(
    input.deliveryFeeAmount ?? 0,
    'Delivery fee amount is invalid.',
  );
  const orderNote = trimText(input.orderNote);
  const deliveryAddress = trimText(input.deliveryAddress);
  const placedAt = new Date();
  const deliveryProvider =
    fulfillmentType === 'delivery' ? trimText(input.deliveryProvider) : null;
  const deliveryQuote =
    fulfillmentType === 'delivery' ? trimText(input.deliveryQuote) : null;
  const deliveryQuoteId =
    fulfillmentType === 'delivery' ? trimText(input.deliveryQuoteId) : null;
  const scheduledFor = resolveScheduledFor(input.scheduleDayId, input.scheduleTime, placedAt);

  if (fulfillmentType === 'delivery' && !deliveryAddress) {
    throw new MenuOrderError(400, 'Delivery address is required for delivery orders.');
  }

  const itemIds = Array.from(new Set(items.map((item) => item.itemId)));
  const itemData = await adminGraphqlRequest<GetItemsForOrderResponse>(GET_ITEMS_FOR_ORDER, {
    item_ids: itemIds,
  });

  const itemRecords = Array.isArray(itemData.items) ? itemData.items : [];
  if (itemRecords.length !== itemIds.length) {
    throw new MenuOrderError(400, 'One or more cart items are no longer available.');
  }

  const itemMap = new Map<string, ItemRecord>();
  for (const record of itemRecords) {
    const itemId = trimText(record.item_id);
    if (itemId) {
      itemMap.set(itemId, record);
    }
  }

  const categoryIds = Array.from(
    new Set(
      itemRecords
        .map((record) => trimText(record.category_id))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const categoryData = await adminGraphqlRequest<GetCategoriesForOrderResponse>(GET_CATEGORIES_FOR_ORDER, {
    category_ids: categoryIds,
  });
  const categoryRecords = Array.isArray(categoryData.categories) ? categoryData.categories : [];
  const categoryMenuMap = new Map<string, string>();
  for (const record of categoryRecords) {
    const categoryId = trimText(record.category_id);
    const menuId = trimText(record.menu_id);
    if (categoryId && menuId) {
      categoryMenuMap.set(categoryId, menuId);
    }
  }

  const menuIds = Array.from(new Set(Array.from(categoryMenuMap.values())));
  const menuData = await adminGraphqlRequest<GetMenusForOrderResponse>(GET_MENUS_FOR_ORDER, {
    menu_ids: menuIds,
    restaurant_id: restaurantId,
  });
  const menuRecords = Array.isArray(menuData.menu) ? menuData.menu : [];
  const allowedMenuIds = new Set(
    menuRecords
      .map((record) => trimText(record.menu_id))
      .filter((value): value is string => Boolean(value)),
  );

  const modifierIds = Array.from(
    new Set(
      items.flatMap((item) => item.selectedAddOns.map((addOn) => addOn.modifierItemId)),
    ),
  );

  const modifierItemMap = new Map<string, ModifierItemRecord>();
  if (modifierIds.length) {
    const modifierData = await adminGraphqlRequest<GetModifierItemsForOrderResponse>(
      GET_MODIFIER_ITEMS_FOR_ORDER,
      {
        modifier_item_ids: modifierIds,
      },
    );

    for (const record of Array.isArray(modifierData.modifier_items) ? modifierData.modifier_items : []) {
      const modifierItemId = trimText(record.modifier_item_id);
      if (modifierItemId) {
        modifierItemMap.set(modifierItemId, record);
      }
    }
  }

  const lineItems: OrderLineDraft[] = items.map((cartItem) => {
    const itemRecord = itemMap.get(cartItem.itemId);
    if (!itemRecord) {
      throw new MenuOrderError(400, 'One or more cart items are no longer available.');
    }

    if (itemRecord.in_stock === false || itemRecord.is_available === false) {
      throw new MenuOrderError(400, `${trimText(itemRecord.name) || 'An item'} is currently unavailable.`);
    }

    const categoryId = trimText(itemRecord.category_id);
    const menuId = categoryId ? categoryMenuMap.get(categoryId) : null;
    if (!menuId || !allowedMenuIds.has(menuId)) {
      throw new MenuOrderError(400, 'One or more cart items do not belong to this restaurant.');
    }

    const allowedModifierGroupIds = new Set(modifierGroupIdsFromValue(itemRecord.modifiers));
    const selectedModifiers = cartItem.selectedAddOns.map((selectedModifier) => {
      const modifierRecord = modifierItemMap.get(selectedModifier.modifierItemId);
      if (!modifierRecord) {
        throw new MenuOrderError(400, 'One or more selected modifiers are no longer available.');
      }

      const modifierGroupId = trimText(modifierRecord.modifier_group_id);
      if (modifierGroupId && allowedModifierGroupIds.size && !allowedModifierGroupIds.has(modifierGroupId)) {
        throw new MenuOrderError(400, `${selectedModifier.name} is not valid for this menu item.`);
      }

      return {
        id: selectedModifier.modifierItemId,
        name: trimText(modifierRecord.name) || selectedModifier.name || 'Option',
        price: currency(modifierRecord.price),
        modifierGroupId,
        modifierGroupName: selectedModifier.modifierGroupName,
      };
    });

    const baseItemPrice = resolveBaseItemPrice(itemRecord, fulfillmentType);
    const modifierTotal = roundCurrency(
      selectedModifiers.reduce((sum, modifier) => sum + modifier.price, 0),
    );
    const lineTotal = roundCurrency((baseItemPrice + modifierTotal) * cartItem.quantity);

    return {
      menuId,
      itemId: cartItem.itemId,
      itemName: trimText(itemRecord.name) || cartItem.name || 'Menu Item',
      quantity: cartItem.quantity,
      baseItemPrice,
      modifierTotal,
      lineTotal,
      itemNote: cartItem.itemNote,
      selectedModifiers,
    };
  });

  const subtotal = roundCurrency(lineItems.reduce((sum, lineItem) => sum + lineItem.lineTotal, 0));
  const offerCartLines = lineItems.map((lineItem) => ({
    itemId: lineItem.itemId,
    name: lineItem.itemName,
    quantity: lineItem.quantity,
    unitPrice: roundCurrency(lineItem.baseItemPrice + lineItem.modifierTotal),
  }));
  let appliedCoupon = null;
  let appliedAutoOffer = null;
  let giftCardAppliedAmount = 0;

  if (trimText(input.couponCode)) {
    try {
      appliedCoupon = await validateMenuCouponCode({
        restaurantId,
        subtotal,
        code: input.couponCode,
      });
    } catch (error) {
      throw new MenuOrderError(
        400,
        error instanceof Error
          ? error.message
          : 'This coupon is not valid for the current order.',
      );
    }
  }

  if (!appliedCoupon) {
    const activeOffers = await loadActiveMenuOffers(restaurantId);
    appliedAutoOffer = evaluateMenuOffers({
      offers: activeOffers,
      cartLines: offerCartLines,
    }).bestOffer;
  }

  const offerApplied = appliedAutoOffer
    ? {
        type: 'auto_offer' as const,
        code: null,
        title: appliedAutoOffer.offerName || appliedAutoOffer.headline,
        description: appliedAutoOffer.description || null,
        discountType: 'amount' as const,
        value: appliedAutoOffer.discountAmount,
        discountAmount: appliedAutoOffer.discountAmount,
      }
    : null;

  const orderDiscountTotal =
    appliedCoupon?.discountAmount || appliedAutoOffer?.discountAmount || 0;
  const preGiftCardTotal = roundCurrency(
    subtotal + deliveryFeeAmount + tipAmount - orderDiscountTotal,
  );

  // Only store auto offers in offer_applied (not coupons or gift cards)
  const storedOfferApplied = appliedAutoOffer
    ? {
        type: 'auto_offer' as const,
        code: null,
        title: appliedAutoOffer.offerName || appliedAutoOffer.headline,
        description: appliedAutoOffer.description || null,
        discountType: 'amount' as const,
        value: appliedAutoOffer.discountAmount,
        discountAmount: appliedAutoOffer.discountAmount,
      }
    : null;

  if (trimText(input.giftCardCode)) {
    try {
      const giftCard = await validateMenuGiftCardCode({
        restaurantId,
        email: contact.email,
        code: input.giftCardCode,
      });
      giftCardAppliedAmount = roundCurrency(
        Math.min(giftCard.currentBalance, Math.max(preGiftCardTotal, 0)),
      );
    } catch (error) {
      throw new MenuOrderError(
        400,
        error instanceof Error
          ? error.message
          : 'This gift card is not valid for the current order.',
      );
    }
  }

  const discountTotal = roundCurrency(orderDiscountTotal + giftCardAppliedAmount);
  const taxTotal = 0;
  const total = roundCurrency(Math.max(preGiftCardTotal - giftCardAppliedAmount, 0));
  const orderNumber = buildOrderNumber(placedAt);

  const deliveryData = input.deliveryAddressData;
  const orderData = await adminGraphqlRequest<InsertOrderResponse>(INSERT_ORDER, {
    object: {
      customer_id: customerId,
      location_id: locationId,
      restaurant_id: restaurantId,
      status: 'pending',
      sub_total: subtotal,
      cart_total: total,
      coupon_used: appliedCoupon?.code || null,
      gift_card_used: giftCardAppliedAmount > 0 ? trimText(input.giftCardCode) : null,
      // Only persist auto offer metadata (not coupons or gift cards)
      offer_applied: storedOfferApplied ? JSON.stringify(storedOfferApplied) : null,
      fulfillment_type: fulfillmentType,
      payment_status: 'processing',
      contact_first_name: contact.firstName,
      contact_last_name: contact.lastName,
      contact_email: contact.email,
      contact_phone: contact.phone,
      scheduled_for: scheduledFor,
      tax_total: taxTotal,
      tip_total: tipAmount,
      discount_total: discountTotal,
      order_note: orderNote,
      delivery_address: fulfillmentType === 'delivery' ? deliveryAddress : null,
      // Structured delivery address fields
      delivery_place_id: fulfillmentType === 'delivery' && deliveryData?.placeId ? deliveryData.placeId : null,
      delivery_address_line1: fulfillmentType === 'delivery' && deliveryData?.addressLine1 ? deliveryData.addressLine1 : null,
      delivery_address_line2: fulfillmentType === 'delivery' && deliveryData?.addressLine2 ? deliveryData.addressLine2 : null,
      delivery_city: fulfillmentType === 'delivery' && deliveryData?.city ? deliveryData.city : null,
      delivery_state: fulfillmentType === 'delivery' && deliveryData?.state ? deliveryData.state : null,
      delivery_postal_code: fulfillmentType === 'delivery' && deliveryData?.postalCode ? deliveryData.postalCode : null,
      delivery_country_code: fulfillmentType === 'delivery' && deliveryData?.countryCode ? deliveryData.countryCode : null,
      delivery_latitude:
        fulfillmentType === 'delivery' && typeof deliveryData?.latitude === 'number'
          ? deliveryData.latitude
          : null,
      delivery_longitude:
        fulfillmentType === 'delivery' && typeof deliveryData?.longitude === 'number'
          ? deliveryData.longitude
          : null,
      delivery_house_flat_floor: fulfillmentType === 'delivery' && deliveryData?.houseFlatFloor ? deliveryData.houseFlatFloor : null,
      delivery_landmark: fulfillmentType === 'delivery' && deliveryData?.landmark ? deliveryData.landmark : null,
      delivery_instructions: fulfillmentType === 'delivery' && deliveryData?.instructions ? deliveryData.instructions : null,
      delivery_address_label: fulfillmentType === 'delivery' && deliveryData?.label ? deliveryData.label : null,
      delivery_address_source: fulfillmentType === 'delivery' && deliveryData?.source ? deliveryData.source : null,
      delivery_provider: deliveryProvider,
      delivery_dispatch_status:
        fulfillmentType === 'delivery' && deliveryProvider ? 'pending_ready' : null,
      delivery_quote: deliveryQuote,
      delivery_quote_id: deliveryQuoteId,
      placed_at: placedAt.toISOString(),
      order_number: orderNumber,
    },
  });

  const orderId = trimText(orderData.insert_orders_one?.order_id);
  if (!orderId) {
    throw new MenuOrderError(500, 'Order creation did not return an order id.');
  }

  const insertOrderItemsData = await adminGraphqlRequest<InsertOrderItemsResponse>(INSERT_ORDER_ITEMS, {
    objects: lineItems.map((lineItem) => ({
      order_id: orderId,
      menu_id: lineItem.menuId,
      item_id: lineItem.itemId,
      item_name: lineItem.itemName,
      item_price: lineItem.baseItemPrice + lineItem.modifierTotal,
      quantity: lineItem.quantity,
      line_total: lineItem.lineTotal,
      selected_modifiers: lineItem.selectedModifiers,
      base_item_price: lineItem.baseItemPrice,
      modifier_total: lineItem.modifierTotal,
      item_note: lineItem.itemNote,
    })),
  });

  if (!insertOrderItemsData.insert_order_items?.affected_rows) {
    throw new MenuOrderError(500, 'Order items could not be created.');
  }

  return {
    orderId,
    orderNumber,
    subtotal,
    deliveryFee: deliveryFeeAmount,
    taxTotal,
    tipTotal: tipAmount,
    discountTotal,
    total,
    offerApplied,
  };
}

export async function updateOrderPaymentIntent(
  orderId: string,
  paymentIntentId: string,
): Promise<void> {
  await adminGraphqlRequest(UPDATE_ORDER_PAYMENT, {
    order_id: orderId,
    payment_reference: paymentIntentId,
    payment_method: 'card',
    payment_status: 'processing',
  });
}

function normalizeContact(contact: OrderContactInput) {
  const firstName = requireName(contact.firstName, 'First name is required.');
  const lastName = requireName(contact.lastName, 'Last name is required.');
  const email = requireEmail(contact.email);
  const phone = requirePhone(contact.phone);

  return {
    firstName,
    lastName,
    email,
    phone,
  };
}

function normalizeCartItems(items: OrderCartItemInput[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new MenuOrderError(400, 'Your cart is empty.');
  }

  return items.map((item) => {
    const itemId = requireUuid(item.itemId, 'A valid menu item is required.');
    const quantity = requireQuantity(item.quantity);
    const itemNote = trimText(item.notes);
    const selectedAddOns = Array.isArray(item.selectedAddOns)
      ? item.selectedAddOns.map((addOn) => ({
          modifierItemId: requireUuid(addOn.id || '', 'A valid modifier item is required.'),
          modifierGroupId: normalizeUuid(addOn.modifierGroupId),
          modifierGroupName: trimText(addOn.modifierGroupName),
          name: trimText(addOn.name) || 'Option',
          price: currency(addOn.price),
        }))
      : [];

    return {
      itemId,
      name: trimText(item.name),
      quantity,
      itemNote,
      selectedAddOns,
    } satisfies NormalizedCartItem;
  });
}

function resolveBaseItemPrice(record: ItemRecord, fulfillmentType: 'pickup' | 'delivery') {
  const pickupPrice = currency(record.pickup_price);
  const deliveryPrice = currency(record.delivery_price);
  if (fulfillmentType === 'delivery') {
    return deliveryPrice > 0 ? deliveryPrice : pickupPrice;
  }
  return pickupPrice > 0 ? pickupPrice : deliveryPrice;
}

function modifierGroupIdsFromValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => trimText(entry)).filter((entry): entry is string => Boolean(entry));
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.modifier_group_ids)) {
      return record.modifier_group_ids
        .map((entry) => trimText(entry))
        .filter((entry): entry is string => Boolean(entry));
    }

    return Object.entries(record)
      .filter(([, candidate]) => candidate === true || candidate === 'true')
      .map(([key]) => trimText(key))
      .filter((entry): entry is string => Boolean(entry));
  }

  const singleValue = trimText(value);
  return singleValue ? [singleValue] : [];
}

function resolveScheduledFor(scheduleDayId: string | null | undefined, scheduleTime: string | null | undefined, placedAt: Date) {
  const dayId = trimText(scheduleDayId);
  const timeValue = trimText(scheduleTime);

  if (!dayId || !timeValue || timeValue.toUpperCase() === 'ASAP') {
    return placedAt.toISOString();
  }

  const dayMatch = dayId.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = timeValue.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!dayMatch || !timeMatch) {
    return placedAt.toISOString();
  }

  const year = Number(dayMatch[1]);
  const month = Number(dayMatch[2]) - 1;
  const day = Number(dayMatch[3]);
  const rawHour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const meridiem = timeMatch[3].toLowerCase();
  const hour = rawHour % 12 + (meridiem === 'pm' ? 12 : 0);

  return new Date(year, month, day, hour, minute, 0, 0).toISOString();
}

function buildOrderNumber(now: Date) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const suffix = randomBytes(2).toString('hex').toUpperCase();
  return `ORD-${year}${month}${day}-${hours}${minutes}-${suffix}`;
}

function requireFulfillmentType(value: string) {
  if (value === 'pickup' || value === 'delivery') {
    return value;
  }

  throw new MenuOrderError(400, 'A valid fulfillment type is required.');
}

function requireUuid(value: string | null | undefined, message: string) {
  const normalized = trimText(value);
  if (!normalized || !UUID_REGEX.test(normalized)) {
    throw new MenuOrderError(400, message);
  }
  return normalized;
}

function normalizeUuid(value: string | null | undefined) {
  const normalized = trimText(value);
  return normalized && UUID_REGEX.test(normalized) ? normalized : null;
}

function requireEmail(value: string) {
  const normalized = trimText(value)?.toLowerCase();
  if (!normalized || !EMAIL_REGEX.test(normalized)) {
    throw new MenuOrderError(400, 'Enter a valid email address.');
  }
  return normalized;
}

function requirePhone(value: string) {
  const normalized = trimText(value);
  if (!normalized || !PHONE_REGEX.test(normalized)) {
    throw new MenuOrderError(400, 'Enter a valid phone number.');
  }
  return normalized;
}

function requireName(value: string, message: string) {
  const normalized = trimText(value);
  if (!normalized) {
    throw new MenuOrderError(400, message);
  }
  return normalized;
}

function requireQuantity(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new MenuOrderError(400, 'Each item quantity must be at least 1.');
  }
  return value;
}

function nonNegativeCurrency(value: number, message: string) {
  const normalized = currency(value);
  if (normalized < 0) {
    throw new MenuOrderError(400, message);
  }
  return normalized;
}

function currency(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return roundCurrency(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return roundCurrency(parsed);
    }
  }

  return 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function trimText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}




