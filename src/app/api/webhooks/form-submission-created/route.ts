/**
 * Hasura Event Trigger - Form Submission Created
 *
 * This webhook is called by Hasura when a new form submission is inserted
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { sendFormSubmissionEmail } from '@/lib/server/email';

/**
 * GraphQL query to get form details by restaurant_id and email
 * Used to find the POC email for the submission
 */
const GET_FORM_BY_RESTAURANT = `
  query GetFormByRestaurant($restaurant_id: uuid!, $type: String!) {
    forms(
      where: {
        restaurant_id: { _eq: $restaurant_id },
        title: { _eq: $type },
        is_deleted: { _eq: false }
      }
      limit: 1
    ) {
      form_id
      email
      title
    }
  }
`;

/**
 * Hasura Event Trigger Payload Interface
 */
interface HasuraEventPayload {
  event: {
    session_variables: Record<string, string>;
    op: 'INSERT' | 'UPDATE' | 'DELETE' | 'MANUAL';
    data: {
      old: any | null;
      new: any;
    };
  };
  created_at: string;
  id: string;
  delivery_info: {
    max_retries: number;
    current_retry: number;
  };
  trigger: {
    name: string;
  };
  table: {
    schema: string;
    name: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Parse Hasura event payload
    const payload: HasuraEventPayload = await request.json();

    // Extract the new form submission data
    const submission = payload.event.data.new;

    if (!submission) {
      return NextResponse.json(
        { success: false, error: 'No submission data found' },
        { status: 400 }
      );
    }

    const {
      form_submission_id,
      restaurant_id,
      email: submitterEmail,
      type,
      fields,
      created_at
    } = submission;

    console.log(`Processing form submission ${form_submission_id} for restaurant ${restaurant_id}`);

    // Fetch form details to get POC email
    let pocEmail = submitterEmail; // Fallback to submitter's email
    let formTitle = type || 'Form Submission';

    try {
      const formResult = await adminGraphqlRequest(GET_FORM_BY_RESTAURANT, {
        restaurant_id,
        type: type || 'Form Submission'
      });

      const forms = (formResult as any).forms;

      if (forms && forms.length > 0) {
        pocEmail = forms[0].email; // Use the form's configured POC email
        formTitle = forms[0].title || formTitle;
        console.log(`Found form configuration, sending email to: ${pocEmail}`);
      } else {
        console.log(`No form configuration found, using submitter email: ${pocEmail}`);
      }
    } catch (formError) {
      console.error('Error fetching form details:', formError);
      // Continue with submission even if form fetch fails
    }

    // Send email notification to POC email
    try {
      await sendFormSubmissionEmail(pocEmail, {
        formTitle,
        submissionData: fields || {},
        submittedAt: created_at,
      });

      console.log(`Email sent successfully to ${pocEmail} for submission ${form_submission_id}`);

      return NextResponse.json({
        success: true,
        message: 'Email notification sent successfully',
        submission_id: form_submission_id
      });

    } catch (emailError) {
      console.error('Error sending form submission email:', emailError);

      // Return error so Hasura will retry
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email notification',
          details: emailError instanceof Error ? emailError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Form submission webhook error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
