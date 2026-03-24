/**
 * Conditional Footer Component
 *
 * This component conditionally renders the footer based on the current route.
 * It hides the footer on admin/dashboard pages and shows it on customer-facing pages.
 */

'use client';

import { usePathname } from 'next/navigation';
import DynamicFooter from './dynamic-footer';

export default function ConditionalFooter() {
  const pathname = usePathname();
  const hideFooter =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/signup') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/forgot-password') ||
    pathname?.startsWith('/menu/checkout');

  if (hideFooter) {
    return null;
  }

  return <DynamicFooter showLoadingSkeleton={false} />;
}