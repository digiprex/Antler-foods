/**
 * Cron: Campaign Scheduler
 *
 * Runs every minute. Finds campaigns where:
 *   - enabled = true
 *   - status = 'scheduled'
 *   - scheduled_date + scheduled_time <= now
 * Then sends the emails and updates status to 'sent'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { sendCampaignEmail } from '@/lib/server/email';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const GET_DUE_CAMPAIGNS = `
  query GetDueCampaigns($now_date: date!, $now_time: timetz!) {
    campaigns(
      where: {
        enabled: { _eq: true }
        status: { _eq: "scheduled" }
        is_deleted: { _eq: false }
        _or: [
          { scheduled_date: { _lt: $now_date } },
          {
            _and: [
              { scheduled_date: { _eq: $now_date } },
              { scheduled_time: { _lte: $now_time } }
            ]
          }
        ]
      }
    ) {
      campaign_id
      restaurant_id
      template_key
      name
      audience
      subject
      heading
      body
    }
  }
`;

const UPDATE_CAMPAIGN_SENT = `
  mutation UpdateCampaignSent(
    $campaign_id: uuid!
    $sent_at: timestamptz!
    $sent_count: Int!
    $failed_count: Int!
  ) {
    update_campaigns_by_pk(
      pk_columns: { campaign_id: $campaign_id }
      _set: {
        status: "sent"
        sent_at: $sent_at
        sent_count: $sent_count
        failed_count: $failed_count
        updated_at: "now()"
      }
    ) {
      campaign_id
    }
  }
`;

const GET_ALL_CUSTOMERS = `
  query GetAllCustomers($restaurant_id: uuid!) {
    customers(
      where: { restaurant_id: { _eq: $restaurant_id }, is_deleted: { _eq: false } }
    ) { email display_name }
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
    ) { email display_name }
  }
`;

const GET_NEWSLETTER_SUBSCRIBERS = `
  query GetNewsletterSubscribers($restaurant_id: uuid!) {
    newsletter_submissions(
      where: { restaurant_id: { _eq: $restaurant_id }, is_deleted: { _eq: false } }
    ) { email }
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
      customer { email display_name }
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Recipient {
  email: string;
  name: string | null;
}

async function logEmail(params: {
  restaurantId: string;
  campaignId: string | null;
  templateKey: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  status: 'sent' | 'failed';
  errorMessage: string | null;
  trigger: string;
}) {
  try {
    await adminGraphqlRequest(INSERT_EMAIL_LOG, {
      restaurant_id: params.restaurantId,
      campaign_id: params.campaignId,
      template_key: params.templateKey,
      customer_id: null,
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName,
      subject: params.subject,
      status: params.status,
      error_message: params.errorMessage,
      trigger: params.trigger,
    });
  } catch (err) {
    console.error('[Cron/Email Log] Failed to log email:', err);
  }
}

async function getAudienceRecipients(restaurantId: string, audience: string): Promise<Recipient[]> {
  const seen = new Map<string, Recipient>();

  if (audience === 'newsletter') {
    const data = await adminGraphqlRequest<any>(GET_NEWSLETTER_SUBSCRIBERS, { restaurant_id: restaurantId });
    for (const sub of data.newsletter_submissions || []) {
      const email = sub.email?.trim()?.toLowerCase();
      if (email && !seen.has(email)) seen.set(email, { email, name: null });
    }
  } else if (audience === 'opted_in') {
    const data = await adminGraphqlRequest<any>(GET_OPTED_IN_CUSTOMERS, { restaurant_id: restaurantId });
    for (const c of data.customers || []) {
      const email = c.email?.trim()?.toLowerCase();
      if (email && !seen.has(email)) seen.set(email, { email, name: c.display_name || null });
    }
  } else if (audience === 'ordered_last_30' || audience === 'ordered_last_90') {
    const days = audience === 'ordered_last_30' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const data = await adminGraphqlRequest<any>(GET_ORDERED_CUSTOMERS, { restaurant_id: restaurantId, since: since.toISOString() });
    for (const o of data.orders || []) {
      const email = o.customer?.email?.trim()?.toLowerCase();
      if (email && !seen.has(email)) seen.set(email, { email, name: o.customer?.display_name || null });
    }
  } else {
    const data = await adminGraphqlRequest<any>(GET_ALL_CUSTOMERS, { restaurant_id: restaurantId });
    for (const c of data.customers || []) {
      const email = c.email?.trim()?.toLowerCase();
      if (email && !seen.has(email)) seen.set(email, { email, name: c.display_name || null });
    }
  }

  return Array.from(seen.values());
}

// ---------------------------------------------------------------------------
// GET — Cron handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const isLocal = process.env.NODE_ENV === 'development';

  if (
    !isLocal &&
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Array<{ campaign_id: string; template_key: string; sent: number; failed: number; total: number }> = [];

  try {
    const now = new Date();
    const nowDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const nowTime = now.toTimeString().slice(0, 8);   // HH:MM:SS

    // 1. Fetch campaigns that are due
    const data = await adminGraphqlRequest<any>(GET_DUE_CAMPAIGNS, {
      now_date: nowDate,
      now_time: nowTime,
    });

    const dueCampaigns = data.campaigns || [];

    if (dueCampaigns.length === 0) {
      return NextResponse.json({ success: true, message: 'No campaigns due', processed: 0 });
    }

    console.log(`[Cron/Campaigns] ${dueCampaigns.length} campaign(s) due for sending`);

    // 2. Process each campaign
    for (const campaign of dueCampaigns) {
      try {
        // Get restaurant info
        const restData = await adminGraphqlRequest<any>(GET_RESTAURANT_INFO, {
          restaurant_id: campaign.restaurant_id,
        });
        const restaurantName = restData.restaurants_by_pk?.name || 'Restaurant';
        const rawLogo = restData.restaurants_by_pk?.logo || '';
        const restaurantLogo = rawLogo && rawLogo.startsWith('http') ? rawLogo : null;
        const restaurantEmail = restData.restaurants_by_pk?.email || null;
        const restaurantPhone = restData.restaurants_by_pk?.phone_number || null;
        const restaurantAddress = [
          restData.restaurants_by_pk?.address,
          restData.restaurants_by_pk?.city,
          restData.restaurants_by_pk?.state,
          restData.restaurants_by_pk?.postal_code,
        ].filter(Boolean).join(', ') || null;

        // Get audience recipients
        const recipients = await getAudienceRecipients(campaign.restaurant_id, campaign.audience || 'all_customers');

        if (recipients.length === 0) {
          console.log(`[Cron/Campaigns] No recipients for campaign ${campaign.campaign_id} (${campaign.template_key}), skipping`);

          // Mark as sent with 0 counts so it doesn't re-trigger
          await adminGraphqlRequest(UPDATE_CAMPAIGN_SENT, {
            campaign_id: campaign.campaign_id,
            sent_at: now.toISOString(),
            sent_count: 0,
            failed_count: 0,
          });

          results.push({ campaign_id: campaign.campaign_id, template_key: campaign.template_key, sent: 0, failed: 0, total: 0 });
          continue;
        }

        // Send emails
        let sentCount = 0;
        let failedCount = 0;

        for (const recipient of recipients) {
          let status: 'sent' | 'failed' = 'sent';
          let errorMessage: string | null = null;
          try {
            await sendCampaignEmail(recipient.email, {
              subject: campaign.subject,
              heading: campaign.heading || campaign.subject,
              body: campaign.body,
              customerName: recipient.name,
              restaurantName,
              restaurantLogo,
              restaurantEmail,
              restaurantPhone,
              restaurantAddress,
            });
            sentCount++;
          } catch (err) {
            console.error(`[Cron/Campaigns] Failed to send to ${recipient.email}:`, err);
            status = 'failed';
            errorMessage = err instanceof Error ? err.message : 'Unknown error';
            failedCount++;
          }

          logEmail({
            restaurantId: campaign.restaurant_id,
            campaignId: campaign.campaign_id,
            templateKey: campaign.template_key,
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            subject: campaign.subject,
            status,
            errorMessage,
            trigger: 'scheduled',
          });
        }

        // Update campaign status
        await adminGraphqlRequest(UPDATE_CAMPAIGN_SENT, {
          campaign_id: campaign.campaign_id,
          sent_at: now.toISOString(),
          sent_count: sentCount,
          failed_count: failedCount,
        });

        console.log(`[Cron/Campaigns] Campaign ${campaign.template_key}: ${sentCount} sent, ${failedCount} failed out of ${recipients.length}`);
        results.push({ campaign_id: campaign.campaign_id, template_key: campaign.template_key, sent: sentCount, failed: failedCount, total: recipients.length });
      } catch (err) {
        console.error(`[Cron/Campaigns] Failed to process campaign ${campaign.campaign_id}:`, err);
        results.push({ campaign_id: campaign.campaign_id, template_key: campaign.template_key, sent: 0, failed: -1, total: 0 });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('[Cron/Campaigns] Fatal error:', error);
    return NextResponse.json(
      { error: 'Failed to process campaigns', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
