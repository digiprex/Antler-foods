# SEO Implementation Guide

This document outlines the comprehensive SEO implementation added to all pages in the Antler Foods application.

## Overview

SEO metadata has been added to all pages in the application with default values for title, description, keywords, and Open Graph images. The implementation includes:

- **Default SEO values** for consistent branding
- **Page-specific SEO configurations** for different page types
- **Dynamic SEO generation** for user-generated content pages
- **Open Graph and Twitter Card support** for social sharing
- **Robots meta tags** for controlling search engine indexing

## Files Modified/Created

### Core SEO Utilities
- **`src/lib/seo.ts`** - Main SEO utility functions and default configurations

### Layout Files
- **`src/app/layout.tsx`** - Root layout with default SEO metadata
- **`src/app/admin/layout.tsx`** - Admin pages layout with admin-specific SEO
- **`src/app/dashboard/[role]/layout.tsx`** - Dashboard layout with dashboard-specific SEO

### Page Files
- **`src/app/(public)/login/page.tsx`** - Login page with no-index SEO
- **`src/app/(public)/signup/page.tsx`** - Signup page with no-index SEO
- **`src/app/not-found.tsx`** - 404 page with appropriate SEO
- **`src/app/[slug]/page.tsx`** - Dynamic pages with server-side metadata generation
- **`src/app/[slug]/page-client.tsx`** - Client component for dynamic pages

## SEO Configuration

### Default SEO Values

```typescript
const DEFAULT_SEO = {
  title: 'Antler Foods - Restaurant Management Platform',
  description: 'Comprehensive restaurant management platform for modern food businesses. Manage your restaurant operations, menu, orders, and customer relationships all in one place.',
  keywords: [
    'restaurant management',
    'food business',
    'restaurant software',
    'menu management',
    'order management',
    'restaurant platform',
    'food service',
    'restaurant technology'
  ],
  ogImage: '/images/dashboard-preview.svg',
  noIndex: false,
};
```

### Page-Specific SEO

#### Login Page
- **Title**: "Login - Antler Foods"
- **Description**: Sign in messaging
- **No-index**: true (prevents indexing of auth pages)

#### Signup Page
- **Title**: "Sign Up - Antler Foods"
- **Description**: Registration messaging
- **No-index**: true

#### Dashboard Pages
- **Title**: "Dashboard - Antler Foods"
- **Description**: Dashboard-specific messaging
- **No-index**: true (private content)

#### Admin Pages
- **Title**: "Admin Panel - Antler Foods"
- **Description**: Admin-specific messaging
- **No-index**: true (private content)

#### 404 Page
- **Title**: "Page Not Found - Antler Foods"
- **Description**: 404-specific messaging
- **No-index**: true

### Dynamic Pages ([slug])

Dynamic pages use server-side metadata generation to create SEO-optimized content based on:

1. **Page data from database** (meta_title, meta_description, og_image)
2. **Restaurant information** for contextual branding
3. **Fallback to default values** if custom data is not available

## Features

### 1. Open Graph Support
All pages include Open Graph metadata for social sharing:
- `og:title`
- `og:description`
- `og:image` (1200x630px recommended)
- `og:type`

### 2. Twitter Cards
Twitter Card metadata is included for Twitter sharing:
- `twitter:card` (summary_large_image)
- `twitter:title`
- `twitter:description`
- `twitter:image`

### 3. Robots Meta Tags
Pages that should not be indexed include robots meta tags:
- `robots: { index: false, follow: false }`

### 4. Canonical URLs
Support for canonical URLs to prevent duplicate content issues (can be added per page).

## Usage

### Adding SEO to a New Page

1. **For static pages**, add metadata export:
```typescript
import { generateMetadata as generateSEOMetadata, getPageSEO } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = generateSEOMetadata(getPageSEO('page-type'));
```

2. **For dynamic pages**, implement `generateMetadata` function:
```typescript
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Fetch page data
  const pageData = await fetchPageData(params.slug);
  
  // Generate SEO config
  const seoConfig = generateDynamicSEO(pageData, restaurantName);
  
  return generateSEOMetadata(seoConfig);
}
```

### Customizing SEO for Specific Pages

You can override default values by passing a custom configuration:

```typescript
export const metadata: Metadata = generateSEOMetadata({
  title: 'Custom Page Title',
  description: 'Custom page description',
  keywords: ['custom', 'keywords'],
  noIndex: true, // Prevent indexing
  canonical: 'https://example.com/canonical-url'
});
```

## Database Integration

The SEO system integrates with the existing database structure:

- **`web_pages.meta_title`** - Custom page title
- **`web_pages.meta_description`** - Custom page description  
- **`web_pages.og_image`** - Custom Open Graph image
- **`web_pages.keywords`** - Custom keywords (comma-separated)

## Best Practices

1. **Title Length**: Keep titles under 60 characters
2. **Description Length**: Keep descriptions under 160 characters
3. **Keywords**: Use relevant, specific keywords (avoid keyword stuffing)
4. **Images**: Use 1200x630px images for optimal social sharing
5. **No-Index**: Use for private/auth pages, admin panels, and duplicate content

## Testing SEO

To test the SEO implementation:

1. **View page source** to verify meta tags are present
2. **Use SEO tools** like Google's Rich Results Test
3. **Test social sharing** on platforms like Facebook and Twitter
4. **Check robots.txt** compliance for no-index pages

## Future Enhancements

- **Structured data** (JSON-LD) for rich snippets
- **Multi-language SEO** support
- **Dynamic sitemap** generation
- **SEO analytics** integration
- **A/B testing** for meta descriptions