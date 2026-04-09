import { NextRequest, NextResponse } from 'next/server';
import {
  MenuCustomerAuthError,
  signUpMenuCustomer,
} from '@/features/restaurant-menu/lib/server/customer-auth';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { sendCampaignEmail } from '@/lib/server/email';

// ---------------------------------------------------------------------------
// Welcome-email helpers
// ---------------------------------------------------------------------------

const GET_WELCOME_CAMPAIGN = `
  query GetWelcomeCampaign($restaurant_id: uuid!) {
    campaigns(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        template_key: { _eq: "welcome_email" }
        enabled: { _eq: true }
        is_deleted: { _eq: false }
      }
      limit: 1
    ) {
      campaign_id
      subject
      heading
      body
    }
  }
`;

const GET_RESTAURANT_INFO = `
  query GetRestaurantInfo($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      name
      logo
      email
      phone_number
      address
      city
      state
      postal_code
    }
  }
`;

const INSERT_EMAIL_LOG = `
  mutation InsertEmailLog(
    $restaurant_id: uuid!
    $campaign_id: uuid
    $template_key: String!
    $customer_id: uuid
    $recipient_email: String!
    $recipient_name: String
    $subject: String!
    $status: String!
    $error_message: String
    $trigger: String!
  ) {
    insert_email_logs_one(object: {
      restaurant_id: $restaurant_id
      campaign_id: $campaign_id
      template_key: $template_key
      customer_id: $customer_id
      recipient_email: $recipient_email
      recipient_name: $recipient_name
      subject: $subject
      status: $status
      error_message: $error_message
      trigger: $trigger
    }) {
      email_log_id
    }
  }
`;

async function sendWelcomeEmailIfEnabled(
  restaurantId: string,
  customerEmail: string,
  customerName: string | null,
) {
  try {
    const data = await adminGraphqlRequest<any>(GET_WELCOME_CAMPAIGN, {
      restaurant_id: restaurantId,
    });
    const campaign = data.campaigns?.[0];
    if (!campaign) return; // welcome email not enabled

    const restData = await adminGraphqlRequest<any>(GET_RESTAURANT_INFO, {
      restaurant_id: restaurantId,
    });
    const rest = restData.restaurants_by_pk || {};
    const restaurantName = rest.name || 'Restaurant';
    const rawLogo = rest.logo || '';
    const restaurantLogo = rawLogo && rawLogo.startsWith('http') ? rawLogo : null;
    const restaurantEmail = rest.email || null;
    const restaurantPhone = rest.phone_number || null;
    const restaurantAddress = [rest.address, rest.city, rest.state, rest.postal_code]
      .filter(Boolean)
      .join(', ') || null;

    let status: 'sent' | 'failed' = 'sent';
    let errorMessage: string | null = null;

    try {
      await sendCampaignEmail(customerEmail, {
        subject: campaign.subject,
        heading: campaign.heading || campaign.subject,
        body: campaign.body,
        customerName,
        restaurantName,
        restaurantLogo,
        restaurantEmail,
        restaurantPhone,
        restaurantAddress,
      });
      console.log(`[Menu Auth] Welcome email sent to ${customerEmail}`);
    } catch (sendErr) {
      status = 'failed';
      errorMessage = sendErr instanceof Error ? sendErr.message : 'Unknown error';
      console.error('[Menu Auth] Failed to send welcome email:', sendErr);
    }

    // Log to email_logs
    await adminGraphqlRequest(INSERT_EMAIL_LOG, {
      restaurant_id: restaurantId,
      campaign_id: campaign.campaign_id,
      template_key: 'welcome_email',
      customer_id: null,
      recipient_email: customerEmail,
      recipient_name: customerName,
      subject: campaign.subject,
      status,
      error_message: errorMessage,
      trigger: 'auto_signup',
    });
  } catch (err) {
    // Don't fail signup if welcome email fails
    console.error('[Menu Auth] Failed to send welcome email:', err);
  }
}

// ---------------------------------------------------------------------------
// POST — Signup
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          restaurantId?: string;
          email?: string;
          firstName?: string;
          lastName?: string;
          phone?: string;
          password?: string;
        }
      | null;

    await signUpMenuCustomer({
      restaurantId: body?.restaurantId || '',
      email: body?.email || '',
      firstName: body?.firstName || '',
      lastName: body?.lastName || '',
      phone: body?.phone || '',
      password: body?.password || '',
    });

    // Fire-and-forget: send welcome email if the restaurant has it enabled
    const restaurantId = (body?.restaurantId || '').trim();
    const email = (body?.email || '').trim();
    const firstName = (body?.firstName || '').trim();
    const lastName = (body?.lastName || '').trim();
    const customerName = [firstName, lastName].filter(Boolean).join(' ') || null;

    if (restaurantId && email) {
      sendWelcomeEmailIfEnabled(restaurantId, email, customerName);
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please sign in to continue.',
    });
  } catch (error) {
    if (error instanceof MenuCustomerAuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    console.error('[Menu Auth] Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to create the account right now.' },
      { status: 500 },
    );
  }
}
