import { NextResponse } from 'next/server';
import {
  RouteError,
  adminGraphqlRequest,
  requireRestaurantAccess,
  safeParseJson,
} from '@/lib/server/api-auth';

type GoogleMediaRow = {
  id?: string | null;
  restaurant_id?: string | null;
  file_id?: string | null;
  source?: string | null;
  external_id?: string | null;
  type?: string | null;
  created_at?: string | null;
  is_hidden?: boolean | null;
};

interface ExistingGoogleMediaResponse {
  medias?: GoogleMediaRow[];
}

interface InsertGoogleMediaResponse {
  insert_medias_one?: GoogleMediaRow | null;
}

interface UpdateGoogleMediaResponse {
  update_medias_by_pk?: GoogleMediaRow | null;
}

const FIND_EXISTING_GOOGLE_MEDIA = `
  query FindExistingGoogleMedia($restaurant_id: uuid!, $external_id: String!) {
    medias(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        source: { _eq: "google" }
        external_id: { _eq: $external_id }
        is_deleted: { _eq: false }
      }
      limit: 1
    ) {
      id
      restaurant_id
      file_id
      source
      external_id
      type
      created_at
      is_hidden
    }
  }
`;

const FIND_DELETED_GOOGLE_MEDIA = `
  query FindDeletedGoogleMedia($restaurant_id: uuid!, $external_id: String!) {
    medias(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        source: { _eq: "google" }
        external_id: { _eq: $external_id }
        is_deleted: { _eq: true }
      }
      limit: 1
      order_by: { updated_at: desc }
    ) {
      id
      restaurant_id
      file_id
      source
      external_id
      type
      created_at
      is_hidden
    }
  }
`;

const INSERT_GOOGLE_MEDIA = `
  mutation InsertGoogleMedia($object: medias_insert_input!) {
    insert_medias_one(object: $object) {
      id
      restaurant_id
      file_id
      source
      external_id
      type
      created_at
      is_hidden
    }
  }
`;

const UPDATE_GOOGLE_MEDIA = `
  mutation UpdateGoogleMedia($media_id: uuid!, $changes: medias_set_input!) {
    update_medias_by_pk(pk_columns: { id: $media_id }, _set: $changes) {
      id
      restaurant_id
      file_id
      source
      external_id
      type
      created_at
      is_hidden
    }
  }
`;

export async function POST(
  request: Request,
  context: { params: { restaurantId: string } },
) {
  try {
    const restaurantId = context.params.restaurantId?.trim() || '';
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId is required.' },
        { status: 400 },
      );
    }

    const { restaurant } = await requireRestaurantAccess(request, restaurantId);
    if (!restaurant.googlePlaceId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant does not have a Google Place ID.' },
        { status: 400 },
      );
    }

    const payload = (await safeParseJson(request)) as { photoId?: unknown } | null;
    const photoId = normalizePhotoId(payload?.photoId);

    if (!photoId) {
      return NextResponse.json(
        { success: false, error: 'photoId is required.' },
        { status: 400 },
      );
    }

    const normalizedPlaceId = normalizePlaceId(restaurant.googlePlaceId);
    const expectedPrefix = `places/${normalizedPlaceId}/photos/`;
    if (!photoId.startsWith(expectedPrefix)) {
      return NextResponse.json(
        {
          success: false,
          error: 'photoId does not belong to the selected restaurant place.',
        },
        { status: 400 },
      );
    }

    const existingData = await adminGraphqlRequest<ExistingGoogleMediaResponse>(
      FIND_EXISTING_GOOGLE_MEDIA,
      {
        restaurant_id: restaurantId,
        external_id: photoId,
      },
    );

    const existing = Array.isArray(existingData.medias) ? existingData.medias[0] : null;
    if (existing?.id) {
      if (existing.is_hidden) {
        const unhiddenData = await adminGraphqlRequest<UpdateGoogleMediaResponse>(
          UPDATE_GOOGLE_MEDIA,
          {
            media_id: existing.id,
            changes: {
              is_hidden: false,
            },
          },
        );
        const updated = unhiddenData.update_medias_by_pk;
        if (!updated?.id) {
          throw new Error('Failed to unhide existing Google media.');
        }

        return NextResponse.json({
          success: true,
          data: normalizeMedia(updated, normalizedPlaceId),
        });
      }

      return NextResponse.json({
        success: true,
        data: normalizeMedia(existing, normalizedPlaceId),
      });
    }

    const deletedData = await adminGraphqlRequest<ExistingGoogleMediaResponse>(
      FIND_DELETED_GOOGLE_MEDIA,
      {
        restaurant_id: restaurantId,
        external_id: photoId,
      },
    );
    const deleted = Array.isArray(deletedData.medias) ? deletedData.medias[0] : null;

    if (deleted?.id) {
      const restoredData = await adminGraphqlRequest<UpdateGoogleMediaResponse>(
        UPDATE_GOOGLE_MEDIA,
        {
          media_id: deleted.id,
          changes: {
            is_deleted: false,
            is_hidden: false,
            source: 'google',
            external_id: photoId,
            file_id: null,
            type: 'gallery',
          },
        },
      );

      const restored = restoredData.update_medias_by_pk;
      if (!restored?.id) {
        throw new Error('Failed to restore existing Google media.');
      }

      return NextResponse.json({
        success: true,
        data: normalizeMedia(restored, normalizedPlaceId),
      });
    }

    const insertData = await adminGraphqlRequest<InsertGoogleMediaResponse>(
      INSERT_GOOGLE_MEDIA,
      {
        object: {
          restaurant_id: restaurantId,
          source: 'google',
          external_id: photoId,
          file_id: null,
          type: 'gallery',
          is_hidden: false,
        },
      },
    );

    const inserted = insertData.insert_medias_one;
    if (!inserted?.id) {
      throw new Error('Failed to import Google photo.');
    }

    return NextResponse.json({
      success: true,
      data: normalizeMedia(inserted, normalizedPlaceId),
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
            : 'Failed to import Google photo.',
      },
      { status: 500 },
    );
  }
}

function normalizeMedia(row: GoogleMediaRow, placeId: string) {
  const id = normalizeString(row.id) || '';
  const restaurantId = normalizeString(row.restaurant_id) || '';
  const source = normalizeSource(row.source);
  const externalId = normalizeString(row.external_id);
  const fileId = normalizeString(row.file_id);

  return {
    id,
    restaurant_id: restaurantId,
    source,
    external_id: externalId,
    file_id: fileId,
    type: normalizeString(row.type) || 'gallery',
    created_at: normalizeString(row.created_at),
    is_hidden: Boolean(row.is_hidden),
    url:
      source === 'google' && externalId
        ? buildGooglePhotoProxyUrl(placeId, externalId, 1200)
        : null,
  };
}

function normalizeSource(value: unknown) {
  const normalized = normalizeString(value)?.toLowerCase();
  return normalized === 'google' ? 'google' : 'manual';
}

function buildGooglePhotoProxyUrl(placeId: string, photoId: string, maxWidth: number) {
  const params = new URLSearchParams();
  params.set('placeId', placeId);
  params.set('photoId', photoId);
  params.set('maxWidth', String(maxWidth));
  return `/api/google/photo?${params.toString()}`;
}

function normalizePlaceId(value: string) {
  return value.replace(/^places\//i, '').trim();
}

function normalizePhotoId(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  return normalized.replace(/^\/+/, '');
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
