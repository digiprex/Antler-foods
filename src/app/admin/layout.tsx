import type { ReactNode } from "react";
import type { Metadata } from "next";
import { generateMetadata as generateSEOMetadata, getPageSEO } from "@/lib/seo";

export const metadata: Metadata = generateSEOMetadata(getPageSEO('admin'));

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <>{children}</>;
}