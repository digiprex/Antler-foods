/**
 * Conditional Scrolling Text Component
 *
 * This component conditionally renders the scrolling text based on the current route.
 * It only shows on the homepage (e.g., /home or / slug).
 */

'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import ScrollingText from './scrolling-text';

export default function ConditionalScrollingText() {
  const pathname = usePathname() ?? '';
  const [domain, setDomain] = useState<string>('');

  // Get current domain on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDomain(window.location.host);
    }
  }, []);

  // Define which pages should show the scrolling text (homepage only)
  const allowedPages = ['/home', '/index', '/'];

  // Show scrolling text only on allowed pages
  const showScrollingText = allowedPages.some(page => pathname === page);

  // Reset CSS variable when not showing scrolling text
  useEffect(() => {
    if (!showScrollingText) {
      document.documentElement.style.setProperty('--scrolling-text-height', '0px');
    }
  }, [showScrollingText]);

  if (!showScrollingText) {
    return null;
  }

  // Fetch scrolling text config dynamically from database
  return <ScrollingText domain={domain} />;
}
