import { NextResponse } from 'next/server';
import {
  RouteError,
  requireRestaurantAccess,
  safeParseJson,
} from '@/lib/server/api-auth';

type GooglePlacePhoto = {
  name?: unknown;
  widthPx?: unknown;
  heightPx?: unknown;
};

type GooglePlacePhotosResponse = {
  photos?: unknown;
};

const GOOGLE_PHOTO_FIELDS_MASK = 'photos.name,photos.widthPx,photos.heightPx';

export async function GET(
  request: Request,
  context: { params: { restaurantId: string } },
) {
  try {
    const restaurantId = context.params.restaurantId?.trim() || '';
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId is required.' },
        { status: 400 },
      );
    }

    const { restaurant } = await requireRestaurantAccess(request, restaurantId);
    if (!restaurant.googlePlaceId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant does not have a Google Place ID.' },
        { status: 400 },
      );
    }

    const apiKey = getGoogleApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Google Maps API key is not configured on server.' },
        { status: 500 },
      );
    }

    const normalizedPlaceId = normalizePlaceId(restaurant.googlePlaceId);
    const endpoint = `https://places.googleapis.com/v1/places/${encodeURIComponent(
      normalizedPlaceId,
    )}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': GOOGLE_PHOTO_FIELDS_MASK,
      },
      cache: 'no-store',
    });

    const payload = (await safeParseJson(response)) as GooglePlacePhotosResponse | null;
    if (!response.ok) {
      const message = extractGoogleErrorMessage(payload);
      return NextResponse.json(
        {
          success: false,
          error:
            message || `Google Places request failed with HTTP ${response.status}.`,
        },
        { status: response.status },
      );
    }

    const photos = Array.isArray(payload?.photos) ? payload?.photos : [];
    const normalized = photos
      .map((photo) => toPhotoItem(photo, normalizedPlaceId))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return NextResponse.json({
      success: true,
      data: normalized,
    });
  } catch (caughtError) {
    if (caughtError instanceof RouteError) {
      return NextResponse.json(
        { success: false, error: caughtError.message },
        { status: caughtError.status },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          caughtError instanceof Error
            ? caughtError.message
            : 'Failed to load Google place photos.',
      },
      { status: 500 },
    );
  }
}

function toPhotoItem(rawPhoto: unknown, placeId: string) {
  const photo = (rawPhoto || {}) as GooglePlacePhoto;
  const photoId = normalizeString(photo.name);
  if (!photoId) {
    return null;
  }

  return {
    photo_id: photoId,
    width: normalizePositiveInt(photo.widthPx),
    height: normalizePositiveInt(photo.heightPx),
    preview_url: buildGooglePhotoProxyUrl(placeId, photoId, 640),
  };
}

function buildGooglePhotoProxyUrl(placeId: string, photoId: string, maxWidth: number) {
  const params = new URLSearchParams();
  params.set('placeId', placeId);
  params.set('photoId', photoId);
  params.set('maxWidth', String(maxWidth));
  return `/api/google/photo?${params.toString()}`;
}

function normalizePlaceId(value: string) {
  return value.replace(/^places\//i, '').trim();
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizePositiveInt(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  return null;
}

function getGoogleApiKey() {
  return (
    normalizeString(process.env.GOOGLE_MAPS_API_KEY) ||
    normalizeString(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
  );
}

function extractGoogleErrorMessage(payload: GooglePlacePhotosResponse | null) {
  const record =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : null;
  const direct = normalizeString(record?.message);
  if (direct) {
    return direct;
  }

  const errorValue = record?.error;
  if (!errorValue || typeof errorValue !== 'object') {
    return null;
  }

  const errorRecord = errorValue as Record<string, unknown>;
  return normalizeString(errorRecord.message) || normalizeString(errorRecord.status);
}
