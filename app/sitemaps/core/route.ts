import { STATIC_PATHS, siteOrigin } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const origin = siteOrigin();
  let body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const path of STATIC_PATHS) {
    body += `<url><loc>${origin}${path === "/" ? "/" : path}</loc></url>\n`;
  }
  body += `</urlset>`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
}
