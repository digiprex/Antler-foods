/**
 * Form Submissions API Route
 *
 * Handles form submission storage
 * POST /api/form-submissions - Create a new form submission
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

/**
 * GraphQL mutation to insert form submission
 */
const INSERT_FORM_SUBMISSION = `
  mutation InsertFormSubmission(
    $restaurant_id: uuid!
    $email: String!
    $type: String!
    $fields: jsonb!
  ) {
    insert_form_submissions_one(
      object: {
        restaurant_id: $restaurant_id
        email: $email
        type: $type
        fields: $fields
        is_deleted: false
      }
    ) {
      form_submission_id
      restaurant_id
      email
      type
      fields
      created_at
    }
  }
`;

// POST - Create a new form submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      form_id,
      form_title,
      restaurant_id,
      data,
      email
    } = body;

    // Validate required fields
    if (!restaurant_id || !data || !email) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID, email, and form data are required' },
        { status: 400 }
      );
    }

    // Insert form submission
    const result = await adminGraphqlRequest(INSERT_FORM_SUBMISSION, {
      restaurant_id,
      email,
      type: form_title || 'Form Submission',
      fields: data
    });

    if (!(result as any).insert_form_submissions_one) {
      throw new Error('Failed to insert form submission');
    }

    const submission = (result as any).insert_form_submissions_one;

    return NextResponse.json({
      success: true,
      data: {
        submission_id: submission.form_submission_id,
        created_at: submission.created_at
      }
    });

  } catch (error) {
    console.error('Form Submissions API POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
