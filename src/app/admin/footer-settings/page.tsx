/**
 * Footer Settings Page
 *
 * Admin interface for configuring footer settings.
 * Access: /admin/footer-settings
 *
 * Features:
 * - Layout selection
 * - Contact information
 * - Social media links
 * - Color customization
 * - Newsletter toggle
 * - Live preview
 *
 * TODO: Add authentication before deploying to production
 */

import FooterSettingsForm from '@/components/admin/footer-settings-form';

export default function FooterSettingsPage() {
  return <FooterSettingsForm />;
}
