import { NextRequest, NextResponse } from 'next/server';
import {
  getMenuCustomerSessionCookieName,
  readMenuCustomerSession,
  updateMenuCustomerOptIn,
} from '@/features/restaurant-menu/lib/server/customer-auth';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import {
  MenuOrderError,
  placeMenuOrder,
  updateOrderPaymentIntent,
  creditOrderLoyaltyPoints,
} from '@/features/restaurant-menu/lib/server/menu-orders';
import { getRestaurantStripeAccountByRestaurantId } from '@/lib/server/restaurant-stripe-accounts';
import { getStripe, calculateStripeTax } from '@/lib/server/stripe';
import { sendInvoiceForOrder, sendOrderConfirmationSms } from '@/lib/server/order-invoice';

const GET_RESTAURANT_PAYMENT_METADATA = `
  query GetRestaurantPaymentMetadata($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      name
      address
      city
      state
      postal_code
      country
    }
  }
`;

const UPDATE_ORDER_STATE_TAX = `
  mutation UpdateOrderStateTax($order_id: uuid!, $state_tax: numeric!, $cart_total: numeric!) {
    update_orders_by_pk(
      pk_columns: { order_id: $order_id }
      _set: { state_tax: $state_tax, cart_total: $cart_total }
    ) {
      order_id
    }
  }
`;

interface CheckoutOrderRequestBody {
  restaurantId?: string;
  locationId?: string | null;
  fulfillmentType?: 'pickup' | 'delivery';
  scheduleDayId?: string | null;
  scheduleTime?: string | null;
  deliveryAddress?: string | null;
  deliveryAddressData?: {
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
  } | null;
  contact?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  } | null;
  items?: Array<{
    key?: string;
    itemId?: string;
    name?: string;
    quantity?: number;
    basePrice?: number;
    notes?: string;
    selectedAddOns?: Array<{
      id?: string;
      name?: string;
      price?: number;
      modifierGroupId?: string;
      modifierGroupName?: string;
    }>;
  }> | null;
  tipAmount?: number;
  paymentMethod?: 'card' | 'cash';
  deliveryQuote?: {
    id?: string | null;
    provider?: string;
    quoteId?: string;
    deliveryFee?: number;
    etaMinutes?: number | null;
  } | null;
  couponCode?: string | null;
  giftCardCode?: string | null;
  orderNote?: string | null;
  loyaltyPointsToRedeem?: number;
  emailOptIn?: boolean;
  smsOptIn?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as CheckoutOrderRequestBody | null;
    const restaurantId = body?.restaurantId || '';
    const cookieValue = request.cookies.get(getMenuCustomerSessionCookieName())?.value;
    const customer = await readMenuCustomerSession(cookieValue, restaurantId);

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sign in or continue as guest before placing your order.',
        },
        { status: 401 },
      );
    }

    // Update customer opt-in preferences
    await updateMenuCustomerOptIn(customer.customerId, {
      emailOptIn: body?.emailOptIn !== false,
      smsOptIn: body?.smsOptIn !== false,
    });

    const isCashOrder = body?.paymentMethod === 'cash' && (body?.fulfillmentType || 'pickup') === 'pickup';

    const result = await placeMenuOrder({
      customerId: customer.customerId,
      restaurantId,
      locationId: body?.locationId,
      fulfillmentType: body?.fulfillmentType || 'pickup',
      scheduleDayId: body?.scheduleDayId,
      scheduleTime: body?.scheduleTime,
      deliveryAddress: body?.deliveryAddress,
      deliveryAddressData: body?.deliveryAddressData,
      contact: {
        firstName: body?.contact?.firstName || '',
        lastName: body?.contact?.lastName || '',
        email: body?.contact?.email || '',
        phone: body?.contact?.phone || '',
      },
      items: (body?.items || []).map((item) => ({
        key: item.key,
        itemId: item.itemId || '',
        name: item.name,
        quantity: typeof item.quantity === 'number' ? item.quantity : 0,
        basePrice: item.basePrice,
        notes: item.notes,
        selectedAddOns: item.selectedAddOns,
      })),
      tipAmount: body?.tipAmount,
      deliveryFeeAmount: body?.deliveryQuote?.deliveryFee,
      deliveryProvider: body?.deliveryQuote?.provider || null,
      deliveryQuote: body?.deliveryQuote?.quoteId || null,
      deliveryQuoteId: body?.deliveryQuote?.id || null,
      couponCode: body?.couponCode,
      giftCardCode: body?.giftCardCode,
      orderNote: body?.orderNote,
      loyaltyPointsToRedeem: typeof body?.loyaltyPointsToRedeem === 'number' ? body.loyaltyPointsToRedeem : 0,
      paymentMethod: isCashOrder ? 'cash' : 'card',
    });

    if (isCashOrder) {
      // Cash pickup orders skip Stripe, so transition to "preparing" immediately
      // so the cron picks them up for the preparation timer.
      try {
        await adminGraphqlRequest(
          `mutation ConfirmCashOrder($order_id: uuid!, $confirmed_at: timestamptz!) {
            update_orders_by_pk(
              pk_columns: { order_id: $order_id }
              _set: { status: "preparing", confirmed_at: $confirmed_at }
            ) { order_id }
          }`,
          { order_id: result.orderId, confirmed_at: new Date().toISOString() },
        );
      } catch (err) {
        console.error('[Menu Orders] Failed to auto-confirm cash order:', err);
      }

      try {
        await creditOrderLoyaltyPoints(result.orderId);
      } catch (loyaltyErr) {
        console.error('[Menu Orders] Cash order loyalty credit failed:', loyaltyErr);
      }

      try {
        await sendInvoiceForOrder(result.orderId);
      } catch (emailErr) {
        console.error('[Menu Orders] Cash order confirmation email failed:', emailErr);
      }

      sendOrderConfirmationSms(result.orderId).catch((smsErr) =>
        console.error('[Menu Orders] Cash order confirmation SMS failed:', smsErr),
      );

      return NextResponse.json({
        success: true,
        message: `Order ${result.orderNumber} placed. Pay with cash at pickup.`,
        order: result,
      });
    }

    // If loyalty points / gift cards cover the full amount, skip Stripe and
    // mark the order as paid + preparing so the cron processes it normally.
    if (result.total <= 0) {
      try {
        await adminGraphqlRequest(
          `mutation ConfirmFullyDiscountedOrder($order_id: uuid!, $confirmed_at: timestamptz!) {
            update_orders_by_pk(
              pk_columns: { order_id: $order_id }
              _set: {
                payment_status: "paid",
                payment_method: "loyalty",
                status: "preparing",
                confirmed_at: $confirmed_at
              }
            ) { order_id }
          }`,
          { order_id: result.orderId, confirmed_at: new Date().toISOString() },
        );
      } catch (err) {
        console.error('[Menu Orders] Failed to auto-confirm fully discounted order:', err);
      }

      try {
        await creditOrderLoyaltyPoints(result.orderId);
      } catch (loyaltyErr) {
        console.error('[Menu Orders] Loyalty order loyalty credit failed:', loyaltyErr);
      }

      try {
        await sendInvoiceForOrder(result.orderId);
      } catch (emailErr) {
        console.error('[Menu Orders] Loyalty order confirmation email failed:', emailErr);
      }

      sendOrderConfirmationSms(result.orderId).catch((smsErr) =>
        console.error('[Menu Orders] Loyalty order confirmation SMS failed:', smsErr),
      );

      return NextResponse.json({
        success: true,
        message: `Order ${result.orderNumber} placed. Fully covered by rewards!`,
        order: result,
      });
    }

    const metadata: Record<string, string> = {
      restaurant_id: restaurantId,
      order_id: result.orderId,
      order_number: result.orderNumber,
    };

    let restaurantAddr: {
      address?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
      country?: string | null;
    } | null = null;

    try {
      const [restaurantData, stripeAccount] = await Promise.all([
        adminGraphqlRequest<{
          restaurants_by_pk?: {
            name?: string | null;
            address?: string | null;
            city?: string | null;
            state?: string | null;
            postal_code?: string | null;
            country?: string | null;
          } | null;
        }>(GET_RESTAURANT_PAYMENT_METADATA, {
          restaurant_id: restaurantId,
        }),
        getRestaurantStripeAccountByRestaurantId(restaurantId),
      ]);

      restaurantAddr = restaurantData.restaurants_by_pk || null;
      const restaurantName = trimMetadataValue(
        restaurantData.restaurants_by_pk?.name,
      );
      const stripeAccountId = trimMetadataValue(stripeAccount?.stripeAccountId);

      if (restaurantName) {
        metadata.restaurant_name = restaurantName;
      }

      if (stripeAccountId) {
        metadata.restaurant_stripe_account_id = stripeAccountId;
      }
    } catch (metadataError) {
      console.error(
        '[Menu Orders] Failed to enrich Stripe payment metadata:',
        metadataError,
      );
    }

    // Calculate state tax via Stripe Tax
    let stateTaxAmount = 0;
    try {
      const deliveryData = body?.deliveryAddressData;
      const fulfillment = body?.fulfillmentType || 'pickup';
      let customerAddress: {
        line1?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      } | undefined;

      if (fulfillment === 'delivery' && deliveryData?.postalCode) {
        customerAddress = {
          line1: deliveryData.addressLine1 || deliveryData.formattedAddress || '',
          city: deliveryData.city || '',
          state: deliveryData.state || '',
          postalCode: deliveryData.postalCode,
          country: deliveryData.countryCode || 'US',
        };
      } else if (restaurantAddr?.postal_code) {
        customerAddress = {
          line1: restaurantAddr.address || '',
          city: restaurantAddr.city || '',
          state: restaurantAddr.state || '',
          postalCode: restaurantAddr.postal_code,
          country: restaurantAddr.country || 'US',
        };
      }

      if (customerAddress?.postalCode) {
        const cartItems = body?.items || [];
        const lineItems = cartItems.map((item) => {
          const addOnsTotal = (item.selectedAddOns || []).reduce(
            (sum, addon) => sum + (addon.price || 0),
            0,
          );
          const unitPrice = (item.basePrice || 0) + addOnsTotal;
          return {
            amount: Math.round(unitPrice * (item.quantity || 1) * 100),
            reference: item.itemId || item.key || undefined,
          };
        });

        const deliveryFeeCents =
          fulfillment === 'delivery' && body?.deliveryQuote?.deliveryFee
            ? Math.round(body.deliveryQuote.deliveryFee * 100)
            : 0;

        const taxResult = await calculateStripeTax({
          lineItems,
          customerAddress,
          shippingCost: deliveryFeeCents > 0 ? deliveryFeeCents : undefined,
        });

        if (taxResult && !taxResult.error && taxResult.taxAmount > 0) {
          stateTaxAmount = taxResult.taxAmount;
          const updatedTotal = Math.round((result.total + stateTaxAmount) * 100) / 100;
          await adminGraphqlRequest(UPDATE_ORDER_STATE_TAX, {
            order_id: result.orderId,
            state_tax: stateTaxAmount,
            cart_total: updatedTotal,
          });
        }
      }
    } catch (taxError) {
      console.error('[Menu Orders] Stripe state tax calculation failed:', taxError);
    }

    const chargeAmount = Math.round((result.total + stateTaxAmount) * 100);

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: chargeAmount,
      currency: 'usd',
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    await updateOrderPaymentIntent(result.orderId, paymentIntent.id);

    return NextResponse.json({
      success: true,
      message: `Order ${result.orderNumber} created. Complete payment to confirm.`,
      order: { ...result, stateTax: stateTaxAmount },
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    if (error instanceof MenuOrderError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }

    console.error('[Menu Orders] Checkout error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to place your order right now.' },
      { status: 500 },
    );
  }
}

function trimMetadataValue(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 500);
}
