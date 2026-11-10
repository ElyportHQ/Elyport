import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "./providers";
import { TopBar } from "@/components/TopBar";
import { SiteFooter } from "@/components/Footer";
import { siteUrl } from "@/lib/config";

// Self-hosted (SIL OFL) so builds never depend on reaching Google Fonts.
const geist = localFont({ src: "./fonts/Geist-latin.woff2", variable: "--font-geist", weight: "300 600", display: "swap" });
const geistMono = localFont({ src: "./fonts/GeistMono-latin.woff2", variable: "--font-geist-mono", weight: "400 500", display: "swap" });
const manrope = localFont({ src: "./fonts/Manrope-800-latin.woff2", variable: "--font-manrope", weight: "800", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Elyport — The port into Elysium", template: "%s · Elyport" },
  description:
    "Refuel gas from any chain, Gas Drop to thousands, and lock or vest tokens on Elysium, the Hyperliquid L2. Independent tool, not affiliated with Kinetiq.",
  openGraph: {
    title: "Elyport — The port into Elysium",
    description: "Refuel, Gas Drop, Locker and Vesting on Elysium.",
    images: ["/og.png"],
  },
  twitter: { card: "summary_large_image", site: "@ElyportHQ", images: ["/og.png"] },
};

export const viewport: Viewport = { themeColor: "#F5F6F8" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${manrope.variable}`}>
      <body>
        <Providers>
          <TopBar />
          <main>{children}</main>
          <SiteFooter />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
