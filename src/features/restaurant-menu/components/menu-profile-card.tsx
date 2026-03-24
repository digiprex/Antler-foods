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
      className={`overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm ${
        isSidebar ? 'p-4' : 'p-4 sm:p-5'
      }`}
    >
      <div className={`grid gap-2.5 ${profile.phone ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <div className="rounded-lg border border-stone-200 bg-white px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
            Name
          </p>
          <p className="mt-1.5 text-sm font-medium text-stone-900">{profile.name}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
            Email
          </p>
          <p className="mt-1.5 break-all text-sm font-medium text-stone-900">{profile.email}</p>
        </div>
        {profile.phone ? (
          <div className="rounded-lg border border-stone-200 bg-white px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
              Phone
            </p>
            <p className="mt-1.5 text-sm font-medium text-stone-900">{profile.phone}</p>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          void onLogout();
        }}
        disabled={isLoggingOut}
        className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-lg border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-900 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoggingOut ? 'Logging out...' : 'Log out'}
      </button>
    </section>
  );
}
