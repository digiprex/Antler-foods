/**
 * Hero Settings Page
 * 
 * Admin interface for configuring hero section settings.
 * Access: /admin/hero-settings
 * 
 * Features:
 * - Layout selection (10 different layouts)
 * - Content configuration (headline, subheadline, description)
 * - Button configuration (primary and secondary)
 * - Media settings (image, video, background)
 * - Styling options (colors, spacing, alignment)
 * - Feature cards management
 * - Live preview
 * 
 * TODO: Add authentication before deploying to production
 */

import HeroSettingsForm from '@/components/admin/hero-settings-form';

export default function HeroSettingsPage() {
  return <HeroSettingsForm />;
}