import { NextResponse } from 'next/server';
import {
  RouteError,
  requireAuthenticatedUser,
  safeParseJson,
} from '@/lib/server/api-auth';

type JsonRecord = Record<string, unknown>;

type PlaceSocialLinksResponse = {
  websiteUri?: unknown;
  googleMapsUri?: unknown;
  error?: unknown;
};

type ExtractedSocialLinks = {
  websiteUrl: string | null;
  googleBusinessLink: string | null;
  facebookLink: string | null;
  instagramLink: string | null;
  xLink: string | null;
  linkedinLink: string | null;
  tiktokLink: string | null;
  youtubeLink: string | null;
  yelpLink: string | null;
  ubereatsLink: string | null;
  grubhubLink: string | null;
  doordashLink: string | null;
};

const GOOGLE_SOCIAL_FIELDS_MASK = ['websiteUri', 'googleMapsUri'].join(',');
const WEBSITE_FETCH_TIMEOUT_MS = 8000;
const WEBSITE_FETCH_USER_AGENT =
  'Mozilla/5.0 (compatible; AntlerFoodsSocialSync/1.0; +https://antlerfoods.com)';

export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser(request);

    const payload = (await safeParseJson(request)) as JsonRecord | null;
    const placeId = normalizeString(payload?.placeId);

    if (!placeId) {
      return NextResponse.json(
        { success: false, error: 'placeId is required.' },
        { status: 400 },
      );
    }

    const apiKey = getGoogleApiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Maps API key is not configured on server.',
        },
        { status: 500 },
      );
    }

    const normalizedPlaceId = normalizePlaceId(placeId);
    if (!normalizedPlaceId) {
      return NextResponse.json(
        { success: false, error: 'Invalid Google Place ID.' },
        { status: 400 },
      );
    }

    const endpoint = `https://places.googleapis.com/v1/places/${encodeURIComponent(
      normalizedPlaceId,
    )}`;

    const googleResponse = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': GOOGLE_SOCIAL_FIELDS_MASK,
      },
      cache: 'no-store',
    });

    const googlePayload = (await safeParseJson(
      googleResponse,
    )) as PlaceSocialLinksResponse | null;

    if (!googleResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            extractGoogleErrorMessage(googlePayload) ||
            `Google Places request failed with HTTP ${googleResponse.status}.`,
        },
        { status: googleResponse.status },
      );
    }

    const websiteUrl = normalizeUrl(googlePayload?.websiteUri);
    const googleBusinessLink =
      normalizeUrl(googlePayload?.googleMapsUri) ||
      `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(
        normalizedPlaceId,
      )}`;

    const extractedLinks = websiteUrl
      ? await extractSocialLinksFromWebsite(websiteUrl)
      : EMPTY_EXTRACTED_SOCIAL_LINKS;

    return NextResponse.json({
      success: true,
      data: {
        websiteUrl,
        googleBusinessLink,
        ...extractedLinks,
      } satisfies ExtractedSocialLinks,
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
            : 'Failed to fetch place social links.',
      },
      { status: 500 },
    );
  }
}

const EMPTY_EXTRACTED_SOCIAL_LINKS: Omit<
  ExtractedSocialLinks,
  'websiteUrl' | 'googleBusinessLink'
> = {
  facebookLink: null,
  instagramLink: null,
  xLink: null,
  linkedinLink: null,
  tiktokLink: null,
  youtubeLink: null,
  yelpLink: null,
  ubereatsLink: null,
  grubhubLink: null,
  doordashLink: null,
};

async function extractSocialLinksFromWebsite(
  websiteUrl: string,
): Promise<Omit<ExtractedSocialLinks, 'websiteUrl' | 'googleBusinessLink'>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, WEBSITE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(websiteUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'User-Agent': WEBSITE_FETCH_USER_AGENT,
      },
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      return EMPTY_EXTRACTED_SOCIAL_LINKS;
    }

    const html = await response.text();
    const candidates = extractCandidateUrls(html, websiteUrl);

    return {
      facebookLink: selectBestSocialUrl(candidates, 'facebook'),
      instagramLink: selectBestSocialUrl(candidates, 'instagram'),
      xLink: selectBestSocialUrl(candidates, 'x'),
      linkedinLink: selectBestSocialUrl(candidates, 'linkedin'),
      tiktokLink: selectBestSocialUrl(candidates, 'tiktok'),
      youtubeLink: selectBestSocialUrl(candidates, 'youtube'),
      yelpLink: selectBestSocialUrl(candidates, 'yelp'),
      ubereatsLink: selectBestSocialUrl(candidates, 'ubereats'),
      grubhubLink: selectBestSocialUrl(candidates, 'grubhub'),
      doordashLink: selectBestSocialUrl(candidates, 'doordash'),
    };
  } catch {
    return EMPTY_EXTRACTED_SOCIAL_LINKS;
  } finally {
    clearTimeout(timeoutId);
  }
}

type SupportedSocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'x'
  | 'linkedin'
  | 'tiktok'
  | 'youtube'
  | 'yelp'
  | 'ubereats'
  | 'grubhub'
  | 'doordash';

type SocialPlatformConfig = {
  hosts: string[];
  invalidPatterns: RegExp[];
  preferredPatterns: RegExp[];
};

const SOCIAL_PLATFORM_CONFIG: Record<SupportedSocialPlatform, SocialPlatformConfig> =
  {
    facebook: {
      hosts: ['facebook.com', 'fb.com'],
      invalidPatterns: [
        /sharer/i,
        /share\.php/i,
        /dialog/i,
        /plugins/i,
        /login/i,
        /privacy/i,
        /policy/i,
      ],
      preferredPatterns: [/facebook\.com\/[^/?#]+$/i, /facebook\.com\/pages\//i],
    },
    instagram: {
      hosts: ['instagram.com'],
      invalidPatterns: [
        /\/p\//i,
        /\/reel\//i,
        /\/stories\//i,
        /\/explore\//i,
        /\/accounts\//i,
      ],
      preferredPatterns: [/instagram\.com\/[^/?#]+\/?$/i],
    },
    x: {
      hosts: ['x.com', 'twitter.com'],
      invalidPatterns: [
        /intent\/tweet/i,
        /\/share/i,
        /\/search/i,
        /\/home/i,
        /\/hashtag\//i,
        /\/status\//i,
        /\/i\/flow\//i,
      ],
      preferredPatterns: [/(x|twitter)\.com\/[^/?#]+\/?$/i],
    },
    linkedin: {
      hosts: ['linkedin.com'],
      invalidPatterns: [
        /shareArticle/i,
        /\/feed\//i,
        /\/jobs\//i,
        /\/posts\//i,
        /\/learning\//i,
      ],
      preferredPatterns: [/linkedin\.com\/company\//i, /linkedin\.com\/in\//i],
    },
    tiktok: {
      hosts: ['tiktok.com'],
      invalidPatterns: [/\/discover\//i, /\/tag\//i, /\/video\//i],
      preferredPatterns: [/tiktok\.com\/@/i],
    },
    youtube: {
      hosts: ['youtube.com', 'youtu.be'],
      invalidPatterns: [/\/watch\?/i, /youtu\.be\//i, /\/shorts\//i, /\/playlist\?/i],
      preferredPatterns: [
        /youtube\.com\/@/i,
        /youtube\.com\/channel\//i,
        /youtube\.com\/c\//i,
        /youtube\.com\/user\//i,
      ],
    },
    yelp: {
      hosts: ['yelp.com'],
      invalidPatterns: [/\/search/i],
      preferredPatterns: [/yelp\.com\/biz\//i],
    },
    ubereats: {
      hosts: ['ubereats.com'],
      invalidPatterns: [],
      preferredPatterns: [/ubereats\.com\//i],
    },
    grubhub: {
      hosts: ['grubhub.com'],
      invalidPatterns: [],
      preferredPatterns: [/grubhub\.com\//i],
    },
    doordash: {
      hosts: ['doordash.com'],
      invalidPatterns: [],
      preferredPatterns: [/doordash\.com\//i],
    },
  };

function extractCandidateUrls(html: string, baseUrl: string) {
  const matches = new Set<string>();
  const hrefRegex =
    /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s"'<>]+))/gi;
  let hrefMatch: RegExpExecArray | null = null;

  while ((hrefMatch = hrefRegex.exec(html)) !== null) {
    const rawHref = hrefMatch[1] || hrefMatch[2] || hrefMatch[3] || '';
    const normalized = normalizeCandidateUrl(rawHref, baseUrl);
    if (normalized) {
      matches.add(normalized);
    }
  }

  const rawUrlRegex = /https?:\/\/[^\s"'<>\\]+/gi;
  let rawUrlMatch: RegExpExecArray | null = null;
  while ((rawUrlMatch = rawUrlRegex.exec(html)) !== null) {
    const normalized = normalizeCandidateUrl(rawUrlMatch[0], baseUrl);
    if (normalized) {
      matches.add(normalized);
    }
  }

  return Array.from(matches);
}

function normalizeCandidateUrl(rawValue: string, baseUrl: string) {
  const normalizedRaw = rawValue
    .trim()
    .replace(/&amp;/gi, '&')
    .replace(/[),.;]+$/g, '');

  if (!normalizedRaw) {
    return null;
  }

  if (
    normalizedRaw.startsWith('mailto:') ||
    normalizedRaw.startsWith('tel:') ||
    normalizedRaw.startsWith('javascript:')
  ) {
    return null;
  }

  try {
    const parsed = new URL(normalizedRaw, baseUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

function selectBestSocialUrl(
  candidates: string[],
  platform: SupportedSocialPlatform,
) {
  const scoredCandidates = candidates
    .map((candidate) => ({
      candidate,
      score: scoreSocialCandidate(candidate, platform),
    }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score);

  return scoredCandidates[0]?.candidate || null;
}

function scoreSocialCandidate(
  candidate: string,
  platform: SupportedSocialPlatform,
) {
  const config = SOCIAL_PLATFORM_CONFIG[platform];

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(candidate);
  } catch {
    return -1;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const normalizedCandidate = candidate.toLowerCase();

  if (!config.hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
    return -1;
  }

  if (config.invalidPatterns.some((pattern) => pattern.test(normalizedCandidate))) {
    return -1;
  }

  let score = 50;

  if (config.preferredPatterns.some((pattern) => pattern.test(normalizedCandidate))) {
    score += 25;
  }

  if (parsedUrl.search) {
    score -= 3;
  }

  const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
  if (pathSegments.length === 0) {
    score -= 10;
  } else {
    score += Math.min(pathSegments.length, 3);
  }

  return score;
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
    // Direct place ids are handled above.
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

function extractGoogleErrorMessage(payload: PlaceSocialLinksResponse | null) {
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

function normalizeUrl(value: unknown) {
  const raw = normalizeString(value);
  if (!raw) {
    return null;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readRecord(value: unknown) {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}
