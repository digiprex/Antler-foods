import { NextRequest, NextResponse } from 'next/server';
import {
  getMenuCustomerSessionCookieName,
  readMenuCustomerSession,
} from '@/features/restaurant-menu/lib/server/customer-auth';
import {
  MenuOrderError,
  placeMenuOrder,
  updateOrderPaymentIntent,
} from '@/features/restaurant-menu/lib/server/menu-orders';
import { getStripe } from '@/lib/server/stripe';

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
  couponCode?: string | null;
  giftCardCode?: string | null;
  orderNote?: string | null;
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
      couponCode: body?.couponCode,
      giftCardCode: body?.giftCardCode,
      orderNote: body?.orderNote,
    });

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: Math.round(result.total * 100),
      currency: 'usd',
      metadata: {
        restaurant_id: restaurantId,
        order_id: result.orderId,
        order_number: result.orderNumber,
      },
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
