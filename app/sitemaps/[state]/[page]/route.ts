import { query } from "@/lib/db";
import { padDot } from "@/lib/format";

const PAGE_SIZE = 50000;

export async function GET(_request: Request, context: { params: Promise<{ state: string; page: string }> }) {
  const { state, page } = await context.params;
  const code = state.toUpperCase();
  const pageNumber = Math.max(1, Number(page) || 1);
  const origin = process.env.SITE_ORIGIN ?? "http://localhost:3000";
  const offset = (pageNumber - 1) * PAGE_SIZE;

  const rows = await query<{ dot_number: string }>(
    `SELECT dot_number FROM carriers
     WHERE phy_state = $1
       AND (status_code = 'A' OR authority_status = 'Active')
     ORDER BY dot_number
     LIMIT $2 OFFSET $3`,
    [code, PAGE_SIZE, offset],
  );

  let body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  body += `<url><loc>${origin}/states/${code}</loc></url>\n`;
  for (const row of rows) {
    body += `<url><loc>${origin}/carriers/${padDot(row.dot_number)}</loc></url>\n`;
  }
  body += `</urlset>`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
}
