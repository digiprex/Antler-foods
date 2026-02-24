import { UserMenu } from './user-menu';

interface TopbarProps {
  userLabel: string;
  onLogout: () => Promise<void>;
  isLoggingOut: boolean;
  onToggleSidebar: () => void;
}

export function Topbar({
  userLabel,
  onLogout,
  isLoggingOut,
  onToggleSidebar,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[#d8e3e7] bg-white px-5 md:px-8">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#d4dfe4] bg-[#f6f8f9] text-[#111827] transition hover:bg-[#eef3f5]"
      >
        <HamburgerIcon />
      </button>

      <div className="flex items-center gap-2">
        <UserMenu
          userLabel={userLabel}
          onLogout={onLogout}
          isLoggingOut={isLoggingOut}
        />
      </div>
    </header>
  );
}

function HamburgerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}
