import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
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

function resolveIconUrl(iconUrl: string, appOrigin: string): string {
  if (/^https?:\/\//i.test(iconUrl)) {
    return iconUrl;
  }

  return `${appOrigin}${iconUrl.startsWith("/") ? "" : "/"}${iconUrl}`;
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
    const requestHeaders = headers();
    const host =
      requestHeaders.get("x-forwarded-host") ||
      requestHeaders.get("host") ||
      "";

    if (!host || host.includes("localhost") || host.includes("127.0.0.1")) {
      return baseMetadata;
    }

    const protocol =
      requestHeaders.get("x-forwarded-proto") ||
      (host.includes("localhost") ? "http" : "https");
    const appOrigin = `${protocol}://${host}`;

    const restaurantId = await resolveRestaurantIdByDomain(host);
    if (!restaurantId) {
      return baseMetadata;
    }

    const data = await adminGraphqlRequest<RestaurantIconResponse>(
      GET_RESTAURANT_ICON,
      { restaurant_id: restaurantId },
    );

    const faviconUrl = data.restaurants_by_pk?.favicon_url;
    const logoUrl = data.restaurants_by_pk?.logo;
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
