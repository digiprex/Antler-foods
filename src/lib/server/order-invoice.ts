import 'server-only';

import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { sendOrderInvoiceEmail } from '@/lib/server/email';
import { isTwilioConfigured, sendSms } from '@/lib/server/twilio';

const GET_ORDER_FOR_INVOICE = `
  query GetOrderForInvoice($order_id: uuid!) {
    orders_by_pk(order_id: $order_id) {
      order_id
      order_number
      created_at
      status
      sub_total
      cart_total
      coupon_used
      gift_card_used
      fulfillment_type
      payment_status
      payment_method
      contact_first_name
      contact_last_name
      contact_email
      contact_phone
      scheduled_for
      service_fee
      tip_total
      discount_total
      loyalty_discount
      loyalty_points_redeemed
      delivery_fee_total
      order_note
      delivery_address
      delivery_quote_id
      placed_at
      restaurant_id
      offer_applied
    }
  }
`;

const GET_ORDER_ITEMS_FOR_INVOICE = `
  query GetOrderItemsForInvoice($order_id: uuid!) {
    order_items(
      where: { order_id: { _eq: $order_id }, is_deleted: { _eq: false } }
      order_by: { created_at: asc }
    ) {
      item_name
      item_price
      quantity
      line_total
      selected_modifiers
      base_item_price
      modifier_total
      item_note
    }
  }
`;

const GET_RESTAURANT_FOR_INVOICE = `
  query GetRestaurantForInvoice($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      name
      email
      phone_number
      logo
      address
      city
      state
      country
      postal_code
    }
  }
`;

/**
 * Fetches order, items, and restaurant data, then sends the invoice email.
 * Safe to call from any context — silently returns if the order or email is missing.
 */
export async function sendInvoiceForOrder(orderId: string) {
  const orderData = await adminGraphqlRequest<{
    orders_by_pk: Record<string, unknown> | null;
  }>(GET_ORDER_FOR_INVOICE, { order_id: orderId });

  const order = orderData.orders_by_pk;
  const contactEmail = typeof order?.contact_email === 'string' ? order.contact_email.trim() : '';
  if (!order || !contactEmail) return;

  const itemsData = await adminGraphqlRequest<{
    order_items: Array<Record<string, unknown>>;
  }>(GET_ORDER_ITEMS_FOR_INVOICE, { order_id: orderId });

  let restaurantName = '';
  let pickupAddress: string | null = null;
  let restaurantEmail: string | null = null;
  let restaurantPhone: string | null = null;
  let restaurantLogo: string | null = null;

  if (order.restaurant_id) {
    const restData = await adminGraphqlRequest<{
      restaurants_by_pk: {
        name?: string;
        email?: string;
        phone_number?: string;
        logo?: string;
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        postal_code?: string;
      } | null;
    }>(GET_RESTAURANT_FOR_INVOICE, { restaurant_id: order.restaurant_id });
    const rest = restData.restaurants_by_pk;
    restaurantName = rest?.name || '';
    restaurantEmail = rest?.email || null;
    restaurantPhone = rest?.phone_number || null;
    restaurantLogo = rest?.logo || null;
    if (order.fulfillment_type === 'pickup') {
      pickupAddress = [rest?.address, rest?.city, rest?.state, rest?.postal_code, rest?.country]
        .map((v) => (typeof v === 'string' && v.trim() ? v.trim() : null))
        .filter(Boolean)
        .join(', ') || null;
    }
  }

  let deliveryFee: number | null =
    order.delivery_fee_total != null ? Number(order.delivery_fee_total) : null;
  const quoteId = typeof order.delivery_quote_id === 'string' ? order.delivery_quote_id : null;
  if (deliveryFee == null && quoteId) {
    try {
      const quoteData = await adminGraphqlRequest<{
        delivery_quotes_by_pk: { delivery_fee?: number | null } | null;
      }>(`query ($id: uuid!) { delivery_quotes_by_pk(delivery_quote_id: $id) { delivery_fee } }`, { id: quoteId });
      deliveryFee = typeof quoteData.delivery_quotes_by_pk?.delivery_fee === 'number'
        ? quoteData.delivery_quotes_by_pk.delivery_fee : null;
    } catch {
      // silent
    }
  }

  await sendOrderInvoiceEmail(contactEmail, {
    order: { ...order, delivery_fee: deliveryFee },
    items: itemsData.order_items || [],
    restaurantName,
    pickupAddress,
    restaurantEmail,
    restaurantPhone,
    restaurantLogo,
  });
}

/**
 * Sends an order confirmation SMS to the customer's phone.
 * Safe to call from any context — silently returns if Twilio is not configured
 * or the order/phone is missing.
 */
export async function sendOrderConfirmationSms(orderId: string) {
  if (!isTwilioConfigured()) return;

  try {
    const orderData = await adminGraphqlRequest<{
      orders_by_pk: {
        order_number?: string;
        contact_phone?: string;
        contact_first_name?: string;
        fulfillment_type?: string;
        cart_total?: number;
        restaurant_id?: string;
      } | null;
    }>(GET_ORDER_FOR_INVOICE, { order_id: orderId });

    const order = orderData.orders_by_pk;
    const phone = typeof order?.contact_phone === 'string' ? order.contact_phone.trim() : '';
    const orderNumber = order?.order_number || '';
    if (!order || !phone || !orderNumber) return;

    let restaurantName = 'the restaurant';
    if (order.restaurant_id) {
      const restData = await adminGraphqlRequest<{
        restaurants_by_pk: { name?: string } | null;
      }>(GET_RESTAURANT_FOR_INVOICE, { restaurant_id: order.restaurant_id });
      restaurantName = restData.restaurants_by_pk?.name || restaurantName;
    }

    const name = typeof order.contact_first_name === 'string' ? order.contact_first_name.trim() : '';
    const greeting = name ? `Hi ${name}, your` : 'Your';
    const fulfillment = order.fulfillment_type === 'delivery' ? 'delivery' : 'pickup';

    const message = `${greeting} order #${orderNumber} from ${restaurantName} is confirmed! We're preparing it for ${fulfillment}.`;

    await sendSms(phone, message);
    console.log(`[Menu Orders] Order confirmation SMS sent to ${phone} for order #${orderNumber}`);
  } catch (err) {
    console.error('[Menu Orders] Failed to send order confirmation SMS:', err);
  }
}
