/**
 * Admin Page for Navbar Configuration
 * 
 * This page provides a UI for administrators to manage navbar settings.
 * Access: /admin/navbar-config
 * 
 * Features:
 * - Live preview of changes
 * - Edit all navbar properties
 * - Save to database
 * 
 * TODO: Add authentication/authorization before deploying to production
 */

import NavbarAdmin from '@/components/admin/navbar-admin';

export default function NavbarConfigPage() {
  return <NavbarAdmin />;
}
