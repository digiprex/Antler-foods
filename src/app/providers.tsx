"use client";

import type { PropsWithChildren } from "react";
import { NhostProvider } from "@nhost/react";
import { nhost } from "@/lib/nhost";

export function Providers({ children }: PropsWithChildren) {
  return (
    <NhostProvider nhost={nhost}>
      {children}
    </NhostProvider>
  );
}
