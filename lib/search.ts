import { identifierHitsSql, LIST_COLUMNS, type CarrierMatch, searchCarriers } from "@/lib/carriers";
import { query } from "@/lib/db";
import { STATE_NAMES } from "@/lib/states";

const NAME_TO_CODE = Object.fromEntries(Object.entries(STATE_NAMES).map(([code, name]) => [name.toLowerCase(), code]));

export type DateRange = { from: string; to: string };

export function formatDay(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function defaultRange(days = 7): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - days);
  return { from: formatDay(from), to: formatDay(to) };
}

export function readRange(from: string | undefined, to: string | undefined, days = 7): DateRange {
  const fallback = defaultRange(days);
  const start = /^\d{4}-\d{2}-\d{2}$/.test(from ?? "") ? from! : fallback.from;
  const end = /^\d{4}-\d{2}-\d{2}$/.test(to ?? "") ? to! : fallback.to;
  return start <= end ? { from: start, to: end } : { from: end, to: start };
}

export type SearchFilters = {
  q: string;
  operation: string;
  authority: string;
  insurance: string;
  vehicle: string;
  location: string;
  locationState: string;
  locationCity: string;
  registered: boolean;
  activated: boolean;
  reinstated: boolean;
  from: string;
  to: string;
  find: "auto" | "dot" | "mc" | "email" | "phone";
};

function resolveState(token: string) {
  const text = token.trim();
  if (/^[A-Za-z]{2}$/.test(text) && STATE_NAMES[text.toUpperCase()]) return text.toUpperCase();
  return NAME_TO_CODE[text.toLowerCase()] ?? "";
}

export function parseLocation(raw: string) {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return { state: "", city: "" };
  const comma = text.split(",").map((part) => part.trim()).filter(Boolean);
  if (comma.length >= 2) {
    const state = resolveState(comma[comma.length - 1]);
    if (state) return { state, city: comma.slice(0, -1).join(", ") };
  }
  const parts = text.split(" ");
  if (parts.length >= 2) {
    const state = resolveState(parts[parts.length - 1]);
    if (state) return { state, city: parts.slice(0, -1).join(" ") };
  }
  const state = resolveState(text);
  if (state) return { state, city: "" };
  return { state: "", city: text };
}

export function readFilters(params: {
  q?: string;
  operation?: string;
  authority?: string;
  insurance?: string;
  vehicle?: string;
  state?: string;
  location?: string;
  registered?: string;
  activated?: string;
  reinstated?: string;
  from?: string;
  to?: string;
  days?: string;
  find?: string;
}): SearchFilters {
  const operation = ["A", "B", "C"].includes(params.operation ?? "") ? params.operation ?? "" : "";
  const authority = ["Active", "Inactive", "Pending"].includes(params.authority ?? "") ? params.authority ?? "" : "";
  const insurance = ["current", "missing", "cancel"].includes(params.insurance ?? "") ? params.insurance ?? "" : "";
  const vehicle = ["truck", "tractor", "trailer", "coach", "school_bus", "bus", "van", "limo"].includes(params.vehicle ?? "")
    ? params.vehicle ?? ""
    : "";
  const find = ["auto", "dot", "mc", "email", "phone"].includes(params.find ?? "")
    ? params.find as SearchFilters["find"]
    : "auto";
  const typed = params.location?.trim() || (/^[A-Za-z]{2}$/.test(params.state ?? "") ? params.state ?? "" : "");
  const place = parseLocation(typed);
  const range = readRange(params.from, params.to, DAY_WINDOW(params.days));
  return {
    q: params.q?.trim() ?? "",
    operation,
    authority,
    insurance,
    vehicle,
    location: typed,
    locationState: place.state,
    locationCity: place.city,
    registered: params.registered === "1",
    activated: params.activated === "1",
    reinstated: params.reinstated === "1",
    from: range.from,
    to: range.to,
    find,
  };
}

function DAY_WINDOW(days: string | undefined) {
  const value = Number(days);
  return [1, 7, 14, 30].includes(value) ? value : 7;
}

export function filtersActive(filters: SearchFilters) {
  return Boolean(
    filters.q || filters.operation || filters.authority || filters.insurance || filters.vehicle
    || filters.location || filters.registered || filters.activated || filters.reinstated,
  );
}

export function filterQuery(filters: SearchFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.find !== "auto") params.set("find", filters.find);
  if (filters.operation) params.set("operation", filters.operation);
  if (filters.authority) params.set("authority", filters.authority);
  if (filters.insurance) params.set("insurance", filters.insurance);
  if (filters.vehicle) params.set("vehicle", filters.vehicle);
  if (filters.location) params.set("location", filters.location);
  if (filters.registered) params.set("registered", "1");
  if (filters.activated) params.set("activated", "1");
  if (filters.reinstated) params.set("reinstated", "1");
  if (filters.registered || filters.activated || filters.reinstated) {
    params.set("from", filters.from);
    params.set("to", filters.to);
  }
  return params;
}

function whereClause(filters: SearchFilters) {
  const params: unknown[] = [];
  const clauses: string[] = [];

  if (filters.operation) {
    params.push(filters.operation);
    clauses.push(`c.carrier_operation = $${params.length}`);
  }
  if (filters.authority) {
    params.push(filters.authority);
    clauses.push(`c.authority_status = $${params.length}`);
  }
  if (filters.insurance === "current") clauses.push("c.insurance_current");
  if (filters.insurance === "missing") clauses.push("NOT COALESCE(c.insurance_current, false)");
  if (filters.insurance === "cancel") clauses.push("c.insurance_cancel_pending");
  if (filters.locationState) {
    params.push(filters.locationState);
    clauses.push(`c.phy_state = $${params.length}`);
  }
  if (filters.locationCity) {
    params.push(filters.locationCity);
    clauses.push(`lower(c.phy_city) = lower($${params.length})`);
  }
  const events: string[] = [];
  if (filters.registered) {
    events.push(`(h.op_auth_status ILIKE 'pending' AND (h.reason ILIKE 'initial status' OR h.reason ILIKE 'published to fmcsa register'))`);
  }
  if (filters.activated) events.push(`(h.op_auth_status ILIKE 'active' AND h.reason ILIKE 'granted')`);
  if (filters.reinstated) events.push(`(h.op_auth_status ILIKE 'active' AND h.reason ILIKE 'reinstat%')`);
  if (events.length > 0) {
    params.push(filters.from, filters.to);
    const fromSlot = params.length - 1;
    const toSlot = params.length;
    clauses.push(`EXISTS (
      SELECT 1 FROM authority_history h
      WHERE h.dot_number = c.dot_number
        AND h.status_change_date >= $${fromSlot}::date
        AND h.status_change_date <= $${toSlot}::date
        AND (h.docket_number ILIKE 'MC%' OR h.docket_number IS NULL)
        AND (${events.join(" OR ")})
    )`);
  }
  if (filters.vehicle) {
    params.push(filters.vehicle);
    clauses.push(
      `EXISTS (SELECT 1 FROM carrier_fleet f WHERE f.dot_number = c.dot_number AND f.vehicle_group = $${params.length})`,
    );
  }

  const term = filters.q;
  const digits = term.replace(/\D/g, "");
  const stripped = digits.replace(/^0+/, "");
  const mode = filters.find === "auto"
    ? term.includes("@")
      ? "email"
      : (digits.length === 10 || (digits.length === 11 && digits.startsWith("1"))) && /^[+().\-\s\d]+$/.test(term)
        ? "phone"
        : /^(mc|mx|ff)?\s*\d+$/i.test(term.replace(/\s/g, "")) && stripped
          ? "number"
          : "name"
    : filters.find;
  let numberSlot: string | null = null;
  if (mode === "email" && term) {
    params.push(term);
    clauses.push(`lower(c.email) = lower($${params.length})`);
  } else if (mode === "phone" && digits) {
    params.push(digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits);
    clauses.push(`c.phone_digits = $${params.length}`);
  } else if (mode === "dot" && stripped) {
    params.push(stripped);
    clauses.push(`c.dot_number = $${params.length}`);
  } else if ((mode === "mc" || mode === "number") && stripped) {
    params.push(stripped);
    numberSlot = `$${params.length}`;
  } else if (term) {
    params.push(term);
    clauses.push(`(c.legal_name ILIKE '%' || $${params.length} || '%' OR c.dba_name ILIKE '%' || $${params.length} || '%')`);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
    numberSlot,
  };
}

function fromClause(filters: SearchFilters) {
  const built = whereClause(filters);
  return {
    from: built.numberSlot ? `${identifierHitsSql(built.numberSlot)} c` : "carriers c",
    where: built.where,
    params: built.params,
    numbered: built.numberSlot,
  };
}

export async function searchDirectory(filters: SearchFilters, limit = 40): Promise<CarrierMatch[]> {
  if (!filtersActive(filters)) return [];
  if (!filters.operation && !filters.authority && !filters.insurance && !filters.vehicle && !filters.location && !filters.registered && !filters.activated && !filters.reinstated) {
    return searchCarriers(filters.q, filters.find);
  }
  const source = fromClause(filters);
  source.params.push(limit);
  return query<CarrierMatch>(
    `SELECT ${LIST_COLUMNS}${source.numbered ? ", matched_on" : ""} FROM ${source.from} ${source.where}
     ORDER BY ${source.numbered ? `(c.dot_number = ${source.numbered}) DESC, ` : ""}c.trust_score DESC NULLS LAST, c.legal_name
     LIMIT $${source.params.length}`,
    source.params,
  );
}

export async function countDirectory(filters: SearchFilters) {
  const source = fromClause(filters);
  const rows = await query<{ count: string }>(
    `SELECT count(*)::text AS count FROM ${source.from} ${source.where}`,
    source.params,
  );
  return Number(rows[0]?.count ?? 0);
}

export function directorySql(filters: SearchFilters) {
  const source = fromClause(filters);
  return {
    text: `SELECT ${LIST_COLUMNS} FROM ${source.from} ${source.where} ORDER BY c.legal_name`,
    params: source.params,
  };
}
