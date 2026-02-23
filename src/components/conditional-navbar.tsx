/**
 * Conditional Navbar Component
 * 
 * This component conditionally renders the navbar based on the current route.
 * It hides the navbar on admin/dashboard pages and shows it on customer-facing pages.
 */

'use client';

import { usePathname } from 'next/navigation';
import DynamicNavbar from './dynamic-navbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Hide navbar on admin and dashboard routes
  const hideNavbar = 
    pathname?.startsWith('/admin') || 
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/signup') ||
    pathname?.startsWith('/login');
  
  if (hideNavbar) {
    return null;
  }
  
  return <DynamicNavbar showLoadingSkeleton={false} />;
}
