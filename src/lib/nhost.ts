import { NhostClient } from "@nhost/nextjs";

const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN?.trim();
const region = process.env.NEXT_PUBLIC_NHOST_REGION?.trim();

export const isNhostConfigured = Boolean(subdomain && region);

if (!isNhostConfigured && process.env.NODE_ENV !== "production") {
  console.warn(
    "Missing NEXT_PUBLIC_NHOST_SUBDOMAIN / NEXT_PUBLIC_NHOST_REGION. Check .env.local and restart dev server.",
  );
}

export const nhost = new NhostClient({
  subdomain: subdomain ?? "local",
  region: region ?? "us-east-1",
});