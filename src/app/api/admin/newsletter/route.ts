import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

interface NewsletterSubmission {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

interface GetNewsletterResponse {
  newsletter_submissions: NewsletterSubmission[];
  newsletter_submissions_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

interface DeleteNewsletterResponse {
  update_newsletter_submissions_by_pk: {
    id: string;
  } | null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get('restaurant_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;

    const result = await adminGraphqlRequest<GetNewsletterResponse>(`
      query GetNewsletterSubmissions($restaurant_id: uuid!, $limit: Int!, $offset: Int!) {
        newsletter_submissions(
          where: {
            restaurant_id: { _eq: $restaurant_id }
            is_deleted: { _eq: false }
          }
          order_by: { created_at: desc }
          limit: $limit
          offset: $offset
        ) {
          id
          email
          created_at
          updated_at
        }
        newsletter_submissions_aggregate(
          where: {
            restaurant_id: { _eq: $restaurant_id }
            is_deleted: { _eq: false }
          }
        ) {
          aggregate {
            count
          }
        }
      }
    `, {
      restaurant_id: restaurantId,
      limit,
      offset
    });

    return NextResponse.json({
      submissions: result.newsletter_submissions || [],
      total: result.newsletter_submissions_aggregate?.aggregate?.count || 0,
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching newsletter submissions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch newsletter submissions' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const result = await adminGraphqlRequest<DeleteNewsletterResponse>(`
      mutation DeleteNewsletterSubmission($id: uuid!) {
        update_newsletter_submissions_by_pk(
          pk_columns: { id: $id }
          _set: { is_deleted: true }
        ) {
          id
        }
      }
    `, {
      id
    });

    if (!result.update_newsletter_submissions_by_pk) {
      return NextResponse.json(
        { error: 'Newsletter submission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting newsletter submission:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete newsletter submission' },
      { status: 500 }
    );
  }
}
