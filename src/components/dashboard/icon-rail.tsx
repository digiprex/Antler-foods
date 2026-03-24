import Link from "next/link";
import type { RestaurantSearchSelection } from "./search-box";

export type DashboardRailTab = "home" | "team" | "website";

interface IconRailProps {
  activeTab: DashboardRailTab;
  dashboardBasePath: string;
  selectedRestaurant: RestaurantSearchSelection | null;
  onSelectWebsiteTab: () => void;
  isSidebarOpen?: boolean;
}

const RAIL_TABS: Array<{
  key: Exclude<DashboardRailTab, "website">;
  label: string;
  href: string;
  icon: JSX.Element;
}> = [
  {
    key: "home",
    label: "Home",
    href: "/new-restaurant",
    icon: <StoreIcon />,
  },
  {
    key: "team",
    label: "Team",
    href: "/team",
    icon: <TeamIcon />,
  },
];

export function IconRail({
  activeTab,
  dashboardBasePath,
  selectedRestaurant,
  onSelectWebsiteTab,
  isSidebarOpen,
}: IconRailProps) {
  const hasWebsiteTab = Boolean(selectedRestaurant);
  const showIcons = !isSidebarOpen; // show icons on the rail only when the main sidebar is collapsed
  const roleSegment = dashboardBasePath.split('/')[2] || 'admin';
  
  // Filter tabs based on role - only show "home" (new-restaurant) tab for admin users
  const filteredTabs = RAIL_TABS.filter(tab => {
    if (tab.key === 'home' && roleSegment !== 'admin') {
      return false;
    }
    return true;
  });

  return (
    <aside className="flex min-h-screen w-16 flex-col items-center border-r border-[#d7e2e6] bg-[#f6f7f7] py-4">
      <div className="flex w-full flex-col gap-2">
        {filteredTabs.map((tab) => {
          const isActive = tab.key === activeTab;
          const href = `${dashboardBasePath}${tab.href}`;

          return (
            <div key={tab.key} className="group relative flex justify-center">
              <Link
                href={href}
                aria-label={tab.label}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl transition ${
                  isActive
                    ? "bg-[#e6f5ec] text-[#5dc67d]"
                    : "text-[#111827] hover:bg-[#edf2f5]"
                }`}
              >
                {showIcons ? tab.icon : <span className="h-2 w-2 rounded-full bg-transparent" />}
              </Link>
              <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-20 -translate-y-1/2 rounded-md bg-[#1f2937] px-2 py-1 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                {tab.label}
              </span>
            </div>
          );
        })}

        {hasWebsiteTab ? (
          <div className="group relative mt-2 flex justify-center">
            <button
              type="button"
              onClick={onSelectWebsiteTab}
              aria-label="Website"
              className={`inline-flex h-12 w-12 items-center justify-center rounded-xl transition ${
                activeTab === "website"
                  ? "bg-[#e6f5ec] text-[#5dc67d]"
                  : "text-[#111827] hover:bg-[#edf2f5]"
              }`}
            >
              {showIcons ? <WebsiteIcon /> : <span className="h-2 w-2 rounded-full bg-transparent" />}
            </button>
            <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-20 -translate-y-1/2 rounded-md bg-[#1f2937] px-2 py-1 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
              Website
            </span>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function StoreIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
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

function TeamIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="7.5" r="3" />
      <circle cx="16.5" cy="9" r="2.5" />
      <path d="M3.5 18a5.5 5.5 0 0 1 11 0" />
      <path d="M14 18a4 4 0 0 1 7.5-1.8" />
    </svg>
  );
}

function WebsiteIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16" />
      <path d="M12 4a12 12 0 0 1 0 16" />
      <path d="M12 4a12 12 0 0 0 0 16" />
    </svg>
  );
}
