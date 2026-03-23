import type { ReactNode } from 'react';

interface MenuAuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const featureList = [
  'Save your favorite orders for faster checkout',
  'Track pickup and delivery details in one place',
  'Keep your delivery details ready for future orders',
];

export function MenuAuthLayout({ title, subtitle, children }: MenuAuthLayoutProps) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1.1fr)_560px]">
      <aside className="relative hidden overflow-hidden bg-black text-white lg:flex lg:min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_40%)]" />
        <div className="relative z-10 flex w-full flex-col justify-between px-14 py-16">
          <div>
            <div className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              Online Ordering
            </div>
            <div className="mt-10 max-w-xl space-y-6">
              <h1 className="text-5xl font-semibold leading-tight text-white">
                {title}
              </h1>
              <p className="max-w-lg text-base leading-7 text-white/70">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
              Why create an account
            </p>
            <div className="space-y-3">
              {featureList.map((feature) => (
                <div key={feature} className="flex items-start gap-3 text-sm text-white/75">
                  <span className="mt-1 h-2 w-2 rounded-full bg-white" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <section className="flex min-h-screen items-center justify-center bg-stone-50 px-5 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-xl">
          <div className="mb-8 text-center lg:hidden">
            <div className="inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm">
              Online Ordering
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {subtitle}
            </p>
          </div>

          <div className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="hidden border-b border-stone-200 pb-6 lg:block">
              <h2 className="text-[2rem] font-semibold tracking-tight text-slate-950">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {subtitle}
              </p>
            </div>
            <div className="lg:pt-6">{children}</div>
          </div>
        </div>
      </section>
    </div>
  );
}