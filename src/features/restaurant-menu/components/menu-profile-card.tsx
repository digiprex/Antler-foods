import type { MenuCustomerProfile } from '@/features/restaurant-menu/lib/customer-profile';

interface MenuProfileCardProps {
  profile: MenuCustomerProfile;
  onLogout: () => void | Promise<void>;
  isLoggingOut?: boolean;
  variant?: 'page' | 'sidebar';
}

export function MenuProfileCard({
  profile,
  onLogout,
  isLoggingOut = false,
  variant = 'page',
}: MenuProfileCardProps) {
  const isSidebar = variant === 'sidebar';

  return (
    <section
      className={`rounded-[28px] border border-stone-200 bg-white shadow-sm ${
        isSidebar ? 'p-5' : 'p-5 sm:p-6'
      }`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black text-lg font-semibold text-white">
            {profile.initials}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Signed in
            </p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 sm:text-[1.35rem]">
              {profile.name}
            </h3>
            <p className="mt-1 truncate text-sm text-slate-600">{profile.email}</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Your details are saved for faster checkout and future orders.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            void onLogout();
          }}
          disabled={isLoggingOut}
          className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-slate-900 transition hover:border-black/20 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoggingOut ? 'Logging out...' : 'Log out'}
        </button>
      </div>

      <div className={`mt-5 grid gap-3 ${profile.phone ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <div className="rounded-2xl bg-stone-50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Name
          </p>
          <p className="mt-2 text-sm font-medium text-slate-950">{profile.name}</p>
        </div>
        <div className="rounded-2xl bg-stone-50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Email
          </p>
          <p className="mt-2 break-all text-sm font-medium text-slate-950">{profile.email}</p>
        </div>
        {profile.phone ? (
          <div className="rounded-2xl bg-stone-50 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Phone
            </p>
            <p className="mt-2 text-sm font-medium text-slate-950">{profile.phone}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}