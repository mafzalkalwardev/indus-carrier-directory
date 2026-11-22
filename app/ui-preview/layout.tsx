import type { Metadata } from "next";
import { Bebas_Neue, DM_Sans } from "next/font/google";
import { PreviewBanner } from "@/components/ui-preview/PreviewBanner";
import { PreviewFooter } from "@/components/ui-preview/PreviewFooter";
import { PreviewNav } from "@/components/ui-preview/PreviewNav";
import "./ui-preview.css";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-uip-display",
  display: "swap",
});

const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-uip-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "UI Preview · INDUS",
  robots: { index: false, follow: false },
};

export default function UiPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`ui-preview ${display.variable} ${sans.variable}`}>
      <PreviewBanner />
      <PreviewNav />
      <div className="uip-main">{children}</div>
      <PreviewFooter />
    </div>
  );
}
