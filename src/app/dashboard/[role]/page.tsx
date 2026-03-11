import { redirect } from "next/navigation";

interface RoleDashboardPageProps {
  params: Promise<{
    role: string;
  }>;
}

export default async function DashboardPage({ params }: RoleDashboardPageProps) {
  const { role } = await params;
  
  // Redirect based on role - owners go to home, admins go to new-restaurant
  if (role === 'admin') {
    redirect(`/dashboard/${role}/new-restaurant`);
  } else {
    redirect(`/dashboard/${role}/home`);
  }
}
