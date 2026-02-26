/**
 * Conditional Announcement Bar Component
 *
 * This component conditionally renders the announcement bar based on the current route.
 * It only shows the announcement bar on the homepage (e.g., /home or / slug).
 */

'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import AnnouncementBar from './announcement-bar';

export default function ConditionalAnnouncementBar() {
  const pathname = usePathname();
  const [domain, setDomain] = useState<string>('');

  // Get current domain on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDomain(window.location.host);
    }
  }, []);

  // Define which pages should show the announcement bar (homepage only)
  // You can customize this array to include other slug pages if needed
  const allowedPages = ['/home', '/index', '/'];

  // Show announcement bar only on allowed pages
  const showAnnouncementBar = allowedPages.some(page => pathname === page);

  // Reset CSS variable when not showing announcement bar
  useEffect(() => {
    if (!showAnnouncementBar) {
      document.documentElement.style.setProperty('--announcement-bar-height', '0px');
    }
  }, [showAnnouncementBar]);

  if (!showAnnouncementBar) {
    return null;
  }

  // Fetch announcement bar config dynamically from database
  // The AnnouncementBar component will update the CSS variable when it renders
  return <AnnouncementBar domain={domain} />;
}