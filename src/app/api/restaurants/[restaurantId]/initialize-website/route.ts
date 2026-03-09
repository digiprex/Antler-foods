import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { addVercelDomain } from '@/lib/server/vercel-domains';

const DEFAULT_STAGING_DOMAIN_SUFFIX = '.vercel.app';

const DEFAULT_SYSTEM_PAGES = [
  { urlSlug: 'home', name: 'Home' },
  { urlSlug: 'about', name: 'About' },
  { urlSlug: 'contact', name: 'Contact' },
  { urlSlug: 'menu', name: 'Menu' },
] as const;

interface Page {
  url_slug: string;
  [key: string]: unknown;
}

interface GetPagesResponse {
  web_pages: Page[];
}

interface UpdateRestaurantResponse {
  update_restaurants_by_pk: {
    restaurant_id: string;
  } | null;
}

interface InsertPageResponse {
  insert_web_pages_one: {
    page_id: string;
  } | null;
}

function buildDefaultStagingDomain(restaurantName: string) {
  const normalizedLabel = restaurantName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  const base = normalizedLabel || 'restaurant';
  return `${base}${DEFAULT_STAGING_DOMAIN_SUFFIX}`;
}

async function getExistingPages(restaurantId: string): Promise<string[]> {
  const query = `
    query GetPages($restaurant_id: uuid!) {
      web_pages(where: { restaurant_id: { _eq: $restaurant_id }, is_deleted: { _eq: false } }) {
        url_slug
      }
    }
  `;

  const data = await adminGraphqlRequest<GetPagesResponse>(query, {
    restaurant_id: restaurantId,
  });

  return data.web_pages
    .map((page) => page.url_slug?.trim().toLowerCase())
    .filter((slug): slug is string => Boolean(slug));
}

async function updateRestaurantData(
  restaurantId: string,
  stagingDomain: string
) {
  const mutation = `
    mutation UpdateRestaurant($restaurantId: uuid!, $stagingDomain: String!) {
      update_restaurants_by_pk(
        pk_columns: { restaurant_id: $restaurantId }
        _set: { staging_domain: $stagingDomain }
      ) {
        restaurant_id
      }
    }
  `;

  const data = await adminGraphqlRequest<UpdateRestaurantResponse>(mutation, {
    restaurantId,
    stagingDomain,
  });

  if (!data.update_restaurants_by_pk) {
    throw new Error('Failed to update restaurant');
  }
}

async function createSystemPage(
  restaurantId: string,
  urlSlug: string,
  name: string
) {
  const mutation = `
    mutation InsertPage($object: web_pages_insert_input!) {
      insert_web_pages_one(object: $object) {
        page_id
      }
    }
  `;

  const data = await adminGraphqlRequest<InsertPageResponse>(mutation, {
    object: {
      url_slug: urlSlug,
      name: name,
      is_deleted: false,
      meta_title: null,
      meta_description: null,
      restaurant_id: restaurantId,
      is_system_page: true,
      show_on_navbar: true,
      show_on_footer: true,
      keywords: null,
      og_image: null,
      published: false,
    },
  });

  if (!data.insert_web_pages_one) {
    throw new Error(`Failed to create page: ${name}`);
  }
}

async function ensureDefaultSystemPagesForRestaurant(restaurantId: string) {
  const existingSlugs = new Set(await getExistingPages(restaurantId));

  for (const page of DEFAULT_SYSTEM_PAGES) {
    if (existingSlugs.has(page.urlSlug)) {
      continue;
    }

    await createSystemPage(restaurantId, page.urlSlug, page.name);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { restaurantId: string } }
) {
  try {
    const restaurantId = params.restaurantId;
    const body = await request.json();
    const { restaurantName } = body;
    // Note: templateId from body is not used yet (template_id field doesn't exist in restaurants table)

    if (!restaurantId || !restaurantName) {
      return NextResponse.json(
        { error: 'Restaurant ID and name are required' },
        { status: 400 }
      );
    }

    // Generate staging domain (Vercel subdomain)
    const defaultStagingDomain = buildDefaultStagingDomain(restaurantName);

    // Add domain to Vercel project via API
    const vercelResult = await addVercelDomain(defaultStagingDomain);

    if (!vercelResult.success) {
      console.error('Failed to add domain to Vercel:', vercelResult.error);
      return NextResponse.json(
        {
          error: `Failed to create staging domain: ${vercelResult.error}`,
          details: 'Make sure VERCEL_API_TOKEN and VERCEL_PROJECT_ID are configured correctly.'
        },
        { status: 500 }
      );
    }

    // Update restaurant with staging domain
    await updateRestaurantData(restaurantId, defaultStagingDomain);

    // Create default system pages
    await ensureDefaultSystemPagesForRestaurant(restaurantId);

    return NextResponse.json({
      success: true,
      stagingDomain: defaultStagingDomain,
      pagesCreated: DEFAULT_SYSTEM_PAGES.length,
      vercelDomainAdded: true,
      vercelNeedsVerification: vercelResult.needsVerification || false,
    });
  } catch (error) {
    console.error('Error initializing website:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to initialize website',
      },
      { status: 500 }
    );
  }
}
