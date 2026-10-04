import { STATE_NAMES, stateName } from "@/lib/states";

export type LoadListing = {
  id: string;
  source: "DOFT" | "Direct Freight" | "C.H. Robinson";
  sourceUrl: string;
  pickup: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  miles: number | null;
  equipment: string;
  weight: string;
  size: string;
  rate: string | null;
  perMile: string | null;
  postedAge: string | null;
  brokerName: string | null;
  brokerPhone: string | null;
  brokerEmail: string | null;
  brokerDot: string | null;
  brokerGrade: string | null;
};

export type LoadQuery = {
  state: string;
  city: string;
  equipment: string;
  sort: "age" | "rpm" | "rate";
};

const EQUIPMENT = new Set([
  "all", "sprinter", "box", "hotshot", "van", "reefer", "container", "flatbed",
  "stepdeck", "conestoga", "power", "auto", "hopper", "tanker", "dump",
  "doubledrop", "lowboy", "rgn",
]);

const DOFT_SLUG: Record<string, string> = {
  sprinter: "cargo-van",
  box: "box-truck",
  van: "van",
  reefer: "reefer",
  container: "container",
  flatbed: "flatbed",
  stepdeck: "step-deck",
  conestoga: "conestoga",
  power: "power-only",
  auto: "auto-carrier",
  hopper: "hopper-bottom",
  tanker: "tanker",
  doubledrop: "double-drop",
  lowboy: "lowboy",
  rgn: "rgn",
};

export const TRAILER_CHOICES = [
  ["all", "Any trailer"],
  ["sprinter", "Sprinter / cargo van"],
  ["box", "Box truck"],
  ["hotshot", "Hotshot"],
  ["van", "Dry van"],
  ["reefer", "Reefer"],
  ["container", "Container"],
  ["flatbed", "Flatbed"],
  ["stepdeck", "Step deck"],
  ["conestoga", "Conestoga"],
  ["power", "Power only"],
  ["auto", "Auto carrier"],
  ["hopper", "Hopper"],
  ["tanker", "Tanker"],
  ["dump", "Dump"],
  ["doubledrop", "Double drop"],
  ["lowboy", "Lowboy"],
  ["rgn", "RGN"],
] as const;

export type LoadBoardResult = {
  loads: LoadListing[];
  notes: string[];
};

const CACHE_MS = 0;
const cache = new Map<string, { at: number; html: string }>();

const TRAILER: Record<string, string> = {
  V: "Van",
  R: "Reefer",
  F: "Flatbed",
  SD: "Step deck",
  PO: "Power only",
  DD: "Double drop",
  AC: "Auto carrier",
  HS: "Hot shot",
  BT: "Box truck",
  C: "Container",
  CV: "Cargo van",
  SV: "Sprinter",
  LB: "Lowboy",
  RG: "RGN",
  CN: "Conestoga",
  TK: "Tanker",
  HB: "Hopper",
  DT: "Dump",
};

export function readLoadQuery(params: { state?: string; city?: string; equipment?: string; sort?: string }): LoadQuery {
  const state = (params.state ?? "TX").toUpperCase();
  const equipment = EQUIPMENT.has(params.equipment ?? "") ? params.equipment! : "all";
  const sort = params.sort === "rpm" || params.sort === "rate" ? params.sort : "age";
  return {
    state: STATE_NAMES[state] ? state : "TX",
    city: cleanCity(params.city ?? "", state),
    equipment,
    sort,
  };
}

export async function availableLoads(query: LoadQuery): Promise<LoadBoardResult> {
  const [doft, direct, robinson] = await Promise.all([loadDoft(query), loadDirectFreight(query), loadRobinson(query)]);
  const notes = [...doft.notes, ...direct.notes, ...robinson.notes];
  const loads = dedupe([...doft.loads, ...direct.loads, ...robinson.loads].filter((load) => fresh(load.pickup)));
  loads.sort((a, b) => compareLoads(a, b, query.sort));
  return { loads, notes };
}

function cleanCity(raw: string, state: string) {
  const name = stateName(state);
  return raw
    .replace(/[^\w\s.'-]/g, " ")
    .replace(new RegExp(`\\b${state}\\b`, "i"), " ")
    .replace(new RegExp(`\\b${name}\\b`, "i"), " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function loadDoft(query: LoadQuery): Promise<LoadBoardResult> {
  const stateSlug = slug(stateName(query.state));
  const citySlug = query.city ? slug(query.city) : "all-cities";
  const equipment = query.equipment === "all" ? "all" : DOFT_SLUG[query.equipment];
  if (!equipment) {
    return { loads: [], notes: ["DOFT has no public page for that trailer. Direct Freight is still checked."] };
  }
  const url = `https://loadboard.doft.com/find-loads/${stateSlug}/${citySlug}/${equipment}-loads`;
  try {
    const html = await cachedText(url);
    const loads = parseDoft(html, url).filter((load) => matchesEquipment(load.equipment, query.equipment));
    return { loads, notes: loads.length ? [] : ["DOFT did not list loads for that search."] };
  } catch {
    return { loads: [], notes: ["DOFT did not respond. The link on each search still opens their board."] };
  }
}

async function loadDirectFreight(query: LoadQuery): Promise<LoadBoardResult> {
  const url = `https://www.directfreight.com/home/boards/find/loads/all/${encodeURIComponent(stateName(query.state))}`;
  try {
    const html = await cachedText(url);
    let loads = parseDirectFreight(html, url);
    if (query.city) {
      const city = query.city.toLowerCase();
      loads = loads.filter((load) => load.originCity.toLowerCase().includes(city));
    }
    loads = loads.filter((load) => matchesEquipment(load.equipment, query.equipment));
    const notes = loads.length
      ? []
      : ["Direct Freight's public page is a short statewide list, and none of those loads matched this city or trailer."];
    return { loads, notes };
  } catch {
    return { loads: [], notes: ["Direct Freight did not respond."] };
  }
}

const PLACES: Record<string, [string, string]> = {
  houston: ["29.7604", "-95.3698"], dallas: ["32.7767", "-96.7970"], austin: ["30.2672", "-97.7431"],
  chicago: ["41.8781", "-87.6298"], atlanta: ["33.7490", "-84.3880"], losangeles: ["34.0522", "-118.2437"],
  phoenix: ["33.4484", "-112.0740"], denver: ["39.7392", "-104.9903"], miami: ["25.7617", "-80.1918"],
  seattle: ["47.6062", "-122.3321"],
};

const STATE_PLACE: Record<string, [string, string]> = {
  AL: ["32.3792", "-86.3077"], AK: ["61.2181", "-149.9003"], AZ: ["33.4484", "-112.0740"], AR: ["34.7465", "-92.2896"],
  CA: ["34.0522", "-118.2437"], CO: ["39.7392", "-104.9903"], CT: ["41.7658", "-72.6734"], DE: ["39.1582", "-75.5244"],
  DC: ["38.9072", "-77.0369"], FL: ["25.7617", "-80.1918"], GA: ["33.7490", "-84.3880"], HI: ["21.3069", "-157.8583"],
  ID: ["43.6150", "-116.2023"], IL: ["41.8781", "-87.6298"], IN: ["39.7684", "-86.1581"], IA: ["41.5868", "-93.6250"],
  KS: ["37.6872", "-97.3301"], KY: ["38.2527", "-85.7585"], LA: ["29.9511", "-90.0715"], ME: ["43.6591", "-70.2568"],
  MD: ["39.2904", "-76.6122"], MA: ["42.3601", "-71.0589"], MI: ["42.3314", "-83.0458"], MN: ["44.9778", "-93.2650"],
  MS: ["32.2988", "-90.1848"], MO: ["38.6270", "-90.1994"], MT: ["45.7833", "-108.5007"], NE: ["41.2565", "-95.9345"],
  NV: ["36.1699", "-115.1398"], NH: ["42.9956", "-71.4548"], NJ: ["40.7357", "-74.1724"], NM: ["35.0844", "-106.6504"],
  NY: ["40.7128", "-74.0060"], NC: ["35.2271", "-80.8431"], ND: ["46.8772", "-96.7898"], OH: ["39.9612", "-82.9988"],
  OK: ["35.4676", "-97.5164"], OR: ["45.5152", "-122.6784"], PA: ["39.9526", "-75.1652"], RI: ["41.8240", "-71.4128"],
  SC: ["34.0007", "-81.0348"], SD: ["43.5460", "-96.7313"], TN: ["36.1627", "-86.7816"], TX: ["29.7604", "-95.3698"],
  UT: ["40.7608", "-111.8910"], VT: ["44.4759", "-73.2121"], VA: ["37.5407", "-77.4360"], WA: ["47.6062", "-122.3321"],
  WV: ["38.3498", "-81.6326"], WI: ["43.0389", "-87.9065"], WY: ["41.1400", "-104.8202"],
};

function placeFor(query: LoadQuery) {
  const city = slug(query.city).replace(/-/g, "");
  const hit = PLACES[city];
  if (hit) return { lat: hit[0], lng: hit[1] };
  const state = STATE_PLACE[query.state];
  return state ? { lat: state[0], lng: state[1] } : null;
}

async function loadRobinson(query: LoadQuery): Promise<LoadBoardResult> {
  const place = placeFor(query);
  if (!place) return { loads: [], notes: ["C.H. Robinson needs a U.S. origin we can place on a map."] };
  const mode = query.equipment === "van" ? "V" : query.equipment === "reefer" ? "R" : query.equipment === "flatbed" ? "F" : "A";
  try {
    const response = await fetch("https://www.chrobinson.com/api/custom/searchload", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        origin: "https://www.chrobinson.com",
        referer: "https://www.chrobinson.com/en-us/carriers/loadboard/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        originLatitude: place.lat,
        originLongitude: place.lng,
        originRadiusMiles: "100",
        destinationLatitude: "",
        destinationLongitude: "",
        destinationRadiusMiles: "100",
        pickupStart: "",
        pickupEnd: "",
        mode,
      }),
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(String(response.status));
    const body = await response.json() as { shipments?: Array<Record<string, unknown>> };
    const loads = (body.shipments ?? []).slice(0, 20).flatMap((row, index) => {
      const origin = row.origin as { city?: string; stateCode?: string } | undefined;
      const destination = row.destination as { city?: string; stateCode?: string } | undefined;
      if (!origin?.city || !destination?.city) return [];
      const miles = typeof (row.distance as { miles?: number } | undefined)?.miles === "number"
        ? Math.round((row.distance as { miles: number }).miles)
        : null;
      const pounds = typeof (row.weight as { pounds?: number } | undefined)?.pounds === "number"
        ? Math.round((row.weight as { pounds: number }).pounds)
        : null;
      const modes = Array.isArray(row.modes) ? row.modes.join(" ") : text(row.modes);
      return [{
        id: `chr-${text(row.externalShipmentId) || index}`,
        source: "C.H. Robinson" as const,
        sourceUrl: "https://www.chrobinson.com/en-us/carriers/loadboard/",
        pickup: text(row.activityDate).slice(0, 10) || "Posted",
        originCity: origin.city,
        originState: origin.stateCode ?? "",
        destinationCity: destination.city,
        destinationState: destination.stateCode ?? "",
        miles: miles && miles > 0 ? miles : null,
        equipment: modes || "Truck",
        weight: pounds ? `${pounds.toLocaleString()} lbs` : "—",
        size: "Full",
        rate: null,
        perMile: null,
        postedAge: null,
        brokerName: "C.H. Robinson",
        brokerPhone: "(952) 937-8500",
        brokerEmail: null,
        brokerDot: "2226453",
        brokerGrade: "D",
      }];
    }).filter((load) => query.equipment === "all" || mode !== "A" || matchesEquipment(load.equipment, query.equipment));
    return {
      loads,
      notes: loads.length ? [] : ["C.H. Robinson’s public search returned no loads for that origin."],
    };
  } catch {
    return { loads: [], notes: ["C.H. Robinson’s public search did not return a list from here. Open their board to search it directly."] };
  }
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

function compareLoads(a: LoadListing, b: LoadListing, sort: LoadQuery["sort"]) {
  const missing = 10 ** 12;
  if (sort === "rpm") return (rpmOf(b) ?? -1) - (rpmOf(a) ?? -1);
  if (sort === "rate") return (rateOf(b) ?? -1) - (rateOf(a) ?? -1);
  return (minutesOf(a) ?? missing) - (minutesOf(b) ?? missing);
}

function minutesOf(load: LoadListing) {
  const text = load.postedAge ?? "";
  const min = text.match(/(\d+)\s*min/);
  const hr = text.match(/(\d+)\s*hr/);
  const day = text.match(/(\d+)\s*day/);
  if (min) return Number(min[1]);
  if (hr) return Number(hr[1]) * 60;
  if (day) return Number(day[1]) * 1440;
  return null;
}

function rpmOf(load: LoadListing) {
  const value = Number((load.perMile ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function rateOf(load: LoadListing) {
  const value = Number((load.rate ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

async function cachedText(url: string) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.html;
  const response = await fetch(url, {
    headers: {
      accept: "text/html",
      "accept-language": "en-US,en;q=0.9",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const html = await response.text();
  cache.set(url, { at: Date.now(), html });
  return html;
}

function parseDoft(html: string, sourceUrl: string): LoadListing[] {
  const blocks = html.split('<div class="b-load">').slice(1, 41);
  return blocks.flatMap((block, index) => {
    const pickup = plain(inner(block, "c-pu"));
    const originCity = texts(block, "c-addr")[0] ?? "";
    const destinationCity = texts(block, "c-addr")[1] ?? "";
    const originState = texts(block, "c-state")[0] ?? "";
    const destinationState = texts(block, "c-state")[1] ?? "";
    if (!originCity || !destinationCity) return [];
    const miles = numberFrom(plain(inner(block, "c-dist")));
    const equipment = plain(inner(block, "c-eq")) || "Truck";
    const weight = plain(inner(block, "c-weight"));
    return [{
      id: `doft-${index}-${originCity}-${destinationCity}-${miles ?? 0}`,
      source: "DOFT" as const,
      sourceUrl,
      pickup: pickup || "Posted",
      originCity,
      originState,
      destinationCity,
      destinationState,
      miles: miles && miles > 0 ? miles : null,
      equipment,
      weight: weight || "—",
      size: /ltl|partial/i.test(weight) ? "Partial" : "Full",
      rate: null,
      perMile: null,
      postedAge: null,
      brokerName: null,
      brokerPhone: null,
      brokerEmail: null,
      brokerDot: null,
      brokerGrade: null,
    }];
  });
}

function parseDirectFreight(html: string, sourceUrl: string): LoadListing[] {
  const marker = "RESULTS: ";
  const start = html.indexOf(marker);
  if (start < 0) return [];
  const array = readJsonArray(html.slice(start + marker.length));
  if (!array) return [];
  return array.slice(0, 40).flatMap((row) => {
    const originCity = text(row.origin_city);
    const destinationCity = text(row.destination_city);
    if (!originCity || !destinationCity) return [];
    const equipment = trailerLabel(row.trailer_type, row.other_trailer_types);
    const weight = typeof row.weight === "number" && row.weight > 0 ? `${row.weight.toLocaleString()} lbs` : "—";
    const rate = typeof row.pay_rate === "number" && row.pay_rate > 0 ? money(row.pay_rate) : null;
    const perMile = typeof row.rate_per_mile_est === "number" && row.rate_per_mile_est > 0
      ? `$${row.rate_per_mile_est.toFixed(2)}/mi`
      : null;
    return [{
      id: `df-${text(row.entry_id) || `${originCity}-${destinationCity}`}`,
      source: "Direct Freight" as const,
      sourceUrl,
      pickup: text(row.ship_date) || "Posted",
      originCity,
      originState: text(row.origin_state),
      destinationCity,
      destinationState: text(row.destination_state),
      miles: typeof row.trip_miles === "number" && row.trip_miles > 0 ? row.trip_miles : null,
      equipment,
      weight,
      size: row.full_load === false ? "Partial" : "Full",
      rate,
      perMile,
      postedAge: ageLabel(row.age),
      brokerName: null,
      brokerPhone: null,
      brokerEmail: null,
      brokerDot: null,
      brokerGrade: null,
    }];
  });
}

function trailerLabel(codes: unknown, other: unknown) {
  const list = Array.isArray(codes) ? codes.map((code) => String(code).toUpperCase()) : [];
  const named = list.map((code) => TRAILER[code] ?? TRAILER[code.charAt(0)] ?? "").filter(Boolean);
  if (named.length) return [...new Set(named)].join(" · ");
  return publicText(other) ?? "Truck";
}

function ageLabel(age: unknown) {
  if (typeof age !== "number" || age < 0) return null;
  if (age < 90) return `Posted ${Math.max(1, Math.round(age))} min ago`;
  const hours = Math.round(age / 60);
  if (hours < 48) return `Posted ${hours} hr ago`;
  return `Posted ${Math.round(hours / 24)} days ago`;
}

function publicText(value: unknown) {
  const raw = text(value);
  if (!raw || /sign up|premium|upgrade/i.test(raw)) return null;
  return raw;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readJsonArray(source: string) {
  let depth = 0;
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === "[") depth += 1;
    else if (source[i] === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(source.slice(0, i + 1)) as Array<Record<string, unknown>>;
          return Array.isArray(parsed) ? parsed : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function inner(block: string, cls: string) {
  const match = block.match(new RegExp(`class="c ${cls}"[^>]*>([\\s\\S]*?)<\\/div>`));
  return match?.[1] ?? "";
}

function texts(block: string, cls: string) {
  const found: string[] = [];
  const pattern = new RegExp(`class="c ${cls}"[^>]*>([\\s\\S]*?)<\\/div>`, "g");
  for (const match of block.matchAll(pattern)) found.push(plain(match[1]));
  return found;
}

function plain(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function numberFrom(value: string) {
  const match = value.replace(/,/g, "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function money(amount: number) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fresh(pickup: string) {
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const iso = pickup.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const named = pickup.match(/(\d{1,2})\s+([A-Za-z]{3})/);
  let date: Date | null = null;
  if (iso) date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  else if (named && months[named[2].toLowerCase()] != null) {
    const now = new Date();
    date = new Date(now.getFullYear(), months[named[2].toLowerCase()], Number(named[1]));
    if (date.getTime() - now.getTime() > 180 * 86400000) {
      date = new Date(now.getFullYear() - 1, months[named[2].toLowerCase()], Number(named[1]));
    }
  }
  if (!date || Number.isNaN(date.getTime())) return true;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - 1);
  return date >= cutoff;
}

function dedupe(loads: LoadListing[]) {
  const seen = new Set<string>();
  return loads.filter((load) => {
    const key = [
      load.source,
      load.originCity,
      load.originState,
      load.destinationCity,
      load.destinationState,
      load.miles ?? "",
      load.equipment,
      load.pickup,
    ].join("|").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
