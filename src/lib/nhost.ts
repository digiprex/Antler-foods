import { NhostClient } from "@nhost/nextjs";

const backendUrl = process.env.NEXT_PUBLIC_NHOST_BACKEND_URL?.trim();
const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN?.trim();
const region = process.env.NEXT_PUBLIC_NHOST_REGION?.trim();
const NHOST_REFRESH_TOKEN_KEY = "nhostRefreshToken";
const NHOST_REFRESH_TOKEN_ID_KEY = "nhostRefreshTokenId";
const NHOST_ACCESS_TOKEN_EXPIRY_KEY = "nhostRefreshTokenExpiresAt";
const NHOST_BACKEND_FINGERPRINT_KEY = "nhostAuthBackendFingerprint";
const NHOST_SESSION_COOKIE_KEY = "nhostSession";

function isBrowser() {
  return typeof window !== "undefined";
}

const normalizeBackendUrl = (url: string) => {
  const cleanUrl = url.replace(/\/+$/, "");
  return cleanUrl.endsWith("/v1") ? cleanUrl.slice(0, -3) : cleanUrl;
};

function getAuthBackendFingerprint() {
  if (backendUrl) {
    return normalizeBackendUrl(backendUrl);
  }

  if (subdomain && region) {
    return `${subdomain}.${region}`;
  }

  return null;
}

export function clearNhostStoredSession() {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem(NHOST_REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(NHOST_REFRESH_TOKEN_ID_KEY);
    window.localStorage.removeItem(NHOST_ACCESS_TOKEN_EXPIRY_KEY);
  } catch {
    // Ignore storage access errors in restricted environments.
  }

  // @nhost/nextjs uses cookie storage in browser. Clear those keys too.
  [NHOST_REFRESH_TOKEN_KEY, NHOST_REFRESH_TOKEN_ID_KEY, NHOST_ACCESS_TOKEN_EXPIRY_KEY, NHOST_SESSION_COOKIE_KEY].forEach(
    (cookieKey) => {
      document.cookie = `${cookieKey}=; Max-Age=0; path=/; SameSite=Strict`;
      document.cookie = `${cookieKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`;
    },
  );
}

function reconcileNhostSessionWithCurrentBackend() {
  if (!isBrowser()) {
    return;
  }

  const fingerprint = getAuthBackendFingerprint();
  if (!fingerprint) {
    return;
  }

  try {
    const previousFingerprint = window.localStorage.getItem(NHOST_BACKEND_FINGERPRINT_KEY);
    if (previousFingerprint && previousFingerprint !== fingerprint) {
      clearNhostStoredSession();
    }

    window.localStorage.setItem(NHOST_BACKEND_FINGERPRINT_KEY, fingerprint);
  } catch {
    // Ignore storage access errors in restricted environments.
  }
}

const createServiceUrls = (url: string) => {
  const baseUrl = normalizeBackendUrl(url);

  return {
    authUrl: `${baseUrl}/v1/auth`,
    graphqlUrl: `${baseUrl}/v1/graphql`,
    storageUrl: `${baseUrl}/v1/storage`,
    functionsUrl: `${baseUrl}/v1/functions`,
  };
};

export const isNhostConfigured = Boolean(backendUrl || (subdomain && region));

if (!isNhostConfigured && process.env.NODE_ENV !== "production") {
  // This keeps local development from crashing before env vars are wired.
  console.warn(
    "Nhost env vars missing. Add NEXT_PUBLIC_NHOST_SUBDOMAIN and NEXT_PUBLIC_NHOST_REGION in .env.local, then restart dev server.",
  );
}

reconcileNhostSessionWithCurrentBackend();

export const nhost = new NhostClient(
  backendUrl
    ? createServiceUrls(backendUrl)
    : {
        subdomain: subdomain ?? "local",
        region: region,
      },
);
