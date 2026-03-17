import { adminGraphqlRequest } from '@/lib/server/api-auth';

const DOMAIN_CACHE_TTL_MS = 5 * 60 * 1000;

type DomainCacheEntry = {
  restaurantId: string | null;
  expiresAt: number;
};

const domainCache = new Map<string, DomainCacheEntry>();

interface GetRestaurantByDomainResponse {
  restaurants: Array<{
    restaurant_id: string;
    is_deleted?: boolean;
  }>;
}

const GET_RESTAURANT_BY_DOMAIN = `
  query GetRestaurantByDomain($domain: String!) {
    restaurants(
      where: {
        _or: [
          { custom_domain: { _eq: $domain } },
          { staging_domain: { _eq: $domain } }
        ],
        is_deleted: { _eq: false }
      },
      limit: 1
    ) {
      restaurant_id
      is_deleted
    }
  }
`;

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase();
}

export async function resolveRestaurantIdByDomain(domain?: string | null): Promise<string | null> {
  if (!domain?.trim()) {
    return null;
  }

  const normalizedDomain = normalizeDomain(domain);
  const now = Date.now();
  const cached = domainCache.get(normalizedDomain);
  if (cached && cached.expiresAt > now) {
    return cached.restaurantId;
  }

  const data = await adminGraphqlRequest<GetRestaurantByDomainResponse>(
    GET_RESTAURANT_BY_DOMAIN,
    { domain: normalizedDomain }
  );

  const restaurantId = data.restaurants?.[0]?.restaurant_id || null;
  domainCache.set(normalizedDomain, {
    restaurantId,
    expiresAt: now + DOMAIN_CACHE_TTL_MS,
  });

  return restaurantId;
}

