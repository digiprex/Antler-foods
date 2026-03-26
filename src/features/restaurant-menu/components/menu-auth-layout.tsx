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

const highlights = [
  {
    label: 'Secure checkout',
    value: 'Protected',
  },
  {
    label: 'Fast access',
    value: 'One-time link',
  },
];

export function MenuAuthLayout({ title, subtitle, children }: MenuAuthLayoutProps) {
  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-[linear-gradient(180deg,#fafaf9_0%,#ffffff_100%)] px-3 py-5 sm:px-4 sm:py-6 lg:px-5 lg:py-7 xl:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[1380px] items-center py-1">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/90 shadow-2xl shadow-slate-900/10 backdrop-blur-sm lg:grid-cols-[minmax(0,0.98fr)_minmax(400px,0.8fr)]">
          <aside className="relative hidden min-h-[580px] overflow-hidden bg-[linear-gradient(160deg,#211d1a_0%,#171412_48%,#090909_100%)] text-white lg:flex">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.08),transparent_45%),radial-gradient(circle_at_78%_70%,rgba(255,255,255,0.05),transparent_50%)]" />
            <div className="absolute -left-16 top-16 h-56 w-56 rounded-full bg-white/8 blur-3xl animate-pulse" />
            <div className="absolute -right-12 bottom-12 h-64 w-64 rounded-full bg-white/5 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

            <div className="relative z-10 flex w-full flex-col justify-between p-8 xl:p-10">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-100 backdrop-blur-sm">
                  <span className="inline-block h-2 w-2 rounded-full bg-white animate-pulse" />
                  Online ordering
                </div>

                <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Reset access with confidence
                </p>
                <h1 className="mt-4 max-w-xl text-[clamp(2.25rem,3.2vw,3.4rem)] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
                  {title}
                </h1>
                <p className="mt-4 max-w-lg text-[15px] leading-6 text-slate-300">
                  {subtitle}
                </p>
              </div>

              <div className="space-y-3">
                <div className="hidden gap-3 xl:grid xl:grid-cols-2">
                  {highlights.map((highlight) => (
                    <div
                      key={highlight.label}
                      className="rounded-[22px] border border-white/10 bg-white/5 p-4 backdrop-blur-md"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {highlight.label}
                      </p>
                      <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">
                        {highlight.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-md">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Why create an account
                  </p>
                  <div className="mt-3 space-y-2.5">
                    {featureList.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-[13px] leading-5.5 text-slate-300">
                        <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white">
                          <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="relative flex min-h-[560px] items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#fafaf9_0%,#ffffff_100%)] px-4 py-7 sm:px-6 sm:py-8 lg:min-h-[660px] lg:px-8 lg:py-9 xl:px-10">
            <div className="pointer-events-none absolute left-8 top-8 h-20 w-20 rounded-full bg-slate-200/70 opacity-70 blur-xl" />
            <div className="pointer-events-none absolute bottom-10 right-8 h-28 w-28 rounded-full bg-slate-200/45 opacity-60 blur-2xl" />

            <div className="relative z-10 w-full max-w-[500px]">
              <div className="mb-3 rounded-[22px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_16px_44px_rgba(15,23,42,0.08)] lg:hidden">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-800">
                  <span className="inline-block h-2 w-2 rounded-full bg-slate-900 animate-pulse" />
                  Online ordering
                </div>
                <h1 className="mt-5 text-[2.05rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.7rem]">
                  {title}
                </h1>
                <p className="mt-2.5 max-w-lg text-[13px] leading-5.5 text-slate-600">
                  {subtitle}
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200/60 bg-white/90 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur-sm sm:p-5 lg:p-6">
                <div className="hidden lg:block">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Account recovery
                  </p>
                  <h2 className="mt-3 text-[1.75rem] font-semibold tracking-[-0.045em] text-slate-950">
                    {title}
                  </h2>
                  <p className="mt-2 max-w-md text-[13px] leading-5.5 text-slate-600">
                    {subtitle}
                  </p>
                  <div className="mt-4 h-px w-full bg-gradient-to-r from-slate-200 via-slate-200 to-transparent" />
                </div>

                <div className="lg:pt-5">{children}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
