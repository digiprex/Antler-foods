import { NextRequest, NextResponse } from 'next/server';
import {
  MenuCustomerAuthError,
  signUpMenuCustomer,
} from '@/features/restaurant-menu/lib/server/customer-auth';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { sendCampaignEmail } from '@/lib/server/email';
import { isTwilioConfigured, sendSms } from '@/lib/server/twilio';

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
      custom_domain
      staging_domain
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

interface RestaurantInfo {
  name?: string;
  logo?: string;
  email?: string;
  phone_number?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  custom_domain?: string;
  staging_domain?: string;
}

function getRestaurantSiteUrl(rest: RestaurantInfo): string | null {
  const domain = rest.custom_domain || rest.staging_domain;
  if (!domain) return null;
  return domain.startsWith('http') ? domain : `https://${domain}/menu`;
}

async function getRestaurantInfo(restaurantId: string): Promise<RestaurantInfo> {
  const data = await adminGraphqlRequest<any>(GET_RESTAURANT_INFO, {
    restaurant_id: restaurantId,
  });
  return data.restaurants_by_pk || {};
}

async function sendWelcomeEmail(
  restaurantId: string,
  customerEmail: string,
  customerName: string | null,
) {
  try {
    const rest = await getRestaurantInfo(restaurantId);
    const restaurantName = rest.name || 'Restaurant';
    const rawLogo = rest.logo || '';
    const restaurantLogo = rawLogo && rawLogo.startsWith('http') ? rawLogo : null;
    const restaurantEmail = rest.email || null;
    const restaurantPhone = rest.phone_number || null;
    const restaurantAddress = [rest.address, rest.city, rest.state, rest.postal_code]
      .filter(Boolean)
      .join(', ') || null;

    // Try to use a custom campaign template if the restaurant has one
    const campaignData = await adminGraphqlRequest<any>(GET_WELCOME_CAMPAIGN, {
      restaurant_id: restaurantId,
    });
    const campaign = campaignData.campaigns?.[0];

    const siteUrl = getRestaurantSiteUrl(rest);
    const subject = campaign?.subject || `Welcome to ${restaurantName}!`;
    const heading = campaign?.heading || subject;

    const siteLink = siteUrl
      ? `<p style="margin:16px 0 0;"><a href="${siteUrl}" style="color:#7c3aed;font-weight:600;text-decoration:underline;">Visit ${restaurantName}</a></p>`
      : '';

    const defaultBody = [
      `<p>Thank you for creating an account with ${restaurantName}!</p>`,
      `<p>Here's what you can enjoy as a member:</p>`,
      `<ul style="margin:12px 0;padding-left:20px;color:#374151;">`,
      `<li style="margin-bottom:8px;"><strong>Loyalty Points</strong> — Earn points on every order and redeem them for discounts on future purchases.</li>`,
      `<li style="margin-bottom:8px;"><strong>Faster Checkout</strong> — Your details are saved so you can order in seconds.</li>`,
      `<li style="margin-bottom:8px;"><strong>Exclusive Offers</strong> — Get access to members-only deals and promotions.</li>`,
      `<li style="margin-bottom:8px;"><strong>Order History</strong> — Easily reorder your favorites anytime.</li>`,
      `</ul>`,
      siteLink,
      `<p style="margin-top:16px;">Your next great meal is just a click away.</p>`,
    ].join('\n');

    const body = campaign?.body || defaultBody;
    const ctaText = siteUrl ? 'Order Now' : undefined;
    const ctaUrl = siteUrl || undefined;

    let status: 'sent' | 'failed' = 'sent';
    let errorMessage: string | null = null;

    try {
      await sendCampaignEmail(customerEmail, {
        subject,
        heading,
        body,
        ctaText,
        ctaUrl,
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
      campaign_id: campaign?.campaign_id || null,
      template_key: 'welcome_email',
      customer_id: null,
      recipient_email: customerEmail,
      recipient_name: customerName,
      subject,
      status,
      error_message: errorMessage,
      trigger: 'auto_signup',
    });
  } catch (err) {
    console.error('[Menu Auth] Welcome email flow failed:', err);
  }
}

async function sendWelcomeSms(
  restaurantId: string,
  customerPhone: string,
  customerName: string | null,
) {
  if (!isTwilioConfigured()) {
    console.warn('[Menu Auth] Twilio not configured, skipping welcome SMS');
    return;
  }

  try {
    const rest = await getRestaurantInfo(restaurantId);
    const restaurantName = rest.name || 'Restaurant';
    const greeting = customerName ? `Hi ${customerName}, welcome` : 'Welcome';
    const message = `${greeting} to ${restaurantName}! Your account is ready. Earn loyalty points on every order and enjoy faster checkout.`;

    await sendSms(customerPhone, message);
    console.log(`[Menu Auth] Welcome SMS sent to ${customerPhone}`);
  } catch (err) {
    console.error('[Menu Auth] Failed to send welcome SMS:', err);
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

    // Fire-and-forget: send welcome email and SMS
    const restaurantId = (body?.restaurantId || '').trim();
    const email = (body?.email || '').trim();
    const phone = (body?.phone || '').trim();
    const firstName = (body?.firstName || '').trim();
    const lastName = (body?.lastName || '').trim();
    const customerName = [firstName, lastName].filter(Boolean).join(' ') || null;

    if (restaurantId && email) {
      sendWelcomeEmail(restaurantId, email, customerName);
    }

    if (restaurantId && phone) {
      sendWelcomeSms(restaurantId, phone, customerName);
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
