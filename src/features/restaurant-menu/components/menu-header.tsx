import { CartButton } from '@/features/restaurant-menu/components/cart-button';
import { HamburgerIcon } from '@/features/restaurant-menu/components/icons';
import type {
  MenuNavLink,
  RestaurantBrand,
} from '@/features/restaurant-menu/types/restaurant-menu.types';

interface MenuHeaderProps {
  brand: RestaurantBrand;
  navigation: MenuNavLink[];
  cartCount: number;
}

export function MenuHeader({ brand, navigation, cartCount }: MenuHeaderProps) {
  return (
    <header className="border-b border-black/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-5">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 text-slate-700 transition hover:border-black/20 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            aria-label="Open navigation"
          >
            <HamburgerIcon className="h-5 w-5" />
          </button>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            {navigation.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="transition hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="min-w-0 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.5em] text-rose-500">
            {brand.accentText}
          </p>
          <h1 className="text-base font-extrabold tracking-[0.35em] text-rose-600 sm:text-xl">
            {brand.name}
          </h1>
          <p className="hidden text-[11px] text-slate-400 sm:block">{brand.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="hidden rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-black/20 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:inline-flex"
          >
            Sign In / Sign Up
          </button>
          <CartButton count={cartCount} />
        </div>
      </div>
    </header>
  );
}
