import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

interface DashboardRouteLayoutProps {
  children: ReactNode;
  params: {
    role: string;
  };
}

const ALLOWED_ROLE_SEGMENTS = new Set(["admin", "owner", "manager"]);

export default function DashboardRouteLayout({ children, params }: DashboardRouteLayoutProps) {
  if (!ALLOWED_ROLE_SEGMENTS.has(params.role)) {
    notFound();
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
