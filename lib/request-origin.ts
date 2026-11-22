/** Allow same-site browser calls; reject cross-site POSTs that send a foreign Origin. */
export function allowSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const candidates = new Set<string>();
    candidates.add(new URL(request.url).host);
    const hostHeader = request.headers.get("host");
    if (hostHeader) candidates.add(hostHeader);
    const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    if (forwarded) candidates.add(forwarded);
    const site = (process.env.SITE_ORIGIN || "").trim();
    if (site) candidates.add(new URL(site).host);
    return candidates.has(originHost);
  } catch {
    return false;
  }
}
