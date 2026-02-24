import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

interface WebsiteRouteLayoutProps {
  children: ReactNode;
  params: {
    role: string;
  };
}

const ALLOWED_ROLE_SEGMENTS = new Set(["admin", "owner", "manager"]);

export default function WebsiteRouteLayout({
  children,
  params,
}: WebsiteRouteLayoutProps) {
  if (!ALLOWED_ROLE_SEGMENTS.has(params.role)) {
    notFound();
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

