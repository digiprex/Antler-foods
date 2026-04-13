"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface UserMenuProps {
  userLabel: string;
  onLogout: () => Promise<void> | void;
  isLoggingOut: boolean;
}

export function UserMenu({ userLabel, onLogout, isLoggingOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname() ?? "";
  const roleSegment = pathname.split("/").find((seg) => seg === "admin" || seg === "manager" || seg === "owner") || "admin";

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2 transition-all hover:border-purple-300 hover:bg-purple-50"
        onClick={() => setOpen((value) => !value)}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-sm font-semibold text-white">
          {userLabel.charAt(0).toUpperCase()}
        </div>
        <span className="max-w-[180px] truncate text-sm font-medium text-gray-900">{userLabel}</span>
        <ChevronDownIcon />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 min-w-[200px] rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Account</p>
            <p className="mt-1 text-sm font-medium text-gray-900 truncate">{userLabel}</p>
          </div>
          <div className="p-2">
            <Link
              href={`/dashboard/${roleSegment}/profile`}
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-all hover:bg-purple-50 hover:text-purple-600"
            >
              <UserIcon />
              Profile
            </Link>
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                await onLogout();
              }}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-all hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogoutIcon />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 text-gray-500"
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

function UserIcon() {
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
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LogoutIcon() {
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
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
