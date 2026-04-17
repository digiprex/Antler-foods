/**
 * Public Blog Posts API
 *
 * Fetches published blog posts for a restaurant (public-facing).
 * Resolved by domain or restaurant_id query parameter.
 */

import { NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { resolveRestaurantIdByDomain } from '@/lib/server/domain-resolver';

const GET_PUBLISHED_BLOG_POSTS = `
  query GetPublishedBlogPosts($restaurant_id: uuid!) {
    blog_posts(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        status: { _eq: "published" }
        is_deleted: { _eq: false }
      }
      order_by: { published_at: desc }
    ) {
      blog_post_id
      title
      slug
      excerpt
      content
      cover_image
      author
      published_at
      tags
    }
  }
`;

const GET_BLOG_POST_BY_SLUG = `
  query GetBlogPostBySlug($restaurant_id: uuid!, $slug: String!) {
    blog_posts(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        slug: { _eq: $slug }
        status: { _eq: "published" }
        is_deleted: { _eq: false }
      }
      limit: 1
    ) {
      blog_post_id
      title
      slug
      excerpt
      content
      cover_image
      author
      published_at
      tags
    }
  }
`;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let restaurantId = searchParams.get('restaurant_id');
    const domain = searchParams.get('domain') || request.headers.get('host');
    const slug = searchParams.get('slug');

    if (!restaurantId && domain) {
      try {
        restaurantId = await resolveRestaurantIdByDomain(domain);
      } catch {
        // continue — validated below
      }
    }

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id or domain required' },
        { status: 400 },
      );
    }

    // Single post by slug
    if (slug) {
      const data = await adminGraphqlRequest<any>(GET_BLOG_POST_BY_SLUG, {
        restaurant_id: restaurantId,
        slug,
      });
      const post = data.blog_posts?.[0] || null;
      return NextResponse.json({ success: true, post }, {
        headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' },
      });
    }

    // All published posts
    const data = await adminGraphqlRequest<any>(GET_PUBLISHED_BLOG_POSTS, {
      restaurant_id: restaurantId,
    });

    return NextResponse.json(
      { success: true, posts: data.blog_posts || [], restaurant_id: restaurantId },
      { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' } },
    );
  } catch (err) {
    console.error('[Public Blog Posts API] GET error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
