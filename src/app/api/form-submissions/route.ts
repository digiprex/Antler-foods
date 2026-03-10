/**
 * Form Submissions API Route
 *
 * Handles form submission storage
 * POST /api/form-submissions - Create a new form submission
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { sendFormSubmissionEmail } from '@/lib/server/email';

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

    // Send email notification to POC email from the submission record
    try {
      const emailRecipient = submission.poc_email;
      console.log('[Form Submissions API] Sending email notification to:', emailRecipient);
      
      await sendFormSubmissionEmail(emailRecipient, {
        formTitle,
        restaurantName,
        submissionData: data,
        submittedAt: submission.created_at,
      });
      
      console.log('[Form Submissions API] Email notification sent successfully');
      
      // Update mail_sent status to true
      try {
        await adminGraphqlRequest(UPDATE_MAIL_SENT_STATUS, {
          form_submission_id: submission.form_submission_id
        });
        console.log('[Form Submissions API] Mail sent status updated to true');
      } catch (updateError) {
        console.error('Failed to update mail_sent status:', updateError);
        // Don't fail the request if status update fails
      }
      
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error('Failed to send form submission email:', emailError);
      // Email failure shouldn't prevent the submission from being recorded
      // mail_sent remains false in database
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
