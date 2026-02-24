import { NavItem } from './nav-item';
import { SearchBox, type RestaurantSearchSelection } from './search-box';
import type { DashboardRailTab } from './icon-rail';

interface SidebarProps {
  activeTab: DashboardRailTab;
  pathname: string;
  dashboardBasePath: string;
  websiteBasePath: string;
  isOpen: boolean;
  selectedRestaurant: RestaurantSearchSelection | null;
  onRestaurantSelect: (restaurant: RestaurantSearchSelection | null) => void;
}

const HOME_MENU_ITEMS = [
  { href: '/home', label: 'Home', icon: <HomeIcon /> },
  { href: '/customer-base', label: 'Customer Base', icon: <UsersIcon /> },
  { href: '/new-restaurant', label: 'New restaurant', icon: <StoreIcon /> },
  { href: '/restaurants', label: 'Restaurants', icon: <ShopIcon /> },
  { href: '/sales', label: 'Sales', icon: <SalesIcon /> },
  { href: '/reports', label: 'Reports', icon: <ReportsIcon /> },
] as const;

export function Sidebar({
  activeTab,
  pathname,
  dashboardBasePath,
  websiteBasePath,
  isOpen,
  selectedRestaurant,
  onRestaurantSelect,
}: SidebarProps) {
  const isHomeTab = activeTab === 'home';
  const isWebsiteTab = activeTab === 'website';

  const websiteMenuItems = selectedRestaurant
    ? [
        {
          href: buildWebsiteSettingsHref(
            `${websiteBasePath}/navbar-settings`,
            selectedRestaurant,
          ),
          label: 'Navbar settings',
          icon: <NavbarIcon />,
        },
        {
          href: buildWebsiteSettingsHref(
            `${websiteBasePath}/footer-settings`,
            selectedRestaurant,
          ),
          label: 'Footer settings',
          icon: <FooterIcon />,
        },
        {
          href: buildWebsiteSettingsHref('/admin/pages-settings', selectedRestaurant),
          label: 'Pages',
          icon: <PagesIcon />,
        },
      ]
    : [];

  return (
    <aside
      className={`min-h-screen w-[330px] border-r border-[#d7e2e6] bg-[#f8fafb] transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full absolute'
      }`}
    >
      <SearchBox
        selectedRestaurant={selectedRestaurant}
        onRestaurantSelect={onRestaurantSelect}
      />
      <div className="border-b border-[#d7e2e6] px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[24px] font-semibold text-[#101827]">
            {isHomeTab
              ? 'Home'
              : isWebsiteTab
                ? 'Website'
              : activeTab === 'reservations'
                ? 'Reservations'
                : 'Team'}
          </h2>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#cdd8de] bg-[#f1f4f6] text-[#a6b2bb]"
          >
            <EyeIcon />
          </button>
        </div>
      </div>

      {isHomeTab ? (
        <nav className="space-y-2 px-3 py-4">
          {HOME_MENU_ITEMS.map((item) => (
            <NavItem
              key={`${dashboardBasePath}${item.href}`}
              href={`${dashboardBasePath}${item.href}`}
              label={item.label}
              icon={item.icon}
              active={pathname === `${dashboardBasePath}${item.href}`}
            />
          ))}
        </nav>
      ) : isWebsiteTab ? (
        <div className="space-y-3 px-3 py-4">
          {/* {selectedRestaurant ? (
            <div className="rounded-xl border border-[#d8e3e8] bg-white px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[#7c8a96]">
                Selected restaurant
              </p>
              <p className="mt-1 text-[15px] font-semibold text-[#111827]">
                {selectedRestaurant.name}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#d8e3e8] bg-white px-4 py-3 text-sm text-[#60707c]">
              Select a restaurant from the search box to manage website settings.
            </div>
          )} */}

          {websiteMenuItems.length ? (
            <nav className="space-y-2">
              {websiteMenuItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={pathname === extractPathFromHref(item.href)}
                />
              ))}
            </nav>
          ) : null}
        </div>
      ) : (
        <div className="px-5 py-6 text-sm text-[#637280]">
          {activeTab === 'reservations'
            ? 'Reservations workspace placeholder.'
            : 'Team workspace placeholder.'}
        </div>
      )}
    </aside>
  );
}

function buildWebsiteSettingsHref(
  basePath: string,
  selectedRestaurant: RestaurantSearchSelection,
) {
  const params = new URLSearchParams({
    restaurant_id: selectedRestaurant.id,
    restaurant_name: selectedRestaurant.name,
  });

  return `${basePath}?${params.toString()}`;
}

function extractPathFromHref(href: string) {
  return href.split('?')[0] || href;
}

function HomeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 11 8-7 8 7" />
      <path d="M6 10.5V20h12v-9.5" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="3" />
      <circle cx="16.5" cy="9" r="2.5" />
      <path d="M2.5 18a5.5 5.5 0 0 1 11 0" />
      <path d="M14 18a4 4 0 0 1 7.5-1.8" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16l-1.5 4.5a2.6 2.6 0 0 1-2.5 1.8H8a2.6 2.6 0 0 1-2.5-1.8L4 7Z" />
      <path d="M6 13.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5.5" />
      <path d="M9 17h6" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10h16" />
      <path d="m5 10 1-5h12l1 5" />
      <path d="M6 10v10h12V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function SalesIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 20V10" />
      <path d="M11 20V4" />
      <path d="M17 20v-7" />
      <path d="M3 20h18" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M15 3v4h4" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  );
}

function NavbarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7h18" />
      <path d="M3 12h18" />
      <path d="M3 17h12" />
    </svg>
  );
}

function FooterIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16v12H4z" />
      <path d="M4 14h16" />
      <path d="M8 18h8" />
    </svg>
  );
}

function PagesIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10,9 9,9 8,9" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
