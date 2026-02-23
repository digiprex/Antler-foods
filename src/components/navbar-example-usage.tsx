/**
 * Example: How to use Navbar with dynamic configuration from database/API
 * 
 * This file demonstrates multiple approaches to using the navbar with dynamic data:
 * 1. Using the DynamicNavbar component (RECOMMENDED)
 * 2. Manual API fetching with the base Navbar component
 * 3. Static configuration with overrides
 */

'use client';

import { useEffect, useState } from 'react';
import Navbar from './navbar';
import DynamicNavbar from './dynamic-navbar';
import type { NavbarConfig } from '@/types/navbar.types';

// ============================================================================
// APPROACH 1: Using DynamicNavbar Component (RECOMMENDED)
// ============================================================================

/**
 * This is the simplest and recommended approach.
 * The DynamicNavbar component handles all API fetching, error handling,
 * and fallback logic automatically.
 */
export function Example1_DynamicNavbar() {
  return <DynamicNavbar showLoadingSkeleton={true} />;
}

// ============================================================================
// APPROACH 2: Manual API Fetching
// ============================================================================

/**
 * Use this approach if you need custom logic or want to handle
 * the API fetching yourself.
 */
export function Example2_ManualFetching() {
  const [config, setConfig] = useState<NavbarConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNavbarConfig() {
      try {
        const response = await fetch('/api/navbar-config');
        const data = await response.json();
        
        if (data.success) {
          setConfig(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch navbar config:', error);
        // Set default values if API fails
        setConfig({
          restaurantName: 'Maison de Noir',
          leftNavItems: [
            { label: 'Menu', href: '/menu' },
            { label: 'About', href: '/about' },
          ],
          rightNavItems: [],
          ctaButton: {
            label: 'Order Online',
            href: '/order',
          },
        });
      } finally {
        setLoading(false);
      }
    }

    fetchNavbarConfig();
  }, []);

  if (loading || !config) {
    return null; // Or a loading skeleton
  }

  return (
    <Navbar
      logoUrl={config.logoUrl}
      restaurantName={config.restaurantName}
      leftNavItems={config.leftNavItems}
      rightNavItems={config.rightNavItems}
      ctaButton={config.ctaButton}
      position={config.position}
      zIndex={config.zIndex}
      bgColor={config.bgColor}
      textColor={config.textColor}
      buttonBgColor={config.buttonBgColor}
      buttonTextColor={config.buttonTextColor}
      layout={config.layout}
      borderColor={config.borderColor}
      borderWidth={config.borderWidth}
    />
  );
}

// ============================================================================
// APPROACH 3: Static Configuration with Overrides
// ============================================================================

/**
 * Use this approach for static pages or when you want to override
 * specific configuration values without making an API call.
 */
export function Example3_StaticWithOverrides() {
  return (
    <DynamicNavbar 
      overrideConfig={{
        restaurantName: "Antler Foods",
        logoUrl: "/logo.png", // Optional: use custom logo
        leftNavItems: [
          { label: 'Home', href: '/' },
          { label: 'Menu', href: '/menu' },
          { label: 'About', href: '/about' },
          { label: 'Contact', href: '/contact' },
        ],
        ctaButton: {
          label: 'Order Now',
          href: '/order',
        },
        layout: 'bordered-centered',
        position: 'absolute',
      }}
    />
  );
}

// ============================================================================
// APPROACH 4: Multiple Configurations (e.g., for different restaurants)
// ============================================================================

/**
 * Use this approach when you have multiple restaurants or brands
 * and need to fetch different configurations based on context.
 */
export function Example4_MultipleConfigs({ restaurantId }: { restaurantId: string }) {
  return (
    <DynamicNavbar 
      apiEndpoint={`/api/navbar-config?restaurantId=${restaurantId}`}
      showLoadingSkeleton={true}
    />
  );
}

// ============================================================================
// DEFAULT EXPORT (for backward compatibility)
// ============================================================================

export default Example1_DynamicNavbar;

/**
 * Example API endpoint structure (Next.js API route)
 * 
 * File: app/api/navbar-config/route.ts
 * 
 * export async function GET() {
 *   // Fetch from your database
 *   const config = await db.navbarConfig.findFirst();
 *   
 *   return Response.json({
 *     position: config.position || 'fixed',
 *     zIndex: config.zIndex || 1000,
 *     logoUrl: config.logoUrl,
 *     restaurantName: config.restaurantName,
 *     // ... other properties
 *   });
 * }
 */

/**
 * Example database schema (Prisma)
 * 
 * model NavbarConfig {
 *   id              String   @id @default(cuid())
 *   position        String   @default("fixed")
 *   zIndex          Int      @default(1000)
 *   logoUrl         String?
 *   restaurantName  String
 *   createdAt       DateTime @default(now())
 *   updatedAt       DateTime @updatedAt
 * }
 */
