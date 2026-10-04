import { query } from "@/lib/db";

const PAGE_SIZE = 50000;

export async function GET() {
  const origin = process.env.SITE_ORIGIN ?? "http://localhost:3000";
  let body = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  try {
    const states = await query<{ phy_state: string; count: string }>(
      `SELECT phy_state, count(*)::text AS count
       FROM carriers
       WHERE phy_state ~ '^[A-Za-z]{2}$'
         AND (status_code = 'A' OR authority_status = 'Active')
       GROUP BY phy_state
       ORDER BY phy_state`,
    );
    for (const state of states) {
      const pages = Math.max(1, Math.ceil(Number(state.count) / PAGE_SIZE));
      for (let page = 1; page <= pages; page += 1) {
        body += `<sitemap><loc>${origin}/sitemaps/${state.phy_state.toUpperCase()}/${page}</loc></sitemap>\n`;
      }
    }
  } catch {
    body += `<sitemap><loc>${origin}/</loc></sitemap>\n`;
  }
  body += `</sitemapindex>`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
}
