import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { generateMetadata as generateSEOMetadata, getPageSEO } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = generateSEOMetadata(getPageSEO('forgot-password'));

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email to receive a password reset link."
    >
      <Suspense
        fallback={<p className="rounded-lg bg-white px-4 py-3 text-sm">Loading form...</p>}
      >
        <ForgotPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
