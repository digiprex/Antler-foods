/**
 * Navbar Settings Page
 * 
 * Simplified admin interface for configuring navbar settings.
 * Access: /admin/navbar-settings
 * 
 * Features:
 * - Layout/Type selection
 * - Position control
 * - Color customization
 * - Order online button toggle
 * - Live preview
 * 
 * TODO: Add authentication before deploying to production
 */

import NavbarSettingsForm from '@/components/admin/navbar-settings-form';

export default function NavbarSettingsPage() {
  return <NavbarSettingsForm />;
}
