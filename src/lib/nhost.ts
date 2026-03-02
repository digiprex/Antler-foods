import { NhostClient } from "@nhost/react";

const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN?.trim();
const region = process.env.NEXT_PUBLIC_NHOST_REGION?.trim();
const authStoragePrefix =
  process.env.NEXT_PUBLIC_AUTH_STORAGE_PREFIX?.trim() || "antler-foods";
const authTabSessionKey = `${authStoragePrefix}:tab-session-id`;
const authLegacyCleanupKey = `${authStoragePrefix}:auth-legacy-cleaned`;

export const isNhostConfigured = Boolean(subdomain && region);

if (!isNhostConfigured && process.env.NODE_ENV !== "production") {
  console.warn(
    "Missing NEXT_PUBLIC_NHOST_SUBDOMAIN / NEXT_PUBLIC_NHOST_REGION. Check .env.local and restart dev server.",
  );
}

function getStorageKey(key: string) {
  return `${authStoragePrefix}:${getTabSessionId()}:${key}`;
}

function getTabSessionId() {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = window.sessionStorage.getItem(authTabSessionKey);
  if (existing?.trim()) {
    return existing;
  }

  const generated = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  window.sessionStorage.setItem(authTabSessionKey, generated);
  return generated;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; path=/; samesite=lax`;
}

function cleanupLegacyAuthStorage() {
  if (typeof window === "undefined") {
    return;
  }

  if (window.sessionStorage.getItem(authLegacyCleanupKey) === "1") {
    return;
  }

  const localKeysToDelete: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key) {
      continue;
    }

    if (
      key === "nhostRefreshToken" ||
      key === "nhostRefreshTokenId" ||
      key === "nhostRefreshTokenExpiresAt" ||
      key === "nhostSession" ||
      (key.startsWith(`${authStoragePrefix}:`) && key.includes("nhostRefreshToken"))
    ) {
      localKeysToDelete.push(key);
    }
  }

  for (const key of localKeysToDelete) {
    window.localStorage.removeItem(key);
  }

  clearCookie("nhostRefreshToken");
  clearCookie("nhostRefreshTokenId");
  clearCookie("nhostRefreshTokenExpiresAt");
  clearCookie("nhostSession");

  window.sessionStorage.setItem(authLegacyCleanupKey, "1");
}

const nhostClientConfig = {
  subdomain: subdomain ?? "local",
  region: region ?? "us-east-1",
  autoSignIn: true,
  autoRefreshToken: true,
  // Keep auth isolated per tab to avoid stale-tab refresh-token invalidation
  // from logging out the active tab.
  broadcastKey: `${authStoragePrefix}:${subdomain ?? "local"}:${region ?? "us-east-1"}:${getTabSessionId()}`,
  clientStorageType: "custom" as const,
  clientStorage: {
    getItem: (key: string) => {
      if (typeof window === "undefined") {
        return null;
      }
      return window.sessionStorage.getItem(getStorageKey(key));
    },
    setItem: (key: string, value: string) => {
      if (typeof window === "undefined") {
        return;
      }
      window.sessionStorage.setItem(getStorageKey(key), value);
    },
    removeItem: (key: string) => {
      if (typeof window === "undefined") {
        return;
      }
      window.sessionStorage.removeItem(getStorageKey(key));
    },
  },
};

type NhostGlobal = typeof globalThis & {
  __ANTLER_NHOST_CLIENT__?: NhostClient;
};

const globalStore = globalThis as NhostGlobal;

if (typeof window !== "undefined") {
  cleanupLegacyAuthStorage();
}

export const nhost =
  globalStore.__ANTLER_NHOST_CLIENT__ ??
  new NhostClient(nhostClientConfig);

if (typeof window !== "undefined") {
  globalStore.__ANTLER_NHOST_CLIENT__ = nhost;
}
