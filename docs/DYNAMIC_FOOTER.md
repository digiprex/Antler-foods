# Dynamic Footer Implementation

## Overview
The footer system has been implemented with the same architecture as the navbar, providing a fully dynamic and configurable footer that can be managed through an admin interface.

## Components Created

### 1. Footer Component (`src/components/footer.tsx`)
The base footer component that renders different layouts based on configuration:
- **Default Layout**: Three sections (Brand/About/Social | Location | Contact)
- **Centered Layout**: All content centered
- **Columns Layout**: Multi-column layout with customizable link columns
- **Minimal Layout**: Simple centered layout

Features:
- Dynamic logo or restaurant name
- Social media links with icons
- Contact information (email, phone, address)
- Customizable columns with links
- Scroll-to-top button
- Copyright text
- "Powered by" branding (toggleable)
- Fully customizable colors (background, text, links)

### 2. Dynamic Footer Component (`src/components/dynamic-footer.tsx`)
Fetches footer configuration from the API and renders the footer with dynamic content:
- Fetches from `/api/footer-config` endpoint
- Uses restaurant_id to get specific configuration
- Falls back to default configuration if API fails
- Supports override configuration for testing
- Loading state handling

### 3. Conditional Footer Component (`src/components/conditional-footer.tsx`)
Controls when the footer is displayed:
- Shows footer on customer-facing pages
- Hides footer on admin/dashboard/auth pages
- Integrated into the root layout

### 4. Footer Settings Form (`src/components/admin/footer-settings-form.tsx`)
Admin interface for configuring the footer:
- Layout selection (default, centered, columns, minimal)
- Color customization (background, text, links)
- Contact information management
- Social media links management
- Column and link management
- Toggle options (social media, locations, powered by)
- Live preview of changes
- Mobile responsive design

### 5. Footer API Route (`src/app/api/footer-config/route.ts`)
API endpoint for footer configuration:
- GET: Fetch footer configuration by restaurant_id
- PUT: Update footer configuration
- Integrates with Nhost GraphQL backend
- Handles JSONB data for complex structures

### 6. Footer Settings Page (`src/app/admin/footer-settings/page.tsx`)
Admin page for accessing the footer settings form

## Database Structure

The footer configuration is stored in the `footer_configs` table with the following structure:

```sql
CREATE TABLE footer_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  restaurant_name TEXT NOT NULL,
  logo_url TEXT,
  about_content TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  columns JSONB DEFAULT '[]',
  social_links JSONB DEFAULT '[]',
  copyright_text TEXT,
  show_powered_by BOOLEAN DEFAULT true,
  layout TEXT DEFAULT 'columns-3',
  bg_color TEXT DEFAULT '#1f2937',
  text_color TEXT DEFAULT '#f9fafb',
  link_color TEXT DEFAULT '#9ca3af',
  border_color TEXT DEFAULT '#374151',
  show_newsletter BOOLEAN DEFAULT false,
  newsletter_title TEXT,
  newsletter_placeholder TEXT,
  show_social_media BOOLEAN DEFAULT true,
  show_locations BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Type Definitions

Located in `src/types/footer.types.ts`:
- `FooterConfig`: Main configuration interface
- `SocialLink`: Social media link structure
- `FooterLink`: Individual link structure
- `FooterColumn`: Column with multiple links
- `DEFAULT_FOOTER_CONFIG`: Default configuration values

## Hooks

### useFooterConfig (`src/hooks/use-footer-config.ts`)
Custom hook for fetching and managing footer configuration:
- Fetches footer config from API
- Handles loading and error states
- Provides refetch functionality
- Update footer configuration

## Styling

### Footer Styles (`src/components/footer.module.scss`)
SCSS module with:
- Responsive design for all screen sizes
- CSS variables for dynamic styling
- Layout-specific styles
- Mobile-first approach
- Smooth animations and transitions

### Footer Settings Form Styles (`src/components/admin/footer-settings-form.module.css`)
Comprehensive mobile-responsive styles:
- Split layout (form | preview)
- Touch-friendly controls (44px minimum)
- Responsive breakpoints (1200px, 900px, 768px, 480px, 360px)
- Smooth scrolling on mobile
- Optimized for all device sizes

## Integration

The footer is integrated into the application through:

1. **Root Layout** (`src/app/layout.tsx`):
   ```tsx
   import ConditionalFooter from "../components/conditional-footer";
   
   // Inside body
   <ConditionalFooter />
   ```

2. **Conditional Rendering**:
   - Shows on: Home page, public pages
   - Hides on: Admin pages, dashboard, auth pages

## Mobile Responsiveness

The footer is fully mobile responsive with:
- Flexible grid layouts that adapt to screen size
- Touch-friendly buttons and links (minimum 44px)
- Optimized font sizes for readability
- Smooth scrolling on iOS devices
- Responsive images and logos
- Collapsible sections on small screens
- Fixed scroll-to-top button

## Usage

### For Administrators
1. Navigate to `/admin/footer-settings`
2. Configure footer layout, colors, and content
3. Add/edit social media links
4. Manage contact information
5. Create custom link columns
6. Preview changes in real-time
7. Save configuration

### For Developers
```tsx
// Use dynamic footer (fetches from API)
import DynamicFooter from '@/components/dynamic-footer';
<DynamicFooter />

// Use with override config
<DynamicFooter overrideConfig={{ restaurantName: "My Restaurant" }} />

// Use conditional footer (auto-hides on admin pages)
import ConditionalFooter from '@/components/conditional-footer';
<ConditionalFooter />

// Use base footer with props
import Footer from '@/components/footer';
<Footer
  restaurantName="My Restaurant"
  layout="centered"
  bgColor="#1f2937"
  textColor="#f9fafb"
  // ... other props
/>
```

## Features Summary

✅ Multiple layout options (default, centered, columns, minimal)
✅ Dynamic content from database
✅ Customizable colors and styling
✅ Social media integration
✅ Contact information display
✅ Custom link columns
✅ Scroll-to-top functionality
✅ Mobile responsive design
✅ Admin configuration interface
✅ Live preview
✅ API integration
✅ Type-safe implementation
✅ Fallback to defaults
✅ Loading states
✅ Error handling

## Next Steps

1. **Testing**: Test footer on different devices and browsers
2. **Content**: Add actual restaurant content and links
3. **SEO**: Add structured data for contact information
4. **Analytics**: Track footer link clicks
5. **Newsletter**: Implement newsletter subscription functionality
6. **Accessibility**: Add ARIA labels and keyboard navigation
7. **Performance**: Optimize images and lazy load content

## Related Files

- Components: `src/components/footer.tsx`, `src/components/dynamic-footer.tsx`, `src/components/conditional-footer.tsx`
- Admin: `src/components/admin/footer-settings-form.tsx`
- API: `src/app/api/footer-config/route.ts`
- Types: `src/types/footer.types.ts`
- Hooks: `src/hooks/use-footer-config.ts`
- Styles: `src/components/footer.module.scss`, `src/components/admin/footer-settings-form.module.css`
- Pages: `src/app/admin/footer-settings/page.tsx`
