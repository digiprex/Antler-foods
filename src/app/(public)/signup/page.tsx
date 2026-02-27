import { AuthLayout } from "@/components/auth/auth-layout";
import { SignupForm } from "@/components/auth/signup-form";
import { generateMetadata as generateSEOMetadata, getPageSEO } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = generateSEOMetadata(getPageSEO('signup'));

export default function SignupPage() {
  return (
    <AuthLayout
      title="Run your restaurant from anywhere"
      subtitle="Create your account to launch and manage operations."
    >
      <SignupForm />
    </AuthLayout>
  );
}
