import { query } from "@/lib/db";

export type CarrierRow = {
  dot_number: string;
  legal_name: string | null;
  dba_name: string | null;
  status_code: string | null;
  phone: string | null;
  fax: string | null;
  cell_phone: string | null;
  email: string | null;
  phy_street: string | null;
  phy_city: string | null;
  phy_state: string | null;
  phy_zip: string | null;
  phy_country: string | null;
  mail_street: string | null;
  mail_city: string | null;
  mail_state: string | null;
  mail_zip: string | null;
  officer_1: string | null;
  officer_2: string | null;
  business_org_desc: string | null;
  power_units: number | null;
  truck_units: number | null;
  bus_units: number | null;
  total_drivers: number | null;
  total_cdl: number | null;
  interstate_drivers: number | null;
  intrastate_drivers: number | null;
  insurance_cancel_pending: boolean;
  fleetsize: string | null;
  carrier_operation: string | null;
  classdef: string | null;
  hm_ind: string | null;
  add_date: string | null;
  mcs150_date: string | null;
  mcs150_mileage: string | null;
  mcs150_mileage_year: number | null;
  cargo: string[] | null;
  docket1prefix: string | null;
  docket1: string | null;
  docket1_status_code: string | null;
  authority_status: string | null;
  common_authority_status: string | null;
  contract_authority_status: string | null;
  broker_authority_status: string | null;
  bipd_on_file: string | null;
  insurance_current: boolean | null;
  authority_granted_date: string | null;
  revocation_count: number;
  out_of_service: boolean;
  oos_date: string | null;
  inspections_24m: number;
  vehicle_oos_24m: number;
  driver_oos_24m: number;
  oos_rate: string | null;
  crashes_24m: number;
  fatal_crashes_24m: number;
  injury_crashes_24m: number;
  last_inspection_date: string | null;
  sms_insp_total: number | null;
  sms_driver_insp_total: number | null;
  sms_driver_oos_insp_total: number | null;
  sms_vehicle_insp_total: number | null;
  sms_vehicle_oos_insp_total: number | null;
  sms_measures: Record<string, string | number | null> | null;
  score_authority: number | null;
  score_age: number | null;
  score_insurance: number | null;
  score_revocation: number | null;
  score_safety: number | null;
  trust_score: number | null;
  trust_grade: string | null;
  live_checked_at: string | null;
  live_allowed_to_operate: string | null;
  live_safety_rating: string | null;
  live_safety_rating_date: string | null;
  prior_revoke_flag: string | null;
};

export const LIST_COLUMNS = `
  dot_number, legal_name, dba_name, phy_city, phy_state, phone, authority_status, status_code,
  docket1prefix, docket1, carrier_operation, insurance_current, insurance_cancel_pending,
  trust_score, trust_grade, power_units
`;

export type CarrierMatch = CarrierRow & { matched_on?: string | null };

export function identifierHitsSql(slot: string) {
  const qualified = LIST_COLUMNS.split(",")
    .map((column) => `c.${column.trim()}`)
    .join(", ");
  const censusMc = `ltrim(regexp_replace(COALESCE(docket1, ''), '[^0-9]', '', 'g'), '0')`;
  const censusMcAliased = `ltrim(regexp_replace(COALESCE(c.docket1, ''), '[^0-9]', '', 'g'), '0')`;
  const docketMc = `ltrim(regexp_replace(d.docket_number, '[^0-9]', '', 'g'), '0')`;
  return `(
    SELECT ${LIST_COLUMNS}, CASE WHEN ${censusMc} = ${slot} THEN 'both' ELSE 'usdot' END AS matched_on
    FROM carriers
    WHERE dot_number = ${slot}
    UNION
    SELECT ${LIST_COLUMNS}, 'mc' AS matched_on
    FROM carriers
    WHERE ${censusMc} = ${slot} AND dot_number <> ${slot}
    UNION
    SELECT ${qualified}, 'mc' AS matched_on
    FROM carriers c
    JOIN dockets d ON d.dot_number = c.dot_number
    WHERE ${docketMc} = ${slot}
      AND c.dot_number <> ${slot}
      AND ${censusMcAliased} <> ${slot}
    UNION
    SELECT ${qualified}, 'mc' AS matched_on
    FROM carriers c
    JOIN census_dockets cd ON cd.dot_number = c.dot_number
    WHERE ltrim(regexp_replace(cd.docket_number, '[^0-9]', '', 'g'), '0') = ${slot}
      AND c.dot_number <> ${slot}
      AND ${censusMcAliased} <> ${slot}
  )`;
}

export async function getCarrier(dot: string) {
  const rows = await query<CarrierRow>(`SELECT * FROM carriers WHERE dot_number = $1`, [dot]);
  return rows[0] ?? null;
}

export async function searchCarriers(raw: string, find: "auto" | "dot" | "mc" | "email" | "phone" = "auto"): Promise<CarrierMatch[]> {
  const term = raw.trim();
  if (!term) return [];
  const digits = term.replace(/\D/g, "");
  const stripped = digits.replace(/^0+/, "");
  const mode = find === "auto"
    ? term.includes("@")
      ? "email"
      : /^[+().\-\s\d]+$/.test(term) && (digits.length === 10 || (digits.length === 11 && digits.startsWith("1")))
        ? "phone"
        : /^(mc|mx|ff)?\s*\d+$/i.test(term.replace(/\s/g, "")) && stripped
          ? "number"
          : "name"
    : find;

  if (mode === "email") {
    return query<CarrierRow>(
      `SELECT ${LIST_COLUMNS} FROM carriers WHERE lower(email) = lower($1) ORDER BY trust_score DESC NULLS LAST LIMIT 25`,
      [term],
    );
  }

  if (mode === "phone") {
    const phone = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
    return query<CarrierRow>(
      `SELECT ${LIST_COLUMNS} FROM carriers
       WHERE phone_digits = $1
       ORDER BY trust_score DESC NULLS LAST, legal_name
       LIMIT 25`,
      [phone],
    );
  }

  if (mode === "dot" && stripped) {
    return query<CarrierMatch>(
      `SELECT ${LIST_COLUMNS}, 'usdot' AS matched_on FROM carriers WHERE dot_number = $1 LIMIT 5`,
      [stripped],
    );
  }

  if ((mode === "mc" || mode === "number") && stripped) {
    return query<CarrierMatch>(
      `SELECT ${LIST_COLUMNS}, matched_on
       FROM ${identifierHitsSql("$1")} hits
       ${mode === "mc" ? "WHERE matched_on IN ('mc', 'both')" : ""}
       ORDER BY (dot_number = $1) DESC, legal_name
       LIMIT 25`,
      [stripped],
    );
  }

  return query<CarrierRow>(
    `SELECT ${LIST_COLUMNS} FROM carriers
     WHERE legal_name ILIKE '%' || $1 || '%'
        OR dba_name ILIKE '%' || $1 || '%'
     ORDER BY
       CASE WHEN legal_name ILIKE $1 || '%' THEN 0 WHEN dba_name ILIKE $1 || '%' THEN 1 ELSE 2 END,
       trust_score DESC NULLS LAST,
       legal_name
     LIMIT 25`,
    [term],
  );
}

export async function carriersByState(state: string, page: number) {
  const limit = 40;
  const offset = (page - 1) * limit;
  const rows = await query<CarrierRow>(
    `SELECT ${LIST_COLUMNS} FROM carriers
     WHERE phy_state = $1
     ORDER BY (authority_status = 'Active') DESC NULLS LAST, trust_score DESC NULLS LAST, legal_name
     LIMIT $2 OFFSET $3`,
    [state, limit, offset],
  );
  const totals = await query<{ count: string }>(
    `SELECT count(*)::text AS count FROM carriers WHERE phy_state = $1`,
    [state],
  );
  return { rows, total: Number(totals[0]?.count ?? 0), limit };
}

export async function carriersByCity(state: string, city: string, page: number) {
  const limit = 40;
  const offset = (page - 1) * limit;
  const rows = await query<CarrierRow>(
    `SELECT ${LIST_COLUMNS} FROM carriers
     WHERE phy_state = $1 AND lower(phy_city) = lower($2)
     ORDER BY (authority_status = 'Active') DESC NULLS LAST, trust_score DESC NULLS LAST, legal_name
     LIMIT $3 OFFSET $4`,
    [state, city, limit, offset],
  );
  const totals = await query<{ count: string }>(
    `SELECT count(*)::text AS count FROM carriers WHERE phy_state = $1 AND lower(phy_city) = lower($2)`,
    [state, city],
  );
  return { rows, total: Number(totals[0]?.count ?? 0), limit };
}

export async function stateIndex() {
  return query<{ phy_state: string; count: string }>(
    `SELECT phy_state, count(*)::text AS count
     FROM carriers
     WHERE phy_state IS NOT NULL AND phy_state <> ''
     GROUP BY phy_state
     ORDER BY phy_state`,
  );
}

export async function latestFeeds() {
  return query<{ feed_key: string; source_updated_at: string | null; loaded_at: string; row_count: string | null }>(
    `SELECT DISTINCT ON (feed_key) feed_key, source_updated_at, loaded_at, row_count::text
     FROM feed_runs
     WHERE status = 'ok'
     ORDER BY feed_key, loaded_at DESC`,
  );
}
