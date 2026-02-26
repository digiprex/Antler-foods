import { NavItem } from './nav-item';
import { SearchBox, type RestaurantSearchSelection } from './search-box';
import type { DashboardRailTab } from './icon-rail';
import {
  buildRestaurantInformationPath,
  buildRestaurantMediaPath,
} from '@/lib/restaurants/route-utils';

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
  const isWebsiteTab = activeTab === 'website';
  const hasRestaurantSelection = Boolean(selectedRestaurant);
  const roleSegment = dashboardBasePath.split('/')[2] || 'admin';

  // Static grouped menu structure matching requested layout
  const HOME_MENU_ITEMS = [
    { href: '/home', label: 'Home', icon: <HomeIcon /> },
    { href: '/new-restaurant', label: 'New Restaurant', icon: <StoreIcon /> },
    { href: '/restaurants', label: 'Restaurants', icon: <ShopIcon /> },
  ];

  const RESTAURANT_MENU_ITEMS = selectedRestaurant
    ? (() => {
      const informationBrandPath = buildRestaurantInformationPath(
        roleSegment,
        selectedRestaurant,
        'brand',
      );
      const informationBasePath = informationBrandPath.replace(/brand$/, '');
      const mediaPath = buildRestaurantMediaPath(roleSegment, selectedRestaurant);

      return [
        {
          href: buildRestaurantScopedHref(
            `${dashboardBasePath}/sales`,
            selectedRestaurant,
          ),
          label: 'Sales',
          icon: <SalesIcon />,
        },
        {
          href: buildRestaurantScopedHref(
            `${dashboardBasePath}/menu`,
            selectedRestaurant,
          ),
          label: 'Manage Menu',
          icon: <MenuIcon />,
        },
        {
          href: informationBrandPath,
          label: 'Information',
          icon: <InfoIcon />,
          matchPrefixes: [informationBasePath],
        },
        {
          href: mediaPath,
          label: 'Media',
          icon: <MediaIcon />,
          matchPrefixes: [mediaPath, `${mediaPath}/`],
        },
        {
          href: buildRestaurantScopedHref(
            `${dashboardBasePath}/reviews`,
            selectedRestaurant,
          ),
          label: 'Reviews',
          icon: <UsersIcon />,
        },
        {
          href: buildRestaurantScopedHref(
            `${dashboardBasePath}/assets`,
            selectedRestaurant,
          ),
          label: 'Assets',
          icon: <AssetsIcon />,
        },
      ];
    })()
    : [];

  const WEBSITE_MENU_ITEMS = selectedRestaurant
    ? [
      {
        href: buildRestaurantScopedHref(
          `${websiteBasePath}/pages-settings`,
          selectedRestaurant,
        ),
        label: 'Pages',
        icon: <PagesIcon />,
      },
      {
        href: buildRestaurantScopedHref(`/admin/forms`, selectedRestaurant),
        label: 'Forms',
        icon: <FormsIcon />,
      },
      {
        href: buildRestaurantScopedHref(`${websiteBasePath}/navbar-settings`, selectedRestaurant),
        label: 'Navbar Settings',
        icon: <NavbarIcon />,
      },
      {
        href: buildRestaurantScopedHref(`/admin/announcement-bar-settings`, selectedRestaurant),
        label: 'Announcement Bar',
        icon: <AnnouncementBarIcon />,
      },
      {
        href: buildRestaurantScopedHref(`${websiteBasePath}/footer-settings`, selectedRestaurant),
        label: 'Footer Settings',
        icon: <FooterIcon />,
      },
      {
        href: buildRestaurantScopedHref(`${websiteBasePath}/popup-settings`, selectedRestaurant),
        label: 'Popup Settings',
        icon: <PopupIcon />,
      },
    ]
    : [];

  const MARKETING_MENU_ITEMS = selectedRestaurant
    ? [
      {
        href: buildRestaurantScopedHref(
          `${dashboardBasePath}/marketing`,
          selectedRestaurant,
        ),
        label: 'Marketing',
        icon: <MarketingIcon />,
      },
    ]
    : [];

  const RESERVATION_MENU_ITEMS = selectedRestaurant
    ? [
      {
        href: buildRestaurantScopedHref(
          `${dashboardBasePath}/reservations`,
          selectedRestaurant,
        ),
        label: 'Reservation',
        icon: <ReservationIcon />,
      },
    ]
    : [];

  const CATERING_MENU_ITEMS = selectedRestaurant
    ? [
      {
        href: buildRestaurantScopedHref(
          `${dashboardBasePath}/catering`,
          selectedRestaurant,
        ),
        label: 'Catering',
        icon: <CateringIcon />,
      },
    ]
    : [];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen border-r border-[#d7e2e6] bg-[#f8fafb] transition-all duration-200 ease-in-out overflow-y-auto ${
        isOpen ? 'w-[330px]' : 'w-16'
        }`}
    >
      <SearchBox
        selectedRestaurant={selectedRestaurant}
        onRestaurantSelect={onRestaurantSelect}
      />
      <div className="border-b border-[#d7e2e6] px-4 py-3">
        <div className="flex items-center justify-between">
          {isOpen ? (
            <h2 className="text-lg font-semibold text-[#101827]">Menu</h2>
          ) : (
            <div className="h-5" />
          )}
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#cdd8de] bg-[#f1f4f6] text-[#a6b2bb]"
          >
            <EyeIcon />
          </button>
        </div>
      </div>

      <div className="space-y-3 px-3 py-3">
        {/* Home Section */}
        <div>
          {isOpen && (
            <p className="text-xs font-medium uppercase tracking-wide text-[#7c8a96] mb-1.5">Home</p>
          )}
          <nav className="space-y-1">
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
        {hasRestaurantSelection ? (
          <div>
            {isOpen && (
              <p className="text-xs font-medium uppercase tracking-wide text-[#7c8a96] mb-1.5">Restaurant</p>
            )}
            <nav className="space-y-1">
              {RESTAURANT_MENU_ITEMS.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isSidebarItemActive(pathname, item)}
                  collapsed={!isOpen}
                />
              ))}
            </nav>
          </div>
        ) : null}

        {/* Website Section */}
        {hasRestaurantSelection ? (
          <div>
            {isOpen && (
              <p
                className={`mb-1.5 text-xs font-medium uppercase tracking-wide ${
                  isWebsiteTab ? 'text-[#5dc67d]' : 'text-[#7c8a96]'
                  }`}
              >
                Website
              </p>
            )}
            <nav className="space-y-1">
              {WEBSITE_MENU_ITEMS.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isSidebarItemActive(pathname, item)}
                  collapsed={!isOpen}
                />
              ))}
            </nav>
          </div>
        ) : null}

        {/* Marketing / Reservation / Catering */}
        {hasRestaurantSelection ? (
          <div>
            {isOpen && (
              <p className="text-xs font-medium uppercase tracking-wide text-[#7c8a96] mb-1.5">Marketing</p>
            )}
            <nav className="space-y-1">
              {MARKETING_MENU_ITEMS.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isSidebarItemActive(pathname, item)}
                  collapsed={!isOpen}
                />
              ))}
            </nav>
          </div>
        ) : null}

        {hasRestaurantSelection ? (
          <div>
            {isOpen && (
              <p className="text-xs font-medium uppercase tracking-wide text-[#7c8a96] mb-1.5">Reservation</p>
            )}
            <nav className="space-y-1">
              {RESERVATION_MENU_ITEMS.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isSidebarItemActive(pathname, item)}
                  collapsed={!isOpen}
                />
              ))}
            </nav>
          </div>
        ) : null}

        {hasRestaurantSelection ? (
          <div>
            {isOpen && (
              <p className="text-xs font-medium uppercase tracking-wide text-[#7c8a96] mb-1.5">Catering</p>
            )}
            <nav className="space-y-1">
              {CATERING_MENU_ITEMS.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isSidebarItemActive(pathname, item)}
                  collapsed={!isOpen}
                />
              ))}
            </nav>
          </div>
        ) : null}

        {!hasRestaurantSelection && isOpen ? (
          <div className="rounded-xl border border-[#d7e2e6] bg-white px-4 py-3 text-sm text-[#60707c]">
            Select a restaurant from the search bar to manage restaurant settings.
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function buildRestaurantScopedHref(
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

function isSidebarItemActive(
  pathname: string,
  item: { href: string; matchPrefixes?: string[] },
) {
  const itemPath = extractPathFromHref(item.href);
  if (pathname === itemPath) {
    return true;
  }

  return (
    item.matchPrefixes?.some((prefix) =>
      pathname.startsWith(extractPathFromHref(prefix)),
    ) ?? false
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

function MediaIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m21 16-5-5-6 6" />
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

function PopupIcon() {
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
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 9h6v6H9z" />
      <path d="M16 8l3-3" />
      <path d="M19 8h-3V5" />
    </svg>
  );
}

function AnnouncementBarIcon() {
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
      <path d="M3 6h18" />
      <path d="M3 10h18" />
      <path d="M7 14h10" />
      <path d="M9 18h6" />
    </svg>
  );
}

function FormsIcon() {
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
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 7h10" />
      <path d="M7 11h10" />
      <path d="M7 15h6" />
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

