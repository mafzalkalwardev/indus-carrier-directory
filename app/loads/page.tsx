import { headers } from "next/headers";
import { LoadsResultsTable } from "@/components/LoadsResultsTable";
import { LoadsSearchBar } from "@/components/LoadsSearchBar";
import {
  isLaneoraUnavailable,
  laneoraConfigured,
  mapEquipmentCodes,
  searchLoads,
  type LaneoraSearchBody,
} from "@/lib/laneora";
import { availableLoads, readLoadQuery, type LoadListing } from "@/lib/loads";
import { rateLimit } from "@/lib/rate-limit";
import { STATE_NAMES } from "@/lib/states";

export const metadata = {
  title: "Search loads",
  description:
    "Search trucking loads by origin, equipment, length, and age on the INDUS Transports live board. Expand a row for booking phone and email.",
  alternates: { canonical: "/loads" },
};

type SearchParams = {
  state?: string;
  city?: string;
  equipment?: string | string[];
  sort?: string;
  origin_city?: string;
  origin_state?: string;
  origin_deadhead?: string;
  destination_city?: string;
  destination_state?: string;
  destination_deadhead?: string;
  capacity?: string;
  earliest?: string;
  latest?: string;
  max_age_minutes?: string;
  max_age_hours?: string;
  limit?: string;
  order_by?: string;
  bookable_only?: string;
  tracking?: string;
  include_load_board?: string;
  include_private_network?: string;
  length_ft?: string;
  weight_lbs?: string;
};

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function numberOr(value: string | undefined, fallback: number | null) {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function legacyEquipment(raw: string): string {
  const code = raw.trim().toUpperCase();
  const map: Record<string, string> = {
    V: "van",
    R: "reefer",
    F: "flatbed",
    SB: "box",
    PO: "power",
    VP: "van",
    VG: "van",
    VM: "van",
    MV: "van",
    ALL: "all",
    VAN: "van",
    REEFER: "reefer",
    FLATBED: "flatbed",
    BOX: "box",
    POWER: "power",
  };
  return map[code] ?? (code.toLowerCase() === "all" ? "all" : "all");
}

function readForm(params: SearchParams) {
  const equipmentRaw = firstParam(params.equipment) || "V";
  const legacy = readLoadQuery({
    state: params.origin_state ?? params.state,
    city: params.origin_city ?? params.city,
    equipment: legacyEquipment(equipmentRaw),
    sort: params.sort,
  });
  const asked = Boolean(params.state || params.origin_state || params.origin_city || params.city);
  const originState = (params.origin_state ?? params.state ?? legacy.state).toUpperCase();
  const hours = numberOr(params.max_age_hours, null);
  const maxAge = hours != null
    ? Math.min(10080, Math.max(60, Math.round(hours * 60)))
    : (numberOr(params.max_age_minutes, 1440) ?? 1440);
  const capacityRaw = (params.capacity ?? "BOTH").toUpperCase();
  const orderBy = (params.order_by ?? "AGE_ASC").toUpperCase();

  return {
    asked,
    legacy,
    originState: STATE_NAMES[originState] ? originState : "TX",
    originCity: (params.origin_city ?? params.city ?? legacy.city).trim(),
    originDeadhead: numberOr(params.origin_deadhead, 150) ?? 150,
    destinationState: STATE_NAMES[(params.destination_state ?? "").toUpperCase()]
      ? (params.destination_state ?? "").toUpperCase()
      : "",
    destinationCity: (params.destination_city ?? "").trim(),
    destinationDeadhead: numberOr(params.destination_deadhead, 150) ?? 150,
    capacity: (capacityRaw === "FULL" || capacityRaw === "PARTIAL" || capacityRaw === "BOTH"
      ? capacityRaw
      : "BOTH") as "BOTH" | "FULL" | "PARTIAL",
    equipment: equipmentRaw || "V",
    earliest: (params.earliest ?? "").trim(),
    latest: (params.latest ?? "").trim(),
    maxAge,
    limit: Math.min(200, Math.max(1, numberOr(params.limit, 100) ?? 100)),
    orderBy: ["AGE_ASC", "AGE_DESC", "RATE_DESC", "RATE_ASC", "DISTANCE_ASC", "DISTANCE_DESC"].includes(orderBy)
      ? orderBy
      : "AGE_ASC",
    bookableOnly: params.bookable_only === "1",
    tracking: ["TRACKING", "NO_TRACKING"].includes((params.tracking ?? "").toUpperCase())
      ? (params.tracking ?? "ALL").toUpperCase()
      : "ALL",
    includeLoadBoard: asked ? params.include_load_board === "1" : true,
    includePrivateNetwork: asked ? params.include_private_network === "1" : true,
    lengthFt: (params.length_ft ?? "").trim(),
    weightLbs: (params.weight_lbs ?? "").trim(),
  };
}

function toSearchBody(form: ReturnType<typeof readForm>): LaneoraSearchBody {
  const body: LaneoraSearchBody = {
    origin: {
      city: form.originCity || undefined,
      state: form.originState,
      deadhead_miles: form.originDeadhead,
    },
    capacity: form.capacity,
    limit: form.limit,
    order_by: form.orderBy,
    bookable_only: form.bookableOnly,
    tracking: form.tracking as LaneoraSearchBody["tracking"],
    include_load_board: form.includeLoadBoard,
    include_private_network: form.includePrivateNetwork,
    max_age_minutes: form.maxAge,
  };
  if (form.destinationCity || form.destinationState) {
    body.destination = {
      city: form.destinationCity || undefined,
      state: form.destinationState || undefined,
      deadhead_miles: form.destinationDeadhead,
    };
  } else {
    body.destination = { deadhead_miles: form.destinationDeadhead };
  }
  const equipment = mapEquipmentCodes(form.equipment);
  if (equipment?.length) body.equipment = equipment;
  if (form.earliest) body.earliest = form.earliest;
  if (form.latest) body.latest = form.latest;
  const length = Number(form.lengthFt);
  if (Number.isFinite(length) && length > 0) body.length_ft = length;
  const weight = Number(form.weightLbs);
  if (Number.isFinite(weight) && weight > 0) body.weight_lbs = weight;
  return body;
}

function publicSearchNote(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  if (/resolve origin|city\/state|location/i.test(raw)) {
    return "Could not find that origin. Check the city and state.";
  }
  if (/destination/i.test(raw)) return "Could not find that destination.";
  if (/timeout|timed out|AbortError/i.test(raw)) return "Search took too long. Try again.";
  if (/unreachable|ECONNREFUSED|503|502/i.test(raw)) return "Live board is temporarily unavailable.";
  return "No loads matched. Adjust filters and search again.";
}

async function resolveLoads(form: ReturnType<typeof readForm>, clientKey: string) {
  const withFallback = async (note: string) => {
    const fallback = await availableLoads(form.legacy);
    return { loads: fallback.loads, notes: [note, ...fallback.notes], source: "fallback" as const };
  };
  if (!laneoraConfigured()) {
    return withFallback("Live board offline — desk/public listings shown.");
  }
  const limited = rateLimit(`loads-page:${clientKey}`, { limit: 30, windowMs: 60_000 });
  if (!limited.ok) {
    return {
      loads: [] as LoadListing[],
      notes: [`Too many searches. Try again in about ${limited.retryAfterSec}s.`],
      source: "laneora" as const,
    };
  }
  try {
    const result = await searchLoads(toSearchBody(form));
    return {
      loads: result.loads,
      notes: result.loads.length ? [] : ["No loads matched. Widen DH-O or clear destination."],
      source: "laneora" as const,
    };
  } catch (error) {
    if (isLaneoraUnavailable(error)) {
      return withFallback("Live board unavailable — desk/public listings shown.");
    }
    return { loads: [] as LoadListing[], notes: [publicSearchNote(error)], source: "laneora" as const };
  }
}

export default async function LoadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const form = readForm(params);
  const h = await headers();
  const clientKey = h.get("x-forwarded-for")?.split(",")[0]?.trim()
    || h.get("x-real-ip")?.trim()
    || "unknown";
  const result = form.asked
    ? await resolveLoads(form, clientKey)
    : { loads: [] as LoadListing[], notes: [] as string[], source: "laneora" as const };

  return (
    <main className="dat-board">
      <div className="dat-board-top">
        <div className="dat-board-title">
          <h1>Search loads</h1>
          <p>Type a city or ZIP for suggestions, set DH-O / equipment, then search.</p>
        </div>
        <LoadsSearchBar
          values={{
            originCity: form.originCity,
            originState: form.originState,
            originDeadhead: form.originDeadhead,
            destinationCity: form.destinationCity,
            destinationState: form.destinationState,
            destinationDeadhead: form.destinationDeadhead,
            equipment: form.equipment,
            capacity: form.capacity,
            earliest: form.earliest,
            latest: form.latest,
            maxAge: form.maxAge,
            limit: form.limit,
            orderBy: form.orderBy,
            bookableOnly: form.bookableOnly,
            tracking: form.tracking,
            includeLoadBoard: form.includeLoadBoard,
            includePrivateNetwork: form.includePrivateNetwork,
            lengthFt: form.lengthFt,
            weightLbs: form.weightLbs,
          }}
        />
      </div>

      {!form.asked ? (
        <p className="dat-empty">Enter an origin and press Search.</p>
      ) : (
        <section className="dat-results" aria-live="polite">
          <div className="dat-results-bar">
            <strong>{result.loads.length.toLocaleString()} loads</strong>
            <span>
              {form.originCity ? `${form.originCity}, ` : ""}{form.originState}
              {" · "}
              {form.destinationCity || form.destinationState
                ? `${form.destinationCity ? `${form.destinationCity}, ` : ""}${form.destinationState || ""}`
                : "Anywhere"}
              {" · "}DH-O {form.originDeadhead}
            </span>
          </div>
          {result.notes.length ? <p className="dat-note" role="status">{result.notes.join(" ")}</p> : null}
          {result.loads.length === 0 ? (
            <p className="dat-empty">No loads for that search.</p>
          ) : (
            <LoadsResultsTable loads={result.loads} />
          )}
        </section>
      )}
    </main>
  );
}
