import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to handle domain-based routing
 *
 * Routes requests to the correct restaurant based on:
 * - Custom domains (e.g., myrestaurant.com)
 * - Staging domains (e.g., restaurantname.vercel.app)
 */
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl;

  // Skip middleware for:
  // - API routes
  // - Static files
  // - Next.js internal routes
  // - Admin dashboard routes
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/static/') ||
    url.pathname.startsWith('/dashboard/') ||
    url.pathname.startsWith('/admin/') ||
    url.pathname.includes('.') // Skip files with extensions
  ) {
    return NextResponse.next();
  }

  // Development: localhost always goes through normally
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return NextResponse.next();
  }

  // For custom domains or Vercel staging domains, the request continues normally
  // The app/[slug]/page.tsx will resolve the restaurant based on the domain
  // via the website-info API which queries by domain

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
