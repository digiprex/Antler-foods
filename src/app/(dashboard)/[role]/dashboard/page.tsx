import { redirect } from "next/navigation";

interface RoleDashboardPageProps {
  params: {
    role: string;
  };
}

export default function DashboardPage({ params }: RoleDashboardPageProps) {
  redirect(`/${params.role}/dashboard/new-restaurant`);
}
