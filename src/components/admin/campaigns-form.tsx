'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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
  },
  {
    key: 'we_miss_you',
    name: 'We Miss You',
    description: 'Re-engage customers who haven\'t ordered recently',
    subject: 'We miss you at {restaurant}!',
    heading: 'It\'s been a while!',
    body: '<p>We noticed you haven\'t visited us in a while, and we miss you!</p><p>Come back and enjoy the flavors you love. We\'ve been working on exciting new dishes and can\'t wait for you to try them.</p><p>Order today and rediscover what makes {restaurant} special.</p>',
    default_audience: 'ordered_last_90',
  },
  {
    key: 'thank_you',
    name: 'Thank You',
    description: 'Show appreciation to customers after their orders',
    subject: 'Thank you for your order from {restaurant}!',
    heading: 'Thank You!',
    body: '<p>Thank you for choosing {restaurant}! We hope you enjoyed every bite.</p><p>Your support means the world to us. We\'re always striving to bring you the best food and experience possible.</p><p>We\'d love to see you again soon!</p>',
    default_audience: 'ordered_last_30',
  },
  {
    key: 'special_offer',
    name: 'Special Offer',
    description: 'Send exclusive promotions and discounts',
    subject: 'Exclusive offer from {restaurant}!',
    heading: 'A Special Treat Just for You',
    body: '<p>As a valued customer of {restaurant}, we have a special offer just for you!</p><p>Don\'t miss out on this exclusive deal. It\'s our way of saying thank you for being a part of our community.</p><p>Hurry — this offer won\'t last forever!</p>',
    default_audience: 'all_customers',
  },
  {
    key: 'new_menu_items',
    name: 'New Menu Items',
    description: 'Announce new additions to your menu',
    subject: 'New dishes at {restaurant}!',
    heading: 'Something New to Try!',
    body: '<p>Exciting news from {restaurant}! We\'ve added delicious new items to our menu.</p><p>From new appetizers to fresh entrees, there\'s something for everyone. Be among the first to try our latest creations.</p><p>Check out what\'s new today!</p>',
    default_audience: 'all_customers',
  },
  {
    key: 'feedback_request',
    name: 'Feedback Request',
    description: 'Ask customers for reviews and feedback',
    subject: 'How was your experience at {restaurant}?',
    heading: 'We\'d Love Your Feedback',
    body: '<p>Thank you for dining with {restaurant}! We hope you had a wonderful experience.</p><p>Your feedback helps us improve and serve you better. We\'d love to hear what you think — it only takes a moment.</p><p>Share your thoughts with us today!</p>',
    default_audience: 'ordered_last_30',
  },
  {
    key: 'loyalty_reward',
    name: 'Loyalty Reward',
    description: 'Reward your most loyal returning customers',
    subject: 'A special reward from {restaurant}!',
    heading: 'You Deserve Something Special',
    body: '<p>You\'re one of our most valued customers at {restaurant}, and we want to show our appreciation!</p><p>As a loyal member of our community, you\'ve earned a special reward. Thank you for your continued support.</p><p>Claim your reward now!</p>',
    default_audience: 'opted_in',
  },
  {
    key: 'seasonal_special',
    name: 'Seasonal Special',
    description: 'Promote limited-time seasonal offerings',
    subject: 'Seasonal specials at {restaurant}!',
    heading: 'Seasonal Favorites Are Here',
    body: '<p>{restaurant} is celebrating the season with special limited-time dishes!</p><p>Our chefs have crafted unique seasonal flavors that capture the spirit of the moment. These dishes are available for a limited time only.</p><p>Don\'t miss out — try them before they\'re gone!</p>',
    default_audience: 'all_customers',
  },
  {
    key: 'lazy_sunday',
    name: 'Lazy Sunday',
    description: 'Tempt customers with a relaxing Sunday meal',
    subject: 'Lazy Sunday? Let {restaurant} handle dinner!',
    heading: 'Kick Back This Sunday',
    body: '<p>Sundays are for relaxing — let {restaurant} take care of the cooking!</p><p>Whether it\'s a cozy brunch, a hearty lunch, or a laid-back dinner, we\'ve got the perfect dishes to make your Sunday even better.</p><p>Skip the kitchen and treat yourself. You deserve it!</p>',
    default_audience: 'all_customers',
  },
];

const AUDIENCE_OPTIONS = [
  { value: 'all_customers', label: 'All Customers' },
  { value: 'opted_in', label: 'Email Opted-In' },
  { value: 'newsletter', label: 'Newsletter Subscribers' },
  { value: 'ordered_last_30', label: 'Ordered Last 30 Days' },
  { value: 'ordered_last_90', label: 'Ordered Last 90 Days' },
];

function isScheduledInFuture(date: string, time: string): boolean {
  if (!date) return false;
  const dateTime = time ? `${date}T${time}` : `${date}T23:59`;
  return new Date(dateTime) > new Date();
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Icons
// ─────────────────────────────────────────────────────────────────────────────

function TemplateIcon({ templateKey }: { templateKey: string }) {
  const cls = 'h-5 w-5';
  switch (templateKey) {
    case 'welcome_email':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
        </svg>
      );
    case 'we_miss_you':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      );
    case 'thank_you':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3.75a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 5.25c0 .896-.393 1.7-1.016 2.25m-3.859 3H6.75A2.25 2.25 0 004.5 12.75v.75a2.25 2.25 0 002.25 2.25h.008a2.25 2.25 0 002.25-2.25V12.75zM16.5 7.5h.008v.008H16.5V7.5zm-3.75 3h7.5a2.25 2.25 0 012.25 2.25v.75a2.25 2.25 0 01-2.25 2.25h-.008a2.25 2.25 0 01-2.25-2.25V12.75z" />
        </svg>
      );
    case 'special_offer':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
      );
    case 'new_menu_items':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      );
    case 'feedback_request':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      );
    case 'loyalty_reward':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      );
    case 'seasonal_special':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      );
    case 'lazy_sunday':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      );
  }
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

  // Local overrides for instant UI updates (no API call until debounce fires)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const getStoredConfig = useCallback(
    (key: string): StoredCampaign | undefined => {
      return storedCampaigns.find((c) => c.template_key === key);
    },
    [storedCampaigns],
  );

  const replaceVars = (text: string) => text.replace(/\{restaurant\}/g, restaurantName);

  // Resolve the effective value for a template field (local override > stored > default)
  const getEffective = (templateKey: string, field: keyof StoredCampaign, fallback: unknown) => {
    const override = localOverrides[templateKey]?.[field];
    if (override !== undefined) return override;
    const stored = getStoredConfig(templateKey);
    const storedVal = stored?.[field];
    if (storedVal !== undefined && storedVal !== null) return storedVal;
    return fallback;
  };

  // Save to API silently (no loading spinners, no re-fetch)
  const persistToApi = useCallback(
    async (templateKey: string, overrides: Partial<StoredCampaign>) => {
      try {
        const existing = storedRef.current.find((c) => c.template_key === templateKey);
        const template = PREDEFINED_TEMPLATES.find((t) => t.key === templateKey)!;

        let res: Response;
        if (existing) {
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
              body: replaceVars(template.body),
            }),
          });
        } else {
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
              body: replaceVars(template.body),
              status: 'draft',
            }),
          });
        }

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save');

        // Update stored campaigns with the response
        const campaign = data.campaign;
        if (campaign) {
          setStoredCampaigns((prev) => {
            const idx = prev.findIndex((c) => c.template_key === templateKey);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = campaign;
              return next;
            }
            return [campaign, ...prev];
          });
        }

        // Clear local overrides
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

  // Update a field locally and debounce the API save
  const updateField = (templateKey: string, field: keyof StoredCampaign, value: unknown) => {
    const updated = { ...localOverrides[templateKey], [field]: value };
    setLocalOverrides((prev) => ({ ...prev, [templateKey]: updated }));

    // Clear existing debounce for this template
    if (debounceTimers.current[templateKey]) {
      clearTimeout(debounceTimers.current[templateKey]);
    }

    // Debounce save (800ms)
    debounceTimers.current[templateKey] = setTimeout(() => {
      persistToApi(templateKey, updated);
      delete debounceTimers.current[templateKey];
    }, 800);
  };

  // Toggle saves immediately (no debounce)
  const handleToggle = (key: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    setLocalOverrides((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled: newEnabled },
    }));

    // Clear any pending debounce — flush everything together
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
      delete debounceTimers.current[key];
    }

    persistToApi(key, { ...localOverrides[key], enabled: newEnabled });
  };

  const handleAudienceChange = (key: string, audience: string) => {
    updateField(key, 'audience', audience);
  };

  const handleDateChange = (key: string, date: string) => {
    updateField(key, 'scheduled_date', date || null);
  };

  const handleTimeChange = (key: string, time: string) => {
    updateField(key, 'scheduled_time', time || null);
  };

  const handleSend = async (templateKey: string) => {
    // Flush any pending saves first
    if (debounceTimers.current[templateKey]) {
      clearTimeout(debounceTimers.current[templateKey]);
      delete debounceTimers.current[templateKey];
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

      // Update stored state with send results
      setStoredCampaigns((prev) =>
        prev.map((c) =>
          c.campaign_id === existing.campaign_id
            ? {
                ...c,
                status: 'sent',
                sent_at: new Date().toISOString(),
                sent_count: data.sent_count,
                failed_count: data.failed_count,
              }
            : c,
        ),
      );
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to send.');
    } finally {
      setSendingKey(null);
    }
  };

  const handleSchedule = (templateKey: string, date: string, time: string) => {
    if (!date) {
      showToast('error', 'Please select a date first.');
      return;
    }
    // Flush pending saves
    if (debounceTimers.current[templateKey]) {
      clearTimeout(debounceTimers.current[templateKey]);
      delete debounceTimers.current[templateKey];
    }

    const existing = storedRef.current.find((c) => c.template_key === templateKey);
    if (!existing) return;

    const isAlreadyScheduled = existing.status === 'scheduled';
    const newStatus = isAlreadyScheduled ? 'draft' : 'scheduled';

    // Optimistic update
    setStoredCampaigns((prev) =>
      prev.map((c) =>
        c.campaign_id === existing.campaign_id
          ? { ...c, status: newStatus, scheduled_date: date || null, scheduled_time: time || null }
          : c,
      ),
    );

    // Persist
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
      if (!data.success) showToast('error', data.error || 'Failed to schedule');
      else showToast('success', newStatus === 'scheduled'
        ? `Scheduled for ${date}${time ? ` at ${time}` : ''}`
        : 'Schedule removed');
    }).catch(() => showToast('error', 'Failed to save schedule'));
  };

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
    <div className="space-y-4">
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

      {/* Info */}
      <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
        <p className="text-sm text-gray-600">
          Toggle on the email templates you want to use, select your audience, pick a date &amp; time, and hit send.
        </p>
      </div>

      {/* Template Cards */}
      {PREDEFINED_TEMPLATES.map((template) => {
        const stored = getStoredConfig(template.key);
        const isEnabled = getEffective(template.key, 'enabled', false) as boolean;
        const audience = getEffective(template.key, 'audience', template.default_audience) as string;
        const now = new Date();
        const defaultDate = now.toISOString().split('T')[0];
        const defaultTime = now.toTimeString().slice(0, 5);
        const scheduledDate = (getEffective(template.key, 'scheduled_date', defaultDate) ?? defaultDate) as string;
        const scheduledTime = (getEffective(template.key, 'scheduled_time', defaultTime) ?? defaultTime) as string;
        const isSent = stored?.status === 'sent';
        const isSending = sendingKey === template.key;
        const isPreviewOpen = previewKey === template.key;

        return (
          <div
            key={template.key}
            className={`rounded-xl border transition-all ${
              isEnabled
                ? 'border-purple-200 bg-white shadow-md'
                : 'border-gray-200 bg-white shadow-sm'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isEnabled
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <TemplateIcon templateKey={template.key} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{template.name}</h3>
                    {isSent && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                        Sent
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{template.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Preview button */}
                <button
                  type="button"
                  onClick={() => setPreviewKey(isPreviewOpen ? null : template.key)}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  {isPreviewOpen ? 'Hide' : 'Preview'}
                </button>

                {/* Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  onClick={() => handleToggle(template.key, isEnabled)}

                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-60 ${
                    isEnabled ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Gmail-style Email Preview Modal */}
            {isPreviewOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreviewKey(null)}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                  {/* Gmail-like toolbar */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                      <span className="text-sm font-medium text-gray-600">Email Preview</span>
                    </div>
                    <button
                      onClick={() => setPreviewKey(null)}
                      className="rounded-full p-1.5 hover:bg-gray-200 transition-colors"
                    >
                      <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Subject line */}
                  <div className="px-6 pt-5 pb-3">
                    <h2 className="text-xl font-normal text-gray-900">{replaceVars(template.subject)}</h2>
                  </div>

                  {/* Sender info (Gmail style) */}
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

                  {/* Email body - rendered like the actual HTML email */}
                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div style={{ maxWidth: 600, margin: '0 auto' }}>
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="px-7 py-8">
                          <h1 className="text-2xl font-bold text-gray-900 text-center mb-4" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                            {replaceVars(template.heading)}
                          </h1>
                          <div
                            className="text-[15px] leading-[1.7] text-gray-700 [&>p]:mb-3"
                            style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
                            dangerouslySetInnerHTML={{ __html: replaceVars(template.body) }}
                          />
                        </div>
                        <div className="bg-gray-50 border-t border-gray-200 px-7 py-5">
                          <p className="text-[13px] text-gray-500 text-center">
                            Sent by {restaurantName}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Expanded Controls */}
            {isEnabled && (
              <div className="border-t border-purple-100 px-5 py-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Audience */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Audience
                    </label>
                    <select
                      value={audience}
                      onChange={(e) => handleAudienceChange(template.key, e.target.value)}
    
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    >
                      {AUDIENCE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Send Date
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => handleDateChange(template.key, e.target.value)}
    
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Send Time
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => handleTimeChange(template.key, e.target.value)}
    
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Status & Actions Row */}
                <div className="flex items-center justify-between gap-3">
                  {/* Sent / Scheduled stats */}
                  <div className="text-xs text-gray-400">
                    {isSent && stored?.sent_at ? (
                      <span>
                        Last sent: {formatDate(stored.sent_at)} &mdash;{' '}
                        {stored.sent_count} delivered
                        {stored.failed_count
                          ? `, ${stored.failed_count} failed`
                          : ''}
                      </span>
                    ) : stored?.status === 'scheduled' && scheduledDate ? (
                      <span className="text-purple-500 font-medium">
                        Scheduled: {scheduledDate}{scheduledTime ? ` at ${scheduledTime}` : ''}
                      </span>
                    ) : (
                      <span>Not yet sent</span>
                    )}
                  </div>

                  {/* Action — auto-detects Send vs Schedule based on date/time */}
                  {(() => {
                    const isFuture = isScheduledInFuture(scheduledDate, scheduledTime);
                    const isScheduled = stored?.status === 'scheduled';

                    if (confirmSendKey === template.key) {
                      return (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSend(template.key)}
                            disabled={isSending}
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
                      );
                    }

                    if (isFuture) {
                      return (
                        <button
                          type="button"
                          onClick={() => handleSchedule(template.key, scheduledDate, scheduledTime)}
                          disabled={isSending}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition disabled:opacity-60 ${
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
                      );
                    }

                    return (
                      <button
                        type="button"
                        onClick={() => setConfirmSendKey(template.key)}
                        disabled={isSending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                        Send
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Collapsed sent info */}
            {!isEnabled && isSent && stored?.sent_at && (
              <div className="border-t border-gray-100 px-5 py-2.5">
                <p className="text-xs text-gray-400">
                  Last sent: {formatDate(stored.sent_at)} &mdash;{' '}
                  {stored.sent_count} delivered
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
