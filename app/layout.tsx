import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { SideRails } from "@/components/SideRails";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";
import "./globals-tokens.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "INDUS Transports",
    template: "%s · INDUS",
  },
  description: "INDUS Transports. Carrier lookup, loads, dispatch, company and MC setup, truck leases, trailer rental, and a $6 fuel card.",
  icons: { icon: "/indus-mark.jpg", apple: "/indus-mark.jpg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>
        <Navbar />
        <SideRails />
        <div className="shell">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
