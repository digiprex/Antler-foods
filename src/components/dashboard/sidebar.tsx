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

  // Add style to hide scrollbar globally
  if (typeof document !== 'undefined') {
    const styleId = 'sidebar-scrollbar-hide';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Static grouped menu structure matching requested layout
  const HOME_MENU_ITEMS = [
    { href: '/home', label: 'Home', icon: <HomeIcon /> },
    ...(roleSegment === 'admin' ? [{ href: '/new-restaurant', label: 'New Restaurant', icon: <StoreIcon /> }] : []),
    { href: '/restaurants', label: 'Restaurants', icon: <ShopIcon /> },
  ];

  const hasRestaurantDomain = selectedRestaurant &&
    (Boolean(selectedRestaurant.customDomain?.trim()) || Boolean(selectedRestaurant.stagingDomain?.trim()));

  const RESTAURANT_MENU_ITEMS = selectedRestaurant
    ? (() => {
        const informationBrandPath = buildRestaurantInformationPath(
          roleSegment,
          selectedRestaurant,
          'brand',
        );
        const informationBasePath = informationBrandPath.replace(/brand$/, '');
        const mediaPath = buildRestaurantMediaPath(
          roleSegment,
          selectedRestaurant,
        );

        const items = [
          {
            href: buildRestaurantScopedHref(
              `${dashboardBasePath}/sales`,
              selectedRestaurant,
            ),
            label: 'Sales',
            icon: <SalesIcon />,
            requiresDomain: true,
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
        ];

        return items; // Show all items regardless of domain requirements
      })()
    : [];

  const MENU_MANAGEMENT_ITEMS = selectedRestaurant
    ? [
        {
          href: buildRestaurantScopedHref(
            `/admin/menu-management`,
            selectedRestaurant,
          ),
          label: 'Menu Management',
          icon: <MenuManagementIcon />,
        },
        {
          href: buildRestaurantScopedHref(
            `/admin/modifier-groups`,
            selectedRestaurant,
          ),
          label: 'Modifiers',
          icon: <ModifierGroupsIcon />,
        },
      ]
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
          href: buildRestaurantScopedHref(
            `${websiteBasePath}/navbar-settings`,
            selectedRestaurant,
          ),
          label: 'Navbar Settings',
          icon: <NavbarIcon />,
        },
        {
          href: buildRestaurantScopedHref(
            `/admin/global-style-settings`,
            selectedRestaurant,
          ),
          label: 'Global Style',
          icon: <GlobalStyleIcon />,
        },
        {
          href: buildRestaurantScopedHref(
            `/admin/announcement-bar-settings`,
            selectedRestaurant,
          ),
          label: 'Announcement Bar',
          icon: <AnnouncementBarIcon />,
        },
        {
          href: buildRestaurantScopedHref(
            `${websiteBasePath}/footer-settings`,
            selectedRestaurant,
          ),
          label: 'Footer Settings',
          icon: <FooterIcon />,
        },
        {
          href: buildRestaurantScopedHref(
            `${websiteBasePath}/popup-settings`,
            selectedRestaurant,
          ),
          label: 'Popup Settings',
          icon: <PopupIcon />,
        },
        {
          href: buildRestaurantScopedHref(
            `/admin/domain-settings`,
            selectedRestaurant,
          ),
          label: 'Domain Settings',
          icon: <DomainIcon />,
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
        {
          href: buildRestaurantScopedHref(`/admin/newsletter-submissions`, selectedRestaurant),
          label: 'Newsletter Subscribers',
          icon: <NewsletterIcon />,
        },
        {
          href: buildRestaurantScopedHref(`/admin/form-submissions`, selectedRestaurant),
          label: 'Form Submissions',
          icon: <FormSubmissionsIcon />,
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
      className={`fixed left-0 top-0 h-screen border-r border-gray-200 bg-white shadow-sm transition-all duration-200 ease-in-out overflow-y-auto overflow-x-hidden scrollbar-hide ${
        isOpen ? 'w-[260px]' : 'w-20'
      }`}
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {isOpen && (
        <>
          <SearchBox
            selectedRestaurant={selectedRestaurant}
            onRestaurantSelect={onRestaurantSelect}
          />
          <div className="border-b border-gray-200 px-4 py-4">
            <h2 className="text-lg font-bold text-gray-900">Menu</h2>
          </div>
        </>
      )}

      <div className="space-y-4 px-3 py-4">
        {/* Home Section */}
        <div>
          {isOpen && (
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Home
            </p>
          )}
          <nav className="space-y-0.5">
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
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Restaurant
              </p>
            )}
            <nav className="space-y-0.5">
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

        {/* Menu Section */}
        {hasRestaurantSelection && MENU_MANAGEMENT_ITEMS.length > 0 ? (
          <div>
            {isOpen && (
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Menu
              </p>
            )}
            <nav className="space-y-0.5">
              {MENU_MANAGEMENT_ITEMS.map((item) => (
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
        {hasRestaurantSelection && WEBSITE_MENU_ITEMS.length > 0 ? (
          <div>
            {isOpen && (
              <p
                className={`mb-2 px-2 text-xs font-semibold uppercase tracking-wider ${
                  isWebsiteTab ? 'text-purple-600' : 'text-gray-500'
                }`}
              >
                Website
              </p>
            )}
            <nav className="space-y-0.5">
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
        {hasRestaurantSelection && MARKETING_MENU_ITEMS.length > 0 ? (
          <div>
            {isOpen && (
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Marketing
              </p>
            )}
            <nav className="space-y-0.5">
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

        {hasRestaurantSelection && RESERVATION_MENU_ITEMS.length > 0 ? (
          <div>
            {isOpen && (
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Reservation
              </p>
            )}
            <nav className="space-y-0.5">
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

        {hasRestaurantSelection && CATERING_MENU_ITEMS.length > 0 ? (
          <div>
            {isOpen && (
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Catering
              </p>
            )}
            <nav className="space-y-0.5">
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
          <div className="mx-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Select a restaurant from the search bar to manage restaurant
            settings.
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
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

function InfoIcon() {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function MediaIcon() {
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
      <path d="M3 11h4l9-6v14l-9-6H3v-2z" />
      <path d="M17 8l4-2v10l-4-2" />
    </svg>
  );
}

function CateringIcon() {
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

function FormSubmissionsIcon() {
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
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  );
}

function GlobalStyleIcon() {
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
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
    </svg>
  );
}

function DomainIcon() {
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
      <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function NewsletterIcon() {
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
      <path d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
    </svg>
  );
}

function MenuManagementIcon() {
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
      <path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      <path d="M10 12h4" />
      <path d="M10 16h4" />
    </svg>
  );
}

function ModifierGroupsIcon() {
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
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      <path d="M8 12h8" />
      <path d="M10 16h4" />
    </svg>
  );
}
