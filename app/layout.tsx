import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import { JsonLd } from "@/components/JsonLd";
import { Navbar } from "@/components/Navbar";
import { SideRails } from "@/components/SideRails";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_DESCRIPTION, SITE_LEGAL, SITE_NAME, SITE_REPO, siteOrigin } from "@/lib/site";
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

const origin = siteOrigin();

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: {
    default: `${SITE_NAME} · FMCSA carrier directory & dispatcher desk`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Muhammad Afzal Kalwar", url: "https://github.com/mafzalkalwardev" }],
  creator: "Muhammad Afzal Kalwar",
  publisher: SITE_LEGAL,
  keywords: [
    "FMCSA carrier directory",
    "USDOT lookup",
    "MC number search",
    "trucking loads",
    "broker check",
    "dispatcher desk",
    "INDUS Transports",
    "Austin TX carriers",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: origin,
    siteName: SITE_NAME,
    title: `${SITE_NAME} · Carrier lookup and loads`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/indus.jpg",
        width: 1200,
        height: 630,
        alt: "INDUS Transports carrier directory",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · Carrier lookup and loads`,
    description: SITE_DESCRIPTION,
    images: ["/indus.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: { icon: "/indus-mark.jpg", apple: "/indus-mark.jpg" },
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: ["INDUS Carrier Directory", SITE_LEGAL],
  url: origin,
  description: SITE_DESCRIPTION,
  publisher: {
    "@type": "Organization",
    name: SITE_LEGAL,
    url: origin,
    logo: `${origin}/indus-mark.jpg`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Austin",
      addressRegion: "TX",
      addressCountry: "US",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+1-512-761-6399",
      contactType: "customer service",
      areaServed: "US",
      availableLanguage: ["English"],
    },
  },
  potentialAction: {
    "@type": "SearchAction",
    target: `${origin}/?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: origin,
  description: SITE_DESCRIPTION,
  author: {
    "@type": "Person",
    name: "Muhammad Afzal Kalwar",
    url: "https://github.com/mafzalkalwardev",
    sameAs: [
      "https://github.com/mafzalkalwardev",
      "https://www.linkedin.com/in/mafzalkalwardev",
      "https://mafzalkalwardev.github.io",
    ],
  },
  codeRepository: SITE_REPO,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>
        <JsonLd data={[websiteLd, softwareLd]} />
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
