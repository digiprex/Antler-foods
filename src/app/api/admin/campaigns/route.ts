/**
 * Campaigns API
 *
 * Stores automated email campaigns in the `campaigns` table.
 * Supports CRUD operations and bulk email sending.
 */

import { NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { sendCampaignEmail } from '@/lib/server/email';

// ---------------------------------------------------------------------------
// GraphQL Queries
// ---------------------------------------------------------------------------

const GET_CAMPAIGNS = `
  query GetCampaigns($restaurant_id: uuid!) {
    campaigns(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: desc }
    ) {
      campaign_id
      restaurant_id
      template_key
      name
      enabled
      audience
      scheduled_date
      scheduled_time
      subject
      heading
      body
      status
      sent_at
      sent_count
      failed_count
      is_deleted
      created_at
      updated_at
    }
  }
`;

const GET_EMAIL_LOGS = `
  query GetEmailLogs($restaurant_id: uuid!) {
    email_logs(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: 200
    ) {
      email_log_id
      campaign_id
      template_key
      customer_id
      recipient_email
      recipient_name
      subject
      status
      error_message
      trigger
      created_at
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

const GET_CAMPAIGN_BY_ID = `
  query GetCampaignById($campaign_id: uuid!) {
    campaigns_by_pk(campaign_id: $campaign_id) {
      campaign_id
      restaurant_id
      template_key
      name
      enabled
      audience
      scheduled_date
      scheduled_time
      subject
      heading
      body
      status
      sent_at
      sent_count
      failed_count
      is_deleted
      created_at
      updated_at
    }
  }
`;

const INSERT_CAMPAIGN = `
  mutation InsertCampaign(
    $restaurant_id: uuid!
    $template_key: String!
    $name: String!
    $enabled: Boolean!
    $audience: String!
    $scheduled_date: date
    $scheduled_time: timetz
    $subject: String!
    $heading: String
    $body: String!
    $status: String!
  ) {
    insert_campaigns_one(
      object: {
        restaurant_id: $restaurant_id
        template_key: $template_key
        name: $name
        enabled: $enabled
        audience: $audience
        scheduled_date: $scheduled_date
        scheduled_time: $scheduled_time
        subject: $subject
        heading: $heading
        body: $body
        status: $status
      }
    ) {
      campaign_id
      restaurant_id
      template_key
      name
      enabled
      audience
      scheduled_date
      scheduled_time
      subject
      heading
      body
      status
      sent_at
      sent_count
      failed_count
      created_at
      updated_at
    }
  }
`;

// Generic update — caller must include ALL fields (merge with existing before calling)
const UPDATE_CAMPAIGN = `
  mutation UpdateCampaign($campaign_id: uuid!, $changes: campaigns_set_input!) {
    update_campaigns_by_pk(
      pk_columns: { campaign_id: $campaign_id }
      _set: $changes
    ) {
      campaign_id
      restaurant_id
      template_key
      name
      enabled
      audience
      scheduled_date
      scheduled_time
      subject
      heading
      body
      status
      sent_at
      sent_count
      failed_count
      created_at
      updated_at
    }
  }
`;

const DELETE_CAMPAIGN = `
  mutation DeleteCampaign($campaign_id: uuid!) {
    update_campaigns_by_pk(
      pk_columns: { campaign_id: $campaign_id }
      _set: { is_deleted: true, updated_at: "now()" }
    ) {
      campaign_id
    }
  }
`;

// Audience queries
const GET_ALL_CUSTOMERS = `
  query GetAllCustomers($restaurant_id: uuid!) {
    customers(
      where: { restaurant_id: { _eq: $restaurant_id }, is_deleted: { _eq: false } }
    ) {
      customer_id
      email
      display_name
    }
  }
`;

const GET_OPTED_IN_CUSTOMERS = `
  query GetOptedInCustomers($restaurant_id: uuid!) {
    customers(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        email_opt_in: { _eq: true }
      }
    ) {
      customer_id
      email
      display_name
    }
  }
`;

const GET_NEWSLETTER_SUBSCRIBERS = `
  query GetNewsletterSubscribers($restaurant_id: uuid!) {
    newsletter_submissions(
      where: { restaurant_id: { _eq: $restaurant_id }, is_deleted: { _eq: false } }
    ) {
      id
      email
    }
  }
`;

const GET_ORDERED_CUSTOMERS = `
  query GetOrderedCustomers($restaurant_id: uuid!, $since: timestamptz!) {
    orders(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        created_at: { _gte: $since }
      }
      distinct_on: customer_id
    ) {
      customer_id
      customer {
        email
        display_name
      }
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Recipient {
  email: string;
  name: string | null;
  customerId: string | null;
}

async function getAudienceRecipients(
  restaurantId: string,
  audience: string,
): Promise<Recipient[]> {
  const seen = new Map<string, Recipient>();

  if (audience === 'newsletter') {
    const data = await adminGraphqlRequest<any>(GET_NEWSLETTER_SUBSCRIBERS, {
      restaurant_id: restaurantId,
    });
    for (const sub of data.newsletter_submissions || []) {
      const email = sub.email?.trim()?.toLowerCase();
      if (email && !seen.has(email)) seen.set(email, { email, name: null, customerId: null });
    }
  } else if (audience === 'opted_in') {
    const data = await adminGraphqlRequest<any>(GET_OPTED_IN_CUSTOMERS, {
      restaurant_id: restaurantId,
    });
    for (const c of data.customers || []) {
      const email = c.email?.trim()?.toLowerCase();
      if (email && !seen.has(email)) seen.set(email, { email, name: c.display_name || null, customerId: c.customer_id || null });
    }
  } else if (audience === 'ordered_last_30' || audience === 'ordered_last_90') {
    const days = audience === 'ordered_last_30' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const data = await adminGraphqlRequest<any>(GET_ORDERED_CUSTOMERS, {
      restaurant_id: restaurantId,
      since: since.toISOString(),
    });
    for (const o of data.orders || []) {
      const email = o.customer?.email?.trim()?.toLowerCase();
      if (email && !seen.has(email)) seen.set(email, { email, name: o.customer?.display_name || null, customerId: o.customer_id || null });
    }
  } else {
    // all_customers
    const data = await adminGraphqlRequest<any>(GET_ALL_CUSTOMERS, {
      restaurant_id: restaurantId,
    });
    for (const c of data.customers || []) {
      const email = c.email?.trim()?.toLowerCase();
      if (email && !seen.has(email)) seen.set(email, { email, name: c.display_name || null, customerId: c.customer_id || null });
    }
  }

  return Array.from(seen.values());
}

async function logEmail(params: {
  restaurantId: string;
  campaignId: string | null;
  templateKey: string;
  customerId: string | null;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  status: 'sent' | 'failed';
  errorMessage: string | null;
  trigger: 'manual' | 'scheduled' | 'auto_signup';
}) {
  try {
    await adminGraphqlRequest(INSERT_EMAIL_LOG, {
      restaurant_id: params.restaurantId,
      campaign_id: params.campaignId,
      template_key: params.templateKey,
      customer_id: params.customerId,
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName,
      subject: params.subject,
      status: params.status,
      error_message: params.errorMessage,
      trigger: params.trigger,
    });
  } catch (err) {
    console.error('[Email Log] Failed to log email:', err);
  }
}

// ---------------------------------------------------------------------------
// GET — List campaigns
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id')?.trim();

    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'restaurant_id required' }, { status: 400 });
    }

    // Fetch active campaigns, email logs, and restaurant info
    const [activeData, logsData, restData] = await Promise.all([
      adminGraphqlRequest<any>(GET_CAMPAIGNS, { restaurant_id: restaurantId }),
      adminGraphqlRequest<any>(GET_EMAIL_LOGS, { restaurant_id: restaurantId }),
      adminGraphqlRequest<any>(GET_RESTAURANT_INFO, { restaurant_id: restaurantId }),
    ]);

    const rest = restData.restaurants_by_pk || {};
    const restaurantAddress = [rest.address, rest.city, rest.state, rest.postal_code]
      .filter(Boolean)
      .join(', ') || null;

    return NextResponse.json({
      success: true,
      campaigns: activeData.campaigns || [],
      email_logs: logsData.email_logs || [],
      restaurant_email: rest.email || null,
      restaurant_phone: rest.phone_number || null,
      restaurant_address: restaurantAddress,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Create campaign or Send campaign
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = (body.action || 'create').trim();

    if (action === 'send') {
      return await handleSendCampaign(body);
    }

    // Create campaign
    const restaurantId = (body.restaurant_id || '').trim();
    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'restaurant_id required' }, { status: 400 });
    }

    const name = (body.name || '').trim() || 'Untitled Campaign';

    const data = await adminGraphqlRequest<any>(INSERT_CAMPAIGN, {
      restaurant_id: restaurantId,
      template_key: body.template_key || name,
      name,
      enabled: body.enabled ?? false,
      audience: body.audience || 'all_customers',
      scheduled_date: body.scheduled_date || null,
      scheduled_time: body.scheduled_time || null,
      subject: (body.subject || '').trim() || name,
      heading: (body.heading || '').trim() || null,
      body: body.body || '',
      status: body.status || 'draft',
    });

    return NextResponse.json({
      success: true,
      campaign: data.insert_campaigns_one,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

async function handleSendCampaign(body: any) {
  const campaignId = (body.campaign_id || '').trim();
  if (!campaignId) {
    return NextResponse.json({ success: false, error: 'campaign_id required' }, { status: 400 });
  }

  // Fetch campaign
  const campaignData = await adminGraphqlRequest<any>(GET_CAMPAIGN_BY_ID, {
    campaign_id: campaignId,
  });
  const campaign = campaignData.campaigns_by_pk;
  if (!campaign || campaign.is_deleted) {
    return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
  }

  if (!campaign.subject || !campaign.body) {
    return NextResponse.json({ success: false, error: 'Campaign must have a subject and body' }, { status: 400 });
  }

  // Get restaurant info
  const restData = await adminGraphqlRequest<any>(GET_RESTAURANT_INFO, {
    restaurant_id: campaign.restaurant_id,
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
  const restaurantDomain = rest.custom_domain || rest.staging_domain || '';
  const menuUrl = restaurantDomain ? `https://${restaurantDomain}/menu` : '';
  const feedbackUrl = restaurantDomain ? `https://${restaurantDomain}/feedback` : '';

  // Get audience recipients
  const recipients = await getAudienceRecipients(campaign.restaurant_id, campaign.audience || 'all_customers');

  if (recipients.length === 0) {
    return NextResponse.json({ success: false, error: 'No recipients found for this audience.' }, { status: 400 });
  }

  // Send emails and log each one
  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    let status: 'sent' | 'failed' = 'sent';
    let errorMessage: string | null = null;
    try {
      await sendCampaignEmail(recipient.email, {
        subject: campaign.subject,
        heading: campaign.heading || campaign.subject,
        body: (campaign.body || '').replace(/\{menu_url\}/g, menuUrl).replace(/\{feedback_url\}/g, feedbackUrl),
        customerName: recipient.name,
        restaurantName,
        restaurantLogo,
        restaurantEmail,
        restaurantPhone,
        restaurantAddress,
      });
      sentCount++;
    } catch (err) {
      console.error(`Failed to send campaign email to ${recipient.email}:`, err);
      status = 'failed';
      errorMessage = err instanceof Error ? err.message : 'Unknown error';
      failedCount++;
    }

    logEmail({
      restaurantId: campaign.restaurant_id,
      campaignId: campaign.campaign_id,
      templateKey: campaign.template_key,
      customerId: recipient.customerId,
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      subject: campaign.subject,
      status,
      errorMessage,
      trigger: 'manual',
    });
  }

  // Update campaign status
  await adminGraphqlRequest(UPDATE_CAMPAIGN, {
    campaign_id: campaignId,
    changes: {
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount,
      updated_at: 'now()',
    },
  });

  return NextResponse.json({
    success: true,
    sent_count: sentCount,
    failed_count: failedCount,
    total: recipients.length,
  });
}

// ---------------------------------------------------------------------------
// PATCH — Update campaign
// ---------------------------------------------------------------------------

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const campaignId = (body.campaign_id || '').trim();

    if (!campaignId) {
      return NextResponse.json({ success: false, error: 'campaign_id required' }, { status: 400 });
    }

    // Verify campaign exists
    const existing = await adminGraphqlRequest<any>(GET_CAMPAIGN_BY_ID, {
      campaign_id: campaignId,
    });
    if (!existing.campaigns_by_pk || existing.campaigns_by_pk.is_deleted) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    // Build changes object — only include fields that were provided
    const changes: Record<string, unknown> = { updated_at: 'now()' };
    if (body.name !== undefined) changes.name = body.name;
    if (body.enabled !== undefined) changes.enabled = body.enabled;
    if (body.audience !== undefined) changes.audience = body.audience;
    if (body.scheduled_date !== undefined) changes.scheduled_date = body.scheduled_date || null;
    if (body.scheduled_time !== undefined) changes.scheduled_time = body.scheduled_time || null;
    if (body.subject !== undefined) changes.subject = body.subject;
    if (body.heading !== undefined) changes.heading = body.heading;
    if (body.body !== undefined) changes.body = body.body;
    if (body.status !== undefined) changes.status = body.status;
    if (body.sent_at !== undefined) changes.sent_at = body.sent_at;
    if (body.sent_count !== undefined) changes.sent_count = body.sent_count;
    if (body.failed_count !== undefined) changes.failed_count = body.failed_count;

    const data = await adminGraphqlRequest<any>(UPDATE_CAMPAIGN, {
      campaign_id: campaignId,
      changes,
    });

    return NextResponse.json({
      success: true,
      campaign: data.update_campaigns_by_pk,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE — Soft-delete campaign
// ---------------------------------------------------------------------------

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const campaignId = (body.campaign_id || '').trim();

    if (!campaignId) {
      return NextResponse.json({ success: false, error: 'campaign_id required' }, { status: 400 });
    }

    await adminGraphqlRequest(DELETE_CAMPAIGN, { campaign_id: campaignId });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
