import { NextResponse } from 'next/server';

const HASURA_URL =
  process.env.HASURA_GRAPHQL_URL ||
  'https://pycfacumenjefxtblime.hasura.us-east-1.nhost.run/v1/graphql';
const HASURA_ADMIN_SECRET =
  process.env.HASURA_ADMIN_SECRET || "i;8zmVF8SvnMiX5gao@F'a6,uJ%WphsD";

const GET_RESTAURANT_MEDIA = `
  query GetRestaurantMedia($restaurant_id: uuid!) {
    medias(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: desc }
    ) {
      id
      file_id
      type
      created_at
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

interface MediaRow {
  id?: string | null;
  file_id?: string | null;
  type?: string | null;
  created_at?: string | null;
}

interface GetRestaurantMediaResponse {
  medias?: MediaRow[];
}

interface DeleteMediaResponse {
  update_medias_by_pk?: {
    id?: string | null;
  } | null;
}

async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>) {
  const response = await fetch(HASURA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const payload = (await response.json()) as {
    data?: T;
    errors?: Array<{ message?: string }>;
  };

  if (payload.errors?.length) {
    const reason = payload.errors
      .map((entry) => entry.message)
      .filter(Boolean)
      .join('; ');
    throw new Error(reason || 'GraphQL request failed.');
  }

  if (!payload.data) {
    throw new Error('No data returned from GraphQL.');
  }

  return payload.data;
}

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

    const data = await graphqlRequest<GetRestaurantMediaResponse>(
      GET_RESTAURANT_MEDIA,
      {
        restaurant_id: restaurantId,
      },
    );

    const rows = Array.isArray(data.medias) ? data.medias : [];
    const normalized = rows
      .map((row) => {
        const mediaId = typeof row.id === 'string' ? row.id.trim() : '';
        const fileId = typeof row.file_id === 'string' ? row.file_id.trim() : '';
        const mediaType = typeof row.type === 'string' ? row.type : '';
        const createdAt =
          typeof row.created_at === 'string' ? row.created_at : null;

        if (!mediaId || !fileId) {
          return null;
        }

        return {
          id: mediaId,
          file_id: fileId,
          type: mediaType,
          created_at: createdAt,
          url: `/api/image-proxy?fileId=${encodeURIComponent(fileId)}`,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    return NextResponse.json({
      success: true,
      data: normalized,
    });
  } catch (caughtError) {
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
    const payload = (await request.json()) as { media_id?: unknown };
    const mediaId =
      typeof payload.media_id === 'string' ? payload.media_id.trim() : '';

    if (!mediaId) {
      return NextResponse.json(
        { success: false, error: 'media_id required' },
        { status: 400 },
      );
    }

    const data = await graphqlRequest<DeleteMediaResponse>(SOFT_DELETE_MEDIA, {
      media_id: mediaId,
    });

    if (!data.update_medias_by_pk?.id) {
      return NextResponse.json(
        { success: false, error: 'Media not found.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (caughtError) {
    return NextResponse.json(
      {
        success: false,
        error: caughtError instanceof Error ? caughtError.message : String(caughtError),
      },
      { status: 500 },
    );
  }
}
