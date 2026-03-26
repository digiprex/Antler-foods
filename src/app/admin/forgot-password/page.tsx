import { redirect } from 'next/navigation';
import { FORGOT_PASSWORD_ROUTE } from '@/lib/auth/routes';

export default function LegacyAdminForgotPasswordPage() {
  redirect(FORGOT_PASSWORD_ROUTE);
}
