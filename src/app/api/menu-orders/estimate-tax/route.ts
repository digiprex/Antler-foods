import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { calculateStripeTax } from '@/lib/server/stripe';

const GET_RESTAURANT_ADDRESS = `
  query GetRestaurantAddress($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      address
      city
      state
      postal_code
      country
    }
  }
`;

interface EstimateTaxRequestBody {
  restaurantId?: string;
  fulfillmentType?: 'pickup' | 'delivery';
  deliveryAddress?: {
    addressLine1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    countryCode?: string;
  } | null;
  items?: Array<{
    itemId?: string;
    quantity?: number;
    basePrice?: number;
    selectedAddOns?: Array<{ price?: number }>;
  }>;
  deliveryFee?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as EstimateTaxRequestBody | null;
    const restaurantId = body?.restaurantId;
    const fulfillment = body?.fulfillmentType || 'pickup';
    const items = body?.items || [];

    if (!restaurantId || items.length === 0) {
      return NextResponse.json({ success: true, stateTax: 0 });
    }

    let customerAddress: {
      line1?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    } | undefined;

    if (fulfillment === 'delivery' && body?.deliveryAddress?.postalCode) {
      customerAddress = {
        line1: body.deliveryAddress.addressLine1 || '',
        city: body.deliveryAddress.city || '',
        state: body.deliveryAddress.state || '',
        postalCode: body.deliveryAddress.postalCode,
        country: body.deliveryAddress.countryCode || 'US',
      };
    } else {
      const restaurantData = await adminGraphqlRequest<{
        restaurants_by_pk?: {
          address?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string | null;
        } | null;
      }>(GET_RESTAURANT_ADDRESS, { restaurant_id: restaurantId });

      const addr = restaurantData.restaurants_by_pk;
      if (addr?.postal_code) {
        customerAddress = {
          line1: addr.address || '',
          city: addr.city || '',
          state: addr.state || '',
          postalCode: addr.postal_code,
          country: addr.country || 'US',
        };
      }
    }

    if (!customerAddress?.postalCode) {
      return NextResponse.json({ success: true, stateTax: 0, debug: 'no_postal_code' });
    }

    const lineItems = items.map((item) => {
      const addOnsTotal = (item.selectedAddOns || []).reduce(
        (sum, addon) => sum + (addon.price || 0),
        0,
      );
      const unitPrice = (item.basePrice || 0) + addOnsTotal;
      return {
        amount: Math.round(unitPrice * (item.quantity || 1) * 100),
        reference: item.itemId || undefined,
      };
    });

    const deliveryFeeCents =
      fulfillment === 'delivery' && body?.deliveryFee
        ? Math.round(body.deliveryFee * 100)
        : 0;

    const taxResult = await calculateStripeTax({
      lineItems,
      customerAddress,
      shippingCost: deliveryFeeCents > 0 ? deliveryFeeCents : undefined,
    });

    if (!taxResult || taxResult.error) {
      return NextResponse.json({ success: true, stateTax: 0, debug: 'stripe_tax_failed', error: taxResult?.error });
    }

    return NextResponse.json({
      success: true,
      stateTax: taxResult.taxAmount,
    });
  } catch (error) {
    console.error('[Estimate Tax] Error:', error);
    return NextResponse.json({ success: true, stateTax: 0, debug: 'error' });
  }
}
