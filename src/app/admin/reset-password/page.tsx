import { redirect } from 'next/navigation';
import { ADMIN_RESET_PASSWORD_ROUTE } from '@/lib/auth/routes';

export default function LegacyAdminResetPasswordPage() {
  redirect(ADMIN_RESET_PASSWORD_ROUTE);
}
