"use client";

import { useEffect, useRef } from "react";
import type { PropsWithChildren } from "react";
import { NhostProvider, useAuthenticationStatus } from "@nhost/react";
import { usePathname } from "next/navigation";
import { clearNhostStoredSession, nhost } from "@/lib/nhost";

function NhostSessionRecovery() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const pathname = usePathname();
  const hasClearedRef = useRef(false);

  useEffect(() => {
    if (isLoading || isAuthenticated || hasClearedRef.current) {
      return;
    }

    const isAuthRoute = pathname === "/login" || pathname === "/signup";
    if (!isAuthRoute) {
      return;
    }

    clearNhostStoredSession();
    hasClearedRef.current = true;
  }, [isAuthenticated, isLoading, pathname]);

  useEffect(() => {
    if (isAuthenticated) {
      hasClearedRef.current = false;
    }
  }, [isAuthenticated]);

  return null;
}

export function Providers({ children }: PropsWithChildren) {
  return (
    <NhostProvider nhost={nhost}>
      <NhostSessionRecovery />
      {children}
    </NhostProvider>
  );
}
