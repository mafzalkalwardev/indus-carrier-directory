import { query } from "@/lib/db";

export type BrokerHit = {
  dot_number: string;
  legal_name: string | null;
  dba_name: string | null;
  phone: string | null;
  email: string | null;
  phy_city: string | null;
  phy_state: string | null;
  authority_status: string | null;
  broker_authority_status: string | null;
  common_authority_status: string | null;
  insurance_current: boolean | null;
  bipd_on_file: string | null;
  trust_grade: string | null;
  trust_score: number | null;
  docket_number: string | null;
  bond_on_file: boolean | null;
  authorities: string | null;
};

const ALIASES: Record<string, string> = {
  tql: "TOTAL QUALITY LOGISTICS",
  "c.h. robinson": "C H ROBINSON",
  "c.h robinson": "C H ROBINSON",
  "ch robinson": "C H ROBINSON",
  "c h robinson": "C H ROBINSON",
  chr: "C H ROBINSON",
};

const COLUMNS = `c.dot_number, c.legal_name, c.dba_name, c.phone, c.email, c.phy_city, c.phy_state,
  c.authority_status, c.broker_authority_status, c.common_authority_status,
  c.insurance_current, c.bipd_on_file::text, c.trust_grade, c.trust_score,
  COALESCE(c.docket1, d.docket_number) AS docket_number,
  EXISTS (
    SELECT 1 FROM insurance_policies p
    WHERE p.dot_number = c.dot_number AND p.ins_form_code IN ('BMC-84', 'BMC-85')
  ) AS bond_on_file,
  (
    SELECT string_agg(DISTINCT d2.op_auth_type || ': ' || COALESCE(d2.op_auth_status, 'listed'), ' · ')
    FROM dockets d2 WHERE d2.dot_number = c.dot_number
  ) AS authorities`;

export async function searchBrokers(raw: string) {
  const term = raw.trim();
  if (term.length < 2) return [];
  const digits = term.replace(/\D/g, "").replace(/^0+/, "");
  const numeric = /^\d+$/.test(term.replace(/\D/g, "")) && digits.length >= 3 && !/[a-z]/i.test(term);
  if (numeric) {
    const keys = [...new Set([digits, digits.padStart(6, "0"), digits.padStart(7, "0"), digits.padStart(8, "0")])];
    return query<BrokerHit>(
      `SELECT ${COLUMNS}
       FROM (
         SELECT dot_number FROM carriers
         WHERE ltrim(regexp_replace(COALESCE(docket1, ''), '[^0-9]', '', 'g'), '0') = $1
            OR dot_number = $1
         UNION
         SELECT dot_number FROM dockets
         WHERE regexp_replace(docket_number, '[^0-9]', '', 'g') = ANY($2::text[])
       ) hits
       JOIN carriers c ON c.dot_number = hits.dot_number
       LEFT JOIN LATERAL (
         SELECT docket_number FROM dockets
         WHERE dot_number = c.dot_number
         ORDER BY (op_auth_type ILIKE '%broker%') DESC
         LIMIT 1
       ) d ON true
       ORDER BY (c.broker_authority_status IS NOT NULL) DESC, c.legal_name
       LIMIT 15`,
      [digits, keys],
    );
  }
  const name = ALIASES[term.toLowerCase().replace(/\s+/g, " ")] ?? term;
  return query<BrokerHit>(
    `SELECT ${COLUMNS}
     FROM carriers c
     LEFT JOIN LATERAL (
       SELECT docket_number FROM dockets
       WHERE dot_number = c.dot_number
       ORDER BY (op_auth_type ILIKE '%broker%') DESC
       LIMIT 1
     ) d ON true
     WHERE (c.legal_name ILIKE '%' || $1 || '%' OR c.dba_name ILIKE '%' || $1 || '%')
       AND (
         c.legal_name ~* '(LLC|INC|CORP|COMPANY|\\mLP\\M|\\mLTD\\M|\\mCO\\M)'
         OR c.dba_name ~* '(LLC|INC|CORP|COMPANY|\\mLP\\M|\\mLTD\\M|\\mCO\\M)'
         OR c.broker_authority_status IS NOT NULL
       )
     ORDER BY similarity(COALESCE(c.dba_name, '') || ' ' || COALESCE(c.legal_name, ''), $1) DESC,
              (c.broker_authority_status IS NOT NULL) DESC,
              c.trust_score DESC NULLS LAST
     LIMIT 15`,
    [name],
  );
}
