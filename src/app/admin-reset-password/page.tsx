import { redirect } from 'next/navigation';
import { RESET_PASSWORD_ROUTE } from '@/lib/auth/routes';

export default function LegacyAdminResetPasswordAliasPage() {
  redirect(RESET_PASSWORD_ROUTE);
}
