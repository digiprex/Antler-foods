import { getRoleFromHasuraClaims, type AppRole } from '@/lib/auth/roles';

type JsonRecord = Record<string, unknown>;

const APP_ROLES = new Set<AppRole>(['admin', 'manager', 'owner', 'client', 'user']);

const GET_RESTAURANT_ACCESS = `
  query GetRestaurantAccess($restaurant_id: uuid!) {
    restaurants(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _neq: true }
      }
      limit: 1
    ) {
      restaurant_id
      user_id
      poc_user_id
      google_place_id
    }
  }
`;

interface ResolveServerConfigResult {
  authUrl: string;
  graphqlUrl: string;
  hasuraAdminSecret: string;
}

interface AuthUserPayload extends JsonRecord {
  id?: unknown;
  defaultRole?: unknown;
  roles?: unknown;
}

interface RestaurantAccessQueryResponse {
  restaurants?: Array<{
    restaurant_id?: string | null;
    user_id?: string | null;
    poc_user_id?: string | null;
    google_place_id?: string | null;
  }>;
}

export interface AuthenticatedUserContext {
  accessToken: string;
  userId: string;
  role: AppRole;
}

export interface RestaurantAccessContext {
  restaurantId: string;
  userId: string | null;
  pocUserId: string | null;
  googlePlaceId: string | null;
}

export class RouteError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function adminGraphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const { graphqlUrl, hasuraAdminSecret } = resolveServerConfig();

  const response = await fetch(graphqlUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': hasuraAdminSecret,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  const payload = (await safeParseJson(response)) as
    | { data?: T; errors?: Array<{ message?: string }> }
    | null;

  if (!response.ok) {
    throw new Error(`Admin GraphQL HTTP ${response.status}`);
  }

  if (payload?.errors?.length) {
    const reason = payload.errors
      .map((entry) => entry.message)
      .filter(Boolean)
      .join('; ');
    throw new Error(reason || 'Admin GraphQL request failed.');
  }

  if (!payload?.data) {
    throw new Error('Admin GraphQL request returned no data.');
  }

  return payload.data;
}

export async function requireAuthenticatedUser(
  request: Request,
): Promise<AuthenticatedUserContext> {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    throw new RouteError(401, 'Missing access token.');
  }

  const { authUrl } = resolveServerConfig();
  const userResponse = await fetch(`${authUrl}/user`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!userResponse.ok) {
    throw new RouteError(401, 'Invalid or expired session.');
  }

  const userPayload = ((await safeParseJson(userResponse)) || {}) as AuthUserPayload;
  const claims = decodeJwtClaims(accessToken);

  const userId =
    normalizeString(userPayload.id) ||
    normalizeString(
      readRecord(claims?.['https://hasura.io/jwt/claims'])?.['x-hasura-user-id'],
    ) ||
    normalizeString(claims?.sub);

  if (!userId) {
    throw new RouteError(401, 'Could not resolve authenticated user.');
  }

  const roleFromClaims = getRoleFromHasuraClaims(claims);
  const roleCandidates: Array<unknown> = [
    roleFromClaims,
    userPayload.defaultRole,
    ...readStringList(userPayload.roles),
  ];

  const resolvedRole =
    roleCandidates
      .map((value) => toRole(value))
      .find((value): value is AppRole => Boolean(value)) || 'user';

  return {
    accessToken,
    userId,
    role: resolvedRole,
  };
}

export async function requireRestaurantAccess(
  request: Request,
  restaurantId: string,
): Promise<{
  user: AuthenticatedUserContext;
  restaurant: RestaurantAccessContext;
}> {
  const normalizedRestaurantId = normalizeString(restaurantId);
  if (!normalizedRestaurantId) {
    throw new RouteError(400, 'restaurantId is required.');
  }

  const user = await requireAuthenticatedUser(request);

  const data = await adminGraphqlRequest<RestaurantAccessQueryResponse>(
    GET_RESTAURANT_ACCESS,
    {
      restaurant_id: normalizedRestaurantId,
    },
  );

  const row = Array.isArray(data.restaurants) ? data.restaurants[0] : null;
  if (!row?.restaurant_id) {
    throw new RouteError(404, 'Restaurant not found.');
  }

  const restaurant: RestaurantAccessContext = {
    restaurantId: row.restaurant_id.trim(),
    userId: normalizeString(row.user_id),
    pocUserId: normalizeString(row.poc_user_id),
    googlePlaceId: normalizeString(row.google_place_id),
  };

  if (user.role === 'admin' || user.role === 'manager' || user.role === 'owner') {
    return { user, restaurant };
  }

  if (user.userId === restaurant.userId || user.userId === restaurant.pocUserId) {
    return { user, restaurant };
  }

  throw new RouteError(
    403,
    'You do not have permission to manage this restaurant.',
  );
}

export function getBearerToken(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function safeParseJson(requestOrResponse: Request | Response) {
  try {
    return await requestOrResponse.json();
  } catch {
    return null;
  }
}

function resolveServerConfig(): ResolveServerConfigResult {
  const backendUrl = normalizeBackendUrl(process.env.NEXT_PUBLIC_NHOST_BACKEND_URL);
  const subdomain = normalizeString(process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN);
  const region = normalizeString(process.env.NEXT_PUBLIC_NHOST_REGION);

  const authUrl =
    normalizeBackendUrl(process.env.NHOST_AUTH_URL) ||
    (backendUrl ? `${backendUrl}/v1/auth` : null) ||
    (subdomain && region
      ? `https://${subdomain}.auth.${region}.nhost.run/v1`
      : null);

  const graphqlUrl =
    normalizeBackendUrl(process.env.HASURA_API_URL) ||
    normalizeBackendUrl(process.env.HASURA_GRAPHQL_URL) ||
    (backendUrl ? `${backendUrl}/v1/graphql` : null) ||
    (subdomain && region
      ? `https://${subdomain}.hasura.${region}.nhost.run/v1/graphql`
      : null);

  const hasuraAdminSecret = normalizeString(process.env.HASURA_ADMIN_SECRET);

  if (!authUrl) {
    throw new Error('Nhost auth URL is not configured on server.');
  }

  if (!graphqlUrl) {
    throw new Error('Hasura GraphQL URL is not configured on server.');
  }

  if (!hasuraAdminSecret) {
    throw new Error('HASURA_ADMIN_SECRET is not configured on server.');
  }

  return {
    authUrl,
    graphqlUrl,
    hasuraAdminSecret,
  };
}

function decodeJwtClaims(token: string) {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadBase64.padEnd(
      payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4),
      '=',
    );
    const payloadJson = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(payloadJson) as JsonRecord;
  } catch {
    return null;
  }
}

function toRole(value: unknown): AppRole | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!APP_ROLES.has(normalized as AppRole)) {
    return null;
  }

  return normalized as AppRole;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeBackendUrl(value: string | undefined) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  return normalized.replace(/\/+$/, '');
}

function readStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => normalizeString(item))
    .filter((item): item is string => Boolean(item));
}

function readRecord(value: unknown) {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}
