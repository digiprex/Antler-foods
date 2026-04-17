/**
 * SMS Campaigns API
 *
 * Stores SMS campaigns in the `campaigns` table with type='sms'.
 * Supports CRUD operations and bulk SMS sending via Twilio.
 */

import { NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { isTwilioConfigured, sendSms } from '@/lib/server/twilio';

// ---------------------------------------------------------------------------
// GraphQL Queries
// ---------------------------------------------------------------------------

const GET_SMS_CAMPAIGNS = `
  query GetSmsCampaigns($restaurant_id: uuid!) {
    campaigns(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        type: { _eq: "sms" }
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
      body
      type
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

const GET_SMS_LOGS = `
  query GetSmsLogs($restaurant_id: uuid!) {
    email_logs(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        template_key: { _like: "sms_%" }
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

const INSERT_SMS_LOG = `
  mutation InsertSmsLog(
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

const INSERT_SMS_CAMPAIGN = `
  mutation InsertSmsCampaign(
    $restaurant_id: uuid!
    $template_key: String!
    $name: String!
    $enabled: Boolean!
    $audience: String!
    $scheduled_date: date
    $scheduled_time: timetz
    $subject: String!
    $body: String!
    $status: String!
    $type: String!
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
        body: $body
        status: $status
        type: $type
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
      body
      type
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
      body
      type
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

// Audience queries — SMS needs phone numbers
const GET_ALL_CUSTOMERS_SMS = `
  query GetAllCustomersSms($restaurant_id: uuid!) {
    customers(
      where: { restaurant_id: { _eq: $restaurant_id }, is_deleted: { _eq: false }, sms_opt_in: { _eq: true } }
    ) {
      customer_id
      phone
      display_name
    }
  }
`;

const GET_SMS_OPTED_IN_CUSTOMERS = `
  query GetSmsOptedInCustomers($restaurant_id: uuid!) {
    customers(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        sms_opt_in: { _eq: true }
      }
    ) {
      customer_id
      phone
      display_name
    }
  }
`;

const GET_ORDERED_CUSTOMERS_SMS = `
  query GetOrderedCustomersSms($restaurant_id: uuid!, $since: timestamptz!) {
    orders(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        created_at: { _gte: $since }
        customer: { sms_opt_in: { _eq: true } }
      }
      distinct_on: customer_id
    ) {
      customer_id
      contact_phone
      contact_first_name
      contact_last_name
    }
  }
`;

const GET_RESTAURANT_INFO = `
  query GetRestaurantInfo($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      name
      phone_number
      custom_domain
      staging_domain
    }
  }
`;

const UPDATE_SMS_LOG_STATUS = `
  mutation UpdateSmsLogStatus($email_log_id: uuid!, $status: String!, $error_message: String) {
    update_email_logs_by_pk(
      pk_columns: { email_log_id: $email_log_id }
      _set: { status: $status, error_message: $error_message }
    ) {
      email_log_id
    }
  }
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SmsRecipient {
  phone: string;
  name: string | null;
  customerId: string | null;
}

async function getSmsAudienceRecipients(
  restaurantId: string,
  audience: string,
): Promise<SmsRecipient[]> {
  const seen = new Map<string, SmsRecipient>();

  if (audience === 'sms_opted_in') {
    const data = await adminGraphqlRequest<any>(GET_SMS_OPTED_IN_CUSTOMERS, {
      restaurant_id: restaurantId,
    });
    for (const c of data.customers || []) {
      const phone = c.phone?.trim();
      if (phone && !seen.has(phone)) {
        seen.set(phone, { phone, name: c.display_name || null, customerId: c.customer_id || null });
      }
    }
  } else if (audience === 'ordered_last_30' || audience === 'ordered_last_90') {
    const days = audience === 'ordered_last_30' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const data = await adminGraphqlRequest<any>(GET_ORDERED_CUSTOMERS_SMS, {
      restaurant_id: restaurantId,
      since: since.toISOString(),
    });
    for (const o of data.orders || []) {
      const phone = o.contact_phone?.trim();
      const name = [o.contact_first_name, o.contact_last_name].filter(Boolean).join(' ') || null;
      if (phone && !seen.has(phone)) {
        seen.set(phone, { phone, name, customerId: o.customer_id || null });
      }
    }
  } else {
    // all_customers
    const data = await adminGraphqlRequest<any>(GET_ALL_CUSTOMERS_SMS, {
      restaurant_id: restaurantId,
    });
    for (const c of data.customers || []) {
      const phone = c.phone?.trim();
      if (phone && !seen.has(phone)) {
        seen.set(phone, { phone, name: c.display_name || null, customerId: c.customer_id || null });
      }
    }
  }

  return Array.from(seen.values());
}

// ---------------------------------------------------------------------------
// GET — List SMS campaigns & logs
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id')?.trim();

    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'restaurant_id required' }, { status: 400 });
    }

    const [campaignsData, logsData, restData] = await Promise.all([
      adminGraphqlRequest<any>(GET_SMS_CAMPAIGNS, { restaurant_id: restaurantId }),
      adminGraphqlRequest<any>(GET_SMS_LOGS, { restaurant_id: restaurantId }),
      adminGraphqlRequest<any>(GET_RESTAURANT_INFO, { restaurant_id: restaurantId }),
    ]);

    const rest = restData.restaurants_by_pk || {};

    return NextResponse.json({
      success: true,
      campaigns: campaignsData.campaigns || [],
      sms_logs: logsData.email_logs || [],
      restaurant_name: rest.name || null,
      restaurant_phone: rest.phone_number || null,
      twilio_configured: isTwilioConfigured(),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Create or Send SMS campaign
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = (body.action || 'create').trim();

    if (action === 'send') {
      return await handleSendSmsCampaign(body);
    }

    // Create campaign
    const restaurantId = (body.restaurant_id || '').trim();
    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'restaurant_id required' }, { status: 400 });
    }

    const name = (body.name || '').trim() || 'Untitled SMS Campaign';

    const data = await adminGraphqlRequest<any>(INSERT_SMS_CAMPAIGN, {
      restaurant_id: restaurantId,
      template_key: body.template_key || name,
      name,
      enabled: body.enabled ?? false,
      audience: body.audience || 'all_customers',
      scheduled_date: body.scheduled_date || null,
      scheduled_time: body.scheduled_time || null,
      subject: (body.subject || '').trim() || name,
      body: body.body || '',
      status: body.status || 'draft',
      type: 'sms',
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

async function handleSendSmsCampaign(body: any) {
  const campaignId = (body.campaign_id || '').trim();
  if (!campaignId) {
    return NextResponse.json({ success: false, error: 'campaign_id required' }, { status: 400 });
  }

  if (!isTwilioConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.' },
      { status: 400 },
    );
  }

  // Fetch campaign
  const campaignData = await adminGraphqlRequest<any>(GET_CAMPAIGN_BY_ID, {
    campaign_id: campaignId,
  });
  const campaign = campaignData.campaigns_by_pk;
  if (!campaign || campaign.is_deleted) {
    return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
  }

  if (!campaign.body) {
    return NextResponse.json({ success: false, error: 'Campaign must have a message body' }, { status: 400 });
  }

  // Get restaurant info for variable replacement
  const restData = await adminGraphqlRequest<any>(GET_RESTAURANT_INFO, {
    restaurant_id: campaign.restaurant_id,
  });
  const rest = restData.restaurants_by_pk || {};
  const restaurantName = rest.name || 'Restaurant';
  const restaurantDomain = rest.custom_domain || rest.staging_domain || '';
  const menuUrl = restaurantDomain ? `https://${restaurantDomain}/menu` : '';
  const feedbackUrl = restaurantDomain ? `https://${restaurantDomain}/feedback` : '';

  // Get audience recipients
  const recipients = await getSmsAudienceRecipients(campaign.restaurant_id, campaign.audience || 'all_customers');

  if (recipients.length === 0) {
    return NextResponse.json({ success: false, error: 'No recipients with phone numbers found for this audience.' }, { status: 400 });
  }

  // Replace variables in message body
  const messageTemplate = (campaign.body || '')
    .replace(/\{restaurant\}/g, restaurantName)
    .replace(/\{menu_url\}/g, menuUrl)
    .replace(/\{feedback_url\}/g, feedbackUrl);

  // Send SMS to each recipient
  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    // Personalize message
    const personalizedMessage = recipient.name
      ? messageTemplate.replace(/\{customer_name\}/g, recipient.name)
      : messageTemplate.replace(/Hi \{customer_name\}, /g, '').replace(/\{customer_name\}/g, 'there');

    // Create log entry
    let logId: string | null = null;
    try {
      const logData = await adminGraphqlRequest<any>(INSERT_SMS_LOG, {
        restaurant_id: campaign.restaurant_id,
        campaign_id: campaign.campaign_id,
        template_key: campaign.template_key,
        customer_id: recipient.customerId,
        recipient_email: recipient.phone, // Store phone in recipient_email field
        recipient_name: recipient.name,
        subject: campaign.subject || campaign.template_key,
        status: 'sent',
        error_message: null,
        trigger: 'manual',
      });
      logId = logData.insert_email_logs_one?.email_log_id || null;
    } catch (logErr) {
      console.error('[SMS Campaign] Failed to create log:', logErr);
    }

    // Send SMS
    try {
      await sendSms(recipient.phone, personalizedMessage);
      sentCount++;
    } catch (err) {
      console.error(`[SMS Campaign] Failed to send SMS to ${recipient.phone}:`, err);
      failedCount++;
      if (logId) {
        adminGraphqlRequest(UPDATE_SMS_LOG_STATUS, {
          email_log_id: logId,
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown error',
        }).catch(() => {});
      }
    }
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
// PATCH — Update SMS campaign
// ---------------------------------------------------------------------------

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const campaignId = (body.campaign_id || '').trim();

    if (!campaignId) {
      return NextResponse.json({ success: false, error: 'campaign_id required' }, { status: 400 });
    }

    const existing = await adminGraphqlRequest<any>(GET_CAMPAIGN_BY_ID, {
      campaign_id: campaignId,
    });
    if (!existing.campaigns_by_pk || existing.campaigns_by_pk.is_deleted) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    const changes: Record<string, unknown> = { updated_at: 'now()' };
    if (body.name !== undefined) changes.name = body.name;
    if (body.enabled !== undefined) changes.enabled = body.enabled;
    if (body.audience !== undefined) changes.audience = body.audience;
    if (body.scheduled_date !== undefined) changes.scheduled_date = body.scheduled_date || null;
    if (body.scheduled_time !== undefined) changes.scheduled_time = body.scheduled_time || null;
    if (body.subject !== undefined) changes.subject = body.subject;
    if (body.body !== undefined) changes.body = body.body;
    if (body.status !== undefined) changes.status = body.status;

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
// DELETE — Soft-delete SMS campaign
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
