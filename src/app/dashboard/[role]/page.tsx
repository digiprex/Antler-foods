import { redirect } from "next/navigation";

interface RoleDashboardPageProps {
  params: Promise<{
    role: string;
  }>;
}

export default async function DashboardPage({ params }: RoleDashboardPageProps) {
  const { role } = await params;
  redirect(`/dashboard/${role}/new-restaurant`);
}
