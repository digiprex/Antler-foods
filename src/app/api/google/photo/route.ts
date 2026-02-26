import { NextResponse } from 'next/server';

const DEFAULT_MAX_WIDTH = 1200;
const MIN_MAX_WIDTH = 128;
const MAX_MAX_WIDTH = 1600;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const placeId = normalizePlaceId(url.searchParams.get('placeId'));
    const mediaId =
      normalizeString(url.searchParams.get('mediaId')) ||
      normalizeString(url.searchParams.get('photoId'));
    const maxWidth = normalizeMaxWidth(url.searchParams.get('maxWidth'));

    if (!placeId) {
      return NextResponse.json(
        { success: false, error: 'placeId query parameter is required.' },
        { status: 400 },
      );
    }

    if (!mediaId) {
      return NextResponse.json(
        { success: false, error: 'mediaId query parameter is required.' },
        { status: 400 },
      );
    }

    const normalizedMediaId = mediaId.replace(/^\/+/, '');
    const expectedPhotoPrefix = `places/${placeId}/photos/`;
    const expectedVideoPrefix = `places/${placeId}/videos/`;
    if (
      !normalizedMediaId.startsWith(expectedPhotoPrefix) &&
      !normalizedMediaId.startsWith(expectedVideoPrefix)
    ) {
      return NextResponse.json(
        { success: false, error: 'mediaId does not belong to the provided placeId.' },
        { status: 400 },
      );
    }

    const apiKey =
      normalizeString(process.env.GOOGLE_MAPS_API_KEY) ||
      normalizeString(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Google Maps API key is not configured on server.' },
        { status: 500 },
      );
    }

    const endpoint = new URL(
      `https://places.googleapis.com/v1/${normalizedMediaId}/media`,
    );
    endpoint.searchParams.set('maxWidthPx', String(maxWidth));
    endpoint.searchParams.set('key', apiKey);

    const googleResponse = await fetch(endpoint.toString(), {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
    });

    if (!googleResponse.ok || !googleResponse.body) {
      return NextResponse.json(
        {
          success: false,
          error: `Google photo request failed with HTTP ${googleResponse.status}.`,
        },
        { status: googleResponse.status || 502 },
      );
    }

    const headers = new Headers();
    headers.set(
      'Cache-Control',
      'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    );

    const contentType = googleResponse.headers.get('content-type');
    if (contentType) {
      headers.set('Content-Type', contentType);
    } else {
      headers.set('Content-Type', 'image/jpeg');
    }

    const contentLength = googleResponse.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new Response(googleResponse.body, {
      status: 200,
      headers,
    });
  } catch (caughtError) {
    return NextResponse.json(
      {
        success: false,
        error:
          caughtError instanceof Error
            ? caughtError.message
            : 'Failed to load Google photo.',
      },
      { status: 500 },
    );
  }
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizePlaceId(value: unknown) {
  const direct = normalizeString(value);
  if (!direct) {
    return null;
  }

  const extracted = extractPlaceIdCandidate(direct);
  if (extracted) {
    return extracted;
  }

  try {
    const parsedUrl = new URL(direct);
    const queryCandidates = [
      parsedUrl.searchParams.get('q'),
      parsedUrl.searchParams.get('query'),
      parsedUrl.searchParams.get('place_id'),
      parsedUrl.searchParams.get('placeid'),
    ]
      .map((entry) => normalizeString(entry))
      .filter((entry): entry is string => Boolean(entry));

    for (const candidate of queryCandidates) {
      const resolved = extractPlaceIdCandidate(candidate);
      if (resolved) {
        return resolved;
      }
    }
  } catch {
    // Not a URL.
  }

  return null;
}

function normalizeMaxWidth(value: string | null) {
  const parsed = Number.parseInt(value || '', 10);
  if (Number.isNaN(parsed)) {
    return DEFAULT_MAX_WIDTH;
  }

  return Math.max(MIN_MAX_WIDTH, Math.min(MAX_MAX_WIDTH, parsed));
}

function extractPlaceIdCandidate(value: string) {
  const decoded = safeDecodeURIComponent(value);
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
