/**
 * Example: How to use Navbar with dynamic position and z-index from database/API
 * 
 * This example demonstrates fetching navbar configuration from an API
 * and passing it to the Navbar component.
 */

'use client';

import { useEffect, useState } from 'react';
import Navbar from './navbar';

// Example API response type
interface NavbarConfig {
  position: 'fixed' | 'sticky' | 'relative' | 'absolute' | 'static';
  zIndex: number;
  logoUrl?: string;
  restaurantName: string;
  // ... other navbar properties
}

export default function NavbarWithAPIData() {
  const [config, setConfig] = useState<NavbarConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch navbar configuration from your database/API
    async function fetchNavbarConfig() {
      try {
        const response = await fetch('/api/navbar-config');
        const data = await response.json();
        setConfig(data);
      } catch (error) {
        console.error('Failed to fetch navbar config:', error);
        // Set default values if API fails
        setConfig({
          position: 'fixed',
          zIndex: 1000,
          restaurantName: 'Maison de Noir'
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
      position={config.position}
      zIndex={config.zIndex}
      logoUrl={config.logoUrl}
      restaurantName={config.restaurantName}
      // ... pass other props from config
    />
  );
}

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
