'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface StoredCampaign {
  campaign_id: string;
  restaurant_id: string;
  template_key: string;
  name: string;
  enabled: boolean;
  audience: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  subject: string;
  body: string;
  status: string;
  sent_at: string | null;
  sent_count: number;
  failed_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

interface SmsLog {
  email_log_id: string;
  campaign_id: string | null;
  template_key: string;
  customer_id: string | null;
  recipient_email: string; // phone number stored here
  recipient_name: string | null;
  subject: string;
  status: string;
  error_message: string | null;
  trigger: string;
  created_at: string;
}

interface Coupon {
  coupon_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  value: number;
  min_spend: number;
  start_date: string;
  end_date: string | null;
}

interface SmsCampaignsFormProps {
  restaurantId: string;
  restaurantName: string;
}

interface TemplateDefinition {
  key: string;
  name: string;
  description: string;
  subject: string;
  body: string;
  default_audience: string;
  trigger: 'manual' | 'auto_signup';
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-defined SMS Templates
// ─────────────────────────────────────────────────────────────────────────────

const PREDEFINED_TEMPLATES: TemplateDefinition[] = [
  {
    key: 'sms_welcome',
    name: 'Welcome SMS',
    description: 'Greet new customers when they first sign up',
    subject: 'Welcome SMS',
    body: 'Hi {customer_name}, welcome to {restaurant}! Your account is ready. Earn loyalty points on every order and enjoy faster checkout.',
    default_audience: 'all_customers',
    trigger: 'auto_signup',
  },
  {
    key: 'sms_we_miss_you',
    name: 'We Miss You',
    description: 'Re-engage customers who haven\'t ordered recently',
    subject: 'We Miss You SMS',
    body: 'Hi {customer_name}, we miss you at {restaurant}! Come back and enjoy the flavors you love. Order now: {menu_url}',
    default_audience: 'ordered_last_90',
    trigger: 'manual',
  },
  {
    key: 'sms_special_offer',
    name: 'Special Offer',
    description: 'Send exclusive promotions and discounts',
    subject: 'Special Offer SMS',
    body: 'Hi {customer_name}, exclusive deal from {restaurant} just for you! Don\'t miss out — order now: {menu_url}',
    default_audience: 'all_customers',
    trigger: 'manual',
  },
  {
    key: 'sms_feedback',
    name: 'Feedback Request',
    description: 'Ask customers for reviews and feedback',
    subject: 'Feedback SMS',
    body: 'Hi {customer_name}, how was your recent order from {restaurant}? We\'d love your feedback: {feedback_url}',
    default_audience: 'ordered_last_30',
    trigger: 'manual',
  },
  {
    key: 'sms_weekend',
    name: 'Weekend Special',
    description: 'Tempt customers with a weekend treat',
    subject: 'Weekend Special SMS',
    body: 'Hi {customer_name}, it\'s the weekend! Treat yourself to something delicious from {restaurant}. Order now: {menu_url}',
    default_audience: 'all_customers',
    trigger: 'manual',
  },
];

const SMS_AUDIENCE_OPTIONS = [
  { value: 'all_customers', label: 'All Customers' },
  { value: 'sms_opted_in', label: 'SMS Opted-In' },
  { value: 'ordered_last_30', label: 'Ordered Last 30 Days' },
  { value: 'ordered_last_90', label: 'Ordered Last 90 Days' },
];

const SMS_CHAR_LIMIT = 160;

const TEMPLATE_NAMES: Record<string, string> = Object.fromEntries(
  PREDEFINED_TEMPLATES.map((t) => [t.key, t.name]),
);

const TRIGGER_LABELS: Record<string, { label: string; cls: string }> = {
  manual: { label: 'Manual', cls: 'bg-gray-100 text-gray-600' },
  scheduled: { label: 'Scheduled', cls: 'bg-purple-50 text-purple-700' },
  auto_signup: { label: 'Sign-up', cls: 'bg-blue-50 text-blue-700' },
};

function isScheduledInFuture(date: string, time: string): boolean {
  if (!date) return false;
  const dateTime = time ? `${date}T${time}` : `${date}T23:59`;
  return new Date(dateTime) > new Date();
}

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

export default function SmsCampaignsForm({ restaurantId, restaurantName }: SmsCampaignsFormProps) {
  const [storedCampaigns, setStoredCampaigns] = useState<StoredCampaign[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [confirmSendKey, setConfirmSendKey] = useState<string | null>(null);
  const [twilioConfigured, setTwilioConfigured] = useState(false);

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [pendingEnableKey, setPendingEnableKey] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Active tab: 'templates' or 'logs'
  const [activeTab, setActiveTab] = useState<'templates' | 'logs'>('templates');
  const [logFilter, setLogFilter] = useState<'all' | 'sent' | 'failed' | 'scheduled'>('all');

  // Coupons for Special Offer template
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);

  // Custom message editing
  const [editingBody, setEditingBody] = useState<Record<string, string>>({});

  useEffect(() => { setIsMounted(true); }, []);

  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<StoredCampaign>>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const storedRef = useRef(storedCampaigns);
  storedRef.current = storedCampaigns;

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/sms-campaigns?restaurant_id=${encodeURIComponent(restaurantId)}`,
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load');
      setStoredCampaigns(data.campaigns || []);
      setSmsLogs(data.sms_logs || []);
      setTwilioConfigured(data.twilio_configured ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch(`/api/coupons?restaurant_id=${encodeURIComponent(restaurantId)}`);
      const data = await res.json();
      if (res.ok && data.success) setCoupons(data.coupons || []);
    } catch { /* silent */ }
  }, [restaurantId]);

  useEffect(() => { fetchData(); fetchCoupons(); }, [fetchData, fetchCoupons]);

  useEffect(() => {
    const timers = debounceTimers.current;
    return () => { Object.values(timers).forEach(clearTimeout); };
  }, []);

  const getStoredConfig = useCallback(
    (key: string): StoredCampaign | undefined => storedCampaigns.find((c) => c.template_key === key),
    [storedCampaigns],
  );

  const replaceVars = (text: string) => text.replace(/\{restaurant\}/g, restaurantName);

  const couponTemplates = ['sms_special_offer'];
  const selectedCoupon = coupons.find((c) => c.coupon_id === selectedCouponId) || null;
  const selectedCouponRef = useRef(selectedCoupon);
  selectedCouponRef.current = selectedCoupon;

  const buildSpecialOfferSmsBody = (coupon: Coupon) => {
    const discountLabel = coupon.discount_type === 'percentage'
      ? `${coupon.value}% off`
      : `$${coupon.value} off`;
    const expiry = coupon.end_date
      ? ` Valid until ${new Date(coupon.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`
      : '';
    return `Hi {customer_name}, exclusive deal from {restaurant}: ${discountLabel} with code ${coupon.code}!${coupon.min_spend > 0 ? ` Min. order $${coupon.min_spend}.` : ''}${expiry} Order now: {menu_url}`;
  };

  const getEffective = (templateKey: string, field: keyof StoredCampaign, fallback: unknown) => {
    const override = localOverrides[templateKey]?.[field];
    if (override !== undefined) return override;
    const stored = getStoredConfig(templateKey);
    const storedVal = stored?.[field];
    if (storedVal !== undefined && storedVal !== null) return storedVal;
    return fallback;
  };

  const getMessageBody = (templateKey: string, template: TemplateDefinition): string => {
    if (editingBody[templateKey] !== undefined) return editingBody[templateKey];
    if (couponTemplates.includes(templateKey) && selectedCoupon) {
      return buildSpecialOfferSmsBody(selectedCoupon);
    }
    const stored = getStoredConfig(templateKey);
    if (stored?.body) return stored.body;
    return replaceVars(template.body);
  };

  const persistToApi = useCallback(
    async (templateKey: string, overrides: Partial<StoredCampaign>) => {
      try {
        const existing = storedRef.current.find((c) => c.template_key === templateKey);
        const template = PREDEFINED_TEMPLATES.find((t) => t.key === templateKey)!;

        const messageBody = editingBody[templateKey]
          ?? (couponTemplates.includes(templateKey) && selectedCouponRef.current
            ? buildSpecialOfferSmsBody(selectedCouponRef.current)
            : (existing?.body || replaceVars(template.body)));

        const isReEnabling =
          overrides.enabled === true &&
          existing &&
          !existing.enabled &&
          (existing.status === 'sent' || existing.status === 'scheduled');

        if (isReEnabling) {
          await fetch('/api/admin/sms-campaigns', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaign_id: existing.campaign_id }),
          });
        }

        let res: Response;
        if (existing && !isReEnabling) {
          res = await fetch('/api/admin/sms-campaigns', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaign_id: existing.campaign_id,
              name: templateKey,
              enabled: overrides.enabled ?? existing.enabled ?? false,
              audience: overrides.audience ?? existing.audience ?? template.default_audience,
              scheduled_date:
                overrides.scheduled_date !== undefined
                  ? overrides.scheduled_date
                  : (existing.scheduled_date ?? null),
              scheduled_time:
                overrides.scheduled_time !== undefined
                  ? overrides.scheduled_time
                  : (existing.scheduled_time ?? null),
              subject: template.subject,
              body: messageBody,
            }),
          });
        } else {
          res = await fetch('/api/admin/sms-campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurant_id: restaurantId,
              template_key: templateKey,
              name: templateKey,
              enabled: overrides.enabled ?? false,
              audience: overrides.audience ?? template.default_audience,
              scheduled_date: overrides.scheduled_date ?? null,
              scheduled_time: overrides.scheduled_time ?? null,
              subject: template.subject,
              body: messageBody,
              status: 'draft',
            }),
          });
        }

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save');

        const campaign = data.campaign;
        if (campaign) {
          setStoredCampaigns((prev) => {
            const filtered = isReEnabling
              ? prev.filter((c) => c.campaign_id !== existing.campaign_id)
              : prev;
            const idx = filtered.findIndex((c) => c.template_key === templateKey);
            if (idx >= 0) {
              const next = [...filtered];
              next[idx] = campaign;
              return next;
            }
            return [campaign, ...filtered];
          });
          storedRef.current = storedRef.current.some((c) => c.template_key === templateKey)
            ? storedRef.current.map((c) => c.template_key === templateKey ? campaign : c)
            : [campaign, ...storedRef.current];
        }

        setLocalOverrides((prev) => {
          const next = { ...prev };
          delete next[templateKey];
          return next;
        });
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to save');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [restaurantId, restaurantName, editingBody],
  );

  const updateField = (templateKey: string, field: keyof StoredCampaign, value: unknown) => {
    const updated = { ...localOverrides[templateKey], [field]: value };
    setLocalOverrides((prev) => ({ ...prev, [templateKey]: updated }));

    if (debounceTimers.current[templateKey]) {
      clearTimeout(debounceTimers.current[templateKey]);
    }

    debounceTimers.current[templateKey] = setTimeout(() => {
      persistToApi(templateKey, updated);
      delete debounceTimers.current[templateKey];
    }, 800);
  };

  const handleToggle = (key: string, currentEnabled: boolean) => {
    const template = PREDEFINED_TEMPLATES.find((t) => t.key === key);
    const isManual = template && template.trigger !== 'auto_signup';

    if (!currentEnabled && isManual) {
      setPendingEnableKey(key);
      setExpandedKey(key);
      return;
    }

    const newEnabled = !currentEnabled;
    setLocalOverrides((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled: newEnabled },
    }));

    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
      delete debounceTimers.current[key];
    }

    persistToApi(key, { ...localOverrides[key], enabled: newEnabled });
  };

  const handleSend = async (templateKey: string) => {
    if (debounceTimers.current[templateKey]) {
      clearTimeout(debounceTimers.current[templateKey]);
      delete debounceTimers.current[templateKey];
    }

    if (pendingEnableKey === templateKey) {
      await persistToApi(templateKey, { ...localOverrides[templateKey], enabled: true });
      setLocalOverrides((prev) => ({ ...prev, [templateKey]: { ...prev[templateKey], enabled: true } }));
      setPendingEnableKey(null);
    } else {
      await persistToApi(templateKey, localOverrides[templateKey] || {});
    }

    const existing = storedRef.current.find((c) => c.template_key === templateKey);
    if (!existing) {
      showToast('error', 'Please enable and configure this template first.');
      return;
    }
    setSendingKey(templateKey);
    setConfirmSendKey(null);
    try {
      const res = await fetch('/api/admin/sms-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', campaign_id: existing.campaign_id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to send');
      showToast(
        'success',
        `Sent! ${data.sent_count} delivered, ${data.failed_count} failed out of ${data.total}.`,
      );

      setStoredCampaigns((prev) =>
        prev.map((c) => c.campaign_id === existing.campaign_id
          ? { ...existing, status: 'sent', enabled: false, sent_at: new Date().toISOString(), sent_count: data.sent_count, failed_count: data.failed_count }
          : c,
        ),
      );
      persistToApi(existing.template_key, { enabled: false });
      setLocalOverrides((prev) => {
        const next = { ...prev };
        delete next[existing.template_key];
        return next;
      });
      fetchData();
      setExpandedKey(null);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to send.');
    } finally {
      setSendingKey(null);
    }
  };

  const handleSchedule = async (templateKey: string, date: string, time: string) => {
    if (!date) {
      showToast('error', 'Please select a date first.');
      return;
    }
    if (debounceTimers.current[templateKey]) {
      clearTimeout(debounceTimers.current[templateKey]);
      delete debounceTimers.current[templateKey];
    }

    if (pendingEnableKey === templateKey) {
      await persistToApi(templateKey, { ...localOverrides[templateKey], enabled: true });
      setLocalOverrides((prev) => ({ ...prev, [templateKey]: { ...prev[templateKey], enabled: true } }));
      setPendingEnableKey(null);
    }

    const existing = storedRef.current.find((c) => c.template_key === templateKey);
    if (!existing) return;

    const isAlreadyScheduled = existing.status === 'scheduled';
    const newStatus = isAlreadyScheduled ? 'draft' : 'scheduled';

    setStoredCampaigns((prev) =>
      prev.map((c) => c.campaign_id === existing.campaign_id
        ? { ...existing, status: newStatus, scheduled_date: date || null, scheduled_time: time || null }
        : c,
      ),
    );

    fetch('/api/admin/sms-campaigns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: existing.campaign_id,
        status: newStatus,
        scheduled_date: date || null,
        scheduled_time: time || null,
      }),
    }).then((res) => res.json()).then((data) => {
      if (!data.success) {
        showToast('error', data.error || 'Failed to schedule');
      } else {
        showToast('success', newStatus === 'scheduled'
          ? `Scheduled for ${date}${time ? ` at ${time}` : ''}`
          : 'Schedule removed');
        if (newStatus === 'scheduled') {
          setExpandedKey(null);
          setPendingEnableKey(null);
        }
      }
    }).catch(() => showToast('error', 'Failed to save schedule'));
  };

  // ── Logs filtering ──
  const filteredLogs = smsLogs.filter((l) => {
    if (logFilter === 'sent') return l.status === 'sent';
    if (logFilter === 'failed') return l.status === 'failed';
    return true;
  });
  const sortedLogs = [...filteredLogs].sort((a, b) =>
    (b.created_at || '').localeCompare(a.created_at || ''),
  );
  const sentLogCount = smsLogs.filter((l) => l.status === 'sent').length;
  const failedLogCount = smsLogs.filter((l) => l.status === 'failed').length;
  const scheduledCampaigns = storedCampaigns.filter((c) => c.status === 'scheduled');
  const scheduledCount = scheduledCampaigns.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <p className="text-sm font-medium text-gray-700">Loading SMS campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Twilio warning */}
      {!twilioConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Twilio not configured.</strong> Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your environment to send SMS campaigns.
        </div>
      )}

      {/* Tab switcher: Templates | Sent Messages */}
      <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
            activeTab === 'templates'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Templates
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
            activeTab === 'logs'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sent Messages
          <span
            className={`inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold min-w-[18px] ${
              activeTab === 'logs' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-500'
            }`}
          >
            {smsLogs.length}
          </span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TAB: Templates                                                     */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-900">SMS Templates</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Enable or disable SMS campaigns. Welcome SMS auto-sends on customer sign-up.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 w-[50px]">Active</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Template</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 hidden sm:table-cell">Trigger</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 hidden md:table-cell">Message</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 w-[100px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {PREDEFINED_TEMPLATES.map((template) => {
                    const isEnabled = getEffective(template.key, 'enabled', false) as boolean;
                    const isAuto = template.trigger === 'auto_signup';
                    const isExpanded = expandedKey === template.key && isEnabled && !isAuto;
                    const msgBody = getMessageBody(template.key, template);

                    return (
                      <tr key={template.key} className="group">
                        {/* Toggle */}
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isEnabled}
                            onClick={() => handleToggle(template.key, isEnabled)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 ${
                              isEnabled ? 'bg-purple-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isEnabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Name & description */}
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-gray-900 text-sm">{template.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                        </td>

                        {/* Trigger */}
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          {isAuto ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                              </svg>
                              Auto on Sign-up
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
                              Send / Schedule
                            </span>
                          )}
                        </td>

                        {/* Message preview */}
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <p className="text-gray-600 text-xs truncate max-w-[280px]">{msgBody}</p>
                          <p className={`text-[10px] mt-0.5 ${msgBody.length > SMS_CHAR_LIMIT ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                            {msgBody.length}/{SMS_CHAR_LIMIT} chars
                            {msgBody.length > SMS_CHAR_LIMIT && ` (${Math.ceil(msgBody.length / SMS_CHAR_LIMIT)} segments)`}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewKey(previewKey === template.key ? null : template.key)}
                              className="text-xs font-medium text-purple-600 hover:text-purple-700"
                            >
                              Preview
                            </button>
                            {!isAuto && isEnabled && (
                              <button
                                type="button"
                                onClick={() => setExpandedKey(isExpanded ? null : template.key)}
                                className="text-xs font-medium text-gray-500 hover:text-gray-700"
                              >
                                {isExpanded ? 'Close' : 'Configure'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TAB: Sent Messages (Logs)                                          */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Log filter tabs */}
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 w-fit">
            {([
              { key: 'all' as const, label: 'All', count: smsLogs.length },
              { key: 'sent' as const, label: 'Sent', count: sentLogCount },
              { key: 'failed' as const, label: 'Failed', count: failedLogCount },
              { key: 'scheduled' as const, label: 'Scheduled', count: scheduledCount },
            ]).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setLogFilter(t.key)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                  logFilter === t.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
                <span
                  className={`inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold min-w-[18px] ${
                    logFilter === t.key ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Scheduled campaigns view */}
          {logFilter === 'scheduled' ? (
            scheduledCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-16">
                <svg className="h-14 w-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-4 text-sm font-medium text-gray-500">No scheduled campaigns</p>
                <p className="mt-1 text-xs text-gray-400">
                  Schedule campaigns from the Templates tab.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Template</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Message</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 hidden sm:table-cell">Audience</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Scheduled For</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {scheduledCampaigns.map((c) => {
                        const templateName = TEMPLATE_NAMES[c.template_key] || c.template_key;
                        const audienceLabel = SMS_AUDIENCE_OPTIONS.find((a) => a.value === c.audience)?.label || c.audience;
                        const scheduleStr = c.scheduled_date
                          ? `${c.scheduled_date}${c.scheduled_time ? ` at ${c.scheduled_time}` : ''}`
                          : '—';

                        return (
                          <tr key={c.campaign_id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3.5">
                              <p className="font-medium text-gray-900 text-sm">{templateName}</p>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="text-xs text-gray-600 truncate max-w-[200px]">{c.body}</p>
                            </td>
                            <td className="px-5 py-3.5 hidden sm:table-cell">
                              <span className="text-xs text-gray-600">{audienceLabel}</span>
                            </td>
                            <td className="px-5 py-3.5 text-xs text-gray-700 whitespace-nowrap">
                              {scheduleStr}
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : sortedLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-16">
              <svg className="h-14 w-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              <p className="mt-4 text-sm font-medium text-gray-500">
                {logFilter === 'failed' ? 'No failed messages' : 'No SMS messages sent yet'}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Enable and send templates from the Templates tab.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Recipient</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Template</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 hidden sm:table-cell">Trigger</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedLogs.map((log) => {
                      const templateName = TEMPLATE_NAMES[log.template_key] || log.template_key;
                      const isFailed = log.status === 'failed';
                      const trigger = TRIGGER_LABELS[log.trigger] || TRIGGER_LABELS.manual;

                      return (
                        <tr key={log.email_log_id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-gray-900 text-sm truncate max-w-[180px]">
                              {log.recipient_name || log.recipient_email}
                            </p>
                            {log.recipient_name && (
                              <p className="text-[11px] text-gray-400 truncate max-w-[180px]">{log.recipient_email}</p>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs text-gray-700 font-medium">{templateName}</span>
                          </td>
                          <td className="px-5 py-3.5 hidden sm:table-cell">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${trigger.cls}`}>
                              {trigger.label}
                            </span>
                          </td>
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
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* Configure Popup                                                    */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {expandedKey && (() => {
        const template = PREDEFINED_TEMPLATES.find((t) => t.key === expandedKey);
        if (!template || template.trigger === 'auto_signup') return null;
        const stored = getStoredConfig(template.key);
        const isPending = pendingEnableKey === expandedKey;
        const isEnabled = getEffective(template.key, 'enabled', false) as boolean;
        if (!isEnabled && !isPending) { setExpandedKey(null); return null; }

        const closePopup = () => {
          setPendingEnableKey(null);
          setExpandedKey(null);
        };

        const now = new Date();
        const defaultDate = now.toISOString().split('T')[0];
        const defaultTime = now.toTimeString().slice(0, 5);
        const audience = getEffective(template.key, 'audience', template.default_audience) as string;
        const scheduledDate = (getEffective(template.key, 'scheduled_date', defaultDate) ?? defaultDate) as string;
        const scheduledTime = (getEffective(template.key, 'scheduled_time', defaultTime) ?? defaultTime) as string;
        const isSending = sendingKey === template.key;
        const isFuture = isScheduledInFuture(scheduledDate, scheduledTime);
        const isScheduled = stored?.status === 'scheduled';
        const needsCoupon = couponTemplates.includes(template.key) && !selectedCouponId;
        const msgBody = getMessageBody(template.key, template);

        return isMounted ? createPortal(
          <div className="fixed inset-0 top-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={closePopup}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{template.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Configure &amp; Send SMS</p>
                </div>
                <button onClick={closePopup} className="rounded-full p-1.5 hover:bg-gray-100 transition-colors">
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Fields */}
              <div className="px-5 py-5 space-y-4">
                {/* Audience */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Audience</label>
                  <select
                    value={audience}
                    onChange={(e) => updateField(template.key, 'audience', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  >
                    {SMS_AUDIENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Coupon selector for special offer template */}
                {couponTemplates.includes(template.key) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Coupon Code</label>
                    <select
                      value={selectedCouponId || ''}
                      onChange={(e) => {
                        const id = e.target.value || null;
                        setSelectedCouponId(id);
                        // Clear custom edits so the coupon body takes effect
                        if (id) {
                          setEditingBody((prev) => {
                            const next = { ...prev };
                            delete next[template.key];
                            return next;
                          });
                        }
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Select a coupon...</option>
                      {coupons.map((c) => (
                        <option key={c.coupon_id} value={c.coupon_id}>
                          {c.code} — {c.discount_type === 'percentage' ? `${c.value}%` : `$${c.value}`} off
                          {c.min_spend > 0 ? ` (min $${c.min_spend})` : ''}
                        </option>
                      ))}
                    </select>
                    {selectedCoupon && (
                      <div className="mt-2 rounded-lg bg-purple-50 border border-purple-200 px-3 py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-purple-700">
                            {selectedCoupon.discount_type === 'percentage' ? `${selectedCoupon.value}% off` : `$${selectedCoupon.value} off`}
                          </span>
                          <span className="text-xs font-mono font-semibold bg-purple-600 text-white px-2 py-0.5 rounded">
                            {selectedCoupon.code}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-gray-500 space-y-0.5">
                          {selectedCoupon.min_spend > 0 && <p>Min. order: ${selectedCoupon.min_spend}</p>}
                          {selectedCoupon.end_date && (
                            <p>Expires: {new Date(selectedCoupon.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {coupons.length === 0 && (
                      <p className="mt-1 text-[11px] text-gray-400">No coupons found. Create coupons in the Discounts page.</p>
                    )}
                  </div>
                )}

                {/* Message body editor */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
                  <textarea
                    value={msgBody}
                    onChange={(e) => setEditingBody((prev) => ({ ...prev, [template.key]: e.target.value }))}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                    placeholder="Type your SMS message..."
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-gray-400">
                      Variables: {'{customer_name}'}, {'{restaurant}'}, {'{menu_url}'}, {'{feedback_url}'}
                    </p>
                    <p className={`text-[11px] font-medium ${msgBody.length > SMS_CHAR_LIMIT ? 'text-amber-600' : 'text-gray-400'}`}>
                      {msgBody.length}/{SMS_CHAR_LIMIT}
                      {msgBody.length > SMS_CHAR_LIMIT && ` (${Math.ceil(msgBody.length / SMS_CHAR_LIMIT)} segments)`}
                    </p>
                  </div>
                </div>

                {/* Schedule */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Send Date</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => updateField(template.key, 'scheduled_date', e.target.value || null)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Send Time</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => updateField(template.key, 'scheduled_time', e.target.value || null)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                <div className="text-xs text-gray-400 min-w-0">
                  {stored?.status === 'sent' && stored?.sent_at ? (
                    <span>
                      Last sent: {formatDateTime(stored.sent_at)} — {stored.sent_count} delivered
                      {stored.failed_count ? `, ${stored.failed_count} failed` : ''}
                    </span>
                  ) : isScheduled && scheduledDate ? (
                    <span className="text-purple-500 font-medium">
                      Scheduled: {scheduledDate}{scheduledTime ? ` at ${scheduledTime}` : ''}
                    </span>
                  ) : (
                    <span>Not yet sent</span>
                  )}
                </div>

                {confirmSendKey === template.key ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleSend(template.key)}
                      disabled={isSending || !twilioConfigured || needsCoupon}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      {isSending ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Sending...
                        </>
                      ) : (
                        'Confirm Send'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmSendKey(null)}
                      disabled={isSending}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : isFuture ? (
                  <button
                    type="button"
                    onClick={() => handleSchedule(template.key, scheduledDate, scheduledTime)}
                    disabled={isSending || !twilioConfigured || needsCoupon}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition disabled:opacity-60 ${
                      isScheduled
                        ? 'border border-green-300 bg-green-50 text-green-700'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {isScheduled ? 'Scheduled' : 'Schedule'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmSendKey(template.key)}
                    disabled={isSending || !twilioConfigured || needsCoupon}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    Send Now
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        ) : null;
      })()}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* SMS Preview Modal                                                  */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {previewKey && isMounted && (() => {
        const template = PREDEFINED_TEMPLATES.find((t) => t.key === previewKey);
        if (!template) return null;
        const msgBody = getMessageBody(template.key, template);
        const previewMessage = msgBody
          .replace(/\{customer_name\}/g, 'John')
          .replace(/\{restaurant\}/g, restaurantName)
          .replace(/\{menu_url\}/g, 'example.com/menu')
          .replace(/\{feedback_url\}/g, 'example.com/feedback');
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        return createPortal(
          <div className="fixed inset-0 top-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setPreviewKey(null)}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-[320px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Phone status bar */}
              <div className="bg-gray-900 px-6 pt-3 pb-2 flex items-center justify-between">
                <span className="text-white text-[11px] font-medium">{timeStr}</span>
                <div className="flex items-center gap-1.5">
                  <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 00-6 0zm-4-4l2 2a7.074 7.074 0 0110 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
                  <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
                </div>
              </div>

              {/* Message header */}
              <div className="bg-gray-900 px-5 pb-4 flex items-center gap-3">
                <button onClick={() => setPreviewKey(null)} className="text-white">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500 text-white text-xs font-bold">
                    {restaurantName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{restaurantName}</p>
                    <p className="text-gray-400 text-[10px]">SMS</p>
                  </div>
                </div>
              </div>

              {/* Message body */}
              <div className="bg-gray-100 px-4 py-5 min-h-[280px] flex flex-col">
                <p className="text-[10px] text-gray-400 text-center mb-4">Text Message</p>

                {/* SMS bubble */}
                <div className="flex justify-start mb-2">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 shadow-sm border border-gray-200">
                    <p className="text-[13px] leading-[1.5] text-gray-900 whitespace-pre-wrap break-words">{previewMessage}</p>
                    <p className="text-[10px] text-gray-400 mt-1.5 text-right">{timeStr}</p>
                  </div>
                </div>

                {/* Character count */}
                <div className="mt-auto pt-4">
                  <div className={`text-center text-[11px] font-medium ${previewMessage.length > SMS_CHAR_LIMIT ? 'text-amber-600' : 'text-gray-400'}`}>
                    {previewMessage.length}/{SMS_CHAR_LIMIT} characters
                    {previewMessage.length > SMS_CHAR_LIMIT && (
                      <span> &middot; {Math.ceil(previewMessage.length / SMS_CHAR_LIMIT)} segments</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-2">
                <div className="flex-1 rounded-full bg-gray-100 px-4 py-2">
                  <p className="text-xs text-gray-400">Text Message</p>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500">
                  <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        );
      })()}
    </div>
  );
}
