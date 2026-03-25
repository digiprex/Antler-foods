import { NextRequest, NextResponse } from 'next/server';
import {
  getMenuCustomerSessionCookieName,
  readMenuCustomerSession,
} from '@/features/restaurant-menu/lib/server/customer-auth';
import {
  MenuOrderError,
  placeMenuOrder,
} from '@/features/restaurant-menu/lib/server/menu-orders';

interface CheckoutOrderRequestBody {
  restaurantId?: string;
  locationId?: string | null;
  fulfillmentType?: 'pickup' | 'delivery';
  scheduleDayId?: string | null;
  scheduleTime?: string | null;
  deliveryAddress?: string | null;
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
      orderNote: body?.orderNote,
    });

    return NextResponse.json({
      success: true,
      message: `Order ${result.orderNumber} placed successfully.`,
      order: result,
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
