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
  heading: string | null;
  body: string;
  status: string;
  sent_at: string | null;
  sent_count: number;
  failed_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
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
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string;
}

interface CampaignsFormProps {
  restaurantId: string;
  restaurantName: string;
}

interface TemplateDefinition {
  key: string;
  name: string;
  description: string;
  subject: string;
  heading: string;
  body: string;
  default_audience: string;
  trigger: 'manual' | 'auto_signup';
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-defined Templates
// ─────────────────────────────────────────────────────────────────────────────

const PREDEFINED_TEMPLATES: TemplateDefinition[] = [
  {
    key: 'welcome_email',
    name: 'Welcome Email',
    description: 'Greet new customers when they first sign up',
    subject: 'Welcome to {restaurant}!',
    heading: 'Welcome to {restaurant}!',
    body: '<p>We\'re thrilled to have you join the {restaurant} family!</p><p>Explore our carefully crafted menu and discover dishes that will delight your taste buds. Whether you\'re craving something familiar or looking to try something new, we\'ve got you covered.</p><p>Your next great meal is just a click away.</p>',
    default_audience: 'all_customers',
    trigger: 'auto_signup',
  },
  {
    key: 'we_miss_you',
    name: 'We Miss You',
    description: 'Re-engage customers who haven\'t ordered recently',
    subject: 'We miss you at {restaurant}!',
    heading: 'It\'s been a while!',
    body: '<p>We noticed you haven\'t visited us in a while, and we miss you!</p><p>Come back and enjoy the flavors you love. We\'ve been working on exciting new dishes and can\'t wait for you to try them.</p><p>Order today and rediscover what makes {restaurant} special.</p><div style="text-align:center;margin:28px 0;"><a href="{menu_url}" style="display:inline-block;padding:14px 32px;background:#1c1917;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Order Now</a></div>',
    default_audience: 'ordered_last_90',
    trigger: 'manual',
  },
  {
    key: 'special_offer',
    name: 'Special Offer',
    description: 'Send exclusive promotions and discounts',
    subject: 'Exclusive offer from {restaurant}!',
    heading: 'A Special Treat Just for You',
    body: '<p>As a valued customer of {restaurant}, we have a special offer just for you!</p><p>Don\'t miss out on this exclusive deal. It\'s our way of saying thank you for being a part of our community.</p><p>Hurry — this offer won\'t last forever!</p>',
    default_audience: 'all_customers',
    trigger: 'manual',
  },
  {
    key: 'feedback_request',
    name: 'Feedback Request',
    description: 'Ask customers for reviews and feedback',
    subject: 'How was your experience at {restaurant}?',
    heading: 'We\'d Love Your Feedback',
    body: '<p>Thank you for dining with {restaurant}! We hope you had a wonderful experience.</p><p>Your feedback helps us improve and serve you better. We\'d love to hear what you think — it only takes a moment.</p><p>Share your thoughts with us today!</p><div style="text-align:center;margin:28px 0;"><a href="{feedback_url}" style="display:inline-block;padding:14px 32px;background:#1c1917;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Give Feedback</a></div>',
    default_audience: 'ordered_last_30',
    trigger: 'manual',
  },
  {
    key: 'lazy_sunday',
    name: 'Lazy Sunday',
    description: 'Tempt customers with a relaxing Sunday meal',
    subject: 'Lazy Sunday? Let {restaurant} handle dinner!',
    heading: 'Kick Back This Sunday',
    body: '<p>Sundays are for relaxing — let {restaurant} take care of the cooking!</p><p>Whether it\'s a cozy brunch, a hearty lunch, or a laid-back dinner, we\'ve got the perfect dishes to make your Sunday even better.</p><p>Skip the kitchen and treat yourself. You deserve it!</p>',
    default_audience: 'all_customers',
    trigger: 'manual',
  },
  {
    key: 'happy_friday',
    name: 'Happy Friday',
    description: 'Kick off the weekend with a delicious meal',
    subject: 'Happy Friday from {restaurant}!',
    heading: 'It\'s Friday — Time to Celebrate!',
    body: '<p>The weekend is here and {restaurant} is ready to make it special!</p><p>Wrap up the week with something delicious. Whether you\'re planning a Friday night feast or a quick treat to kick off the weekend, we\'ve got just what you need.</p><p>Start your weekend right — order now!</p>',
    default_audience: 'all_customers',
    trigger: 'manual',
  },
];

const AUDIENCE_OPTIONS = [
  { value: 'all_customers', label: 'All Customers' },
  { value: 'opted_in', label: 'Email Opted-In' },
  { value: 'newsletter', label: 'Newsletter Subscribers' },
  { value: 'ordered_last_30', label: 'Ordered Last 30 Days' },
  { value: 'ordered_last_90', label: 'Ordered Last 90 Days' },
];

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

export default function CampaignsForm({ restaurantId, restaurantName }: CampaignsFormProps) {
  const [storedCampaigns, setStoredCampaigns] = useState<StoredCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [confirmSendKey, setConfirmSendKey] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [restaurantEmail, setRestaurantEmail] = useState<string | null>(null);
  const [restaurantPhone, setRestaurantPhone] = useState<string | null>(null);
  const [restaurantAddress, setRestaurantAddress] = useState<string | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  // Active tab: 'templates' or 'logs'
  const [activeTab, setActiveTab] = useState<'templates' | 'logs'>('templates');
  const [logFilter, setLogFilter] = useState<'all' | 'sent' | 'failed' | 'opened' | 'clicked' | 'scheduled'>('all');

  // Configure popup key for manual campaigns (audience + date/time + send)
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  // When a manual campaign toggle is flipped ON, we hold it here until config is confirmed
  const [pendingEnableKey, setPendingEnableKey] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  // Coupons for Special Offer template
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);

  // Local overrides for instant UI updates
  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<StoredCampaign>>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const storedRef = useRef(storedCampaigns);
  storedRef.current = storedCampaigns;

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/campaigns?restaurant_id=${encodeURIComponent(restaurantId)}`,
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load');
      setStoredCampaigns(data.campaigns || []);
      setEmailLogs(data.email_logs || []);
      setRestaurantEmail(data.restaurant_email || null);
      setRestaurantPhone(data.restaurant_phone || null);
      setRestaurantAddress(data.restaurant_address || null);
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

  useEffect(() => {
    fetchCampaigns();
    fetchCoupons();
  }, [fetchCampaigns, fetchCoupons]);

  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const getStoredConfig = useCallback(
    (key: string): StoredCampaign | undefined => storedCampaigns.find((c) => c.template_key === key),
    [storedCampaigns],
  );

  const replaceVars = (text: string) => text.replace(/\{restaurant\}/g, restaurantName);

  const selectedCoupon = coupons.find((c) => c.coupon_id === selectedCouponId) || null;

  const buildSpecialOfferBody = (coupon: Coupon) => {
    const discountLabel = coupon.discount_type === 'percentage'
      ? `${coupon.value}% off`
      : `$${coupon.value} off`;
    const expiry = coupon.end_date
      ? `Valid until ${new Date(coupon.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : '';

    return `<p>As a valued customer of ${restaurantName}, we have a special offer just for you!</p>`
      + `<div style="text-align:center;margin:24px 0;padding:24px;background:#f9fafb;border-radius:12px;border:2px dashed #1c1917;">`
      + `<p style="margin:0 0 4px;font-size:22px;font-weight:700;color:#1c1917;">${discountLabel}</p>`
      + `<p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#1f2937;">Use code: <span style="background:#1c1917;color:#ffffff;padding:4px 12px;border-radius:6px;letter-spacing:1px;">${coupon.code}</span></p>`
      + (expiry ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${expiry}</p>` : '')
      + `</div>`
      + `<p>Don't miss out on this exclusive deal. It's our way of saying thank you for being a part of our community.</p>`
      + `<p>Hurry — this offer won't last forever!</p>`
      + `<div style="text-align:center;margin:28px 0;"><a href="{menu_url}" style="display:inline-block;padding:14px 32px;background:#1c1917;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Order Now</a></div>`;
  };

  const buildLazySundayBody = (coupon: Coupon) => {
    const discountLabel = coupon.discount_type === 'percentage'
      ? `${coupon.value}% off`
      : `$${coupon.value} off`;
    const expiry = coupon.end_date
      ? `Valid until ${new Date(coupon.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : '';

    return `<p>Sundays are for relaxing — let ${restaurantName} take care of the cooking!</p>`
      + `<div style="text-align:center;margin:24px 0;padding:24px;background:#f9fafb;border-radius:12px;border:2px dashed #1c1917;">`
      + `<p style="margin:0 0 4px;font-size:22px;font-weight:700;color:#1c1917;">${discountLabel}</p>`
      + `<p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#1f2937;">Use code: <span style="background:#1c1917;color:#ffffff;padding:4px 12px;border-radius:6px;letter-spacing:1px;">${coupon.code}</span></p>`
      + (expiry ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${expiry}</p>` : '')
      + `</div>`
      + `<p>Whether it's a cozy brunch, a hearty lunch, or a laid-back dinner, we've got the perfect dishes to make your Sunday even better.</p>`
      + `<p>Skip the kitchen and treat yourself. You deserve it!</p>`
      + `<div style="text-align:center;margin:28px 0;"><a href="{menu_url}" style="display:inline-block;padding:14px 32px;background:#1c1917;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Order Now</a></div>`;
  };

  const buildHappyFridayBody = (coupon: Coupon) => {
    const discountLabel = coupon.discount_type === 'percentage'
      ? `${coupon.value}% off`
      : `$${coupon.value} off`;
    const expiry = coupon.end_date
      ? `Valid until ${new Date(coupon.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : '';

    return `<p>The weekend is here and ${restaurantName} is ready to make it special!</p>`
      + `<div style="text-align:center;margin:24px 0;padding:24px;background:#f9fafb;border-radius:12px;border:2px dashed #1c1917;">`
      + `<p style="margin:0 0 4px;font-size:22px;font-weight:700;color:#1c1917;">${discountLabel}</p>`
      + `<p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#1f2937;">Use code: <span style="background:#1c1917;color:#ffffff;padding:4px 12px;border-radius:6px;letter-spacing:1px;">${coupon.code}</span></p>`
      + (expiry ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${expiry}</p>` : '')
      + `</div>`
      + `<p>Wrap up the week with something delicious. Whether you're planning a Friday night feast or a quick treat to kick off the weekend, we've got just what you need.</p>`
      + `<p>Start your weekend right — order now!</p>`
      + `<div style="text-align:center;margin:28px 0;"><a href="{menu_url}" style="display:inline-block;padding:14px 32px;background:#1c1917;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Order Now</a></div>`;
  };

  const couponTemplates = ['special_offer', 'lazy_sunday', 'happy_friday'];

  const getCouponBody = (templateKey: string, coupon: Coupon) => {
    if (templateKey === 'lazy_sunday') return buildLazySundayBody(coupon);
    if (templateKey === 'happy_friday') return buildHappyFridayBody(coupon);
    return buildSpecialOfferBody(coupon);
  };

  const getEffective = (templateKey: string, field: keyof StoredCampaign, fallback: unknown) => {
    const override = localOverrides[templateKey]?.[field];
    if (override !== undefined) return override;
    const stored = getStoredConfig(templateKey);
    const storedVal = stored?.[field];
    if (storedVal !== undefined && storedVal !== null) return storedVal;
    return fallback;
  };

  const selectedCouponRef = useRef(selectedCoupon);
  selectedCouponRef.current = selectedCoupon;

  const persistToApi = useCallback(
    async (templateKey: string, overrides: Partial<StoredCampaign>) => {
      try {
        const existing = storedRef.current.find((c) => c.template_key === templateKey);
        const template = PREDEFINED_TEMPLATES.find((t) => t.key === templateKey)!;

        // Use coupon-enhanced body when a coupon is selected
        const emailBody = couponTemplates.includes(templateKey) && selectedCouponRef.current
          ? getCouponBody(templateKey, selectedCouponRef.current)
          : replaceVars(template.body);

        const isReEnabling =
          overrides.enabled === true &&
          existing &&
          !existing.enabled &&
          (existing.status === 'sent' || existing.status === 'scheduled');

        // If re-enabling a previously sent/scheduled campaign, soft-delete the old
        // record and create a fresh one so the history is preserved.
        if (isReEnabling) {
          await fetch('/api/admin/campaigns', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaign_id: existing.campaign_id }),
          });
        }

        let res: Response;
        if (existing && !isReEnabling) {
          res = await fetch('/api/admin/campaigns', {
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
              subject: replaceVars(template.subject),
              heading: replaceVars(template.heading),
              body: emailBody,
            }),
          });
        } else {
          // New campaign or re-enabling (old one was soft-deleted above)
          res = await fetch('/api/admin/campaigns', {
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
              subject: replaceVars(template.subject),
              heading: replaceVars(template.heading),
              body: emailBody,
              status: 'draft',
            }),
          });
        }

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save');

        const campaign = data.campaign;
        if (campaign) {
          setStoredCampaigns((prev) => {
            // Remove any soft-deleted entry for this template and add/update with fresh one
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
          // Update ref immediately so callers awaiting this function see the new campaign
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
    [restaurantId, restaurantName],
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

    // Enabling a manual campaign → open config popup first, don't enable yet
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

    // If this is a pending-enable campaign, enable it first
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
      const res = await fetch('/api/admin/campaigns', {
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

      const updatedCampaign = {
        ...existing,
        status: 'sent',
        enabled: false,
        sent_at: new Date().toISOString(),
        sent_count: data.sent_count,
        failed_count: data.failed_count,
      };

      setStoredCampaigns((prev) =>
        prev.map((c) => c.campaign_id === existing.campaign_id ? updatedCampaign : c),
      );
      // Turn off the toggle after sending so user must re-enable for next send
      persistToApi(existing.template_key, { enabled: false });
      setLocalOverrides((prev) => {
        const next = { ...prev };
        delete next[existing.template_key];
        return next;
      });
      // Re-fetch to get updated email logs
      fetchCampaigns();
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

    // If this is a pending-enable campaign, enable it first
    if (pendingEnableKey === templateKey) {
      await persistToApi(templateKey, { ...localOverrides[templateKey], enabled: true });
      setLocalOverrides((prev) => ({ ...prev, [templateKey]: { ...prev[templateKey], enabled: true } }));
      setPendingEnableKey(null);
    }

    const existing = storedRef.current.find((c) => c.template_key === templateKey);
    if (!existing) return;

    const isAlreadyScheduled = existing.status === 'scheduled';
    const newStatus = isAlreadyScheduled ? 'draft' : 'scheduled';

    const updatedCampaign = { ...existing, status: newStatus, scheduled_date: date || null, scheduled_time: time || null };

    setStoredCampaigns((prev) =>
      prev.map((c) => c.campaign_id === existing.campaign_id ? updatedCampaign : c),
    );

    fetch('/api/admin/campaigns', {
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
  const filteredLogs = emailLogs.filter((l) => {
    if (logFilter === 'sent') return l.status === 'sent';
    if (logFilter === 'failed') return l.status === 'failed';
    if (logFilter === 'opened') return !!l.opened_at;
    if (logFilter === 'clicked') return !!l.clicked_at;
    return true;
  });
  const sortedLogs = [...filteredLogs].sort((a, b) =>
    (b.created_at || '').localeCompare(a.created_at || ''),
  );
  const sentLogCount = emailLogs.filter((l) => l.status === 'sent').length;
  const failedLogCount = emailLogs.filter((l) => l.status === 'failed').length;
  const openedLogCount = emailLogs.filter((l) => !!l.opened_at).length;
  const clickedLogCount = emailLogs.filter((l) => !!l.clicked_at).length;
  const scheduledCampaigns = storedCampaigns.filter((c) => c.status === 'scheduled');
  const scheduledCount = scheduledCampaigns.length;

  // ── Preview modal template ──
  const previewTemplate = previewKey
    ? PREDEFINED_TEMPLATES.find((t) => t.key === previewKey) || null
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <p className="text-sm font-medium text-gray-700">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
            {emailLogs.length}
          </span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TAB: Campaign Templates                                            */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {activeTab === 'templates' && <div>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-gray-900">Campaign Templates</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Enable or disable email campaigns for your restaurant. Welcome Email auto-sends on customer sign-up.
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
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 hidden md:table-cell">Subject</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 w-[100px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {PREDEFINED_TEMPLATES.map((template) => {
                  const stored = getStoredConfig(template.key);
                  const isEnabled = getEffective(template.key, 'enabled', false) as boolean;
                  const isAuto = template.trigger === 'auto_signup';
                  const isExpanded = expandedKey === template.key && isEnabled && !isAuto;
                  const isSending = sendingKey === template.key;

                  const now = new Date();
                  const defaultDate = now.toISOString().split('T')[0];
                  const defaultTime = now.toTimeString().slice(0, 5);
                  const audience = getEffective(template.key, 'audience', template.default_audience) as string;
                  const scheduledDate = (getEffective(template.key, 'scheduled_date', defaultDate) ?? defaultDate) as string;
                  const scheduledTime = (getEffective(template.key, 'scheduled_time', defaultTime) ?? defaultTime) as string;

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

                      {/* Subject */}
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <p className="text-gray-600 text-xs truncate max-w-[220px]">{replaceVars(template.subject)}</p>
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
      </div>}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TAB: Sent Messages (Logs)                                          */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Log filter tabs */}
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 w-fit">
            {([
              { key: 'all' as const, label: 'All', count: emailLogs.length },
              { key: 'sent' as const, label: 'Sent', count: sentLogCount },
              { key: 'failed' as const, label: 'Failed', count: failedLogCount },
              { key: 'opened' as const, label: 'Opened', count: openedLogCount },
              { key: 'clicked' as const, label: 'Clicked', count: clickedLogCount },
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
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Subject</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 hidden sm:table-cell">Audience</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Scheduled For</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {scheduledCampaigns.map((c) => {
                        const templateName = TEMPLATE_NAMES[c.template_key] || c.template_key;
                        const audienceLabel = AUDIENCE_OPTIONS.find((a) => a.value === c.audience)?.label || c.audience;
                        const scheduleStr = c.scheduled_date
                          ? `${c.scheduled_date}${c.scheduled_time ? ` at ${c.scheduled_time}` : ''}`
                          : '—';

                        return (
                          <tr key={c.campaign_id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3.5">
                              <p className="font-medium text-gray-900 text-sm">{templateName}</p>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="text-xs text-gray-600 truncate max-w-[200px]">{c.subject}</p>
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <p className="mt-4 text-sm font-medium text-gray-500">
                {logFilter === 'failed' ? 'No failed emails' : logFilter === 'opened' ? 'No opened emails' : logFilter === 'clicked' ? 'No clicked emails' : 'No emails sent yet'}
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
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 hidden md:table-cell">Engagement</th>
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
                            {log.subject && (
                              <p className="text-[11px] text-gray-400 truncate max-w-[160px] mt-0.5">{log.subject}</p>
                            )}
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
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            <div className="flex flex-col gap-1">
                              {log.opened_at ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-green-600 font-medium">
                                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                  </svg>
                                  Opened
                                </span>
                              ) : (
                                <span className="text-[11px] text-gray-400">Not opened</span>
                              )}
                              {log.clicked_at ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                                  </svg>
                                  Clicked
                                </span>
                              ) : null}
                            </div>
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

        return isMounted ? createPortal(
          <div className="fixed inset-0 top-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={closePopup}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{template.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Configure &amp; Send</p>
                </div>
                <button onClick={closePopup} className="rounded-full p-1.5 hover:bg-gray-100 transition-colors">
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Fields */}
              <div className="px-5 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Audience</label>
                  <select
                    value={audience}
                    onChange={(e) => updateField(template.key, 'audience', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  >
                    {AUDIENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Coupon selector for coupon-based templates */}
                {couponTemplates.includes(template.key) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Coupon Code</label>
                    <select
                      value={selectedCouponId || ''}
                      onChange={(e) => setSelectedCouponId(e.target.value || null)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">No coupon (generic offer)</option>
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
                      disabled={isSending || needsCoupon}
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
                    disabled={isSending || needsCoupon}
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
                    disabled={isSending || needsCoupon}
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
      {/* Preview Modal                                                      */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {previewTemplate && isMounted && createPortal(
        <div className="fixed inset-0 top-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setPreviewKey(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span className="text-sm font-medium text-gray-600">Email Preview</span>
              </div>
              <button onClick={() => setPreviewKey(null)} className="rounded-full p-1.5 hover:bg-gray-200 transition-colors">
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Subject */}
            <div className="px-6 pt-5 pb-3">
              <h2 className="text-xl font-normal text-gray-900">{replaceVars(previewTemplate.subject)}</h2>
            </div>

            {/* Sender */}
            <div className="flex items-center gap-3 px-6 pb-4 border-b border-gray-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white text-sm font-bold">
                {restaurantName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{restaurantName}</span>
                  <span className="text-xs text-gray-400">&lt;noreply@{restaurantName.toLowerCase().replace(/\s+/g, '')}.com&gt;</span>
                </div>
                <p className="text-xs text-gray-500">to me</p>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div style={{ maxWidth: 600, margin: '0 auto' }}>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-7 py-8">
                    <h1 className="text-2xl font-bold text-gray-900 text-center mb-4" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                      {replaceVars(previewTemplate.heading)}
                    </h1>
                    <p className="text-[16px] text-gray-700 mb-4" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                      Hi {'{{customer_name}}'},
                    </p>
                    <div
                      className="text-[15px] leading-[1.7] text-gray-700 [&>p]:mb-3"
                      style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
                      dangerouslySetInnerHTML={{ __html: couponTemplates.includes(previewTemplate.key)
                        ? getCouponBody(previewTemplate.key, selectedCoupon || { coupon_id: '', code: 'SAVE20', discount_type: 'percentage', value: 20, min_spend: 0, start_date: '', end_date: null })
                        : replaceVars(previewTemplate.body) }}
                    />
                  </div>
                  <div className="bg-gray-50 border-t border-gray-200 px-7 py-5">
                    <p className="text-[13px] text-gray-500 text-center">Sent by {restaurantName}</p>
                    {(restaurantEmail || restaurantPhone || restaurantAddress) && (
                      <div className="mt-2 text-[12px] text-gray-400 text-center leading-relaxed">
                        {[restaurantEmail, restaurantPhone, restaurantAddress]
                          .filter(Boolean)
                          .join(' | ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
