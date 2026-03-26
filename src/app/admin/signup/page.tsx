import { redirect } from 'next/navigation';
import { SIGNUP_ROUTE } from '@/lib/auth/routes';

export default function LegacyAdminSignupPage() {
  redirect(SIGNUP_ROUTE);
}
