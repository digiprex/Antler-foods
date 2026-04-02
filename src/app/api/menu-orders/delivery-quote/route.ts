import { NextRequest, NextResponse } from 'next/server';
import {
  isUberDirectConfigured,
  quoteUberDirectDelivery,
} from '@/lib/server/delivery/uber-direct';

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

    try {
      const quote = await quoteUberDirectDelivery({
        restaurantId,
        locationId: normalizeText(body?.locationId),
        orderValue: subtotal,
        dropoffAddress: {
          formattedAddress,
          placeId: normalizeText(address?.placeId),
          latitude: typeof address?.latitude === 'number' ? address.latitude : null,
          longitude: typeof address?.longitude === 'number' ? address.longitude : null,
          houseFlatFloor: normalizeText(address?.houseFlatFloor),
          instructions: normalizeText(address?.instructions),
        },
      });

      return NextResponse.json({
        success: true,
        available: true,
        quote: {
          provider: 'uber_direct',
          quoteId: quote.quoteId,
          deliveryFee: quote.fee,
          currencyCode: quote.currencyCode,
          etaMinutes: quote.etaMinutes,
          pickupAt: quote.pickupAt,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Uber Direct is unavailable for this address right now.';

      const isConfigurationError =
        message.includes('UBER_DIRECT_') || message.includes('store mapping');

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
