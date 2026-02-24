/**
 * Newsletter Subscription API
 *
 * This API route handles newsletter subscriptions by inserting email and restaurant_id
 * into the newsletter table
 */

import { NextResponse } from 'next/server';

const HASURA_URL = process.env.HASURA_GRAPHQL_URL || 'https://pycfacumenjefxtblime.hasura.us-east-1.nhost.run/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || "i;8zmVF8SvnMiX5gao@F'a6,uJ%WphsD";

/**
 * GraphQL mutation to insert newsletter subscription
 */
const INSERT_NEWSLETTER = `
  mutation InsertNewsletter($email: String!, $restaurant_id: uuid!) {
    insert_newsletter_one(
      object: {
        email: $email,
        restaurant_id: $restaurant_id
      }
    ) {
      email
      restaurant_id
    }
  }
`;

/**
 * Helper function to make GraphQL requests
 */
async function graphqlRequest(query: string, variables?: any) {
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
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

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

    // Insert newsletter subscription
    const data = await graphqlRequest(INSERT_NEWSLETTER, {
      email: body.email,
      restaurant_id: body.restaurant_id,
    });

    if (!data.insert_newsletter_one) {
      throw new Error('Failed to insert newsletter subscription');
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to newsletter',
    });
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);

    // Check if it's a duplicate email error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
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
