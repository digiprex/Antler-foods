/**
 * Type definitions for dynamic footer configuration
 * These types define the structure of data that will come from the database/API
 */

export interface SocialLink {
  id?: string;
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok' | 'gmb' | 'doordash' | 'grubhub' | 'ubereats' | 'yelp';
  url: string;
  order?: number;
}

export interface FooterLink {
  id?: string;
  label: string;
  href: string;
  order?: number;
}

export interface FooterColumn {
  id?: string;
  title: string;
  links: FooterLink[];
  order?: number;
}

export interface FooterConfig {
  id?: string;
  restaurant_id?: string; // Restaurant ID for database operations

  // Logo and branding
  logoUrl?: string;
  restaurantName: string;
  aboutContent?: string; // Changed from tagline

  // Contact information
  email?: string;
  phone?: string;
  address?: string;

  // Footer columns
  columns: FooterColumn[];

  // Social media links
  socialLinks: SocialLink[];

  // Footer bottom
  copyrightText?: string;
  showPoweredBy?: boolean;

  // Styling
  layout?: 'default' | 'centered' | 'columns-3' | 'columns-4' | 'restaurant';
  // Layout descriptions:
  // - default: Three sections (Left: Brand/About/Social | Center: Location | Right: Contact/ScrollTop)
  // - centered: All content centered
  // - columns-3/4: Multi-column layout with links
  // - restaurant: Four columns with brand, address, contact, and scroll button + nav links below
  bgColor?: string;
  textColor?: string;
  linkColor?: string;
  borderColor?: string;
  copyrightBgColor?: string;
  copyrightTextColor?: string;

  // Font styling for footer content
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';

  // Font styling for headings (slightly larger)
  headingFontFamily?: string;
  headingFontSize?: string;
  headingFontWeight?: number;
  headingTextTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';

  // Font styling for copyright section
  copyrightFontFamily?: string;
  copyrightFontSize?: string;
  copyrightFontWeight?: number;

  // Additional options
  showNewsletter?: boolean;
  newsletterTitle?: string;
  newsletterPlaceholder?: string;
  showSocialMedia?: boolean; // Toggle for social media
  showLocations?: boolean; // Toggle for locations

  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

/**
 * API Response type for footer configuration
 */
export interface FooterConfigResponse {
  success: boolean;
  data: FooterConfig;
  error?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  restaurantName: "Restaurant",
  aboutContent: "Experience fine dining at its best",
  email: "hello@maisonnoir.com",
  phone: "+1 (555) 123-4567",
  address: "123 Main Street, City, State 12345",
  columns: [
    {
      title: "Quick Links",
      links: [
        { label: "Menu", href: "#menu", order: 1 },
        { label: "Reservations", href: "#reservations", order: 2 },
        { label: "About Us", href: "#about", order: 3 },
      ],
      order: 1,
    },
    {
      title: "Customer Service",
      links: [
        { label: "Contact", href: "#contact", order: 1 },
        { label: "FAQ", href: "#faq", order: 2 },
        { label: "Privacy Policy", href: "#privacy", order: 3 },
      ],
      order: 2,
    },
  ],
  socialLinks: [
    { platform: "facebook", url: "https://facebook.com", order: 1 },
    { platform: "instagram", url: "https://instagram.com", order: 2 },
    { platform: "twitter", url: "https://twitter.com", order: 3 },
  ],
  copyrightText: `© ${new Date().getFullYear()} Restaurant. All rights reserved.`,
  showPoweredBy: false,
  layout: "restaurant",
  bgColor: "#f5f5f5",
  textColor: "#333333",
  linkColor: "#666666",
  borderColor: "#374151",
  copyrightBgColor: "#000000",
  copyrightTextColor: "#ffffff",
  showNewsletter: false,
  newsletterTitle: "Subscribe to our newsletter",
  newsletterPlaceholder: "Enter your email",
  showSocialMedia: true,
  showLocations: true,
  fontFamily: "Poppins, sans-serif",
  fontSize: "0.9375rem",
  fontWeight: 400,
  textTransform: "none",
  headingFontFamily: "Poppins, sans-serif",
  headingFontSize: "1.125rem",
  headingFontWeight: 600,
  headingTextTransform: "uppercase",
  copyrightFontFamily: "Poppins, sans-serif",
  copyrightFontSize: "0.875rem",
  copyrightFontWeight: 400
};
