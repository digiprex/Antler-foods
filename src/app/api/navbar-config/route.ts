/**
 * Mock API Endpoint for Navbar Configuration
 * 
 * This is a Next.js API route that demonstrates how to fetch navbar configuration
 * from a database and return it to the frontend.
 * 
 * File: src/app/api/navbar-config/route.ts
 * 
 * In production, replace the mock data with actual database queries.
 */

import { NextResponse } from 'next/server';
import type { NavbarConfig, NavbarConfigResponse } from '@/types/navbar.types';

/**
 * Mock database data
 * In production, this would be fetched from your database (e.g., PostgreSQL, MongoDB, etc.)
 */
const MOCK_NAVBAR_CONFIG: NavbarConfig = {
  id: '1',
  
  // Logo configuration
  logoUrl: '', // Leave empty to use restaurant name initials
  restaurantName: 'Antler Foods',
  
  // Navigation items
  leftNavItems: [
    { id: '1', label: 'Menu', href: '/menu', order: 1 },
    { id: '2', label: 'About', href: '/about', order: 2 },
    { id: '3', label: 'Locations', href: '/locations', order: 3 },
    { id: '4', label: 'Contact', href: '/contact', order: 4 },
  ],
  rightNavItems: [],
  
  // CTA Button (Order Online)
  ctaButton: {
    id: '1',
    label: 'Order Online',
    href: '/order',
    bgColor: '#000000',
    textColor: '#ffffff',
  },
  
  // Layout and styling
  layout: 'bordered-centered',
  position: 'absolute',
  zIndex: 1000,
  
  // Colors
  bgColor: '#ffffff',
  textColor: '#000000',
  buttonBgColor: '#000000',
  buttonTextColor: '#ffffff',
  borderColor: '#000000',
  borderWidth: '2px',
  
  // Additional features
  bagCount: 0,
  additionalText: undefined,
  
  // Metadata
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * GET endpoint to fetch navbar configuration
 */
export async function GET() {
  try {
    // TODO: Replace with actual database query
    // Example with Prisma:
    // const config = await prisma.navbarConfig.findFirst({
    //   include: {
    //     leftNavItems: { orderBy: { order: 'asc' } },
    //     rightNavItems: { orderBy: { order: 'asc' } },
    //     ctaButton: true,
    //   },
    // });
    
    // Simulate database delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const response: NavbarConfigResponse = {
      success: true,
      data: MOCK_NAVBAR_CONFIG,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching navbar config:', error);
    
    const errorResponse: NavbarConfigResponse = {
      success: false,
      data: MOCK_NAVBAR_CONFIG, // Return defaults on error
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST endpoint to update navbar configuration
 * (Optional - for admin panel)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // TODO: Validate and update database
    // Example with Prisma:
    // const updatedConfig = await prisma.navbarConfig.update({
    //   where: { id: body.id },
    //   data: {
    //     logoUrl: body.logoUrl,
    //     restaurantName: body.restaurantName,
    //     // ... other fields
    //   },
    // });
    
    const response: NavbarConfigResponse = {
      success: true,
      data: { ...MOCK_NAVBAR_CONFIG, ...body },
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating navbar config:', error);
    
    const errorResponse: NavbarConfigResponse = {
      success: false,
      data: MOCK_NAVBAR_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
