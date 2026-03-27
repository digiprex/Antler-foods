/**
 * Conditional Navbar Component
 *
 * This component conditionally renders the navbar based on the current route.
 * It hides the navbar on admin/dashboard pages and shows it on customer-facing pages.
 * The navbar automatically adjusts its position when an announcement bar is present
 * using the CSS variable --announcement-bar-height set by the announcement bar.
 */

'use client';

import { usePathname } from 'next/navigation';
import DynamicNavbar from './dynamic-navbar';

export default function ConditionalNavbar() {
  const pathname = usePathname() ?? '';
  const isProfilePage = pathname === '/profile';
  const isOrdersPage = pathname === '/orders';
  const isMenuCheckoutSuccessPage = pathname === '/menu/checkout/success';
  const isMenuCheckoutPage = pathname?.startsWith('/menu/checkout') && !isMenuCheckoutSuccessPage;
  const isMenuPage = (pathname?.startsWith('/menu') && !isMenuCheckoutPage) || isProfilePage || isOrdersPage;

  const hideNavbar =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/signup') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/forgot-password') ||
    pathname?.startsWith('/reset-password') ||
    pathname?.startsWith('/customer-reset-password') ||
    isMenuCheckoutPage;

  if (hideNavbar) {
    return null;
  }

  return (
    <DynamicNavbar
      showLoadingSkeleton={false}
      forceHamburgerMenu={Boolean(isMenuPage)}
    />
  );
}

