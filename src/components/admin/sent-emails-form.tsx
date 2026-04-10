'use client';

import { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface EmailLog {
  email_log_id: string;
  campaign_id: string | null;
  template_key: string;
  customer_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: string;
  error_message: string | null;
  trigger: string;
  created_at: string;
}

interface Campaign {
  campaign_id: string;
  template_key: string;
  name: string;
  audience: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  subject: string;
  status: string;
}

interface SentEmailsFormProps {
  restaurantId: string;
  restaurantName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TEMPLATE_NAMES: Record<string, string> = {
  welcome_email: 'Welcome Email',
  we_miss_you: 'We Miss You',
  thank_you: 'Thank You',
  special_offer: 'Special Offer',
  feedback_request: 'Feedback Request',
  loyalty_reward: 'Loyalty Reward',
  lazy_sunday: 'Lazy Sunday',
  happy_friday: 'Happy Friday',
};

const TRIGGER_LABELS: Record<string, { label: string; cls: string }> = {
  manual: { label: 'Manual', cls: 'bg-gray-100 text-gray-600' },
  scheduled: { label: 'Scheduled', cls: 'bg-purple-50 text-purple-700' },
  auto_signup: { label: 'Sign-up', cls: 'bg-blue-50 text-blue-700' },
};

const AUDIENCE_LABELS: Record<string, string> = {
  all_customers: 'All Customers',
  opted_in: 'Email Opted-In',
  newsletter: 'Newsletter Subscribers',
  ordered_last_30: 'Ordered Last 30 Days',
  ordered_last_90: 'Ordered Last 90 Days',
};

type TabFilter = 'all' | 'sent' | 'failed' | 'scheduled';

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

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SentEmailsForm({ restaurantId }: SentEmailsFormProps) {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabFilter>('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/campaigns?restaurant_id=${encodeURIComponent(restaurantId)}`,
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load');
      setLogs(data.email_logs || []);
      setCampaigns(data.campaigns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Filter
  const filtered = logs.filter((l) => {
    if (tab === 'sent') return l.status === 'sent';
    if (tab === 'failed') return l.status === 'failed';
    return true;
  });

  // Sort newest first
  const sorted = [...filtered].sort((a, b) =>
    (b.created_at || '').localeCompare(a.created_at || ''),
  );

  const sentCount = logs.filter((l) => l.status === 'sent').length;
  const failedCount = logs.filter((l) => l.status === 'failed').length;
  const scheduledCampaigns = campaigns.filter((c) => c.status === 'scheduled');
  const scheduledCount = scheduledCampaigns.length;

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
          { key: 'all' as TabFilter, label: 'All', count: logs.length },
          { key: 'sent' as TabFilter, label: 'Sent', count: sentCount },
          { key: 'scheduled' as TabFilter, label: 'Scheduled', count: scheduledCount },
          { key: 'failed' as TabFilter, label: 'Failed', count: failedCount },
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

      {/* Scheduled campaigns tab */}
      {tab === 'scheduled' ? (
        scheduledCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-16">
            <svg className="h-14 w-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-4 text-sm font-medium text-gray-500">No scheduled emails</p>
            <p className="mt-1 text-xs text-gray-400">Schedule campaigns from the Email Campaigns page.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Template</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 hidden md:table-cell">Subject</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Audience</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Scheduled For</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {scheduledCampaigns.map((c) => (
                    <tr key={c.campaign_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-medium text-gray-900">{TEMPLATE_NAMES[c.template_key] || c.template_key}</span>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <p className="text-gray-600 text-xs truncate max-w-[200px]">{c.subject}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-gray-600">{AUDIENCE_LABELS[c.audience] || c.audience}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-700 whitespace-nowrap">
                        {c.scheduled_date}{c.scheduled_time ? ` at ${c.scheduled_time}` : ''}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Scheduled
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) :

      /* Empty state */
      sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-16">
          <svg className="h-14 w-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          <p className="mt-4 text-sm font-medium text-gray-500">
            {tab === 'failed'
              ? 'No failed emails'
              : tab === 'sent'
                ? 'No sent emails yet'
                : 'No emails sent yet'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Enable and send templates from the Email Campaigns page.
          </p>
        </div>
      ) : (
        /* Table */
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Recipient</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 hidden md:table-cell">Subject</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Template</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 hidden sm:table-cell">Trigger</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((log) => {
                  const templateName = TEMPLATE_NAMES[log.template_key] || log.template_key;
                  const isFailed = log.status === 'failed';
                  const trigger = TRIGGER_LABELS[log.trigger] || TRIGGER_LABELS.manual;

                  return (
                    <tr key={log.email_log_id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Recipient */}
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900 text-sm truncate max-w-[180px]">
                          {log.recipient_name || log.recipient_email}
                        </p>
                        {log.recipient_name && (
                          <p className="text-[11px] text-gray-400 truncate max-w-[180px]">{log.recipient_email}</p>
                        )}
                      </td>

                      {/* Subject */}
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <p className="text-gray-600 text-xs truncate max-w-[200px]">{log.subject}</p>
                      </td>

                      {/* Template */}
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-gray-700 font-medium">{templateName}</span>
                      </td>

                      {/* Trigger */}
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${trigger.cls}`}>
                          {trigger.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        {isFailed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700" title={log.error_message || ''}>
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Sent
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
