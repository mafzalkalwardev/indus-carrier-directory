import { query } from "@/lib/db";
import type { LoadListing, LoadQuery } from "@/lib/loads";

export type PostedLoadSource = "Indus" | "Laneora desk";

export type PostedLoadInput = {
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  equipment: string;
  weight?: string | null;
  size?: string | null;
  miles?: number | null;
  rate?: string | null;
  perMile?: string | null;
  pickupDate?: string | null;
  notes?: string | null;
  brokerName?: string | null;
  brokerPhone?: string | null;
  brokerEmail?: string | null;
  brokerDot?: string | null;
  source?: PostedLoadSource;
  status?: "open" | "filled" | "hidden";
};

type PostedLoadRow = {
  id: string;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  equipment: string;
  weight: string | null;
  size: string;
  miles: number | null;
  rate: string | null;
  per_mile: string | null;
  pickup_date: string | null;
  notes: string | null;
  broker_name: string | null;
  broker_phone: string | null;
  broker_email: string | null;
  broker_dot: string | null;
  status: string;
  source: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

let ensured = false;

export async function ensurePostedLoadsTable() {
  if (ensured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS posted_loads (
      id bigserial PRIMARY KEY,
      origin_city text NOT NULL,
      origin_state text NOT NULL,
      destination_city text NOT NULL,
      destination_state text NOT NULL,
      equipment text NOT NULL,
      weight text,
      size text NOT NULL DEFAULT 'Full',
      miles int,
      rate text,
      per_mile text,
      pickup_date text,
      notes text,
      broker_name text,
      broker_phone text,
      broker_email text,
      broker_dot text,
      status text NOT NULL DEFAULT 'open',
      source text NOT NULL DEFAULT 'Indus',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(`ALTER TABLE posted_loads ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'Indus'`);
  await query(`CREATE INDEX IF NOT EXISTS posted_loads_origin_state_idx ON posted_loads (origin_state)`);
  await query(`CREATE INDEX IF NOT EXISTS posted_loads_status_idx ON posted_loads (status)`);
  await query(`CREATE INDEX IF NOT EXISTS posted_loads_created_at_idx ON posted_loads (created_at DESC)`);
  ensured = true;
}

export async function listPostedLoads(loadQuery: LoadQuery): Promise<LoadListing[]> {
  await ensurePostedLoadsTable();
  const rows = await query<PostedLoadRow>(
    `SELECT *
     FROM posted_loads
     WHERE status = 'open'
       AND upper(origin_state) = $1
     ORDER BY created_at DESC
     LIMIT 80`,
    [loadQuery.state.toUpperCase()],
  );

  return rows
    .map(rowToListing)
    .filter((load) => {
      if (loadQuery.city) {
        const city = loadQuery.city.toLowerCase();
        if (!load.originCity.toLowerCase().includes(city)) return false;
      }
      return matchesEquipment(load.equipment, loadQuery.equipment);
    });
}

export async function createPostedLoad(input: PostedLoadInput) {
  await ensurePostedLoadsTable();
  const source = input.source === "Laneora desk" ? "Laneora desk" : "Indus";
  const rows = await query<PostedLoadRow>(
    `INSERT INTO posted_loads (
       origin_city, origin_state, destination_city, destination_state,
       equipment, weight, size, miles, rate, per_mile, pickup_date, notes,
       broker_name, broker_phone, broker_email, broker_dot, status, source
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
     )
     RETURNING *`,
    [
      input.originCity,
      input.originState.toUpperCase(),
      input.destinationCity,
      input.destinationState.toUpperCase(),
      input.equipment,
      input.weight || null,
      input.size || "Full",
      input.miles ?? null,
      input.rate || null,
      input.perMile || null,
      input.pickupDate || null,
      input.notes || null,
      input.brokerName || null,
      input.brokerPhone || null,
      input.brokerEmail || null,
      input.brokerDot || null,
      input.status === "filled" || input.status === "hidden" ? input.status : "open",
      source,
    ],
  );
  return rowToListing(rows[0]!);
}

export async function updatePostedLoadStatus(id: number, status: "open" | "filled" | "hidden") {
  await ensurePostedLoadsTable();
  const rows = await query<PostedLoadRow>(
    `UPDATE posted_loads
     SET status = $2, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, status],
  );
  return rows[0] ? rowToListing(rows[0]) : null;
}

function rowToListing(row: PostedLoadRow): LoadListing {
  const source: LoadListing["source"] =
    row.source === "Laneora desk" ? "Laneora desk" : "Indus";
  return {
    id: `indus-${row.id}`,
    source,
    sourceUrl: `/loads/open?source=${encodeURIComponent(source)}&origin=${encodeURIComponent(`${row.origin_city}, ${row.origin_state}`)}&destination=${encodeURIComponent(`${row.destination_city}, ${row.destination_state}`)}`,
    pickup: row.pickup_date || "Open",
    originCity: row.origin_city,
    originState: row.origin_state,
    destinationCity: row.destination_city,
    destinationState: row.destination_state,
    miles: row.miles,
    equipment: row.equipment,
    weight: row.weight || "—",
    size: row.size || "Full",
    rate: row.rate,
    perMile: row.per_mile,
    postedAge: ageFromCreated(row.created_at),
    brokerName: row.broker_name,
    brokerPhone: row.broker_phone,
    brokerEmail: row.broker_email,
    brokerDot: row.broker_dot,
    brokerGrade: null,
    notes: row.notes,
  };
}

function ageFromCreated(value: Date | string) {
  const at = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(at.getTime())) return "Posted just now";
  const minutes = Math.max(1, Math.round((Date.now() - at.getTime()) / 60000));
  if (minutes < 90) return `Posted ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `Posted ${hours} hr ago`;
  return `Posted ${Math.round(hours / 24)} days ago`;
}

function matchesEquipment(label: string, equipment: string) {
  if (equipment === "all") return true;
  const words: Record<string, RegExp> = {
    sprinter: /sprinter|cargo van/,
    box: /box/,
    hotshot: /hot\s*shot|hotshot/,
    van: /\bvan\b/,
    reefer: /reefer/,
    container: /container/,
    flatbed: /flat/,
    stepdeck: /step/,
    conestoga: /conestoga/,
    power: /power/,
    auto: /auto/,
    hopper: /hopper/,
    tanker: /tank/,
    dump: /dump/,
    doubledrop: /double/,
    lowboy: /lowboy/,
    rgn: /\brgn\b/,
  };
  const pattern = words[equipment];
  if (!pattern) return label.toLowerCase().includes(equipment);
  if (equipment === "van" && /sprinter|cargo|box/.test(label.toLowerCase())) return false;
  return pattern.test(label.toLowerCase());
}
