import { redirect } from 'next/navigation';
import { LOGIN_ROUTE } from '@/lib/auth/routes';

export default function LegacyAdminLoginPage() {
  redirect(LOGIN_ROUTE);
}
