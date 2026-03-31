import { NextResponse } from 'next/server';
import {
  RouteError,
  requireAuthenticatedUser,
  safeParseJson,
} from '@/lib/server/api-auth';

type JsonRecord = Record<string, unknown>;

type GooglePlaceMatchCandidate = {
  id?: unknown;
  name?: unknown;
  displayName?: unknown;
  formattedAddress?: unknown;
  googleMapsUri?: unknown;
  websiteUri?: unknown;
  location?: unknown;
};

type GooglePlaceMatchSearchResponse = {
  places?: unknown;
  error?: unknown;
};

const GOOGLE_PLACE_MATCH_FIELDS_MASK = [
  'places.id',
  'places.name',
  'places.displayName',
  'places.formattedAddress',
  'places.googleMapsUri',
  'places.websiteUri',
  'places.location',
].join(',');

export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser(request);

    const payload = (await safeParseJson(request)) as JsonRecord | null;
    const name = normalizeString(payload?.name);
    const address = normalizeString(payload?.address);
    const city = normalizeString(payload?.city);
    const state = normalizeString(payload?.state);
    const postalCode = normalizeString(payload?.postalCode);
    const country = normalizeString(payload?.country);

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Restaurant name is required.' },
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

    const textQuery = buildTextQuery({
      name,
      address,
      city,
      state,
      postalCode,
      country,
    });

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': GOOGLE_PLACE_MATCH_FIELDS_MASK,
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 5,
      }),
      cache: 'no-store',
    });

    const result = (await safeParseJson(response)) as GooglePlaceMatchSearchResponse | null;
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            extractGoogleErrorMessage(result) ||
            `Google Places search failed with HTTP ${response.status}.`,
        },
        { status: response.status },
      );
    }

    const candidates = Array.isArray(result?.places)
      ? result.places
          .map((candidate) => normalizeCandidate(candidate))
          .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
      : [];

    const bestMatch = pickBestCandidate(candidates, {
      name,
      address,
      city,
      state,
      postalCode,
      country,
    });

    if (!bestMatch) {
      return NextResponse.json(
        { success: false, error: 'No matching Google listing found.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: bestMatch,
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
            : 'Failed to match Google Place.',
      },
      { status: 500 },
    );
  }
}

function buildTextQuery({
  name,
  address,
  city,
  state,
  postalCode,
  country,
}: {
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}) {
  return [name, address, city, state, postalCode, country]
    .filter(Boolean)
    .join(', ');
}

function normalizeCandidate(value: unknown) {
  const record = readRecord(value);
  if (!record) {
    return null;
  }

  const location = readRecord(record.location);
  const placeId =
    normalizePlaceIdCandidate(record.id) ||
    normalizePlaceIdCandidate(record.name);

  if (!placeId) {
    return null;
  }

  const displayName = readRecord(record.displayName);

  return {
    placeId,
    name: normalizeString(displayName?.text) || normalizeString(record.displayName),
    formattedAddress: normalizeString(record.formattedAddress),
    googleMapsUri: normalizeString(record.googleMapsUri),
    websiteUri: normalizeString(record.websiteUri),
    latitude: normalizeNumber(location?.latitude),
    longitude: normalizeNumber(location?.longitude),
  };
}

function pickBestCandidate(
  candidates: Array<{
    placeId: string;
    name: string | null;
    formattedAddress: string | null;
    googleMapsUri: string | null;
    websiteUri: string | null;
    latitude: number | null;
    longitude: number | null;
  }>,
  input: {
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  },
) {
  if (!candidates.length) {
    return null;
  }

  const normalizedInputName = normalizeComparisonText(input.name);
  const normalizedAddressTokens = tokenizeForComparison(
    [input.address, input.city, input.state, input.postalCode, input.country]
      .filter(Boolean)
      .join(' '),
  );

  return candidates
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(candidate, normalizedInputName, normalizedAddressTokens),
    }))
    .sort((left, right) => right.score - left.score)[0]?.candidate || null;
}

function scoreCandidate(
  candidate: {
    name: string | null;
    formattedAddress: string | null;
    googleMapsUri: string | null;
    websiteUri: string | null;
  },
  normalizedInputName: string,
  normalizedAddressTokens: string[],
) {
  const normalizedCandidateName = normalizeComparisonText(candidate.name || '');
  const normalizedCandidateAddress = normalizeComparisonText(
    candidate.formattedAddress || '',
  );

  let score = 0;

  if (normalizedCandidateName === normalizedInputName) {
    score += 100;
  } else if (
    normalizedCandidateName.includes(normalizedInputName) ||
    normalizedInputName.includes(normalizedCandidateName)
  ) {
    score += 60;
  }

  const inputNameTokens = tokenizeForComparison(normalizedInputName);
  for (const token of inputNameTokens) {
    if (normalizedCandidateName.includes(token)) {
      score += 12;
    }
  }

  for (const token of normalizedAddressTokens) {
    if (normalizedCandidateAddress.includes(token)) {
      score += 4;
    }
  }

  if (candidate.googleMapsUri) {
    score += 5;
  }
  if (candidate.websiteUri) {
    score += 3;
  }

  return score;
}

function tokenizeForComparison(value: string) {
  return normalizeComparisonText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

function normalizeComparisonText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizePlaceIdCandidate(value: unknown) {
  const raw = normalizeString(value);
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(/^places\//i, '').trim();
  return normalized && /^[A-Za-z0-9._-]+$/.test(normalized) ? normalized : null;
}

function readRecord(value: unknown) {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getGoogleApiKey() {
  return (
    normalizeString(process.env.GOOGLE_MAPS_API_KEY) ||
    normalizeString(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
  );
}

function extractGoogleErrorMessage(payload: GooglePlaceMatchSearchResponse | null) {
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
