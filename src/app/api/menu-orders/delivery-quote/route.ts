import { NextRequest, NextResponse } from 'next/server';
import {
  isUberDirectConfigured,
  quoteUberDirectDelivery,
} from '@/lib/server/delivery/uber-direct';
import {
  isDoorDashDriveConfigured,
  quoteDoorDashDriveDelivery,
} from '@/lib/server/delivery/doordash-drive';
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

interface ProviderQuote {
  provider: string;
  quoteId: string;
  deliveryFee: number;
  feeMinor: number;
  currencyCode: string;
  etaMinutes: number | null;
  pickupAt?: number;
  expiresAt: number | null;
  rawPayload: unknown;
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

function pickBestQuote(quotes: ProviderQuote[]): ProviderQuote | null {
  if (quotes.length === 0) return null;
  if (quotes.length === 1) return quotes[0];

  return quotes.sort((a, b) => {
    // Lowest fee first
    if (a.deliveryFee !== b.deliveryFee) {
      return a.deliveryFee - b.deliveryFee;
    }
    // If same fee, fastest ETA first (null ETA goes last)
    const etaA = a.etaMinutes ?? Infinity;
    const etaB = b.etaMinutes ?? Infinity;
    return etaA - etaB;
  })[0];
}

export async function POST(request: NextRequest) {
  try {
    const uberConfigured = isUberDirectConfigured();
    const doorDashConfigured = isDoorDashDriveConfigured();

    if (!uberConfigured && !doorDashConfigured) {
      return NextResponse.json(
        {
          success: false,
          error: 'No delivery provider is configured.',
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

      const restaurantName = normalizeText(restaurant?.name);
      const restaurantPhone = normalizeText(restaurant?.phone_number);

      // Fetch quotes from all configured providers in parallel
      const quotePromises: Promise<ProviderQuote | null>[] = [];

      if (uberConfigured) {
        quotePromises.push(
          quoteUberDirectDelivery({
            restaurantId,
            locationId,
            orderValue: subtotal,
            pickup: {
              address: pickupAddress,
              name: restaurantName,
              phoneNumber: restaurantPhone,
            },
            dropoffAddress: {
              formattedAddress,
              placeId,
              latitude,
              longitude,
              houseFlatFloor,
              instructions,
            },
          })
            .then((quote): ProviderQuote => ({
              provider: 'uber_direct',
              quoteId: quote.quoteId,
              deliveryFee: quote.fee,
              feeMinor: quote.feeMinor,
              currencyCode: quote.currencyCode,
              etaMinutes: quote.etaMinutes,
              pickupAt: quote.pickupAt,
              expiresAt: quote.expiresAt,
              rawPayload: quote.rawPayload,
            }))
            .catch((err) => {
              console.error('[Delivery Quote] Uber Direct quote failed:', err);
              return null;
            }),
        );
      }

      if (doorDashConfigured) {
        quotePromises.push(
          quoteDoorDashDriveDelivery({
            restaurantId,
            locationId,
            orderValue: subtotal,
            pickup: {
              address: pickupAddress,
              name: restaurantName,
              phoneNumber: restaurantPhone,
            },
            dropoffAddress: {
              formattedAddress,
              placeId,
              latitude,
              longitude,
              houseFlatFloor,
              instructions,
            },
          })
            .then((quote): ProviderQuote => ({
              provider: 'doordash_drive',
              quoteId: quote.quoteId,
              deliveryFee: quote.fee,
              feeMinor: quote.feeMinor,
              currencyCode: quote.currencyCode,
              etaMinutes: quote.etaMinutes,
              expiresAt: quote.expiresAt,
              rawPayload: quote.rawPayload,
            }))
            .catch((err) => {
              console.error('[Delivery Quote] DoorDash Drive quote failed:', err);
              return null;
            }),
        );
      }

      const results = await Promise.all(quotePromises);
      const successfulQuotes = results.filter((q): q is ProviderQuote => q !== null);

      if (successfulQuotes.length === 0) {
        return NextResponse.json({
          success: false,
          available: false,
          error: 'Delivery is unavailable for this address right now.',
        });
      }

      // Store all quotes in DB
      const savedQuotes: Array<{ provider: string; deliveryQuoteId: string | null }> = [];
      for (const quote of successfulQuotes) {
        try {
          const insertResult = await adminGraphqlRequest<{
            insert_delivery_quotes_one?: { delivery_quote_id?: string } | null;
          }>(INSERT_DELIVERY_QUOTE, {
            object: {
              restaurant_id: restaurantId,
              location_id: locationId,
              provider: quote.provider,
              provider_quote_id: quote.quoteId,
              delivery_fee: quote.deliveryFee,
              currency_code: quote.currencyCode,
              eta_minutes: quote.etaMinutes,
              delivery_address: formattedAddress,
              delivery_place_id: placeId,
              expires_at:
                quote.expiresAt != null
                  ? new Date(quote.expiresAt * 1000).toISOString()
                  : null,
              raw_response: quote.rawPayload,
            },
          });
          savedQuotes.push({
            provider: quote.provider,
            deliveryQuoteId:
              insertResult.insert_delivery_quotes_one?.delivery_quote_id || null,
          });
        } catch (saveError) {
          console.error(`[Delivery Quote] Failed to persist ${quote.provider} quote:`, saveError);
          savedQuotes.push({ provider: quote.provider, deliveryQuoteId: null });
        }
      }

      // Pick the best quote (lowest fee, then fastest ETA)
      const bestQuote = pickBestQuote(successfulQuotes)!;
      const bestSaved = savedQuotes.find((s) => s.provider === bestQuote.provider);

      return NextResponse.json({
        success: true,
        available: true,
        quote: {
          id: bestSaved?.deliveryQuoteId || null,
          provider: bestQuote.provider,
          quoteId: bestQuote.quoteId,
          deliveryFee: bestQuote.deliveryFee,
          currencyCode: bestQuote.currencyCode,
          etaMinutes: bestQuote.etaMinutes,
          pickupAt: bestQuote.pickupAt ?? 0,
        },
        allQuotes: successfulQuotes.map((q) => ({
          provider: q.provider,
          deliveryFee: q.deliveryFee,
          etaMinutes: q.etaMinutes,
          selected: q.provider === bestQuote.provider,
        })),
      });
    } catch (error) {
      console.error('[Delivery Quote] Quote failed:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Delivery is unavailable for this address right now.';

      const isConfigurationError =
        message.includes('UBER_DIRECT_') ||
        message.includes('DOORDASH_DRIVE_') ||
        message.includes('pickup address');

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
    console.error('[Delivery Quote] Delivery quote error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to check delivery availability right now.' },
      { status: 500 },
    );
  }
}
