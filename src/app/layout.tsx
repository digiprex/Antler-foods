import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import "./globals.css";
import { Providers } from "./providers";
import ConditionalAnnouncementBar from "../components/conditional-announcement-bar";
import ConditionalNavbar from "../components/conditional-navbar";
import ConditionalFooter from "../components/conditional-footer";
import { generateMetadata as generateSEOMetadata } from "@/lib/seo";
import { adminGraphqlRequest } from "@/lib/server/api-auth";
import { resolveRestaurantIdByDomain } from "@/lib/server/domain-resolver";

interface RestaurantIconResponse {
  restaurants_by_pk: {
    favicon_url: string | null;
    logo: string | null;
  } | null;
}

const GET_RESTAURANT_ICON = `
  query GetRestaurantIcon($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      favicon_url
      logo
    }
  }
`;

const getCachedRestaurantIcon = unstable_cache(
  async (restaurantId: string) => {
    const data = await adminGraphqlRequest<RestaurantIconResponse>(
      GET_RESTAURANT_ICON,
      { restaurant_id: restaurantId },
    );
    return {
      faviconUrl: data.restaurants_by_pk?.favicon_url ?? null,
      logoUrl: data.restaurants_by_pk?.logo ?? null,
    };
  },
  ["restaurant-icon"],
  { revalidate: 300 }, // 5 minutes
);

function resolveIconUrl(rawUrl: string, appOrigin: string): string {
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  const path = rawUrl.startsWith("/")
    ? rawUrl
    : `/api/image-proxy?fileId=${encodeURIComponent(rawUrl)}`;

  return `${appOrigin}${path}`;
}

function isDynamicServerUsageError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    (error as { digest?: string }).digest === 'DYNAMIC_SERVER_USAGE'
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const baseMetadata = generateSEOMetadata();

  try {
    const requestHeaders = await headers();

    // Skip expensive DB lookups for admin/dashboard routes — they define their own metadata
    if (requestHeaders.get("x-admin-route")) {
      return baseMetadata;
    }

    const host =
      requestHeaders.get("x-forwarded-host") ||
      requestHeaders.get("host") ||
      "";

    if (!host) {
      return baseMetadata;
    }

    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
    const protocol =
      requestHeaders.get("x-forwarded-proto") ||
      (isLocal ? "http" : "https");
    const appOrigin = `${protocol}://${host}`;

    const restaurantId = await resolveRestaurantIdByDomain(host);
    if (!restaurantId) {
      return baseMetadata;
    }

    const { faviconUrl, logoUrl } = await getCachedRestaurantIcon(restaurantId);
    const iconCandidate = faviconUrl || logoUrl;

    if (!iconCandidate) {
      return baseMetadata;
    }

    const iconUrl = resolveIconUrl(iconCandidate, appOrigin);

    return {
      ...baseMetadata,
      metadataBase: new URL(appOrigin),
      icons: {
        icon: iconUrl,
        shortcut: iconUrl,
        apple: iconUrl,
      },
    };
  } catch (error) {
    if (!isDynamicServerUsageError(error)) {
      console.error("Error generating dynamic favicon metadata:", error);
    }
    return baseMetadata;
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <ConditionalAnnouncementBar />
          <ConditionalNavbar />
          {children}
          <ConditionalFooter />
        </Providers>
      </body>
    </html>
  );
}
