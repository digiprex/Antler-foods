/**
 * Blog Posts API
 *
 * CRUD operations for restaurant blog posts.
 * Stored in the `blog_posts` table.
 */

import { NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const GET_BLOG_POSTS = `
  query GetBlogPosts($restaurant_id: uuid!) {
    blog_posts(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: desc }
    ) {
      blog_post_id
      restaurant_id
      title
      slug
      excerpt
      content
      cover_image
      author
      status
      published_at
      tags
      is_deleted
      created_at
      updated_at
    }
  }
`;

const GET_BLOG_POST_BY_ID = `
  query GetBlogPostById($blog_post_id: uuid!) {
    blog_posts_by_pk(blog_post_id: $blog_post_id) {
      blog_post_id
      restaurant_id
      title
      slug
      excerpt
      content
      cover_image
      author
      status
      published_at
      tags
      is_deleted
      created_at
      updated_at
    }
  }
`;

const INSERT_BLOG_POST = `
  mutation InsertBlogPost(
    $restaurant_id: uuid!
    $title: String!
    $slug: String!
    $excerpt: String!
    $content: String!
    $cover_image: String!
    $author: String!
    $status: String!
    $published_at: timestamptz
    $tags: jsonb!
  ) {
    insert_blog_posts_one(object: {
      restaurant_id: $restaurant_id
      title: $title
      slug: $slug
      excerpt: $excerpt
      content: $content
      cover_image: $cover_image
      author: $author
      status: $status
      published_at: $published_at
      tags: $tags
    }) {
      blog_post_id
      restaurant_id
      title
      slug
      excerpt
      content
      cover_image
      author
      status
      published_at
      tags
      created_at
      updated_at
    }
  }
`;

const UPDATE_BLOG_POST = `
  mutation UpdateBlogPost($blog_post_id: uuid!, $changes: blog_posts_set_input!) {
    update_blog_posts_by_pk(
      pk_columns: { blog_post_id: $blog_post_id }
      _set: $changes
    ) {
      blog_post_id
      restaurant_id
      title
      slug
      excerpt
      content
      cover_image
      author
      status
      published_at
      tags
      created_at
      updated_at
    }
  }
`;

const DELETE_BLOG_POST = `
  mutation DeleteBlogPost($blog_post_id: uuid!) {
    update_blog_posts_by_pk(
      pk_columns: { blog_post_id: $blog_post_id }
      _set: { is_deleted: true, updated_at: "now()" }
    ) {
      blog_post_id
    }
  }
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// GET — List blog posts
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id')?.trim();

    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'restaurant_id required' }, { status: 400 });
    }

    const data = await adminGraphqlRequest<any>(GET_BLOG_POSTS, {
      restaurant_id: restaurantId,
    });

    return NextResponse.json({
      success: true,
      posts: data.blog_posts || [],
    });
  } catch (err) {
    console.error('[Blog Posts API] GET error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Create blog post
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const restaurantId = (body.restaurant_id || '').trim();

    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'restaurant_id required' }, { status: 400 });
    }

    const title = (body.title || '').trim();
    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const slug = (body.slug || '').trim() || slugify(title);
    const status = body.status || 'draft';

    const data = await adminGraphqlRequest<any>(INSERT_BLOG_POST, {
      restaurant_id: restaurantId,
      title,
      slug,
      excerpt: (body.excerpt || '').trim(),
      content: body.content || '',
      cover_image: (body.cover_image || '').trim(),
      author: (body.author || '').trim(),
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
      tags: body.tags || [],
    });

    return NextResponse.json({
      success: true,
      post: data.insert_blog_posts_one,
    });
  } catch (err) {
    console.error('[Blog Posts API] POST error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json(
        { success: false, error: 'A blog post with this slug already exists.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH — Update blog post
// ---------------------------------------------------------------------------

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const blogPostId = (body.blog_post_id || '').trim();

    if (!blogPostId) {
      return NextResponse.json({ success: false, error: 'blog_post_id required' }, { status: 400 });
    }

    const changes: Record<string, unknown> = { updated_at: 'now()' };
    if (body.title !== undefined) changes.title = body.title;
    if (body.slug !== undefined) changes.slug = body.slug;
    if (body.excerpt !== undefined) changes.excerpt = body.excerpt;
    if (body.content !== undefined) changes.content = body.content;
    if (body.cover_image !== undefined) changes.cover_image = body.cover_image;
    if (body.author !== undefined) changes.author = body.author;
    if (body.tags !== undefined) changes.tags = body.tags;

    if (body.status !== undefined) {
      changes.status = body.status;
      if (body.status === 'published' && !body.published_at) {
        changes.published_at = new Date().toISOString();
      }
    }
    if (body.published_at !== undefined) changes.published_at = body.published_at;

    const data = await adminGraphqlRequest<any>(UPDATE_BLOG_POST, {
      blog_post_id: blogPostId,
      changes,
    });

    return NextResponse.json({
      success: true,
      post: data.update_blog_posts_by_pk,
    });
  } catch (err) {
    console.error('[Blog Posts API] PATCH error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json(
        { success: false, error: 'A blog post with this slug already exists.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE — Soft-delete blog post
// ---------------------------------------------------------------------------

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const blogPostId = (body.blog_post_id || '').trim();

    if (!blogPostId) {
      return NextResponse.json({ success: false, error: 'blog_post_id required' }, { status: 400 });
    }

    await adminGraphqlRequest(DELETE_BLOG_POST, { blog_post_id: blogPostId });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Blog Posts API] DELETE error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
