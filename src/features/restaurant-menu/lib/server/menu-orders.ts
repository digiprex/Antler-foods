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
      parent_item_id
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

const GET_RESTAURANT_TAX_RATE = `
  query GetRestaurantTaxRate($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      transaction_tax_rate
      service_fee_capped_at
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
      service_fee
      tip_total
      delivery_fee_total
      restaurant_payout_amount
      payout_status
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

const UPDATE_DELIVERY_QUOTE_CUSTOMER = `
  mutation UpdateDeliveryQuoteCustomer($delivery_quote_id: uuid!, $customer_id: uuid!) {
    update_delivery_quotes_by_pk(
      pk_columns: { delivery_quote_id: $delivery_quote_id },
      _set: { customer_id: $customer_id }
    ) {
      delivery_quote_id
    }
  }
`;

const INSERT_CUSTOMER_DELIVERY_ADDRESS = `
  mutation InsertCustomerDeliveryAddress($object: customer_delivery_addresses_insert_input!) {
    insert_customer_delivery_addresses_one(object: $object) {
      id
    }
  }
`;

const GET_LOYALTY_SETTINGS_FOR_ORDER = `
  query GetLoyaltySettingsForOrder($restaurant_id: uuid!) {
    loyalty_settings(where: { restaurant_id: { _eq: $restaurant_id }, is_enabled: { _eq: true } }, limit: 1) {
      id
      points_per_dollar
      redemption_rate
      min_redemption_points
      max_redemption_percentage
      welcome_bonus_points
    }
  }
`;

const INSERT_LOYALTY_BALANCE = `
  mutation InsertLoyaltyBalance($object: loyalty_balances_insert_input!) {
    insert_loyalty_balances_one(object: $object) {
      id
      points_balance
    }
  }
`;

const UPDATE_LOYALTY_BALANCE = `
  mutation UpdateLoyaltyBalance($id: uuid!, $changes: loyalty_balances_set_input!) {
    update_loyalty_balances_by_pk(pk_columns: { id: $id }, _set: $changes) {
      id
      points_balance
    }
  }
`;

const INSERT_LOYALTY_TRANSACTION = `
  mutation InsertLoyaltyTransaction($object: loyalty_transactions_insert_input!) {
    insert_loyalty_transactions_one(object: $object) {
      id
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
  parent_item_id?: string | null;
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
  service_fee?: number | string | null;
  tip_total?: number | string | null;
  delivery_fee_total?: number | string | null;
  restaurant_payout_amount?: number | string | null;
  payout_status?: string | null;
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
  paymentMethod?: 'card' | 'cash';
  loyaltyPointsToRedeem?: number;
}

export interface PlaceMenuOrderResult {
  orderId: string;
  orderNumber: string;
  subtotal: number;
  deliveryFee: number;
  taxTotal: number;
  tipTotal: number;
  discountTotal: number;
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;
  loyaltyDiscount: number;
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
  const paymentMethod = input.paymentMethod === 'cash' ? 'cash' : 'card';
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

  // Fetch parent items for variants so we can build "Parent — Variant" names
  const parentIds = Array.from(new Set(
    itemRecords
      .map((record) => trimText(record.parent_item_id))
      .filter((id): id is string => Boolean(id))
      .filter((id) => !itemMap.has(id)),
  ));
  if (parentIds.length > 0) {
    const parentData = await adminGraphqlRequest<GetItemsForOrderResponse>(GET_ITEMS_FOR_ORDER, {
      item_ids: parentIds,
    });
    for (const record of Array.isArray(parentData.items) ? parentData.items : []) {
      const itemId = trimText(record.item_id);
      if (itemId) {
        itemMap.set(itemId, record);
      }
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
      itemName: (() => {
        const variantName = trimText(itemRecord.name) || cartItem.name || 'Menu Item';
        const parentId = trimText(itemRecord.parent_item_id);
        if (parentId) {
          const parentRecord = itemMap.get(parentId);
          const parentName = parentRecord ? trimText(parentRecord.name) : null;
          if (parentName && parentName !== variantName) {
            return `${parentName} — ${variantName}`;
          }
        }
        return variantName;
      })(),
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

  const taxRateData = await adminGraphqlRequest<{ restaurants_by_pk: { transaction_tax_rate?: number | null; service_fee_capped_at?: number | null } | null }>(
    GET_RESTAURANT_TAX_RATE,
    { restaurant_id: restaurantId },
  );
  const taxRate = typeof taxRateData.restaurants_by_pk?.transaction_tax_rate === 'number'
    ? taxRateData.restaurants_by_pk.transaction_tax_rate
    : 0;
  const serviceFeeCap = typeof taxRateData.restaurants_by_pk?.service_fee_capped_at === 'number'
    ? taxRateData.restaurants_by_pk.service_fee_capped_at
    : 100;
  const taxTotal = taxRate > 0
    ? roundCurrency(Math.min(subtotal * (taxRate / 100), serviceFeeCap > 0 ? serviceFeeCap : Infinity))
    : 0;
  // --- Loyalty points redemption ---
  interface LoyaltySettingsRow {
    points_per_dollar?: number | string;
    redemption_rate?: number | string;
    min_redemption_points?: number | string;
    max_redemption_percentage?: number | string;
    welcome_bonus_points?: number | string;
  }
  interface LoyaltyBalanceRow {
    id?: string;
    points_balance?: number | string;
    lifetime_earned?: number | string;
    lifetime_redeemed?: number | string;
  }
  let loyaltyPointsRedeemed = 0;
  let loyaltyDiscount = 0;
  let loyaltySettings: LoyaltySettingsRow | null = null;
  let existingBalance: LoyaltyBalanceRow | null = null;

  try {
    const loyaltyData = await adminGraphqlRequest<{
      loyalty_settings?: LoyaltySettingsRow[];
      loyalty_balances?: LoyaltyBalanceRow[];
    }>(
      `query LoyaltyCheck($restaurant_id: uuid!, $customer_id: uuid!) {
        loyalty_settings(where: { restaurant_id: { _eq: $restaurant_id }, is_enabled: { _eq: true } }, limit: 1) {
          points_per_dollar
          redemption_rate
          min_redemption_points
          max_redemption_percentage
          welcome_bonus_points
        }
        loyalty_balances(where: { customer_id: { _eq: $customer_id }, restaurant_id: { _eq: $restaurant_id } }, limit: 1) {
          id
          points_balance
          lifetime_earned
          lifetime_redeemed
        }
      }`,
      { restaurant_id: restaurantId, customer_id: customerId },
    );
    loyaltySettings = loyaltyData.loyalty_settings?.[0] || null;
    existingBalance = loyaltyData.loyalty_balances?.[0] || null;
  } catch (err) {
    console.error('[Menu Orders] Failed to fetch loyalty data:', err);
  }

  if (
    loyaltySettings &&
    typeof input.loyaltyPointsToRedeem === 'number' &&
    input.loyaltyPointsToRedeem > 0
  ) {
    const pointsRequested = Math.round(input.loyaltyPointsToRedeem);
    const currentBalance = toInt(existingBalance?.points_balance);
    const minPoints = toInt(loyaltySettings.min_redemption_points) || 100;
    const maxPct = toInt(loyaltySettings.max_redemption_percentage) || 50;
    const rawRate = toInt(loyaltySettings.redemption_rate);
    const rate = rawRate > 0 ? rawRate / 10000 : 0.01;

    if (pointsRequested >= minPoints && pointsRequested <= currentBalance) {
      const maxDiscount = roundCurrency(subtotal * (maxPct / 100));
      const requestedDiscount = roundCurrency(pointsRequested * rate);
      loyaltyDiscount = roundCurrency(Math.min(requestedDiscount, maxDiscount));
      loyaltyPointsRedeemed = loyaltyDiscount > 0
        ? Math.min(pointsRequested, Math.ceil(loyaltyDiscount / rate))
        : 0;
    }
  }

  const discountTotal = roundCurrency(orderDiscountTotal + giftCardAppliedAmount + loyaltyDiscount);
  const preGiftCardTotalWithTax = roundCurrency(preGiftCardTotal + taxTotal - loyaltyDiscount);
  const total = roundCurrency(Math.max(preGiftCardTotalWithTax - giftCardAppliedAmount, 0));
  // State tax is not sourced separately in the current checkout flow yet.
  const stateTax = 0;
  const restaurantPayoutAmount = roundCurrency(
    Math.max(total - taxTotal - stateTax - deliveryFeeAmount, 0),
  );
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
      payment_method: paymentMethod,
      payment_status: 'pending',
      contact_first_name: contact.firstName,
      contact_last_name: contact.lastName,
      contact_email: contact.email,
      contact_phone: contact.phone,
      scheduled_for: scheduledFor,
      service_fee: taxTotal,
      state_tax: stateTax,
      tip_total: tipAmount,
      discount_total: discountTotal,
      delivery_fee_total: deliveryFeeAmount,
      restaurant_payout_amount: restaurantPayoutAmount,
      payout_status: 'pending',
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
      loyalty_points_redeemed: loyaltyPointsRedeemed,
      loyalty_discount: loyaltyDiscount,
      delivery_provider: deliveryProvider,
      delivery_dispatch_status:
        fulfillmentType === 'delivery' && deliveryProvider ? 'pending_ready' : null,
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

  if (deliveryQuoteId && customerId) {
    try {
      await adminGraphqlRequest(UPDATE_DELIVERY_QUOTE_CUSTOMER, {
        delivery_quote_id: deliveryQuoteId,
        customer_id: customerId,
      });
    } catch (err) {
      console.error('[Menu Orders] Failed to update delivery quote customer_id:', err);
    }
  }

  if (fulfillmentType === 'delivery' && customerId && deliveryAddress) {
    const deliveryData = input.deliveryAddressData;
    try {
      const addressObject: Record<string, string> = {
        customer_id: customerId,
        restaurant_id: restaurantId,
        address: deliveryAddress,
      };
      const optionalFields: Record<string, string | undefined | null> = {
        street: trimText(deliveryData?.addressLine1),
        city: trimText(deliveryData?.city),
        state: trimText(deliveryData?.state),
        country: trimText(deliveryData?.countryCode),
        house_no: trimText(deliveryData?.houseFlatFloor),
        zip_code: trimText(deliveryData?.postalCode),
        saved_as: trimText(deliveryData?.label) || 'other',
        nearby_landmark: trimText(deliveryData?.landmark),
        place_id: trimText(deliveryData?.placeId),
        latitude: typeof deliveryData?.latitude === 'number' ? String(deliveryData.latitude) : null,
        longitude: typeof deliveryData?.longitude === 'number' ? String(deliveryData.longitude) : null,
      };
      for (const [key, value] of Object.entries(optionalFields)) {
        if (value) addressObject[key] = value;
      }
      await adminGraphqlRequest(INSERT_CUSTOMER_DELIVERY_ADDRESS, {
        object: addressObject,
      });
    } catch (err) {
      console.error('[Menu Orders] Failed to save customer delivery address:', err);
    }
  }

  // --- Loyalty: debit redeemed points immediately (prevents double-spend) ---
  // Earned points are credited later when payment is confirmed via
  // creditOrderLoyaltyPoints(), called from the Stripe webhook, checkout
  // (cash/loyalty), or cron reconciliation.
  let loyaltyPointsEarned = 0;
  if (loyaltySettings) {
    const pointsPerDollar = toInt(loyaltySettings.points_per_dollar) || 1;
    loyaltyPointsEarned = Math.floor(subtotal * pointsPerDollar);

    // Welcome bonus: first order for this restaurant
    const isFirstOrder = !existingBalance?.id;
    const welcomeBonus = isFirstOrder ? (toInt(loyaltySettings.welcome_bonus_points)) : 0;
    const totalEarned = loyaltyPointsEarned + welcomeBonus;

    // Store earned points on the order (credited to balance after payment)
    if (totalEarned > 0) {
      try {
        await adminGraphqlRequest(
          `mutation UpdateOrderLoyaltyEarned($order_id: uuid!, $changes: orders_set_input!) {
            update_orders_by_pk(pk_columns: { order_id: $order_id }, _set: $changes) {
              order_id
            }
          }`,
          { order_id: orderId, changes: { loyalty_points_earned: totalEarned } },
        );
      } catch (err) {
        console.error('[Menu Orders] Failed to update order loyalty_points_earned:', err);
      }
    }

    // Debit redeemed points from balance now to prevent double-spend
    if (loyaltyPointsRedeemed > 0 && existingBalance?.id) {
      try {
        const currentBalance = toInt(existingBalance.points_balance);
        const currentLifetimeRedeemed = toInt(existingBalance.lifetime_redeemed);
        await adminGraphqlRequest(UPDATE_LOYALTY_BALANCE, {
          id: existingBalance.id,
          changes: {
            points_balance: Math.max(currentBalance - loyaltyPointsRedeemed, 0),
            lifetime_earned: toInt(existingBalance.lifetime_earned),
            lifetime_redeemed: currentLifetimeRedeemed + loyaltyPointsRedeemed,
          },
        });

        await adminGraphqlRequest(INSERT_LOYALTY_TRANSACTION, {
          object: {
            customer_id: customerId,
            restaurant_id: restaurantId,
            order_id: orderId,
            type: 'redeemed',
            points: -loyaltyPointsRedeemed,
            balance_after: Math.max(currentBalance - loyaltyPointsRedeemed, 0),
            description: `Redeemed on Order #${orderNumber} (-$${loyaltyDiscount.toFixed(2)})`,
          },
        });
      } catch (err) {
        console.error('[Menu Orders] Failed to debit loyalty points:', err);
      }
    }
  }

  return {
    orderId,
    orderNumber,
    subtotal,
    deliveryFee: deliveryFeeAmount,
    taxTotal,
    tipTotal: tipAmount,
    discountTotal,
    loyaltyPointsEarned,
    loyaltyPointsRedeemed,
    loyaltyDiscount,
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

// ---------------------------------------------------------------------------
// Loyalty: credit earned points after payment confirmation
// ---------------------------------------------------------------------------

const GET_ORDER_LOYALTY_DATA = `
  query GetOrderLoyaltyData($order_id: uuid!) {
    orders_by_pk(order_id: $order_id) {
      order_id
      order_number
      customer_id
      restaurant_id
      sub_total
      loyalty_points_earned
      loyalty_points_redeemed
      loyalty_discount
    }
  }
`;

const GET_LOYALTY_BALANCE_FOR_CREDIT = `
  query GetLoyaltyBalanceForCredit($customer_id: uuid!, $restaurant_id: uuid!) {
    loyalty_balances(
      where: { customer_id: { _eq: $customer_id }, restaurant_id: { _eq: $restaurant_id } }
      limit: 1
    ) {
      id
      points_balance
      lifetime_earned
      lifetime_redeemed
    }
  }
`;

interface OrderLoyaltyRow {
  order_id?: string;
  order_number?: string;
  customer_id?: string;
  restaurant_id?: string;
  sub_total?: number | string;
  loyalty_points_earned?: number | string | null;
  loyalty_points_redeemed?: number | string | null;
  loyalty_discount?: number | string | null;
}

function toInt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return 0;
}

interface LoyaltyBalanceCreditRow {
  id?: string;
  points_balance?: number | string;
  lifetime_earned?: number | string;
  lifetime_redeemed?: number | string;
}

/**
 * Credits earned loyalty points to the customer's balance.
 * Called after payment is confirmed (Stripe webhook, cash confirmation, etc.).
 */
export async function creditOrderLoyaltyPoints(orderId: string): Promise<void> {
  try {
    const data = await adminGraphqlRequest<{ orders_by_pk?: OrderLoyaltyRow }>(
      GET_ORDER_LOYALTY_DATA,
      { order_id: orderId },
    );
    const order = data.orders_by_pk;
    if (!order?.customer_id || !order?.restaurant_id) {
      console.warn('[Loyalty Credit] Order missing customer/restaurant:', orderId);
      return;
    }

    const pointsEarned = toInt(order.loyalty_points_earned);
    if (pointsEarned <= 0) {
      console.warn('[Loyalty Credit] No points earned on order:', orderId, 'raw value:', order.loyalty_points_earned);
      return;
    }

    const balData = await adminGraphqlRequest<{ loyalty_balances?: LoyaltyBalanceCreditRow[] }>(
      GET_LOYALTY_BALANCE_FOR_CREDIT,
      { customer_id: order.customer_id, restaurant_id: order.restaurant_id },
    );
    const existing = balData.loyalty_balances?.[0];
    const currentBalance = toInt(existing?.points_balance);
    const currentLifetimeEarned = toInt(existing?.lifetime_earned);
    const newBalance = currentBalance + pointsEarned;
    const newLifetimeEarned = currentLifetimeEarned + pointsEarned;

    console.log('[Loyalty Credit] Crediting', pointsEarned, 'pts for order', orderId, existing?.id ? '(update)' : '(insert)');

    if (existing?.id) {
      await adminGraphqlRequest(UPDATE_LOYALTY_BALANCE, {
        id: existing.id,
        changes: {
          points_balance: Math.max(newBalance, 0),
          lifetime_earned: newLifetimeEarned,
          lifetime_redeemed: toInt(existing.lifetime_redeemed),
        },
      });
    } else {
      await adminGraphqlRequest(INSERT_LOYALTY_BALANCE, {
        object: {
          customer_id: order.customer_id,
          restaurant_id: order.restaurant_id,
          points_balance: Math.max(newBalance, 0),
          lifetime_earned: newLifetimeEarned,
          lifetime_redeemed: 0,
        },
      });
    }

    await adminGraphqlRequest(INSERT_LOYALTY_TRANSACTION, {
      object: {
        customer_id: order.customer_id,
        restaurant_id: order.restaurant_id,
        order_id: orderId,
        type: 'earned',
        points: pointsEarned,
        balance_after: Math.max(newBalance, 0),
        description: `Order #${order.order_number || orderId}`,
      },
    });

    console.log('[Loyalty Credit] Success for order', orderId);
  } catch (err) {
    console.error('[Loyalty Credit] Failed for order:', orderId, err);
  }
}

// ---------------------------------------------------------------------------
// Loyalty: reverse points on cancel / refund
// ---------------------------------------------------------------------------

/**
 * Reverses loyalty point changes for a cancelled or refunded order.
 *
 * @param revokeEarned — pass true when payment was already confirmed so the
 *   earned points have been credited. For orders cancelled before payment
 *   (still in "pending"), earned points were never credited; pass false.
 */
export async function reverseOrderLoyaltyPoints(
  orderId: string,
  { revokeEarned }: { revokeEarned: boolean },
): Promise<void> {
  try {
    const data = await adminGraphqlRequest<{ orders_by_pk?: OrderLoyaltyRow }>(
      GET_ORDER_LOYALTY_DATA,
      { order_id: orderId },
    );
    const order = data.orders_by_pk;
    if (!order?.customer_id || !order?.restaurant_id) return;

    const pointsEarned = revokeEarned ? toInt(order.loyalty_points_earned) : 0;
    const pointsRedeemed = toInt(order.loyalty_points_redeemed);

    if (pointsEarned === 0 && pointsRedeemed === 0) return;

    const balData = await adminGraphqlRequest<{ loyalty_balances?: LoyaltyBalanceCreditRow[] }>(
      GET_LOYALTY_BALANCE_FOR_CREDIT,
      { customer_id: order.customer_id, restaurant_id: order.restaurant_id },
    );
    const existing = balData.loyalty_balances?.[0];
    if (!existing?.id) return; // no balance record to adjust

    const currentBalance = toInt(existing.points_balance);
    const currentLifetimeEarned = toInt(existing.lifetime_earned);
    const currentLifetimeRedeemed = toInt(existing.lifetime_redeemed);

    // Restore redeemed points, revoke earned points
    const newBalance = currentBalance + pointsRedeemed - pointsEarned;
    const newLifetimeEarned = currentLifetimeEarned - pointsEarned;
    const newLifetimeRedeemed = currentLifetimeRedeemed - pointsRedeemed;

    await adminGraphqlRequest(UPDATE_LOYALTY_BALANCE, {
      id: existing.id,
      changes: {
        points_balance: Math.max(newBalance, 0),
        lifetime_earned: Math.max(newLifetimeEarned, 0),
        lifetime_redeemed: Math.max(newLifetimeRedeemed, 0),
      },
    });

    const orderLabel = order.order_number || orderId;

    if (pointsRedeemed > 0) {
      await adminGraphqlRequest(INSERT_LOYALTY_TRANSACTION, {
        object: {
          customer_id: order.customer_id,
          restaurant_id: order.restaurant_id,
          order_id: orderId,
          type: 'restored',
          points: pointsRedeemed,
          balance_after: Math.max(newBalance, 0),
          description: `Points restored — Order #${orderLabel} cancelled/refunded`,
        },
      });
    }

    if (pointsEarned > 0) {
      await adminGraphqlRequest(INSERT_LOYALTY_TRANSACTION, {
        object: {
          customer_id: order.customer_id,
          restaurant_id: order.restaurant_id,
          order_id: orderId,
          type: 'revoked',
          points: -pointsEarned,
          balance_after: Math.max(newBalance, 0),
          description: `Points revoked — Order #${orderLabel} cancelled/refunded`,
        },
      });
    }

    // Zero out loyalty fields on the order to prevent double-reversal
    await adminGraphqlRequest(
      `mutation ClearOrderLoyalty($order_id: uuid!) {
        update_orders_by_pk(
          pk_columns: { order_id: $order_id }
          _set: { loyalty_points_earned: 0, loyalty_points_redeemed: 0, loyalty_discount: 0 }
        ) { order_id }
      }`,
      { order_id: orderId },
    );
  } catch (err) {
    console.error('[Menu Orders] Failed to reverse loyalty points for order:', orderId, err);
  }
}

