import 'server-only';

type UmamiWebsite = {
  websiteId?: string;
  id?: string;
  name?: string;
  domain?: string;
};

export interface UmamiStatsSummary {
  pageviews: number;
  visits: number;
  visitors: number;
  bounces: number;
  totaltime: number;
}

export interface UmamiMetricRow {
  x: string;
  y: number;
}

export interface UmamiWebsiteAnalytics {
  websiteId: string;
  domain: string;
  periodDays: number;
  startAt: number;
  endAt: number;
  summary: UmamiStatsSummary | null;
  topPages: UmamiMetricRow[];
  topReferrers: UmamiMetricRow[];
  topEntryPages: UmamiMetricRow[];
  topExitPages: UmamiMetricRow[];
  topCountries: UmamiMetricRow[];
  topRegions: UmamiMetricRow[];
  topCities: UmamiMetricRow[];
  topBrowsers: UmamiMetricRow[];
  topOperatingSystems: UmamiMetricRow[];
  topDevices: UmamiMetricRow[];
  topLanguages: UmamiMetricRow[];
  topEvents: UmamiMetricRow[];
  topHostnames: UmamiMetricRow[];
  topChannels: UmamiMetricRow[];
}

type UmamiListResponse =
  | UmamiWebsite[]
  | {
      data?: UmamiWebsite[];
    };

type UmamiApiConfig = {
  baseUrl: string;
  isCloudApi: boolean;
};

type UmamiMetricType =
  | 'url'
  | 'referrer'
  | 'entry'
  | 'exit'
  | 'country'
  | 'region'
  | 'city'
  | 'browser'
  | 'os'
  | 'device'
  | 'language'
  | 'event'
  | 'hostname'
  | 'channel';

// In-memory cache for Umami websites list (avoids hitting external API on every page load)
let cachedWebsites: UmamiWebsite[] | null = null;
let cachedWebsitesTimestamp = 0;
const WEBSITES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory cache for domain→websiteId lookups
const domainWebsiteIdCache = new Map<string, { value: string | null; timestamp: number }>();
const DOMAIN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function normalizeConfiguredBaseUrl(raw: string) {
  const trimmed = raw.trim().replace(/\/+$/, '');

  // Umami Cloud UI URL is not the API endpoint.
  if (trimmed === 'https://cloud.umami.is') {
    return 'https://api.umami.is/v1';
  }

  return trimmed;
}

function getUmamiConfig(): UmamiApiConfig | null {
  const rawBaseUrl = process.env.UMAMI_URL || process.env.NEXT_PUBLIC_UMAMI_URL || '';
  const baseUrl = normalizeConfiguredBaseUrl(rawBaseUrl);

  if (!baseUrl) {
    return null;
  }

  const isCloudApi = /https:\/\/api\.umami\.is(\/v\d+)?$/i.test(baseUrl);

  return {
    baseUrl,
    isCloudApi,
  };
}

function normalizeDomain(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
}

function getAuthHeaders(config: UmamiApiConfig) {
  const apiKey = process.env.UMAMI_API_KEY || process.env.UMAMI_API_TOKEN || '';
  if (!apiKey) {
    return null;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.isCloudApi) {
    headers['x-umami-api-key'] = apiKey;
    return headers;
  }

  headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

function websitesPath(config: UmamiApiConfig) {
  return config.isCloudApi ? '/websites' : '/api/websites';
}

function websiteStatsPath(config: UmamiApiConfig, websiteId: string, startAt?: number, endAt?: number) {
  const base = config.isCloudApi ? `/websites/${websiteId}/stats` : `/api/websites/${websiteId}/stats`;

  if (typeof startAt === 'number' && typeof endAt === 'number') {
    return `${base}?startAt=${startAt}&endAt=${endAt}`;
  }

  return base;
}

function websiteMetricsPath(
  config: UmamiApiConfig,
  websiteId: string,
  type: UmamiMetricType,
  startAt?: number,
  endAt?: number,
) {
  // On Umami Cloud API, "url" has been renamed to "path".
  const metricType =
    config.isCloudApi && type === 'url'
      ? 'path'
      : config.isCloudApi && type === 'os'
      ? 'operatingSystem'
      : type;
  const base = config.isCloudApi
    ? `/websites/${websiteId}/metrics?type=${metricType}`
    : `/api/websites/${websiteId}/metrics?type=${metricType}`;

  if (typeof startAt === 'number' && typeof endAt === 'number') {
    return `${base}&startAt=${startAt}&endAt=${endAt}`;
  }

  return base;
}

async function fetchMetricRowsForType(
  config: UmamiApiConfig,
  websiteId: string,
  type: UmamiMetricType,
  startAt: number,
  endAt: number,
) {
  const metricWithRange = await fetchUmamiJson<unknown>(
    websiteMetricsPath(config, websiteId, type, startAt, endAt),
  );

  if (metricWithRange) {
    return parseMetricRows(metricWithRange).slice(0, 10);
  }

  const metricFallback = await fetchUmamiJson<unknown>(
    websiteMetricsPath(config, websiteId, type),
  );
  return parseMetricRows(metricFallback).slice(0, 10);
}

function toTimestampRange(periodDays: number) {
  const safeDays = Number.isFinite(periodDays) ? Math.max(1, Math.min(365, Math.floor(periodDays))) : 30;
  const endAt = Date.now();
  const startAt = endAt - safeDays * 24 * 60 * 60 * 1000;
  return { startAt, endAt, safeDays };
}

function parseMetricRows(payload: unknown): UmamiMetricRow[] {
  if (Array.isArray(payload)) {
    return payload
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const row = entry as Record<string, unknown>;
        const x = typeof row.x === 'string' ? row.x : '';
        const y = typeof row.y === 'number' ? row.y : Number(row.y || 0);
        if (!x || Number.isNaN(y)) return null;
        return { x, y };
      })
      .filter((row): row is UmamiMetricRow => Boolean(row));
  }

  if (payload && typeof payload === 'object') {
    const wrapped = payload as Record<string, unknown>;
    if (Array.isArray(wrapped.data)) {
      return parseMetricRows(wrapped.data);
    }
  }

  return [];
}

async function fetchUmamiJson<T>(path: string): Promise<T | null> {
  const config = getUmamiConfig();

  if (!config) {
    return null;
  }

  const headers = getAuthHeaders(config);

  if (!headers) {
    return null;
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

async function fetchUmamiWebsites() {
  // Return cached list if still fresh
  if (cachedWebsites && Date.now() - cachedWebsitesTimestamp < WEBSITES_CACHE_TTL_MS) {
    return cachedWebsites;
  }

  const config = getUmamiConfig();

  if (!config) {
    return [] as UmamiWebsite[];
  }

  const headers = getAuthHeaders(config);

  if (!headers) {
    return [] as UmamiWebsite[];
  }

  const response = await fetch(`${config.baseUrl}${websitesPath(config)}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    console.error(`[Umami] Failed to fetch websites (${response.status})`);
    // Cache the empty result so we don't hammer a failing API on every page load
    cachedWebsites = [];
    cachedWebsitesTimestamp = Date.now();
    return [];
  }

  const json = (await response.json()) as UmamiListResponse;
  const websites = Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : []);

  // Update cache
  cachedWebsites = websites;
  cachedWebsitesTimestamp = Date.now();

  return websites;
}

function findWebsiteByDomain(websites: UmamiWebsite[], domain: string) {
  const normalizedTarget = normalizeDomain(domain);

  return websites.find((website) => {
    const websiteDomain = website.domain ? normalizeDomain(website.domain) : '';
    return websiteDomain === normalizedTarget;
  });
}

function websiteIdFromWebsite(website: UmamiWebsite | undefined | null) {
  if (!website) return null;
  return website.websiteId || website.id || null;
}

export async function getUmamiWebsiteIdForDomain(domain: string) {
  try {
    const normalizedDomain = normalizeDomain(domain);
    if (!normalizedDomain) return null;

    // Check domain-level cache first
    const cached = domainWebsiteIdCache.get(normalizedDomain);
    if (cached && Date.now() - cached.timestamp < DOMAIN_CACHE_TTL_MS) {
      return cached.value;
    }

    const websites = await fetchUmamiWebsites();
    const found = findWebsiteByDomain(websites, normalizedDomain);
    const websiteId = websiteIdFromWebsite(found);

    // Cache the result
    domainWebsiteIdCache.set(normalizedDomain, { value: websiteId, timestamp: Date.now() });

    return websiteId;
  } catch (error) {
    console.error('[Umami] Failed to resolve website ID for domain:', domain, error);
    return null;
  }
}

export async function getUmamiWebsiteMatchForDomains(domains: string[]) {
  try {
    const normalizedCandidates = domains
      .map((domain) => ({
        original: domain,
        normalized: normalizeDomain(domain),
      }))
      .filter((entry) => Boolean(entry.normalized));

    if (normalizedCandidates.length === 0) {
      return null;
    }

    const websites = await fetchUmamiWebsites();

    for (const candidate of normalizedCandidates) {
      const found = findWebsiteByDomain(websites, candidate.normalized);
      const websiteId = websiteIdFromWebsite(found);

      if (websiteId) {
        return {
          domain: candidate.original,
          websiteId,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[Umami] Failed to resolve website for candidate domains:', domains, error);
    return null;
  }
}

export async function ensureUmamiWebsiteForDomain(domain: string, name: string) {
  const config = getUmamiConfig();
  const normalizedDomain = normalizeDomain(domain);

  if (!config || !normalizedDomain) {
    return null;
  }

  const headers = getAuthHeaders(config);

  if (!headers) {
    return null;
  }

  const existingId = await getUmamiWebsiteIdForDomain(normalizedDomain);
  if (existingId) {
    return existingId;
  }

  const response = await fetch(`${config.baseUrl}${websitesPath(config)}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name,
      domain: normalizedDomain,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Failed to create Umami website (${response.status}): ${body}`);
  }

  const created = (await response.json()) as UmamiWebsite;
  return websiteIdFromWebsite(created);
}

export async function getUmamiAnalyticsForWebsite(
  websiteId: string,
  domain: string,
  periodDays: number = 30,
): Promise<UmamiWebsiteAnalytics | null> {
  const config = getUmamiConfig();

  if (!config) {
    return null;
  }

  const { startAt, endAt, safeDays } = toTimestampRange(periodDays);

  const summary =
    (await fetchUmamiJson<UmamiStatsSummary>(websiteStatsPath(config, websiteId, startAt, endAt))) ||
    (await fetchUmamiJson<UmamiStatsSummary>(websiteStatsPath(config, websiteId)));

  const [
    topPages,
    topReferrers,
    topEntryPages,
    topExitPages,
    topCountries,
    topRegions,
    topCities,
    topBrowsers,
    topOperatingSystems,
    topDevices,
    topLanguages,
    topEvents,
    topHostnames,
    topChannels,
  ] = await Promise.all([
    fetchMetricRowsForType(config, websiteId, 'url', startAt, endAt),
    fetchMetricRowsForType(config, websiteId, 'referrer', startAt, endAt),
    fetchMetricRowsForType(config, websiteId, 'entry', startAt, endAt),
    fetchMetricRowsForType(config, websiteId, 'exit', startAt, endAt),
    fetchMetricRowsForType(config, websiteId, 'country', startAt, endAt),
    fetchMetricRowsForType(config, websiteId, 'region', startAt, endAt),
    fetchMetricRowsForType(config, websiteId, 'city', startAt, endAt),
    fetchMetricRowsForType(config, websiteId, 'browser', startAt, endAt),
    fetchMetricRowsForType(config, websiteId, 'os', startAt, endAt),
    fetchMetricRowsForType(config, websiteId, 'device', startAt, endAt),
    fetchMetricRowsForType(config, websiteId, 'language', startAt, endAt),
    fetchMetricRowsForType(config, websiteId, 'event', startAt, endAt),
    fetchMetricRowsForType(config, websiteId, 'hostname', startAt, endAt),
    fetchMetricRowsForType(config, websiteId, 'channel', startAt, endAt),
  ]);

  return {
    websiteId,
    domain: normalizeDomain(domain),
    periodDays: safeDays,
    startAt,
    endAt,
    summary: summary || null,
    topPages,
    topReferrers,
    topEntryPages,
    topExitPages,
    topCountries,
    topRegions,
    topCities,
    topBrowsers,
    topOperatingSystems,
    topDevices,
    topLanguages,
    topEvents,
    topHostnames,
    topChannels,
  };
}
