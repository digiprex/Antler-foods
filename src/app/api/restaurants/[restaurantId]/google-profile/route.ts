import { NextResponse } from 'next/server';
import {
  RouteError,
  requireRestaurantAccess,
  safeParseJson,
} from '@/lib/server/api-auth';

type GooglePlaceProfileResponse = {
  displayName?: unknown;
  formattedAddress?: unknown;
  shortFormattedAddress?: unknown;
  googleMapsUri?: unknown;
  websiteUri?: unknown;
  nationalPhoneNumber?: unknown;
  internationalPhoneNumber?: unknown;
  rating?: unknown;
  userRatingCount?: unknown;
  businessStatus?: unknown;
  currentOpeningHours?: unknown;
  location?: unknown;
  primaryTypeDisplayName?: unknown;
  error?: unknown;
};

const GOOGLE_PROFILE_FIELDS_MASK = [
  'displayName',
  'formattedAddress',
  'shortFormattedAddress',
  'googleMapsUri',
  'websiteUri',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'rating',
  'userRatingCount',
  'businessStatus',
  'currentOpeningHours.openNow',
  'currentOpeningHours.weekdayDescriptions',
  'location',
  'primaryTypeDisplayName',
].join(',');

const GOOGLE_PROFILE_FALLBACK_FIELDS_MASK = [
  'displayName',
  'formattedAddress',
  'googleMapsUri',
  'rating',
  'userRatingCount',
].join(',');

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
    if (!normalizedPlaceId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stored Google Place ID is invalid. Update Google profile settings.',
        },
        { status: 400 },
      );
    }

    const endpoint = `https://places.googleapis.com/v1/places/${encodeURIComponent(
      normalizedPlaceId,
    )}`;

    const { response, payload } = await fetchGooglePlaceProfile(endpoint, apiKey);
    if (!response.ok) {
      const message = extractGoogleErrorMessage(payload);
      return NextResponse.json(
        {
          success: false,
          error: message || `Google Places request failed with HTTP ${response.status}.`,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      data: normalizeGoogleProfile(payload, normalizedPlaceId),
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
            : 'Failed to load Google profile details.',
      },
      { status: 500 },
    );
  }
}

async function fetchGooglePlaceProfile(endpoint: string, apiKey: string) {
  const fullResponse = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': GOOGLE_PROFILE_FIELDS_MASK,
    },
    cache: 'no-store',
  });
  const fullPayload = (await safeParseJson(fullResponse)) as GooglePlaceProfileResponse | null;
  const shouldRetryWithFallback =
    fullResponse.status === 400 || isFieldMaskError(fullPayload);

  if (fullResponse.ok || !shouldRetryWithFallback) {
    return { response: fullResponse, payload: fullPayload };
  }

  const fallbackResponse = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': GOOGLE_PROFILE_FALLBACK_FIELDS_MASK,
    },
    cache: 'no-store',
  });
  const fallbackPayload = (await safeParseJson(fallbackResponse)) as
    | GooglePlaceProfileResponse
    | null;

  return { response: fallbackResponse, payload: fallbackPayload };
}

function normalizeGoogleProfile(
  payload: GooglePlaceProfileResponse | null,
  placeId: string,
) {
  const record = readRecord(payload);
  const displayName = readRecord(record?.displayName);
  const location = readRecord(record?.location);
  const currentOpeningHours = readRecord(record?.currentOpeningHours);
  const primaryTypeDisplayName = readRecord(record?.primaryTypeDisplayName);
  const weekdayDescriptionsRaw = currentOpeningHours?.weekdayDescriptions;

  return {
    place_id: placeId,
    name: normalizeString(displayName?.text),
    formatted_address: normalizeString(record?.formattedAddress),
    short_address: normalizeString(record?.shortFormattedAddress),
    maps_url:
      normalizeString(record?.googleMapsUri) ||
      `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`,
    website_url: normalizeString(record?.websiteUri),
    phone_number:
      normalizeString(record?.internationalPhoneNumber) ||
      normalizeString(record?.nationalPhoneNumber),
    rating: normalizeRating(record?.rating),
    user_rating_count: normalizePositiveInt(record?.userRatingCount),
    business_status: normalizeString(record?.businessStatus),
    open_now: normalizeBoolean(currentOpeningHours?.openNow),
    weekday_descriptions: Array.isArray(weekdayDescriptionsRaw)
      ? weekdayDescriptionsRaw
          .map((entry) => normalizeString(entry))
          .filter((entry): entry is string => Boolean(entry))
      : [],
    latitude: normalizeNumber(location?.latitude),
    longitude: normalizeNumber(location?.longitude),
    primary_type: normalizeString(primaryTypeDisplayName?.text),
  };
}

function readRecord(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function normalizeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizePositiveInt(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  return null;
}

function normalizeRating(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  const bounded = Math.max(0, Math.min(5, value));
  return Math.round(bounded * 10) / 10;
}

function getGoogleApiKey() {
  return (
    normalizeString(process.env.GOOGLE_MAPS_API_KEY) ||
    normalizeString(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
  );
}

function normalizePlaceId(value: string) {
  const direct = extractPlaceIdCandidate(value);
  if (direct) {
    return direct;
  }

  try {
    const parsedUrl = new URL(value);
    const queryCandidates = [
      parsedUrl.searchParams.get('q'),
      parsedUrl.searchParams.get('query'),
      parsedUrl.searchParams.get('place_id'),
      parsedUrl.searchParams.get('placeid'),
    ]
      .map((entry) => normalizeString(entry))
      .filter((entry): entry is string => Boolean(entry));

    for (const candidate of queryCandidates) {
      const extracted = extractPlaceIdCandidate(candidate);
      if (extracted) {
        return extracted;
      }
    }
  } catch {
    // Not a URL, direct extraction already attempted.
  }

  return '';
}

function extractPlaceIdCandidate(value: string) {
  const direct = normalizeString(value);
  if (!direct) {
    return null;
  }

  const decoded = safeDecodeURIComponent(direct);
  const candidate = decoded.replace(/^\/+/, '').trim();
  if (!candidate) {
    return null;
  }

  const placeIdQueryMatch = candidate.match(/place_id:([^&#?/\s]+)/i);
  if (placeIdQueryMatch?.[1]) {
    return placeIdQueryMatch[1].trim();
  }

  const placeResourceMatch = candidate.match(/(?:^|\/)places\/([^/?#\s]+)/i);
  if (placeResourceMatch?.[1]) {
    return placeResourceMatch[1].trim();
  }

  const normalized = candidate
    .replace(/^place_id:/i, '')
    .replace(/^places\//i, '')
    .trim();

  if (!normalized || !/^[A-Za-z0-9._-]+$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractGoogleErrorMessage(payload: GooglePlaceProfileResponse | null) {
  const record = readRecord(payload);
  const direct = normalizeString(record?.message);
  if (direct) {
    return direct;
  }

  const errorValue = record?.error;
  const errorRecord = readRecord(errorValue);
  if (!errorRecord) {
    return null;
  }

  return normalizeString(errorRecord.message) || normalizeString(errorRecord.status);
}

function isFieldMaskError(payload: GooglePlaceProfileResponse | null) {
  const message = extractGoogleErrorMessage(payload);
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return (
    normalized.includes('fieldmask') ||
    normalized.includes('field mask') ||
    normalized.includes('invalid field') ||
    normalized.includes('cannot find field')
  );
}
