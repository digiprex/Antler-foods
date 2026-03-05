import type { ReactNode } from 'react';
import Image from 'next/image';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7f6] lg:grid lg:grid-cols-[1.15fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#1e1b4b] lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(139,92,246,0.15),transparent_40%),radial-gradient(circle_at_80%_78%,rgba(124,58,237,0.18),transparent_45%)]" />
        <div className="absolute -left-12 bottom-14 h-60 w-60 rounded-full bg-[#8b5cf6]/12 blur-[100px]" />
        <div className="absolute right-0 top-8 h-72 w-72 rounded-full bg-[#a78bfa]/10 blur-[120px]" />
        <div className="relative z-10 m-auto w-full max-w-[950px] px-12 py-14">
          <div className="mb-2 inline-block rounded-full border border-[#8b5cf6]/30 bg-[#6d28d9]/25 px-3 py-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#c4b5fd]">
              Restaurant Builder
            </p>
          </div>
          <h2 className="mt-2 max-w-xl text-2xl font-bold leading-snug tracking-tight text-white/95">
            One dashboard to manage orders, teams, and growth.
          </h2>
          <div className="mt-7 overflow-hidden rounded-2xl border border-[#8b5cf6]/40 bg-[#1e1b4b]/90 p-3.5 shadow-[0_20px_55px_rgba(30,27,75,0.8)]">
            <Image
              src="/images/dashboard-preview.svg"
              alt="Restaurant dashboard preview"
              width={1600}
              height={1200}
              priority
              className="h-auto w-full rounded-xl"
            />
          </div>
        </div>
      </aside>

      <section className="relative flex min-h-screen items-center bg-[radial-gradient(circle_at_75%_10%,#faf5ff,transparent_35%),radial-gradient(circle_at_30%_95%,#f3e8ff,transparent_40%)] px-6 py-10 sm:px-10 lg:px-12">
        <div className="pointer-events-none absolute left-6 top-6 h-16 w-16 rounded-full border border-purple-200/50 bg-purple-100/30 blur-sm" />
        <div className="pointer-events-none absolute bottom-14 right-10 h-32 w-32 rounded-full bg-[#8b5cf6]/8 blur-2xl" />
        <div className="relative mx-auto w-full max-w-[480px] rounded-[24px] border border-purple-100/80 bg-white/95 p-7 shadow-[0_20px_50px_rgba(139,92,246,0.15)] backdrop-blur-sm sm:p-10">
          <div className="mb-6 overflow-hidden rounded-xl border border-[#c4b5fd]/50 bg-[#1e1b4b] p-2 shadow-lg lg:hidden">
            <Image
              src="/images/dashboard-preview.svg"
              alt="Restaurant dashboard preview"
              width={1280}
              height={720}
              className="h-auto w-full rounded-lg"
            />
          </div>

          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
            {title}
          </h1>
          <p className="mt-2 text-sm font-medium text-[#6b7280]">
            {subtitle}
          </p>
          <div className="mt-7">{children}</div>
        </div>
      </section>
    </div>
  );
}
