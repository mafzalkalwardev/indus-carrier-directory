/** Allow same-site browser calls; reject cross-site POSTs that send a foreign Origin. */
export function allowSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const requestHost = new URL(request.url).host;
    const originHost = new URL(origin).host;
    return requestHost === originHost;
  } catch {
    return false;
  }
}
