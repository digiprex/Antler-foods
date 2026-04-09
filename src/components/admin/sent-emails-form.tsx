'use client';

import { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Campaign {
  campaign_id: string;
  restaurant_id: string;
  template_key: string;
  name: string;
  enabled: boolean;
  audience: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  subject: string;
  heading: string | null;
  body: string;
  status: string;
  sent_at: string | null;
  sent_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
}

interface SentEmailsFormProps {
  restaurantId: string;
  restaurantName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const AUDIENCE_MAP: Record<string, string> = {
  all_customers: 'All Customers',
  opted_in: 'Email Opted-In',
  newsletter: 'Newsletter Subscribers',
  ordered_last_30: 'Ordered Last 30 Days',
  ordered_last_90: 'Ordered Last 90 Days',
};

const TEMPLATE_NAMES: Record<string, string> = {
  welcome_email: 'Welcome Email',
  we_miss_you: 'We Miss You',
  thank_you: 'Thank You',
  special_offer: 'Special Offer',
  new_menu_items: 'New Menu Items',
  feedback_request: 'Feedback Request',
  loyalty_reward: 'Loyalty Reward',
  seasonal_special: 'Seasonal Special',
  lazy_sunday: 'Lazy Sunday',
};

type TabFilter = 'all' | 'sent' | 'scheduled';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSchedule(date: string | null, time: string | null) {
  if (!date) return '—';
  const d = new Date(date + (time ? `T${time}` : ''));
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(time ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function getTemplateName(key: string) {
  return TEMPLATE_NAMES[key] || key;
}

function getAudienceLabel(value: string) {
  return AUDIENCE_MAP[value] || value;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SentEmailsForm({ restaurantId }: SentEmailsFormProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabFilter>('all');
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/campaigns?restaurant_id=${encodeURIComponent(restaurantId)}`,
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load');
      setCampaigns(data.campaigns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Filter campaigns by tab
  const filtered = campaigns.filter((c) => {
    if (tab === 'sent') return c.status === 'sent';
    if (tab === 'scheduled') return c.status === 'scheduled';
    return c.status === 'sent' || c.status === 'scheduled';
  });

  // Sort: scheduled first (by date asc), then sent (by sent_at desc)
  const sorted = [...filtered].sort((a, b) => {
    if (a.status === 'scheduled' && b.status !== 'scheduled') return -1;
    if (a.status !== 'scheduled' && b.status === 'scheduled') return 1;
    if (a.status === 'scheduled' && b.status === 'scheduled') {
      const dateA = a.scheduled_date || '';
      const dateB = b.scheduled_date || '';
      return dateA.localeCompare(dateB);
    }
    // Both sent — newest first
    const sentA = a.sent_at || '';
    const sentB = b.sent_at || '';
    return sentB.localeCompare(sentA);
  });

  const sentCount = campaigns.filter((c) => c.status === 'sent').length;
  const scheduledCount = campaigns.filter((c) => c.status === 'scheduled').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <p className="text-sm font-medium text-gray-700">Loading emails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {([
          { key: 'all' as TabFilter, label: 'All', count: sentCount + scheduledCount },
          { key: 'scheduled' as TabFilter, label: 'Scheduled', count: scheduledCount },
          { key: 'sent' as TabFilter, label: 'Sent', count: sentCount },
        ]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            <span
              className={`inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold min-w-[18px] ${
                tab === t.key ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-16">
          <svg className="h-14 w-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          <p className="mt-4 text-sm font-medium text-gray-500">
            {tab === 'scheduled'
              ? 'No scheduled emails'
              : tab === 'sent'
                ? 'No sent emails yet'
                : 'No sent or scheduled emails yet'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Enable and schedule templates from the Automated Emails page.
          </p>
        </div>
      ) : (
        /* Table */
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Template</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Subject</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Audience</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Results</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((campaign) => {
                  const isSent = campaign.status === 'sent';
                  const isScheduled = campaign.status === 'scheduled';

                  return (
                    <tr key={campaign.campaign_id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Template Name */}
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{getTemplateName(campaign.template_key)}</p>
                      </td>

                      {/* Subject */}
                      <td className="px-5 py-3.5">
                        <p className="text-gray-600 truncate max-w-[200px]">{campaign.subject}</p>
                      </td>

                      {/* Audience */}
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                          {getAudienceLabel(campaign.audience)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        {isSent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Sent
                          </span>
                        )}
                        {isScheduled && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Scheduled
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                        {isSent && campaign.sent_at
                          ? formatDateTime(campaign.sent_at)
                          : isScheduled
                            ? formatSchedule(campaign.scheduled_date, campaign.scheduled_time)
                            : '—'}
                      </td>

                      {/* Results */}
                      <td className="px-5 py-3.5">
                        {isSent ? (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                              {campaign.sent_count}
                            </span>
                            {campaign.failed_count > 0 && (
                              <span className="inline-flex items-center gap-1 text-red-500 font-medium">
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                {campaign.failed_count}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Preview */}
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => setPreviewCampaign(campaign)}
                          className="text-xs font-medium text-purple-600 hover:text-purple-700"
                        >
                          Preview
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreviewCampaign(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span className="text-sm font-medium text-gray-600">
                  {getTemplateName(previewCampaign.template_key)}
                  {previewCampaign.status === 'sent' && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Sent</span>
                  )}
                  {previewCampaign.status === 'scheduled' && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">Scheduled</span>
                  )}
                </span>
              </div>
              <button onClick={() => setPreviewCampaign(null)} className="rounded-full p-1.5 hover:bg-gray-200 transition-colors">
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Subject */}
            <div className="px-6 pt-5 pb-3">
              <h2 className="text-xl font-normal text-gray-900">{previewCampaign.subject}</h2>
            </div>

            {/* Meta info */}
            <div className="px-6 pb-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <span>Audience: <span className="text-gray-600 font-medium">{getAudienceLabel(previewCampaign.audience)}</span></span>
              {previewCampaign.status === 'sent' && previewCampaign.sent_at && (
                <span>Sent: <span className="text-gray-600 font-medium">{formatDateTime(previewCampaign.sent_at)}</span></span>
              )}
              {previewCampaign.status === 'scheduled' && previewCampaign.scheduled_date && (
                <span>Scheduled: <span className="text-gray-600 font-medium">{formatSchedule(previewCampaign.scheduled_date, previewCampaign.scheduled_time)}</span></span>
              )}
              {previewCampaign.status === 'sent' && (
                <span>
                  {previewCampaign.sent_count} delivered
                  {previewCampaign.failed_count > 0 && `, ${previewCampaign.failed_count} failed`}
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="border-b border-gray-100 mx-6" />

            {/* Email body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div style={{ maxWidth: 600, margin: '0 auto' }}>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-7 py-8">
                    <h1
                      className="text-2xl font-bold text-gray-900 text-center mb-4"
                      style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
                    >
                      {previewCampaign.heading || previewCampaign.subject}
                    </h1>
                    <div
                      className="text-[15px] leading-[1.7] text-gray-700 [&>p]:mb-3"
                      style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
                      dangerouslySetInnerHTML={{ __html: previewCampaign.body }}
                    />
                  </div>
                  <div className="bg-gray-50 border-t border-gray-200 px-7 py-5">
                    <p className="text-[13px] text-gray-500 text-center">
                      Sent by {previewCampaign.name || 'Restaurant'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
