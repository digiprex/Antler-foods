import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

interface WebsiteRouteLayoutProps {
  children: ReactNode;
  params: Promise<{
    role: string;
  }>;
}

const ALLOWED_ROLE_SEGMENTS = new Set(["admin", "owner", "manager"]);

export default async function WebsiteRouteLayout({
  children,
  params,
}: WebsiteRouteLayoutProps) {
  const { role } = await params;

  if (!ALLOWED_ROLE_SEGMENTS.has(role)) {
    notFound();
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

