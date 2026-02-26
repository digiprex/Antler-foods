import { NextResponse } from 'next/server';
import {
  RouteError,
  adminGraphqlRequest,
  requireRestaurantAccess,
  safeParseJson,
} from '@/lib/server/api-auth';

type MediaRow = {
  id?: string | null;
  restaurant_id?: string | null;
  file_id?: string | null;
  type?: string | null;
  created_at?: string | null;
  source?: string | null;
  external_id?: string | null;
  is_hidden?: boolean | null;
};

interface GetRestaurantMediaResponseV2 {
  medias?: MediaRow[];
}

interface GetRestaurantMediaResponseV1 {
  medias?: Array<{
    id?: string | null;
    restaurant_id?: string | null;
    file_id?: string | null;
    type?: string | null;
    created_at?: string | null;
  }>;
}

interface MediaByIdResponseV2 {
  medias_by_pk?: {
    id?: string | null;
    restaurant_id?: string | null;
    source?: string | null;
  } | null;
}

interface MediaByIdResponseV1 {
  medias_by_pk?: {
    id?: string | null;
    restaurant_id?: string | null;
  } | null;
}

interface DeleteMediaResponse {
  update_medias_by_pk?: {
    id?: string | null;
  } | null;
}

const GET_RESTAURANT_MEDIA_V2 = `
  query GetRestaurantMediaV2($restaurant_id: uuid!) {
    medias(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        is_hidden: { _eq: false }
      }
      order_by: { created_at: desc }
    ) {
      id
      restaurant_id
      file_id
      type
      created_at
      source
      external_id
      is_hidden
    }
  }
`;

const GET_RESTAURANT_MEDIA_V1 = `
  query GetRestaurantMediaV1($restaurant_id: uuid!) {
    medias(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: desc }
    ) {
      id
      restaurant_id
      file_id
      type
      created_at
    }
  }
`;

const GET_MEDIA_BY_ID_V2 = `
  query GetMediaByIdV2($media_id: uuid!) {
    medias_by_pk(id: $media_id) {
      id
      restaurant_id
      source
    }
  }
`;

const GET_MEDIA_BY_ID_V1 = `
  query GetMediaByIdV1($media_id: uuid!) {
    medias_by_pk(id: $media_id) {
      id
      restaurant_id
    }
  }
`;

const SOFT_DELETE_MEDIA = `
  mutation SoftDeleteMedia($media_id: uuid!) {
    update_medias_by_pk(
      pk_columns: { id: $media_id }
      _set: { is_deleted: true }
    ) {
      id
    }
  }
`;

const HIDE_MEDIA = `
  mutation HideMedia($media_id: uuid!) {
    update_medias_by_pk(
      pk_columns: { id: $media_id }
      _set: { is_hidden: true }
    ) {
      id
    }
  }
`;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const restaurantId = url.searchParams.get('restaurant_id')?.trim() ?? '';

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id required' },
        { status: 400 },
      );
    }

    const { restaurant } = await requireRestaurantAccess(request, restaurantId);

    const rows = await loadMediaRows(restaurantId);
    const normalized = rows
      .map((row) => normalizeMedia(row, restaurant.googlePlaceId))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

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
        error: caughtError instanceof Error ? caughtError.message : String(caughtError),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = (await safeParseJson(request)) as { media_id?: unknown } | null;
    const mediaId = normalizeString(payload?.media_id);

    if (!mediaId) {
      return NextResponse.json(
        { success: false, error: 'media_id required' },
        { status: 400 },
      );
    }

    const mediaRow = await loadMediaById(mediaId);
    if (!mediaRow?.id || !mediaRow.restaurant_id) {
      return NextResponse.json(
        { success: false, error: 'Media not found.' },
        { status: 404 },
      );
    }

    await requireRestaurantAccess(request, mediaRow.restaurant_id);

    const source = normalizeSource(mediaRow.source);
    const mutation = source === 'google' ? HIDE_MEDIA : SOFT_DELETE_MEDIA;

    const data = await adminGraphqlRequest<DeleteMediaResponse>(mutation, {
      media_id: mediaId,
    });

    if (!data.update_medias_by_pk?.id) {
      return NextResponse.json(
        { success: false, error: 'Media not found.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      action: source === 'google' ? 'hidden' : 'deleted',
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
        error: caughtError instanceof Error ? caughtError.message : String(caughtError),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await safeParseJson(request)) as
      | {
          media_id?: unknown;
          action?: unknown;
        }
      | null;
    const mediaId = normalizeString(payload?.media_id);
    const action = (normalizeString(payload?.action) || 'hide').toLowerCase();

    if (!mediaId) {
      return NextResponse.json(
        { success: false, error: 'media_id required' },
        { status: 400 },
      );
    }

    if (action !== 'hide') {
      return NextResponse.json(
        { success: false, error: 'Only hide action is supported.' },
        { status: 400 },
      );
    }

    const mediaRow = await loadMediaById(mediaId);
    if (!mediaRow?.id || !mediaRow.restaurant_id) {
      return NextResponse.json(
        { success: false, error: 'Media not found.' },
        { status: 404 },
      );
    }

    await requireRestaurantAccess(request, mediaRow.restaurant_id);

    const data = await adminGraphqlRequest<DeleteMediaResponse>(HIDE_MEDIA, {
      media_id: mediaId,
    });

    if (!data.update_medias_by_pk?.id) {
      return NextResponse.json(
        { success: false, error: 'Media not found.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      action: 'hidden',
    });
  } catch (caughtError) {
    if (caughtError instanceof RouteError) {
      return NextResponse.json(
        { success: false, error: caughtError.message },
        { status: caughtError.status },
      );
    }

    const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
    if (isSchemaColumnError(message)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Hide action is not supported by the current media schema.',
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

async function loadMediaRows(restaurantId: string) {
  try {
    const data = await adminGraphqlRequest<GetRestaurantMediaResponseV2>(
      GET_RESTAURANT_MEDIA_V2,
      {
        restaurant_id: restaurantId,
      },
    );

    return Array.isArray(data.medias) ? data.medias : [];
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
    if (!isSchemaColumnError(message)) {
      throw caughtError;
    }

    const fallback = await adminGraphqlRequest<GetRestaurantMediaResponseV1>(
      GET_RESTAURANT_MEDIA_V1,
      {
        restaurant_id: restaurantId,
      },
    );

    const rows = Array.isArray(fallback.medias) ? fallback.medias : [];
    return rows.map((row) => ({
      ...row,
      source: 'manual',
      external_id: null,
      is_hidden: false,
    }));
  }
}

async function loadMediaById(mediaId: string) {
  try {
    const data = await adminGraphqlRequest<MediaByIdResponseV2>(GET_MEDIA_BY_ID_V2, {
      media_id: mediaId,
    });

    return data.medias_by_pk || null;
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
    if (!isSchemaColumnError(message)) {
      throw caughtError;
    }

    const fallback = await adminGraphqlRequest<MediaByIdResponseV1>(GET_MEDIA_BY_ID_V1, {
      media_id: mediaId,
    });

    if (!fallback.medias_by_pk) {
      return null;
    }

    return {
      ...fallback.medias_by_pk,
      source: 'manual',
    };
  }
}

function normalizeMedia(
  row: MediaRow,
  restaurantGooglePlaceId: string | null,
) {
  const mediaId = normalizeString(row.id);
  const restaurantId = normalizeString(row.restaurant_id);
  const source = normalizeSource(row.source);
  const type = normalizeString(row.type) || '';
  const createdAt = normalizeString(row.created_at);
  const externalId = normalizeString(row.external_id);
  const fileId = normalizeString(row.file_id);

  if (!mediaId || !restaurantId) {
    return null;
  }

  if (source === 'google') {
    if (!externalId || !restaurantGooglePlaceId) {
      return null;
    }

    return {
      id: mediaId,
      restaurant_id: restaurantId,
      source,
      file_id: null,
      external_id: externalId,
      type,
      created_at: createdAt,
      url: buildGooglePhotoProxyUrl(restaurantGooglePlaceId, externalId, 1200),
    };
  }

  if (!fileId) {
    return null;
  }

  return {
    id: mediaId,
    restaurant_id: restaurantId,
    source: 'manual',
    file_id: fileId,
    external_id: null,
    type,
    created_at: createdAt,
    url: `/api/image-proxy?fileId=${encodeURIComponent(fileId)}`,
  };
}

function buildGooglePhotoProxyUrl(placeId: string, photoId: string, maxWidth: number) {
  const params = new URLSearchParams();
  params.set('placeId', placeId);
  params.set('photoId', photoId);
  params.set('maxWidth', String(maxWidth));
  return `/api/google/photo?${params.toString()}`;
}

function normalizeSource(value: unknown) {
  const normalized = normalizeString(value)?.toLowerCase();
  return normalized === 'google' ? 'google' : 'manual';
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isSchemaColumnError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('field "source"') ||
    normalized.includes('field "is_hidden"') ||
    normalized.includes('column "source"') ||
    normalized.includes('column "is_hidden"') ||
    normalized.includes('external_id')
  );
}
