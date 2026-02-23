# Dynamic Navbar Configuration

This document explains how to use the dynamic navbar system that fetches logo, menu items, and CTA button from a database/API.

## Overview

The navbar system is now fully dynamic and can be configured through a database/API. All aspects of the navbar can be controlled:

- **Logo**: URL or restaurant name (displays as initials if no URL)
- **Menu Items**: Left and right navigation items
- **CTA Button**: "Order Online" or any custom button
- **Styling**: Colors, layout, position, borders, etc.

## Quick Start

### 1. Use the Dynamic Navbar Component

Replace your static navbar with the dynamic version:

```tsx
import DynamicNavbar from '@/components/dynamic-navbar';

export default function Page() {
  return (
    <div>
      <DynamicNavbar />
      {/* Your page content */}
    </div>
  );
}
```

### 2. Set Up the API Endpoint

The API endpoint is already created at [`src/app/api/navbar-config/route.ts`](src/app/api/navbar-config/route.ts:1). It currently returns mock data. To connect it to your database:

```typescript
// In src/app/api/navbar-config/route.ts
import { prisma } from '@/lib/prisma'; // Your database client

export async function GET() {
  const config = await prisma.navbarConfig.findFirst({
    include: {
      leftNavItems: { orderBy: { order: 'asc' } },
      rightNavItems: { orderBy: { order: 'asc' } },
      ctaButton: true,
    },
  });
  
  return NextResponse.json({
    success: true,
    data: config,
  });
}
```

### 3. Set Up Your Database

Choose your database schema from [`src/lib/database/navbar-schema-examples.ts`](src/lib/database/navbar-schema-examples.ts:1):

- **Prisma** (PostgreSQL, MySQL, SQLite)
- **MongoDB** (Mongoose)
- **Raw SQL**

## Component API

### DynamicNavbar Props

```typescript
interface DynamicNavbarProps {
  // API endpoint to fetch configuration
  apiEndpoint?: string; // Default: '/api/navbar-config'
  
  // Show loading skeleton while fetching
  showLoadingSkeleton?: boolean; // Default: false
  
  // Override configuration (for testing or static pages)
  overrideConfig?: Partial<NavbarConfig>;
}
```

### Examples

#### Basic Usage
```tsx
<DynamicNavbar />
```

#### With Loading Skeleton
```tsx
<DynamicNavbar showLoadingSkeleton={true} />
```

#### With Custom API Endpoint
```tsx
<DynamicNavbar apiEndpoint="/api/custom-navbar" />
```

#### With Override Config (Static)
```tsx
<DynamicNavbar 
  overrideConfig={{
    restaurantName: "My Restaurant",
    ctaButton: {
      label: "Book Now",
      href: "/reservations"
    }
  }}
/>
```

## Configuration Structure

The navbar configuration follows this structure:

```typescript
interface NavbarConfig {
  // Logo
  logoUrl?: string;              // Image URL or leave empty for initials
  restaurantName: string;        // Used for initials if no logo
  
  // Navigation
  leftNavItems: NavItem[];       // Left side menu items
  rightNavItems: NavItem[];      // Right side menu items
  
  // CTA Button
  ctaButton: {
    label: string;               // e.g., "Order Online"
    href: string;                // e.g., "/order"
    bgColor?: string;
    textColor?: string;
  };
  
  // Layout
  layout?: 'default' | 'centered' | 'logo-center' | 'stacked' | 
           'split' | 'logo-left-items-left' | 'bordered-centered';
  position?: 'fixed' | 'sticky' | 'relative' | 'absolute' | 'static';
  zIndex?: number;
  
  // Colors
  bgColor?: string;
  textColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  borderColor?: string;
  borderWidth?: string;
  
  // Additional
  bagCount?: number;
  additionalText?: string;
}
```

## Database Setup

### Option 1: Prisma (Recommended)

1. Add the schema from [`navbar-schema-examples.ts`](src/lib/database/navbar-schema-examples.ts:1) to your `prisma/schema.prisma`
2. Run migrations:
   ```bash
   npx prisma migrate dev --name add_navbar_config
   ```
3. Seed initial data:
   ```bash
   npx prisma db seed
   ```

### Option 2: MongoDB

1. Create the Mongoose models from [`navbar-schema-examples.ts`](src/lib/database/navbar-schema-examples.ts:1)
2. Connect to MongoDB in your API route
3. Query using Mongoose

### Option 3: Raw SQL

1. Execute the SQL schema from [`navbar-schema-examples.ts`](src/lib/database/navbar-schema-examples.ts:1)
2. Use your SQL client to query the data
3. Transform the results to match the [`NavbarConfig`](src/types/navbar.types.ts:1) type

## Example Database Records

### Sample Configuration

```json
{
  "id": "1",
  "restaurantName": "Antler Foods",
  "logoUrl": null,
  "leftNavItems": [
    { "label": "Menu", "href": "/menu", "order": 1 },
    { "label": "About", "href": "/about", "order": 2 },
    { "label": "Locations", "href": "/locations", "order": 3 },
    { "label": "Contact", "href": "/contact", "order": 4 }
  ],
  "rightNavItems": [],
  "ctaButton": {
    "label": "Order Online",
    "href": "/order"
  },
  "layout": "bordered-centered",
  "position": "absolute",
  "bgColor": "#ffffff",
  "textColor": "#000000",
  "buttonBgColor": "#000000",
  "buttonTextColor": "#ffffff"
}
```

## Admin Panel Integration

To allow admins to edit navbar configuration, create an admin page:

```tsx
'use client';

import { useState } from 'react';

export default function NavbarAdmin() {
  const [config, setConfig] = useState({
    restaurantName: '',
    logoUrl: '',
    // ... other fields
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const response = await fetch('/api/navbar-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    
    if (response.ok) {
      alert('Navbar updated successfully!');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields for editing navbar config */}
    </form>
  );
}
```

## Error Handling

The dynamic navbar includes automatic error handling:

1. **API Failure**: Falls back to default configuration
2. **Invalid Data**: Merges with defaults to ensure all required fields
3. **Network Issues**: Logs error and uses defaults
4. **Loading State**: Optional skeleton loader

## Performance Considerations

- **Caching**: Consider caching the API response with `revalidate` in Next.js
- **Static Generation**: Use `overrideConfig` for static pages
- **Loading State**: Enable `showLoadingSkeleton` for better UX

## Migration from Static Navbar

To migrate from the static [`navbar.tsx`](src/components/navbar.tsx:1):

1. Replace `<Navbar />` with `<DynamicNavbar />`
2. Remove hardcoded props
3. Set up your database with initial data
4. Test the API endpoint
5. Deploy!

## Type Safety

All types are defined in [`src/types/navbar.types.ts`](src/types/navbar.types.ts:1):

- [`NavbarConfig`](src/types/navbar.types.ts:23): Main configuration type
- [`NavItem`](src/types/navbar.types.ts:7): Navigation item type
- [`CTAButton`](src/types/navbar.types.ts:13): CTA button type
- [`NavbarConfigResponse`](src/types/navbar.types.ts:61): API response type

## Testing

Test with override config before connecting to database:

```tsx
<DynamicNavbar 
  overrideConfig={{
    restaurantName: "Test Restaurant",
    leftNavItems: [
      { label: "Test 1", href: "#1" },
      { label: "Test 2", href: "#2" },
    ],
    ctaButton: {
      label: "Test Button",
      href: "#test"
    }
  }}
/>
```

## Support

For issues or questions:
1. Check the type definitions in [`navbar.types.ts`](src/types/navbar.types.ts:1)
2. Review the API route in [`route.ts`](src/app/api/navbar-config/route.ts:1)
3. Examine database schemas in [`navbar-schema-examples.ts`](src/lib/database/navbar-schema-examples.ts:1)
