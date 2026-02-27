import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";
import { generateMetadata as generateSEOMetadata, getPageSEO } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = generateSEOMetadata(getPageSEO('login'));

export default function LoginPage() {
  return (
    <AuthLayout
      title="Run your restaurant from anywhere"
      subtitle="Login to your existing account."
    >
      <Suspense
        fallback={<p className="rounded-lg bg-white px-4 py-3 text-sm">Loading login form...</p>}
      >
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
