import { NavItem } from './nav-item';
import { useState } from 'react';
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



export function Sidebar({
  activeTab,
  pathname,
  dashboardBasePath,
  websiteBasePath,
  isOpen,
  selectedRestaurant,
  onRestaurantSelect,
}: SidebarProps) {
  const [isMyInfoOpen, setIsMyInfoOpen] = useState(true);
  const isWebsiteTab = activeTab === 'website';
  
  // Static grouped menu structure matching requested layout
  const HOME_MENU_ITEMS = [
    { href: '/home', label: 'Home', icon: <HomeIcon /> },
    { href: '/new-restaurant?step=1', label: 'New Restaurant', icon: <StoreIcon /> },
    { href: '/restaurants', label: 'Restaurants', icon: <ShopIcon /> },
  ];

  const RESTAURANT_MENU_ITEMS = [
    { href: '/sales', label: 'Sales', icon: <SalesIcon /> },
    { href: '/menu', label: 'Manage Menu', icon: <MenuIcon /> },
    { href: '/information', label: 'Information', icon: <InfoIcon /> },
    { href: '/reviews', label: 'Reviews', icon: <UsersIcon /> },
    { href: '/assets', label: 'Assets', icon: <AssetsIcon /> },
    { href: '/opening-hours', label: 'Opening Hours', icon: <ClockIcon /> },
    { href: '/locations', label: 'Locations', icon: <LocationIcon /> },
  ];

  const MY_INFO_MENU_ITEMS = selectedRestaurant
    ? [
        {
          href: buildRestaurantScopedHref(
            `${dashboardBasePath}/my-info/profile`,
            selectedRestaurant,
          ),
          label: 'Profile',
          icon: <ProfileIcon />,
        },
        {
          href: buildRestaurantScopedHref(
            `${dashboardBasePath}/my-info/gallery`,
            selectedRestaurant,
          ),
          label: 'Gallery',
          icon: <GalleryIcon />,
        },
        {
          href: buildRestaurantScopedHref(
            `${dashboardBasePath}/my-info/business-information`,
            selectedRestaurant,
          ),
          label: 'Business Information',
          icon: <BusinessInfoIcon />,
        },
        {
          href: buildRestaurantScopedHref(
            `${dashboardBasePath}/my-info/google-profile`,
            selectedRestaurant,
          ),
          label: 'Google profile',
          icon: <GoogleProfileIcon />,
        },
      ]
    : [];

  const WEBSITE_MENU_ITEMS = selectedRestaurant
    ? [
        {
          href: buildAdminSettingsHref('/admin/pages-settings', selectedRestaurant),
          label: 'Pages',
          icon: <PagesIcon />,
        },
        {
          href: buildAdminSettingsHref('/admin/navbar-settings', selectedRestaurant),
          label: 'Navbar',
          icon: <NavbarIcon />,
        },
        {
          href: buildAdminSettingsHref('/admin/popup-settings', selectedRestaurant),
          label: 'Popup',
          icon: <span style={{ fontSize: '1.25rem' }}>🔔</span>,
        },
        {
          href: buildAdminSettingsHref('/admin/footer-settings', selectedRestaurant),
          label: 'Footer',
          icon: <FooterIcon />,
        },
      ]
    : [];

  const MARKETING_MENU_ITEMS = [
    { href: '/marketing', label: 'Marketing', icon: <MarketingIcon /> },
  ];

  const RESERVATION_MENU_ITEMS = [
    { href: '/reservations', label: 'Reservation', icon: <ReservationIcon /> },
  ];

  const CATERING_MENU_ITEMS = [
    { href: '/catering', label: 'Catering', icon: <CateringIcon /> },
  ];

  return (
    <aside
      className={`min-h-screen border-r border-[#d7e2e6] bg-[#f8fafb] transition-all duration-200 ease-in-out ${
        isOpen ? 'w-[330px]' : 'w-16'
      }`}
    >
      <SearchBox
        selectedRestaurant={selectedRestaurant}
        onRestaurantSelect={onRestaurantSelect}
      />
      <div className="border-b border-[#d7e2e6] px-5 py-4">
        <div className="flex items-center justify-between">
          {isOpen ? (
            <h2 className="text-[24px] font-semibold text-[#101827]">Menu</h2>
          ) : (
            <div className="h-6" />
          )}
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#cdd8de] bg-[#f1f4f6] text-[#a6b2bb]"
          >
            <EyeIcon />
          </button>
        </div>
      </div>

      <div className="space-y-4 px-3 py-4">
        {/* Home Section */}
        <div>
          {isOpen && (
            <p className="text-xs font-medium uppercase tracking-wide text-[#7c8a96] mb-2">Home</p>
          )}
          <nav className="space-y-2">
            {HOME_MENU_ITEMS.map((item) => (
              <NavItem
                key={`${dashboardBasePath}${item.href}`}
                href={`${dashboardBasePath}${item.href}`}
                label={item.label}
                icon={item.icon}
                active={pathname === `${dashboardBasePath}${item.href}`}
                collapsed={!isOpen}
              />
            ))}
          </nav>
        </div>

        {/* Restaurant Section */}
        <div>
          {isOpen && (
            <p className="text-xs font-medium uppercase tracking-wide text-[#7c8a96] mb-2">Restaurant</p>
          )}
          <nav className="space-y-2">
            {RESTAURANT_MENU_ITEMS.map((item) => (
              <NavItem
                key={`${dashboardBasePath}${item.href}`}
                href={`${dashboardBasePath}${item.href}`}
                label={item.label}
                icon={item.icon}
                active={pathname === `${dashboardBasePath}${item.href}`}
                collapsed={!isOpen}
              />
            ))}
          </nav>
        </div>

        {/* My Info Section */}
        {isOpen ? (
          <div>
            <button
              type="button"
              onClick={() => setIsMyInfoOpen((previous) => !previous)}
              className="flex w-full items-center justify-between rounded-xl px-5 py-3 text-left text-[20px] text-[#111827] transition hover:bg-[#f3f6f4]"
            >
              <span className="flex items-center gap-3">
                <span className="text-[#1f2937]">
                  <ProfileIcon />
                </span>
                <span className="leading-tight">My info</span>
              </span>
              <span
                className={`transition-transform ${
                  isMyInfoOpen ? 'rotate-180' : ''
                }`}
              >
                <ChevronDownSmallIcon />
              </span>
            </button>

            {isMyInfoOpen ? (
              <nav className="mt-1 space-y-2 pl-4">
                {MY_INFO_MENU_ITEMS.length ? (
                  MY_INFO_MENU_ITEMS.map((item) => (
                    <NavItem
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      active={pathname === extractPathFromHref(item.href)}
                      collapsed={!isOpen}
                    />
                  ))
                ) : (
                  <div className="px-5 text-sm text-[#60707c]">
                    Select a restaurant to manage My info.
                  </div>
                )}
              </nav>
            ) : null}
          </div>
        ) : null}

        {/* Website Section */}
        <div>
          {isOpen && (
            <p
              className={`mb-2 text-xs font-medium uppercase tracking-wide ${
                isWebsiteTab ? 'text-[#5dc67d]' : 'text-[#7c8a96]'
              }`}
            >
              Website
            </p>
          )}
          <nav className="space-y-2">
            {WEBSITE_MENU_ITEMS.length ? (
              WEBSITE_MENU_ITEMS.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={pathname === extractPathFromHref(item.href)}
                  collapsed={!isOpen}
                />
              ))
            ) : (
              isOpen ? (
                <div className="text-sm text-[#60707c]">Select a restaurant to manage website settings.</div>
              ) : null
            )}
          </nav>
        </div>

        {/* Marketing / Reservation / Catering */}
        <div>
          {isOpen && (
            <p className="text-xs font-medium uppercase tracking-wide text-[#7c8a96] mb-2">Marketing</p>
          )}
          <nav className="space-y-2">
            {MARKETING_MENU_ITEMS.map((item) => (
              <NavItem
                key={`${dashboardBasePath}${item.href}`}
                href={`${dashboardBasePath}${item.href}`}
                label={item.label}
                icon={item.icon}
                active={pathname === `${dashboardBasePath}${item.href}`}
                collapsed={!isOpen}
              />
            ))}
          </nav>
        </div>

        <div>
          {isOpen && (
            <p className="text-xs font-medium uppercase tracking-wide text-[#7c8a96] mb-2">Reservation</p>
          )}
          <nav className="space-y-2">
            {RESERVATION_MENU_ITEMS.map((item) => (
              <NavItem
                key={`${dashboardBasePath}${item.href}`}
                href={`${dashboardBasePath}${item.href}`}
                label={item.label}
                icon={item.icon}
                active={pathname === `${dashboardBasePath}${item.href}`}
                collapsed={!isOpen}
              />
            ))}
          </nav>
        </div>

        <div>
          {isOpen && (
            <p className="text-xs font-medium uppercase tracking-wide text-[#7c8a96] mb-2">Catering</p>
          )}
          <nav className="space-y-2">
            {CATERING_MENU_ITEMS.map((item) => (
              <NavItem
                key={`${dashboardBasePath}${item.href}`}
                href={`${dashboardBasePath}${item.href}`}
                label={item.label}
                icon={item.icon}
                active={pathname === `${dashboardBasePath}${item.href}`}
                collapsed={!isOpen}
              />
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}

function buildWebsiteSettingsHref(
  websiteBasePath: string,
  settingsPath: string,
  selectedRestaurant: RestaurantSearchSelection,
) {
  const params = new URLSearchParams({
    restaurant_id: selectedRestaurant.id,
    restaurant_name: selectedRestaurant.name,
  });

  return `${websiteBasePath}${settingsPath}?${params.toString()}`;
}

function buildAdminSettingsHref(
  adminPath: string,
  selectedRestaurant: RestaurantSearchSelection,
) {
  const params = new URLSearchParams({
    restaurant_id: selectedRestaurant.id,
    restaurant_name: selectedRestaurant.name,
  });

  return `${adminPath}?${params.toString()}`;
}

function extractPathFromHref(href: string) {
  return href.split('?')[0] || href;
}

function ChevronDownSmallIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ProfileIcon() {
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
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function GalleryIcon() {
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
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m21 16-5-5-6 6" />
    </svg>
  );
}

function BusinessInfoIcon() {
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
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
    </svg>
  );
}

function GoogleProfileIcon() {
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
      <path d="M12 20a8 8 0 1 1 7.7-10h-7.7v4h4.4a4.5 4.5 0 1 1-4.4-6" />
    </svg>
  );
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

function ReservationIcon() {
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
      <path d="M5 12h14" />
      <path d="M8 7h8" />
      <path d="M7 12v5" />
      <path d="M17 12v5" />
      <path d="M9 17h6" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function AssetsIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 3v18" />
      <path d="M17 3v18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function MarketingIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11h4l9-6v14l-9-6H3v-2z" />
      <path d="M17 8l4-2v10l-4-2" />
    </svg>
  );
}

function CateringIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v12" />
      <path d="M12 2v12" />
      <path d="M16 2v12" />
      <path d="M3 18h18" />
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
