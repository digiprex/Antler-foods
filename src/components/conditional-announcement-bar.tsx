/**
 * Conditional Announcement Bar Component
 * 
 * This component conditionally renders the announcement bar based on the current route.
 * It hides the announcement bar on admin/dashboard pages and shows it on customer-facing pages.
 */

'use client';

import { usePathname } from 'next/navigation';
import AnnouncementBar from './announcement-bar';

export default function ConditionalAnnouncementBar() {
  const pathname = usePathname();
  
  // Hide announcement bar on admin and dashboard routes
  const hideAnnouncementBar = 
    pathname?.startsWith('/admin') || 
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/signup') ||
    pathname?.startsWith('/login');
  
  if (hideAnnouncementBar) {
    return null;
  }
  
  return <AnnouncementBar />;
}