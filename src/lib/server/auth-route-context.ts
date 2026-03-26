import { headers } from 'next/headers';
import { resolveRestaurantIdByDomain } from '@/lib/server/domain-resolver';

function getRequestHost() {
  const requestHeaders = headers();
  return (
    requestHeaders.get('x-forwarded-host') ||
    requestHeaders.get('host') ||
    ''
  ).trim();
}

export async function resolveRestaurantIdForAuthRequest() {
  const host = getRequestHost();

  if (!host || host.includes('localhost') || host.includes('127.0.0.1')) {
    return null;
  }

  try {
    return await resolveRestaurantIdByDomain(host);
  } catch (error) {
    console.error('[Auth Route] Failed to resolve host:', error);
    return null;
  }
}

export async function isRestaurantDomainAuthRequest() {
  const restaurantId = await resolveRestaurantIdForAuthRequest();
  return Boolean(restaurantId);
}
