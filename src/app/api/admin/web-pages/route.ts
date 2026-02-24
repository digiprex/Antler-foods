import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPages } from '@/lib/graphql/queries';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const restaurantId = url.searchParams.get('restaurant_id') || undefined;

    const pages = await getPages(restaurantId);

    return NextResponse.json({ pages });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Unknown error' }, { status: 500 });
  }
}
