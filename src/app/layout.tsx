import type { Metadata } from "next";
import { Charmonman, Chonburi, Sarabun } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import { CartProvider } from "@/context/CartContext";
import { TicketAvailabilityProvider } from "@/context/TicketAvailabilityContext";
import { TicketCatalogProvider } from "@/context/TicketCatalogContext";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Display Thai font for the brand wordmark — bold Thai-signage style, with
// correct vowel/tone-mark shaping (unlike the ฉลุ font tried earlier, which
// lacked proper Thai GPOS mark-positioning and rendered illegibly).
const thaiDisplay = Chonburi({
  variable: "--font-thai-display",
  subsets: ["thai"],
  weight: "400",
});

// Ornate flowing Thai script — free-for-commercial Google Font, used as a
// decorative accent (e.g. the tagline under the brand wordmark).
const thaiScript = Charmonman({
  variable: "--font-thai-script",
  subsets: ["thai"],
  weight: ["400", "700"],
});

// Site-wide default — every page inherits this unless it sets its own
// openGraph/twitter block. Matters most for brand recall with zero ad
// budget: when a result link gets shared in a LINE group or on Facebook,
// this is the preview card people actually see, logo and all, whether or
// not they ever click through.
const DEFAULT_OG_IMAGE = { url: "/logo.png", width: 750, height: 260, alt: "เจเคลอตเตอรี่ (JK Lottery)" };

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "เจเคลอตเตอรี่ออนไลน์ | ตรวจผลรางวัลสลากกินแบ่งรัฐบาล",
  description:
    "ตรวจผลรางวัลสลากกินแบ่งรัฐบาลง่าย รวดเร็ว แม่นยำ อัปเดตทุกงวด",
  openGraph: {
    siteName: "เจเคลอตเตอรี่",
    locale: "th_TH",
    type: "website",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${sarabun.variable} ${thaiDisplay.variable} ${thaiScript.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SessionProvider>
          <TicketCatalogProvider>
            <TicketAvailabilityProvider>
              <CartProvider>
                <Header />
                <main className="flex flex-1 flex-col pb-16 md:pb-0">{children}</main>
                <Footer />
                <BottomNav />
              </CartProvider>
            </TicketAvailabilityProvider>
          </TicketCatalogProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
