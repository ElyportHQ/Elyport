import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { TopBar } from "@/components/TopBar";
import { SiteFooter } from "@/components/Footer";
import { siteUrl } from "@/lib/config";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", weight: ["300", "400", "500", "600"] });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", weight: ["400", "500"] });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", weight: ["800"] });

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
      </body>
    </html>
  );
}
