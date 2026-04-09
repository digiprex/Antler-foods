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

const UPDATE_CAMPAIGN = `
  mutation UpdateCampaign(
    $campaign_id: uuid!
    $name: String
    $enabled: Boolean
    $audience: String
    $scheduled_date: date
    $scheduled_time: timetz
    $subject: String
    $heading: String
    $body: String
    $status: String
    $sent_at: timestamptz
    $sent_count: Int
    $failed_count: Int
  ) {
    update_campaigns_by_pk(
      pk_columns: { campaign_id: $campaign_id }
      _set: {
        name: $name
        enabled: $enabled
        audience: $audience
        scheduled_date: $scheduled_date
        scheduled_time: $scheduled_time
        subject: $subject
        heading: $heading
        body: $body
        status: $status
        sent_at: $sent_at
        sent_count: $sent_count
        failed_count: $failed_count
        updated_at: "now()"
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

const GET_RESTAURANT_NAME = `
  query GetRestaurantName($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      name
      logo
    }
  }
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAudienceEmails(
  restaurantId: string,
  audience: string,
): Promise<string[]> {
  const emails = new Set<string>();

  if (audience === 'newsletter') {
    const data = await adminGraphqlRequest<any>(GET_NEWSLETTER_SUBSCRIBERS, {
      restaurant_id: restaurantId,
    });
    for (const sub of data.newsletter_submissions || []) {
      if (sub.email?.trim()) emails.add(sub.email.trim().toLowerCase());
    }
  } else if (audience === 'opted_in') {
    const data = await adminGraphqlRequest<any>(GET_OPTED_IN_CUSTOMERS, {
      restaurant_id: restaurantId,
    });
    for (const c of data.customers || []) {
      if (c.email?.trim()) emails.add(c.email.trim().toLowerCase());
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
      const email = o.customer?.email?.trim();
      if (email) emails.add(email.toLowerCase());
    }
  } else {
    // all_customers
    const data = await adminGraphqlRequest<any>(GET_ALL_CUSTOMERS, {
      restaurant_id: restaurantId,
    });
    for (const c of data.customers || []) {
      if (c.email?.trim()) emails.add(c.email.trim().toLowerCase());
    }
  }

  return Array.from(emails);
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

    const data = await adminGraphqlRequest<any>(GET_CAMPAIGNS, {
      restaurant_id: restaurantId,
    });

    return NextResponse.json({
      success: true,
      campaigns: data.campaigns || [],
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
  const restData = await adminGraphqlRequest<any>(GET_RESTAURANT_NAME, {
    restaurant_id: campaign.restaurant_id,
  });
  const restaurantName = restData.restaurants_by_pk?.name || 'Restaurant';
  const rawLogo = restData.restaurants_by_pk?.logo || '';
  const restaurantLogo = rawLogo && rawLogo.startsWith('http') ? rawLogo : null;

  // Get audience emails
  const emails = await getAudienceEmails(campaign.restaurant_id, campaign.audience || 'all_customers');

  if (emails.length === 0) {
    return NextResponse.json({ success: false, error: 'No recipients found for this audience.' }, { status: 400 });
  }

  // Send emails
  let sentCount = 0;
  let failedCount = 0;

  for (const email of emails) {
    try {
      await sendCampaignEmail(email, {
        subject: campaign.subject,
        heading: campaign.heading || campaign.subject,
        body: campaign.body,
        restaurantName,
        restaurantLogo,
      });
      sentCount++;
    } catch (err) {
      console.error(`Failed to send campaign email to ${email}:`, err);
      failedCount++;
    }
  }

  // Update campaign status
  await adminGraphqlRequest(UPDATE_CAMPAIGN, {
    campaign_id: campaignId,
    status: 'sent',
    sent_at: new Date().toISOString(),
    sent_count: sentCount,
    failed_count: failedCount,
  });

  return NextResponse.json({
    success: true,
    sent_count: sentCount,
    failed_count: failedCount,
    total: emails.length,
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

    // Build update variables — only include fields that were provided
    const updates: Record<string, unknown> = { campaign_id: campaignId };
    if (body.name !== undefined) updates.name = body.name;
    if (body.enabled !== undefined) updates.enabled = body.enabled;
    if (body.audience !== undefined) updates.audience = body.audience;
    if (body.scheduled_date !== undefined) updates.scheduled_date = body.scheduled_date || null;
    if (body.scheduled_time !== undefined) updates.scheduled_time = body.scheduled_time || null;
    if (body.subject !== undefined) updates.subject = body.subject;
    if (body.heading !== undefined) updates.heading = body.heading;
    if (body.body !== undefined) updates.body = body.body;
    if (body.status !== undefined) updates.status = body.status;
    if (body.sent_at !== undefined) updates.sent_at = body.sent_at;
    if (body.sent_count !== undefined) updates.sent_count = body.sent_count;
    if (body.failed_count !== undefined) updates.failed_count = body.failed_count;

    const data = await adminGraphqlRequest<any>(UPDATE_CAMPAIGN, updates);

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
