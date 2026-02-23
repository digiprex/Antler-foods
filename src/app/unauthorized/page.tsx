import Link from "next/link";
import { LOGIN_ROUTE } from "@/lib/auth/routes";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f5f6] p-6">
      <div className="w-full max-w-xl rounded-2xl border border-[#d7e2e6] bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-semibold text-[#111827]">Unauthorized</h1>
        <p className="mt-3 text-[#5f6c78]">
          You do not have access to this dashboard.
        </p>
        <Link
          href={LOGIN_ROUTE}
          className="mt-6 inline-flex rounded-lg bg-accent px-5 py-2.5 font-medium text-white transition hover:bg-accentDark"
        >
          Back to login
        </Link>
      </div>
    </main>
  );
}
