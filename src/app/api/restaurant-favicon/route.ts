import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

type UpdateRestaurantResponse = {
  update_restaurants_by_pk: {
    restaurant_id: string;
  } | null;
};

type GetRestaurantFaviconResponse = {
  restaurants_by_pk: Record<string, unknown> | null;
};

const UPDATE_RESTAURANT_FAVICON = `
  mutation UpdateRestaurantFavicon(
    $restaurant_id: uuid!
    $changes: restaurants_set_input!
  ) {
    update_restaurants_by_pk(
      pk_columns: { restaurant_id: $restaurant_id }
      _set: $changes
    ) {
      restaurant_id
    }
  }
`;

const GET_RESTAURANT_FAVICON_V2 = `
  query GetRestaurantFaviconV2($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      restaurant_id
      favicon_url
      favicon_file_id
    }
  }
`;

const GET_RESTAURANT_FAVICON_V1 = `
  query GetRestaurantFaviconV1($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      restaurant_id
      favicon_url
    }
  }
`;

const GET_RESTAURANT_FAVICON_LEGACY = `
  query GetRestaurantFaviconLegacy($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      restaurant_id
      favicon
      favicon_file
    }
  }
`;

const GET_RESTAURANT_FAVICON_LEGACY_URL_ONLY = `
  query GetRestaurantFaviconLegacyUrlOnly($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      restaurant_id
      favicon
    }
  }
`;

function extractMissingSetFields(message: string): string[] {
  const regex = /field '([^']+)' not found in type: 'restaurants_set_input'/g;
  const matches = Array.from(message.matchAll(regex));
  return Array.from(
    new Set(
      matches
        .map((match) => match[1]?.trim())
        .filter((field): field is string => Boolean(field)),
    ),
  );
}

function removeFieldsFromObject(
  object: Record<string, unknown>,
  fields: string[],
): string[] {
  const removable = fields.filter((field) =>
    Object.prototype.hasOwnProperty.call(object, field),
  );

  removable.forEach((field) => {
    delete object[field];
  });

  return removable;
}

async function updateRestaurantFaviconWithFallback(
  restaurantId: string,
  changes: Record<string, unknown>,
) {
  const workingChanges = { ...changes };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (Object.keys(workingChanges).length === 0) {
      throw new Error('No supported favicon fields found in restaurants_set_input.');
    }

    try {
      const data = await adminGraphqlRequest<UpdateRestaurantResponse>(
        UPDATE_RESTAURANT_FAVICON,
        {
          restaurant_id: restaurantId,
          changes: workingChanges,
        },
      );

      if (!data.update_restaurants_by_pk) {
        throw new Error('Hasura returned no row for favicon update.');
      }

      return data.update_restaurants_by_pk;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown GraphQL error';
      const missingFields = extractMissingSetFields(message);
      const removedFields = removeFieldsFromObject(workingChanges, missingFields);

      if (removedFields.length > 0) {
        continue;
      }

      throw new Error(`Failed to update favicon. ${message}`);
    }
  }

  throw new Error('Failed to update favicon after schema fallback attempts.');
}

function normalizeOptionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function getRestaurantFaviconWithFallback(restaurantId: string) {
  const variants = [
    GET_RESTAURANT_FAVICON_V2,
    GET_RESTAURANT_FAVICON_V1,
    GET_RESTAURANT_FAVICON_LEGACY,
    GET_RESTAURANT_FAVICON_LEGACY_URL_ONLY,
  ];

  let lastError: string | null = null;

  for (const query of variants) {
    try {
      const data = await adminGraphqlRequest<GetRestaurantFaviconResponse>(query, {
        restaurant_id: restaurantId,
      });
      const row = data.restaurants_by_pk;

      if (!row) {
        return {
          favicon_url: null,
          favicon_file_id: null,
        };
      }

      return {
        favicon_url:
          normalizeOptionalText(row.favicon_url) ??
          normalizeOptionalText(row.favicon),
        favicon_file_id:
          normalizeOptionalText(row.favicon_file_id) ??
          normalizeOptionalText(row.favicon_file),
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown GraphQL error';
    }
  }

  throw new Error(lastError || 'Failed to load favicon.');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id')?.trim() ?? '';

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 },
      );
    }

    const favicon = await getRestaurantFaviconWithFallback(restaurantId);

    return NextResponse.json({
      success: true,
      data: {
        restaurant_id: restaurantId,
        ...favicon,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load favicon';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const restaurantId =
      typeof body?.restaurant_id === 'string' ? body.restaurant_id.trim() : '';

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 },
      );
    }

    const faviconUrl =
      typeof body?.favicon_url === 'string' ? body.favicon_url.trim() : '';
    const faviconFileId =
      typeof body?.favicon_file_id === 'string' ? body.favicon_file_id.trim() : '';

    const changes: Record<string, unknown> = {
      favicon_url: faviconUrl || null,
      favicon_file_id: faviconFileId || null,
      // Legacy fallbacks for schema variants
      favicon: faviconUrl || null,
      favicon_file: faviconFileId || null,
    };

    await updateRestaurantFaviconWithFallback(restaurantId, changes);

    return NextResponse.json({
      success: true,
      data: {
        restaurant_id: restaurantId,
        favicon_url: faviconUrl || null,
        favicon_file_id: faviconFileId || null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update favicon';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
