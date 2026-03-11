/**
 * Newsletter Subscription API
 *
 * This API route handles newsletter subscriptions by inserting email and restaurant_id
 * into the newsletter_submissions table with enhanced schema
 */

import { NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

interface InsertNewsletterResponse {
  insert_newsletter_submissions_one: {
    id: string;
    email: string;
    restaurant_id: string;
    created_at: string;
  } | null;
}

interface CheckExistingResponse {
  newsletter_submissions: Array<{
    id: string;
    restaurant_id: string;
    is_deleted: boolean;
  }>;
}

/**
 * GraphQL query to check for existing subscription
 */
const CHECK_EXISTING_SUBSCRIPTION = `
  query CheckExistingSubscription($email: String!) {
    newsletter_submissions(
      where: {
        email: { _eq: $email }
      }
    ) {
      id
      restaurant_id
      is_deleted
    }
  }
`;

/**
 * GraphQL mutation to insert newsletter subscription
 */
const INSERT_NEWSLETTER = `
  mutation InsertNewsletter($email: String!, $restaurant_id: uuid!) {
    insert_newsletter_submissions_one(
      object: {
        email: $email,
        restaurant_id: $restaurant_id
      }
    ) {
      id
      email
      restaurant_id
      created_at
    }
  }
`;

/**
 * GraphQL mutation to update existing subscription
 */
const UPDATE_NEWSLETTER = `
  mutation UpdateNewsletter($email: String!, $restaurant_id: uuid!) {
    update_newsletter_submissions(
      where: { email: { _eq: $email } }
      _set: { 
        restaurant_id: $restaurant_id,
        is_deleted: false,
        updated_at: "now()"
      }
    ) {
      returning {
        id
        email
        restaurant_id
        created_at
      }
    }
  }
`;

/**
 * POST endpoint to subscribe to newsletter
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!body.restaurant_id) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingData = await adminGraphqlRequest<CheckExistingResponse>(CHECK_EXISTING_SUBSCRIPTION, {
      email: body.email,
    });

    if (existingData.newsletter_submissions && existingData.newsletter_submissions.length > 0) {
      const existing = existingData.newsletter_submissions[0];
      
      // If email exists and is not deleted, check if it's for the same restaurant
      if (!existing.is_deleted) {
        if (existing.restaurant_id === body.restaurant_id) {
          return NextResponse.json(
            { success: false, error: 'This email is already subscribed to this restaurant' },
            { status: 409 }
          );
        } else {
          return NextResponse.json(
            { success: false, error: 'This email is already subscribed to another restaurant' },
            { status: 409 }
          );
        }
      } else {
        // Email exists but is deleted, update it
        const updateResult = await adminGraphqlRequest<{update_newsletter_submissions: {returning: Array<{id: string; email: string; restaurant_id: string; created_at: string}>}}>(UPDATE_NEWSLETTER, {
          email: body.email,
          restaurant_id: body.restaurant_id,
        });

        if (updateResult.update_newsletter_submissions?.returning?.[0]) {
          return NextResponse.json({
            success: true,
            message: 'Successfully subscribed to newsletter',
            data: {
              id: updateResult.update_newsletter_submissions.returning[0].id,
              email: updateResult.update_newsletter_submissions.returning[0].email,
              created_at: updateResult.update_newsletter_submissions.returning[0].created_at
            }
          });
        }
      }
    }

    // Insert new newsletter subscription
    const data = await adminGraphqlRequest<InsertNewsletterResponse>(INSERT_NEWSLETTER, {
      email: body.email,
      restaurant_id: body.restaurant_id,
    });

    if (!data.insert_newsletter_submissions_one) {
      throw new Error('Failed to insert newsletter subscription');
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to newsletter',
      data: {
        id: data.insert_newsletter_submissions_one.id,
        email: data.insert_newsletter_submissions_one.email,
        created_at: data.insert_newsletter_submissions_one.created_at
      }
    });
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);

    // Check if it's a unique constraint violation
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('duplicate') || errorMessage.includes('unique') || errorMessage.includes('already exists')) {
      return NextResponse.json(
        { success: false, error: 'This email is already subscribed' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to subscribe to newsletter' },
      { status: 500 }
    );
  }
}
