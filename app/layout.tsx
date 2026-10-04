import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { SideRails } from "@/components/SideRails";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "INDUS Transports",
    template: "%s · INDUS",
  },
  description: "INDUS Transports. Carrier lookup, loads, dispatch, company and MC setup, truck leases, trailer rental, and a $6 fuel card.",
  icons: { icon: "/indus-mark.jpg", apple: "/indus-mark.jpg" },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
