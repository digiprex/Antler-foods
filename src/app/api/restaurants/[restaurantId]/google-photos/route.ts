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

type GooglePlaceVideo = {
  name?: unknown;
  widthPx?: unknown;
  heightPx?: unknown;
};

type GooglePlacePhotosResponse = {
  photos?: unknown;
  videos?: unknown;
  error?: unknown;
};

const GOOGLE_MEDIA_FIELDS_MASK =
  'photos.name,photos.widthPx,photos.heightPx,videos.name,videos.widthPx,videos.heightPx';
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

    const { response, payload } = await fetchGooglePlaceMedia(endpoint, apiKey);

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
    const videos = Array.isArray(payload?.videos) ? payload?.videos : [];
    const normalized = [
      ...photos
        .map((photo) => toMediaItem(photo, normalizedPlaceId, 'photo'))
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
      ...videos
        .map((video) => toMediaItem(video, normalizedPlaceId, 'video'))
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    ];

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
            : 'Failed to load Google place media.',
      },
      { status: 500 },
    );
  }
}

function toMediaItem(
  rawMedia: unknown,
  placeId: string,
  kind: 'photo' | 'video',
) {
  const media = (rawMedia || {}) as GooglePlacePhoto | GooglePlaceVideo;
  const mediaId = normalizeString(media.name);
  if (!mediaId) {
    return null;
  }

  return {
    media_id: mediaId,
    kind,
    width: normalizePositiveInt(media.widthPx),
    height: normalizePositiveInt(media.heightPx),
    preview_url: buildGoogleMediaProxyUrl(placeId, mediaId, 640),
  };
}

function buildGoogleMediaProxyUrl(placeId: string, mediaId: string, maxWidth: number) {
  const params = new URLSearchParams();
  params.set('placeId', placeId);
  params.set('mediaId', mediaId);
  params.set('maxWidth', String(maxWidth));
  return `/api/google/photo?${params.toString()}`;
}

async function fetchGooglePlaceMedia(endpoint: string, apiKey: string) {
  const mediaResponse = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': GOOGLE_MEDIA_FIELDS_MASK,
    },
    cache: 'no-store',
  });

  const mediaPayload = (await safeParseJson(mediaResponse)) as GooglePlacePhotosResponse | null;
  const shouldRetryWithPhotosOnly =
    mediaResponse.status === 400 || isFieldMaskError(mediaPayload);

  if (mediaResponse.ok || !shouldRetryWithPhotosOnly) {
    return { response: mediaResponse, payload: mediaPayload };
  }

  const photoOnlyResponse = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': GOOGLE_PHOTO_FIELDS_MASK,
    },
    cache: 'no-store',
  });
  const photoOnlyPayload = (await safeParseJson(photoOnlyResponse)) as
    | GooglePlacePhotosResponse
    | null;
  return { response: photoOnlyResponse, payload: photoOnlyPayload };
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
    // Not a URL, direct parsing above already attempted.
  }

  return '';
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

function isFieldMaskError(payload: GooglePlacePhotosResponse | null) {
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
