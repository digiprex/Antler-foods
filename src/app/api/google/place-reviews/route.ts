import { NextResponse } from "next/server";

type JsonRecord = Record<string, unknown>;

type GoogleReviewRecord = {
  name?: string;
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  publishTime?: string;
  googleMapsUri?: string;
  authorAttribution?: {
    displayName?: string;
    uri?: string;
    photoUri?: string;
  };
};

type PlaceReviewsResponse = {
  reviews?: GoogleReviewRecord[];
};

const GOOGLE_FIELDS_MASK = [
  "reviews.name",
  "reviews.rating",
  "reviews.text",
  "reviews.originalText",
  "reviews.publishTime",
  "reviews.authorAttribution.displayName",
  "reviews.authorAttribution.uri",
  "reviews.authorAttribution.photoUri",
  "reviews.googleMapsUri",
].join(",");

export async function POST(request: Request) {
  try {
    const payload = (await safeParseJson(request)) as JsonRecord | null;
    const placeId = normalizeString(payload?.placeId);

    if (!placeId) {
      return NextResponse.json({ error: "placeId is required." }, { status: 400 });
    }

    const apiKey =
      normalizeString(process.env.GOOGLE_MAPS_API_KEY) ||
      normalizeString(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Maps API key is not configured on server." },
        { status: 500 },
      );
    }

    const normalizedPlaceId = normalizePlaceId(placeId);
    const endpoint = `https://places.googleapis.com/v1/places/${encodeURIComponent(
      normalizedPlaceId,
    )}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": GOOGLE_FIELDS_MASK,
      },
      cache: "no-store",
    });

    const body = (await safeParseJson(response)) as JsonRecord | null;

    if (!response.ok) {
      const errorMessage = extractGoogleErrorMessage(body);
      return NextResponse.json(
        {
          error:
            errorMessage ||
            `Google Places request failed with HTTP ${response.status}.`,
        },
        { status: response.status },
      );
    }

    const data = body as PlaceReviewsResponse | null;
    const reviews = Array.isArray(data?.reviews)
      ? data.reviews.map(toNormalizedReview).filter(Boolean)
      : [];

    return NextResponse.json({ reviews });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error
        ? caughtError.message
        : "Failed to fetch Google place reviews.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function toNormalizedReview(rawReview: GoogleReviewRecord) {
  const rating =
    typeof rawReview.rating === "number" && !Number.isNaN(rawReview.rating)
      ? Math.max(1, Math.min(5, Math.round(rawReview.rating)))
      : 5;

  const reviewText =
    normalizeString(rawReview.text?.text) ||
    normalizeString(rawReview.originalText?.text) ||
    null;

  const reviewName = normalizeString(rawReview.name);

  return {
    source: "google",
    external_review_id: extractExternalReviewId(reviewName),
    rating,
    author_name: normalizeString(rawReview.authorAttribution?.displayName),
    review_text: reviewText,
    author_url: normalizeString(rawReview.authorAttribution?.uri),
    review_url: normalizeString(rawReview.googleMapsUri),
    avatar_url: normalizeString(rawReview.authorAttribution?.photoUri),
    published_at: normalizeIsoString(rawReview.publishTime),
  };
}

function extractExternalReviewId(value: string | null) {
  if (!value) {
    return null;
  }

  const lastSegment = value.split("/").filter(Boolean).at(-1);
  return normalizeString(lastSegment);
}

function normalizePlaceId(value: string) {
  return value.replace(/^places\//i, "").trim();
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeIsoString(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function extractGoogleErrorMessage(payload: JsonRecord | null) {
  const direct = normalizeString(payload?.message);
  if (direct) {
    return direct;
  }

  const error = payload?.error;
  if (!error || typeof error !== "object") {
    return null;
  }

  const errorRecord = error as JsonRecord;
  const candidates = [errorRecord.message, errorRecord.status];
  for (const candidate of candidates) {
    const normalized = normalizeString(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

async function safeParseJson(requestOrResponse: Request | Response) {
  try {
    return await requestOrResponse.json();
  } catch {
    return null;
  }
}
