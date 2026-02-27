import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPages, getPageBySlug } from '@/lib/graphql/queries';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const restaurantId = url.searchParams.get('restaurant_id') || undefined;
    const urlSlug = url.searchParams.get('url_slug');
    const domain = url.searchParams.get('domain') || request.headers.get('host') || undefined;

    // If url_slug is provided, get page by slug
    if (urlSlug) {
      const page = await getPageBySlug(urlSlug, restaurantId, domain);
      
      if (!page) {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 });
      }

      return NextResponse.json({ page });
    }

    // Otherwise, get all pages
    const pages = await getPages(restaurantId);

    return NextResponse.json({ pages });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
