import type { ReactNode } from 'react';
import Image from 'next/image';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 lg:grid lg:grid-cols-2">
      {/* Left Side - Brand Section */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 lg:flex lg:sticky lg:top-0 lg:h-screen">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(139,92,246,0.2),transparent_50%),radial-gradient(circle_at_75%_75%,rgba(124,58,237,0.15),transparent_50%)]" />
        <div className="absolute -left-20 top-20 h-80 w-80 rounded-full bg-gradient-to-r from-violet-500/20 to-purple-500/20 blur-3xl animate-pulse" />
        <div className="absolute -right-16 bottom-20 h-96 w-96 rounded-full bg-gradient-to-l from-indigo-500/15 to-blue-500/15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center w-full max-w-lg mx-auto px-12 py-16">
          {/* Brand Badge */}
          <div className="mb-8 inline-flex items-center gap-2 self-start rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 backdrop-blur-sm">
            <div className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-200">
              Restaurant Builder
            </span>
          </div>
          
          {/* Main Heading */}
          <h2 className="mb-6 text-4xl font-bold leading-tight text-white">
            Transform your restaurant into a{' '}
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              digital powerhouse
            </span>
          </h2>
          
          {/* Description */}
          <p className="mb-8 text-lg text-slate-300 leading-relaxed">
            Streamline operations, boost sales, and delight customers with our comprehensive restaurant management platform.
          </p>
          
          {/* Feature List */}
          <div className="space-y-4">
            {[
              'Real-time order management',
              'Customer analytics & insights',
              'Automated marketing tools',
              'Multi-location support'
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 border border-violet-400/30">
                  <svg className="h-3 w-3 text-violet-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-slate-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Right Side - Form Section */}
      <section className="relative flex min-h-screen items-start justify-center px-6 py-8 sm:px-8 lg:px-12 lg:py-12 overflow-y-auto">
        {/* Background Decorations */}
        <div className="pointer-events-none absolute left-8 top-8 h-20 w-20 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 opacity-60 blur-xl" />
        <div className="pointer-events-none absolute bottom-12 right-8 h-32 w-32 rounded-full bg-gradient-to-tl from-indigo-100 to-blue-100 opacity-40 blur-2xl" />
        
        {/* Form Container */}
        <div className="relative w-full max-w-xl my-auto">
          {/* Mobile Brand Section */}
          <div className="mb-8 text-center lg:hidden">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-700">
                Restaurant Builder
              </span>
            </div>
          </div>
          
          {/* Form Card */}
          <div className="rounded-3xl border border-slate-200/60 bg-white/90 p-6 sm:p-8 shadow-2xl shadow-slate-900/10 backdrop-blur-sm">
            {/* Header */}
            <div className="mb-6 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 leading-tight">
                {title}
              </h1>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                {subtitle}
              </p>
            </div>
            
            {/* Form Content */}
            <div>{children}</div>
          </div>
          
          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Secure authentication powered by industry-standard encryption
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
