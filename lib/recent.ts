import { query } from "@/lib/db";
import { defaultRange, type DateRange } from "@/lib/search";

export type RecentCarrier = {
  dot_number: string;
  legal_name: string | null;
  phy_city: string | null;
  phy_state: string | null;
  authority_status: string | null;
  status_code: string | null;
  trust_grade: string | null;
  trust_score: number | null;
  docket_number: string | null;
  event_date: string;
  event_label: string;
};

const LIST = `
  dot_number, legal_name, phy_city, phy_state, authority_status, status_code,
  trust_grade, trust_score, docket_number, event_date::text, event_label
`;

function recentSql(kind: "registered" | "activated") {
  const rule = kind === "registered"
    ? `h.op_auth_status ILIKE 'pending' AND (h.reason ILIKE 'initial status' OR h.reason ILIKE 'published to fmcsa register')`
    : `h.op_auth_status ILIKE 'active' AND (h.reason ILIKE 'granted' OR h.reason ILIKE 'reinstat%')`;
  const label = kind === "registered"
    ? `CASE WHEN h.reason ILIKE 'published%' THEN 'Published' ELSE 'Registered' END`
    : `CASE WHEN h.reason ILIKE 'reinstat%' THEN 'Reinstated' ELSE 'Activated' END`;
  return `
    SELECT DISTINCT ON (h.dot_number)
      c.dot_number, c.legal_name, c.phy_city, c.phy_state, c.authority_status, c.status_code,
      c.trust_grade, c.trust_score, h.docket_number, h.status_change_date AS event_date,
      ${label} AS event_label
    FROM authority_history h
    JOIN carriers c ON c.dot_number = h.dot_number
    WHERE h.status_change_date >= $1::date
      AND h.status_change_date <= $2::date
      AND (h.docket_number ILIKE 'MC%' OR h.docket_number IS NULL)
      AND ${rule}
    ORDER BY h.dot_number, h.status_change_date DESC
  `;
}

export async function recentCarriers(kind: "registered" | "activated", range: DateRange = defaultRange(), limit = 8, offset = 0) {
  return query<RecentCarrier>(
    `SELECT ${LIST} FROM (${recentSql(kind)}) events
     ORDER BY event_date DESC, legal_name
     LIMIT $3 OFFSET $4`,
    [range.from, range.to, limit, offset],
  );
}

export async function countRecent(kind: "registered" | "activated", range: DateRange = defaultRange()) {
  const rows = await query<{ count: string }>(
    `SELECT count(*)::text AS count FROM (${recentSql(kind)}) events`,
    [range.from, range.to],
  );
  return Number(rows[0]?.count ?? 0);
}
