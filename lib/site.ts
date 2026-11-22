/** Public site origin for canonicals, sitemap, and JSON-LD. */
export function siteOrigin() {
  const raw = (process.env.SITE_ORIGIN ?? "https://carriers.induswebagency.com").trim().replace(/\/+$/, "");
  return raw || "https://carriers.induswebagency.com";
}

export const SITE_NAME = "INDUS Transports";
export const SITE_LEGAL = "INDUS Transports LLC";

export const SITE_DESCRIPTION =
  "INDUS Transports is an FMCSA carrier directory and dispatcher desk for USDOT and MC lookup, load search, broker checks, and trucking setup from Austin, TX.";

export const SITE_TAGLINE =
  "Check a carrier before the truck rolls — searchable public FMCSA records, live load search, and desk tools for carriers, brokers, and shippers.";

export const SITE_REPO = "https://github.com/mafzalkalwardev/indus-carrier-directory";

export const STATIC_PATHS = [
  "/",
  "/loads",
  "/brokers",
  "/desk",
  "/faq",
  "/lanes",
  "/states",
  "/services",
  "/download",
  "/new/registered",
  "/new/activated",
  "/loads/post",
] as const;
