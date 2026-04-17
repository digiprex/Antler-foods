/**
 * Form Submissions API Route
 *
 * Handles form submission storage
 * POST /api/form-submissions - Create a new form submission
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { sendFormSubmissionEmail, sendFormSubmissionConfirmationEmail } from '@/lib/server/email';

/**
 * GraphQL query to get form details
 */
const GET_FORM = `
  query GetForm($form_id: uuid!) {
    forms_by_pk(form_id: $form_id) {
      form_id
      email
      title
    }
  }
`;

/**
 * GraphQL query to get restaurant POC email and name
 */
const GET_RESTAURANT_INFO = `
  query GetRestaurantInfo($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      poc_email
      name
      email
      phone_number
    }
  }
`;

/**
 * GraphQL mutation to insert form submission
 */
const INSERT_FORM_SUBMISSION = `
  mutation InsertFormSubmission(
    $restaurant_id: uuid!
    $email: String!
    $poc_email: String!
    $type: String!
    $fields: jsonb!
  ) {
    insert_form_submissions_one(
      object: {
        restaurant_id: $restaurant_id
        email: $email
        poc_email: $poc_email
        type: $type
        fields: $fields
        mail_sent: false
        is_deleted: false
      }
    ) {
      form_submission_id
      restaurant_id
      email
      poc_email
      type
      fields
      mail_sent
      created_at
    }
  }
`;

/**
 * GraphQL mutation to update mail_sent status
 */
const UPDATE_MAIL_SENT_STATUS = `
  mutation UpdateMailSentStatus($form_submission_id: uuid!) {
    update_form_submissions_by_pk(
      pk_columns: { form_submission_id: $form_submission_id }
      _set: { mail_sent: true }
    ) {
      form_submission_id
      mail_sent
    }
  }
`;

/**
 * GraphQL query to get all form submissions for a restaurant
 */
const GET_FORM_SUBMISSIONS = `
  query GetFormSubmissions($restaurant_id: uuid!) {
    form_submissions(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        is_deleted: {_eq: false}
      }
      order_by: {created_at: desc}
    ) {
      form_submission_id
      created_at
      updated_at
      is_deleted
      type
      fields
      restaurant_id
      email
      poc_email
      mail_sent
    }
  }
`;

// GET - Fetch form submissions for a restaurant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    console.log('[Form Submissions API] Fetching submissions for restaurant:', restaurantId);

    const result = await adminGraphqlRequest(GET_FORM_SUBMISSIONS, {
      restaurant_id: restaurantId,
    });

    const submissions = (result as any).form_submissions || [];
    console.log('[Form Submissions API] Found', submissions.length, 'submissions');

    return NextResponse.json({
      success: true,
      data: submissions,
    });

  } catch (error) {
    console.error('Form Submissions API GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new form submission
export async function POST(request: NextRequest) {
  try {
    console.log('[Form Submissions API] Received request');
    const body = await request.json();
    console.log('[Form Submissions API] Request body:', body);
    
    const {
      form_id,
      form_title,
      restaurant_id,
      data,
      email
    } = body;

    // Validate required fields
    if (!restaurant_id || !data || !email) {
      console.log('[Form Submissions API] Validation failed:', {
        restaurant_id: !!restaurant_id,
        data: !!data,
        email: !!email
      });
      return NextResponse.json(
        { success: false, error: 'Restaurant ID, email, and form data are required' },
        { status: 400 }
      );
    }

    // Fetch restaurant POC email and name
    let pocEmail = email; // Default to submitter's email as fallback
    let restaurantName = ''; // Restaurant name for email
    let restaurantEmail: string | null = null;
    let restaurantPhone: string | null = null;
    let formTitle = form_title || 'Form Submission';

    try {
      console.log('[Form Submissions API] Fetching restaurant info for:', restaurant_id);
      const restaurantResult = await adminGraphqlRequest(GET_RESTAURANT_INFO, { restaurant_id });
      const restaurant = (restaurantResult as any).restaurants_by_pk;

      if (restaurant) {
        if (restaurant.poc_email) {
          pocEmail = restaurant.poc_email;
          console.log('[Form Submissions API] Using restaurant POC email:', pocEmail);
        } else {
          console.log('[Form Submissions API] No POC email found, using submitter email:', pocEmail);
        }

        if (restaurant.name) {
          restaurantName = restaurant.name;
          console.log('[Form Submissions API] Restaurant name:', restaurantName);
        }

        restaurantEmail = restaurant.email || null;
        restaurantPhone = restaurant.phone_number || null;
      }
    } catch (restaurantError) {
      console.error('Error fetching restaurant info:', restaurantError);
      // Continue with submission using submitter email as fallback
    }

    // Fetch form details if form_id is provided and valid UUID (not "sample")
    if (form_id && form_id !== 'sample') {
      try {
        const formResult = await adminGraphqlRequest(GET_FORM, { form_id });
        const form = (formResult as any).forms_by_pk;

        if (form) {
          formTitle = form.title || formTitle;
          // Note: We're using restaurant POC email instead of form email now
        }
      } catch (formError) {
        console.error('Error fetching form details:', formError);
        // Continue with submission even if form fetch fails
      }
    } else if (form_id === 'sample') {
      console.log('[Form Submissions API] Using sample form, skipping form details fetch');
    }

    // Insert form submission
    console.log('[Form Submissions API] Inserting form submission with data:', {
      restaurant_id,
      email,
      poc_email: pocEmail,
      type: formTitle,
      fields: data
    });
    
    const result = await adminGraphqlRequest(INSERT_FORM_SUBMISSION, {
      restaurant_id,
      email,
      poc_email: pocEmail,
      type: formTitle,
      fields: data
    });

    console.log('[Form Submissions API] GraphQL result:', result);

    if (!(result as any).insert_form_submissions_one) {
      console.log('[Form Submissions API] No submission returned from GraphQL');
      throw new Error('Failed to insert form submission');
    }

    const submission = (result as any).insert_form_submissions_one;
    console.log('[Form Submissions API] Submission created:', submission);

    // Send POC notification to restaurant owner email and poc_email (deduped)
    const pocRecipients = new Set<string>();
    if (restaurantEmail) pocRecipients.add(restaurantEmail.trim().toLowerCase());
    if (pocEmail && pocEmail !== email) pocRecipients.add(pocEmail.trim().toLowerCase());

    const emailData = {
      formTitle,
      restaurantName,
      submissionData: data,
      submittedAt: submission.created_at,
    };

    for (const recipient of pocRecipients) {
      sendFormSubmissionEmail(recipient, emailData)
        .then(() => {
          console.log(`[Form Submissions API] POC email sent to ${recipient}`);
        })
        .catch((err) => {
          console.error(`[Form Submissions API] Failed to send POC email to ${recipient}:`, err);
        });
    }

    // Update mail_sent status
    if (pocRecipients.size > 0) {
      adminGraphqlRequest(UPDATE_MAIL_SENT_STATUS, {
        form_submission_id: submission.form_submission_id,
      }).catch((err) => {
        console.error('Failed to update mail_sent status:', err);
      });
    }

    // Send confirmation email to customer (fire-and-forget)
    if (email) {
      sendFormSubmissionConfirmationEmail(email, {
        formTitle,
        restaurantName: restaurantName || 'Restaurant',
        restaurantEmail,
        restaurantPhone,
        submissionData: data,
        submittedAt: submission.created_at,
      }).catch((err) => {
        console.error('[Form Submissions API] Failed to send customer confirmation email:', err);
      });
    }

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
