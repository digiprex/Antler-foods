import { NextRequest, NextResponse } from 'next/server';
import {
  isUberDirectConfigured,
  quoteUberDirectDelivery,
} from '@/lib/server/delivery/uber-direct';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const GET_RESTAURANT_ADDRESS = `
  query GetRestaurantAddress($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      name
      address
      city
      state
      country
      postal_code
      phone_number
    }
  }
`;

const INSERT_DELIVERY_QUOTE = `
  mutation InsertDeliveryQuote($object: delivery_quotes_insert_input!) {
    insert_delivery_quotes_one(object: $object) {
      delivery_quote_id
    }
  }
`;

interface DeliveryQuoteRequestBody {
  restaurantId?: string;
  locationId?: string | null;
  subtotal?: number;
  deliveryAddressData?: {
    formattedAddress?: string;
    placeId?: string;
    latitude?: number;
    longitude?: number;
    houseFlatFloor?: string;
    instructions?: string;
  } | null;
}

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}


function buildFormattedAddress(restaurant: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
}): string | null {
  const parts = [
    normalizeText(restaurant.address),
    normalizeText(restaurant.city),
    normalizeText(restaurant.state),
    normalizeText(restaurant.postal_code),
    normalizeText(restaurant.country),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : null;
}

export async function POST(request: NextRequest) {
  try {
    if (!isUberDirectConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Uber Direct is not configured yet.',
        },
        { status: 503 },
      );
    }

    const body = (await request.json().catch(() => null)) as DeliveryQuoteRequestBody | null;
    const restaurantId = normalizeText(body?.restaurantId);
    const locationId = normalizeText(body?.locationId);
    const subtotal = typeof body?.subtotal === 'number' ? body.subtotal : Number.NaN;
    const address = body?.deliveryAddressData;
    const formattedAddress = normalizeText(address?.formattedAddress);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId is required.' },
        { status: 400 },
      );
    }

    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      return NextResponse.json(
        { success: false, error: 'A valid subtotal is required.' },
        { status: 400 },
      );
    }

    if (!formattedAddress) {
      return NextResponse.json(
        { success: false, error: 'A delivery address is required.' },
        { status: 400 },
      );
    }

    const placeId = normalizeText(address?.placeId);
    const latitude = typeof address?.latitude === 'number' ? address.latitude : null;
    const longitude = typeof address?.longitude === 'number' ? address.longitude : null;
    const houseFlatFloor = normalizeText(address?.houseFlatFloor);
    const instructions = normalizeText(address?.instructions);

    try {
      const restaurantResult = await adminGraphqlRequest<{
        restaurants_by_pk?: {
          name?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          postal_code?: string | null;
          phone_number?: string | null;
        } | null;
      }>(GET_RESTAURANT_ADDRESS, { restaurant_id: restaurantId });

      const restaurant = restaurantResult.restaurants_by_pk;
      const pickupAddress = buildFormattedAddress(restaurant || {});
      if (!pickupAddress) {
        return NextResponse.json(
          { success: false, available: false, error: 'Restaurant address is not configured.' },
          { status: 503 },
        );
      }

      const quote = await quoteUberDirectDelivery({
        restaurantId,
        locationId,
        orderValue: subtotal,
        pickup: {
          address: pickupAddress,
          name: normalizeText(restaurant?.name),
          phoneNumber: normalizeText(restaurant?.phone_number),
        },
        dropoffAddress: {
          formattedAddress,
          placeId,
          latitude,
          longitude,
          houseFlatFloor,
          instructions,
        },
      });

      let deliveryQuoteId: string | null = null;
      try {
        const insertResult = await adminGraphqlRequest<{
          insert_delivery_quotes_one?: { delivery_quote_id?: string } | null;
        }>(INSERT_DELIVERY_QUOTE, {
          object: {
            restaurant_id: restaurantId,
            location_id: locationId,
            provider: 'uber_direct',
            provider_quote_id: quote.quoteId,
            delivery_fee: quote.fee,
            currency_code: quote.currencyCode,
            eta_minutes: quote.etaMinutes,
            delivery_address: formattedAddress,
            delivery_place_id: placeId,
            expires_at: quote.expiresAt != null ? new Date(quote.expiresAt * 1000).toISOString() : null,
            raw_response: quote.rawPayload,
          },
        });
        deliveryQuoteId = insertResult.insert_delivery_quotes_one?.delivery_quote_id || null;
      } catch (saveError) {
        console.error('[Menu Orders] Failed to persist delivery quote:', saveError);
      }

      return NextResponse.json({
        success: true,
        available: true,
        quote: {
          id: deliveryQuoteId,
          provider: 'uber_direct',
          quoteId: quote.quoteId,
          deliveryFee: quote.fee,
          currencyCode: quote.currencyCode,
          etaMinutes: quote.etaMinutes,
          pickupAt: quote.pickupAt,
        },
      });
    } catch (error) {
      console.error('[Menu Orders] Uber quote failed:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Uber Direct is unavailable for this address right now.';

      const isConfigurationError =
        message.includes('UBER_DIRECT_') || message.includes('pickup address');

      return NextResponse.json(
        {
          success: false,
          available: false,
          error: message,
        },
        { status: isConfigurationError ? 503 : 200 },
      );
    }
  } catch (error) {
    console.error('[Menu Orders] Delivery quote error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to check delivery availability right now.' },
      { status: 500 },
    );
  }
}
