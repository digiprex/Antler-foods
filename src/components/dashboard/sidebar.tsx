import { NavItem } from "./nav-item";
import { SearchBox } from "./search-box";
import type { DashboardRailTab } from "./icon-rail";

interface SidebarProps {
  activeTab: DashboardRailTab;
  pathname: string;
  dashboardBasePath: string;
}

const HOME_MENU_ITEMS = [
  { href: "/home", label: "Home", icon: <HomeIcon /> },
  { href: "/customer-base", label: "Customer Base", icon: <UsersIcon /> },
  { href: "/new-restaurant", label: "New restaurant", icon: <StoreIcon /> },
  { href: "/restaurants", label: "Restaurants", icon: <ShopIcon /> },
  { href: "/sales", label: "Sales", icon: <SalesIcon /> },
  { href: "/reports", label: "Reports", icon: <ReportsIcon /> },
] as const;

export function Sidebar({ activeTab, pathname, dashboardBasePath }: SidebarProps) {
  const isHomeTab = activeTab === "home";

  return (
    <aside className="min-h-screen w-[330px] border-r border-[#d7e2e6] bg-[#f8fafb]">
      <SearchBox />
      <div className="border-b border-[#d7e2e6] px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[24px] font-semibold text-[#101827]">
            {isHomeTab ? "Home" : activeTab === "reservations" ? "Reservations" : "Team"}
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
      ) : (
        <div className="px-5 py-6 text-sm text-[#637280]">
          {activeTab === "reservations"
            ? "Reservations workspace placeholder."
            : "Team workspace placeholder."}
        </div>
      )}
    </aside>
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
