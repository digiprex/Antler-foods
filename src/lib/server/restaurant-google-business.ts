import 'server-only';

import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { decryptGoogleBusinessSecret, encryptGoogleBusinessSecret } from '@/lib/server/google-business-crypto';
import { refreshGoogleBusinessAccessToken } from '@/lib/server/google-business-oauth';

type RestaurantGoogleBusinessConnectionRow = {
  google_business_connection_id?: string | null;
  restaurant_id?: string | null;
  google_account_name?: string | null;
  google_account_display_name?: string | null;
  google_location_name?: string | null;
  google_location_title?: string | null;
  google_location_store_code?: string | null;
  google_location_language_code?: string | null;
  google_place_id?: string | null;
  connected_email?: string | null;
  refresh_token_encrypted?: string | null;
  scopes?: unknown;
  is_connected?: boolean | null;
  is_deleted?: boolean | null;
  last_synced_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: unknown;
};

interface RestaurantGoogleBusinessConnectionsQueryResponse {
  google_business_connections?: RestaurantGoogleBusinessConnectionRow[];
}

interface InsertRestaurantGoogleBusinessConnectionResponse {
  insert_google_business_connections_one?: RestaurantGoogleBusinessConnectionRow | null;
}

interface UpdateRestaurantGoogleBusinessConnectionResponse {
  update_google_business_connections_by_pk?: RestaurantGoogleBusinessConnectionRow | null;
}

interface UpdateRestaurantGooglePlaceIdResponse {
  update_restaurants_by_pk?: {
    restaurant_id?: string | null;
    google_place_id?: string | null;
  } | null;
}

export interface RestaurantGoogleBusinessConnectionSnapshot {
  id: string;
  restaurantId: string;
  googleAccountName: string | null;
  googleAccountDisplayName: string | null;
  googleLocationName: string | null;
  googleLocationTitle: string | null;
  googleLocationStoreCode: string | null;
  googleLocationLanguageCode: string | null;
  googlePlaceId: string | null;
  connectedEmail: string | null;
  refreshTokenEncrypted: string | null;
  scopes: string[];
  isConnected: boolean;
  isDeleted: boolean;
  lastSyncedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  metadata: Record<string, unknown> | null;
}

const GET_RESTAURANT_GOOGLE_BUSINESS_CONNECTION = `
  query GetRestaurantGoogleBusinessConnection($restaurant_id: uuid!) {
    google_business_connections(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
      }
      limit: 1
    ) {
      google_business_connection_id
      restaurant_id
      google_account_name
      google_account_display_name
      google_location_name
      google_location_title
      google_location_store_code
      google_location_language_code
      google_place_id
      connected_email
      refresh_token_encrypted
      scopes
      is_connected
      is_deleted
      last_synced_at
      created_at
      updated_at
      metadata
    }
  }
`;

const INSERT_RESTAURANT_GOOGLE_BUSINESS_CONNECTION = `
  mutation InsertRestaurantGoogleBusinessConnection(
    $object: google_business_connections_insert_input!
  ) {
    insert_google_business_connections_one(object: $object) {
      google_business_connection_id
      restaurant_id
      google_account_name
      google_account_display_name
      google_location_name
      google_location_title
      google_location_store_code
      google_location_language_code
      google_place_id
      connected_email
      refresh_token_encrypted
      scopes
      is_connected
      is_deleted
      last_synced_at
      created_at
      updated_at
      metadata
    }
  }
`;

const UPDATE_RESTAURANT_GOOGLE_BUSINESS_CONNECTION = `
  mutation UpdateRestaurantGoogleBusinessConnection(
    $google_business_connection_id: uuid!
    $changes: google_business_connections_set_input!
  ) {
    update_google_business_connections_by_pk(
      pk_columns: {
        google_business_connection_id: $google_business_connection_id
      }
      _set: $changes
    ) {
      google_business_connection_id
      restaurant_id
      google_account_name
      google_account_display_name
      google_location_name
      google_location_title
      google_location_store_code
      google_location_language_code
      google_place_id
      connected_email
      refresh_token_encrypted
      scopes
      is_connected
      is_deleted
      last_synced_at
      created_at
      updated_at
      metadata
    }
  }
`;

const UPDATE_RESTAURANT_GOOGLE_PLACE_ID = `
  mutation UpdateRestaurantGooglePlaceId(
    $restaurant_id: uuid!
    $google_place_id: String
  ) {
    update_restaurants_by_pk(
      pk_columns: { restaurant_id: $restaurant_id }
      _set: { google_place_id: $google_place_id }
    ) {
      restaurant_id
      google_place_id
    }
  }
`;

export async function getRestaurantGoogleBusinessConnectionByRestaurantId(
  restaurantId: string,
) {
  const data =
    await adminGraphqlRequest<RestaurantGoogleBusinessConnectionsQueryResponse>(
      GET_RESTAURANT_GOOGLE_BUSINESS_CONNECTION,
      {
        restaurant_id: restaurantId,
      },
    );

  const row = Array.isArray(data.google_business_connections)
    ? data.google_business_connections?.[0]
    : null;

  return normalizeRestaurantGoogleBusinessConnectionRow(row);
}

export async function upsertRestaurantGoogleBusinessOAuthConnection(input: {
  restaurantId: string;
  refreshToken: string;
  scopes: string[];
  createdByUserId?: string | null;
}) {
  const existing = await getRestaurantGoogleBusinessConnectionByRestaurantId(
    input.restaurantId,
  );
  const metadata = {
    ...(existing?.metadata ?? {}),
    last_connected_at: new Date().toISOString(),
    last_connected_by_user_id: normalizeNullableString(input.createdByUserId),
  };
  const changes = {
    restaurant_id: input.restaurantId,
    refresh_token_encrypted: encryptGoogleBusinessSecret(input.refreshToken),
    scopes: input.scopes,
    is_connected: true,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata,
    ...(normalizeNullableString(input.createdByUserId)
      ? { created_by_user_id: normalizeNullableString(input.createdByUserId) }
      : {}),
  };

  if (!existing) {
    const inserted =
      await adminGraphqlRequest<InsertRestaurantGoogleBusinessConnectionResponse>(
        INSERT_RESTAURANT_GOOGLE_BUSINESS_CONNECTION,
        {
          object: changes,
        },
      );

    return normalizeRestaurantGoogleBusinessConnectionRow(
      inserted.insert_google_business_connections_one,
    );
  }

  const updated =
    await adminGraphqlRequest<UpdateRestaurantGoogleBusinessConnectionResponse>(
      UPDATE_RESTAURANT_GOOGLE_BUSINESS_CONNECTION,
      {
        google_business_connection_id: existing.id,
        changes,
      },
    );

  return normalizeRestaurantGoogleBusinessConnectionRow(
    updated.update_google_business_connections_by_pk,
  );
}

export async function updateRestaurantGoogleBusinessLocationSelection(input: {
  restaurantId: string;
  googleAccountName: string;
  googleAccountDisplayName?: string | null;
  googleLocationName: string;
  googleLocationTitle?: string | null;
  googleLocationStoreCode?: string | null;
  googleLocationLanguageCode?: string | null;
  googlePlaceId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const existing = await getRestaurantGoogleBusinessConnectionByRestaurantId(
    input.restaurantId,
  );
  if (!existing) {
    throw new Error(
      'Google Business OAuth connection has not been created yet for this restaurant.',
    );
  }

  const metadata = {
    ...(existing.metadata ?? {}),
    ...(input.metadata ?? {}),
    selected_location_at: new Date().toISOString(),
  };

  const updated =
    await adminGraphqlRequest<UpdateRestaurantGoogleBusinessConnectionResponse>(
      UPDATE_RESTAURANT_GOOGLE_BUSINESS_CONNECTION,
      {
        google_business_connection_id: existing.id,
        changes: {
          google_account_name: input.googleAccountName,
          google_account_display_name: normalizeNullableString(
            input.googleAccountDisplayName,
          ),
          google_location_name: input.googleLocationName,
          google_location_title: normalizeNullableString(input.googleLocationTitle),
          google_location_store_code: normalizeNullableString(
            input.googleLocationStoreCode,
          ),
          google_location_language_code: normalizeNullableString(
            input.googleLocationLanguageCode,
          ),
          google_place_id: normalizeNullableString(input.googlePlaceId),
          is_connected: true,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata,
        },
      },
    );

  if (typeof input.googlePlaceId === 'string') {
    await syncRestaurantGooglePlaceId(input.restaurantId, input.googlePlaceId);
  }

  return normalizeRestaurantGoogleBusinessConnectionRow(
    updated.update_google_business_connections_by_pk,
  );
}

export async function updateRestaurantGoogleBusinessConnectionMetadata(input: {
  restaurantId: string;
  connectedEmail?: string | null;
  googleAccountName?: string | null;
  googleAccountDisplayName?: string | null;
  scopes?: string[];
  metadata?: Record<string, unknown> | null;
}) {
  const existing = await getRestaurantGoogleBusinessConnectionByRestaurantId(
    input.restaurantId,
  );
  if (!existing) {
    return null;
  }

  const updated =
    await adminGraphqlRequest<UpdateRestaurantGoogleBusinessConnectionResponse>(
      UPDATE_RESTAURANT_GOOGLE_BUSINESS_CONNECTION,
      {
        google_business_connection_id: existing.id,
        changes: {
          connected_email: normalizeNullableString(input.connectedEmail),
          google_account_name: normalizeNullableString(input.googleAccountName),
          google_account_display_name: normalizeNullableString(
            input.googleAccountDisplayName,
          ),
          scopes: input.scopes ?? existing.scopes,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            ...(existing.metadata ?? {}),
            ...(input.metadata ?? {}),
          },
        },
      },
    );

  return normalizeRestaurantGoogleBusinessConnectionRow(
    updated.update_google_business_connections_by_pk,
  );
}

export async function getRestaurantGoogleBusinessAccessTokenByRestaurantId(
  restaurantId: string,
) {
  const connection = await getRestaurantGoogleBusinessConnectionByRestaurantId(
    restaurantId,
  );
  if (!connection?.refreshTokenEncrypted) {
    throw new Error('Google Business Profile is not connected for this restaurant.');
  }

  const refreshToken = decryptGoogleBusinessSecret(connection.refreshTokenEncrypted);
  const token = await refreshGoogleBusinessAccessToken(refreshToken);

  if (token.refreshToken) {
    await upsertRestaurantGoogleBusinessOAuthConnection({
      restaurantId,
      refreshToken: token.refreshToken,
      scopes: token.scopes.length ? token.scopes : connection.scopes,
    });
  } else if (token.scopes.length) {
    await updateRestaurantGoogleBusinessConnectionMetadata({
      restaurantId,
      scopes: token.scopes,
    });
  }

  return {
    connection,
    accessToken: token.accessToken,
    scopes: token.scopes.length ? token.scopes : connection.scopes,
  };
}

export async function syncRestaurantGooglePlaceId(
  restaurantId: string,
  googlePlaceId: string | null,
) {
  await adminGraphqlRequest<UpdateRestaurantGooglePlaceIdResponse>(
    UPDATE_RESTAURANT_GOOGLE_PLACE_ID,
    {
      restaurant_id: restaurantId,
      google_place_id: normalizeNullableString(googlePlaceId),
    },
  );
}

function normalizeRestaurantGoogleBusinessConnectionRow(
  row: RestaurantGoogleBusinessConnectionRow | null | undefined,
): RestaurantGoogleBusinessConnectionSnapshot | null {
  const id = normalizeString(row?.google_business_connection_id);
  const restaurantId = normalizeString(row?.restaurant_id);
  if (!id || !restaurantId) {
    return null;
  }

  return {
    id,
    restaurantId,
    googleAccountName: normalizeNullableString(row?.google_account_name),
    googleAccountDisplayName: normalizeNullableString(
      row?.google_account_display_name,
    ),
    googleLocationName: normalizeNullableString(row?.google_location_name),
    googleLocationTitle: normalizeNullableString(row?.google_location_title),
    googleLocationStoreCode: normalizeNullableString(
      row?.google_location_store_code,
    ),
    googleLocationLanguageCode: normalizeNullableString(
      row?.google_location_language_code,
    ),
    googlePlaceId: normalizeNullableString(row?.google_place_id),
    connectedEmail: normalizeNullableString(row?.connected_email),
    refreshTokenEncrypted: normalizeNullableString(row?.refresh_token_encrypted),
    scopes: normalizeStringArray(row?.scopes),
    isConnected: Boolean(row?.is_connected),
    isDeleted: Boolean(row?.is_deleted),
    lastSyncedAt: normalizeNullableString(row?.last_synced_at),
    createdAt: normalizeNullableString(row?.created_at),
    updatedAt: normalizeNullableString(row?.updated_at),
    metadata: normalizeRecord(row?.metadata),
  };
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeNullableString(value: unknown) {
  return normalizeString(value) || null;
}

function normalizeRecord(value: unknown) {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((entry) => normalizeString(entry))
    .filter((entry): entry is string => Boolean(entry));
}
