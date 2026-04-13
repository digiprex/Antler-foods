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
} from '@/features/restaurant-menu/lib/server/menu-orders';
import { getRestaurantStripeAccountByRestaurantId } from '@/lib/server/restaurant-stripe-accounts';
import { getStripe } from '@/lib/server/stripe';

const GET_RESTAURANT_PAYMENT_METADATA = `
  query GetRestaurantPaymentMetadata($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      name
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

      return NextResponse.json({
        success: true,
        message: `Order ${result.orderNumber} placed. Pay with cash at pickup.`,
        order: result,
      });
    }

    const metadata: Record<string, string> = {
      restaurant_id: restaurantId,
      order_id: result.orderId,
      order_number: result.orderNumber,
    };

    try {
      const [restaurantData, stripeAccount] = await Promise.all([
        adminGraphqlRequest<{
          restaurants_by_pk?: {
            name?: string | null;
          } | null;
        }>(GET_RESTAURANT_PAYMENT_METADATA, {
          restaurant_id: restaurantId,
        }),
        getRestaurantStripeAccountByRestaurantId(restaurantId),
      ]);

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

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: Math.round(result.total * 100),
      currency: 'usd',
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    await updateOrderPaymentIntent(result.orderId, paymentIntent.id);

    return NextResponse.json({
      success: true,
      message: `Order ${result.orderNumber} created. Complete payment to confirm.`,
      order: result,
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

