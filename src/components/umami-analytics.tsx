'use client';

import Script from 'next/script';

interface UmamiAnalyticsProps {
  websiteId: string | null;
}

export default function UmamiAnalytics({ websiteId }: UmamiAnalyticsProps) {
  if (!websiteId) {
    return null;
  }

  const explicitScriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL || '';
  const publicUmamiBaseUrl = (process.env.NEXT_PUBLIC_UMAMI_URL || '').replace(/\/+$/, '');
  const scriptUrl = explicitScriptUrl || (publicUmamiBaseUrl ? `${publicUmamiBaseUrl}/script.js` : '');

  if (!scriptUrl) {
    return null;
  }

  return (
    <Script
      id="umami-analytics"
      src={scriptUrl}
      data-website-id={websiteId}
      strategy="afterInteractive"
    />
  );
}
