import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import ConditionalNavbar from "../components/conditional-navbar";
import ConditionalFooter from "../components/conditional-footer";

export const metadata: Metadata = {
  title: "Antler Foods Dashboard",
  description: "Antler Foods auth and dashboard foundation with Nhost.",
};

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
          <ConditionalNavbar />
          {children}
          <ConditionalFooter />
        </Providers>
      </body>
    </html>
  );
}
