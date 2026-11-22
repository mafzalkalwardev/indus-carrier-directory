import type { LoadListing } from "@/lib/loads";
import { TRAILER_CHOICES } from "@/lib/loads";
import { cacheLiveLoads } from "@/lib/live-load-cache";

export type LaneoraPlaceObject = {
  city?: string;
  state?: string;
  deadhead_miles?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  states?: string[];
};

export type LaneoraPlace = LaneoraPlaceObject | string;

export type LaneoraSearchBody = {
  origin: LaneoraPlace;
  destination?: LaneoraPlace;
  equipment?: string[];
  capacity?: "BOTH" | "FULL" | "PARTIAL";
  earliest?: string;
  latest?: string;
  max_age_minutes?: number;
  limit?: number;
  /** DAT orderBy — AGE_ASC | AGE_DESC | RATE_DESC | DISTANCE_ASC */
  order_by?: string;
  bookable_only?: boolean;
  tracking?: "ALL" | "TRACKING" | "NO_TRACKING";
  include_load_board?: boolean;
  include_private_network?: boolean;
  /** Truck max length (ft) — DAT capacity filter */
  length_ft?: number;
  /** Truck max weight (lbs) — DAT capacity filter */
  weight_lbs?: number;
};

export type LaneoraLoad = {
  id: string;
  posting_id?: string;
  origin?: LaneoraPlaceObject;
  destination?: LaneoraPlaceObject;
  availability?: { earliest?: string; latest?: string };
  equipment?: string;
  capacity?: string;
  length_ft?: number | null;
  weight_lbs?: number | null;
  miles?: number | null;
  rate?: number | null;
  currency?: string;
  rate_per_mile?: number | null;
  company?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  phone_extension?: string | null;
  email?: string | null;
  credit_score?: number | null;
  days_to_pay?: number | null;
  comments?: string[] | string | null;
  reference?: string | null;
  created_when?: string | null;
  detail?: Record<string, unknown>;
};

export type LaneoraSearchResult = {
  ok: true;
  search_id: string;
  count: number;
  loads: LoadListing[];
};

/** Public detail payload — never includes Soft/DAT raw GraphQL or provider keys. */
export type PublicLoadDetail = {
  ok: true;
  search_id: string;
  id: string;
  dot: {
    broker_mc?: string;
    carrier_mc?: string;
    dot_number?: string;
  };
  peer_rating: {
    average?: number | null;
    count?: number | null;
  };
  /** @deprecated internal only — stripped before any browser response */
  detail?: Record<string, unknown>;
};

export type LaneoraDetailResult = PublicLoadDetail;

export class LaneoraApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "LaneoraApiError";
    this.status = status;
    this.body = body;
  }
}

type TokenCache = { token: string; at: number };

let tokenCache: TokenCache | null = null;

const EQUIPMENT_CODE: Record<string, string> = {
  van: "V",
  "dry van": "V",
  dryvan: "V",
  reefer: "R",
  refrigerated: "R",
  flatbed: "F",
  flat: "F",
  "straight box": "SB",
  box: "SB",
  "box truck": "SB",
  "power only": "PO",
  power: "PO",
  po: "PO",
  "van pallet": "VP",
  vp: "VP",
  "van team": "VM",
  vm: "VM",
  "van logistics": "VG",
  vg: "VG",
  "moving van": "MV",
  mv: "MV",
  sprinter: "SB",
  stepdeck: "F",
  "step deck": "F",
  conestoga: "F",
  hotshot: "F",
  v: "V",
  r: "R",
  f: "F",
  sb: "SB",
};

const EQUIPMENT_LABEL: Record<string, string> = {
  V: "Van",
  R: "Reefer",
  F: "Flatbed",
  SB: "Straight box",
  PO: "Power only",
  VP: "Van (pallet)",
  VG: "Van (logistics)",
  VM: "Van (team)",
  MV: "Moving van",
};

/** DAT-aligned equipment choices for the live board search form. */
export const LIVE_EQUIPMENT_CHOICES: [string, string][] = [
  ["all", "Any equipment"],
  ["V", "Van (V)"],
  ["R", "Reefer (R)"],
  ["F", "Flatbed (F)"],
  ["SB", "Straight box (SB)"],
  ["PO", "Power only (PO)"],
  ["VP", "Van pallet (VP)"],
  ["VG", "Van logistics (VG)"],
  ["VM", "Van team (VM)"],
  ["MV", "Moving van (MV)"],
];

export function laneoraConfig() {
  const base = (process.env.LANEORA_API_BASE ?? "").trim().replace(/\/+$/, "");
  const username = (process.env.LANEORA_USERNAME ?? "").trim();
  const password = process.env.LANEORA_PASSWORD ?? "";
  return { base, username, password };
}

export function laneoraConfigured() {
  const { base, username, password } = laneoraConfig();
  return Boolean(base && username && password);
}

export function invalidateToken() {
  tokenCache = null;
}

export async function getToken(force = false): Promise<string> {
  if (!force && tokenCache?.token) return tokenCache.token;
  const { base, username, password } = laneoraConfig();
  if (!base || !username || !password) {
    throw new LaneoraApiError(
      503,
      "Live board is not configured. Set LANEORA_API_BASE, LANEORA_USERNAME, and LANEORA_PASSWORD on the Next.js host.",
    );
  }
  const response = await softFetch(`${base}/api/v1/session`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new LaneoraApiError(
      response.status,
      apiMessage(payload, response.status === 401
        ? "Live board sign-in failed."
        : `Live board session error (${response.status}).`),
      payload,
    );
  }
  const token = String((payload as { token?: unknown })?.token ?? "").trim();
  if (!token) {
    throw new LaneoraApiError(502, "Laneora session response had no token.", payload);
  }
  tokenCache = { token, at: Date.now() };
  return token;
}

/** Probe Soft without credentials. Soft must be reachable from the Next.js host (LAN, tunnel, or public Soft URL). */
export async function probeLaneora(): Promise<{ ok: boolean; status?: number; message: string }> {
  const { base } = laneoraConfig();
  if (!base) {
    return { ok: false, message: "LANEORA_API_BASE is not set." };
  }
  try {
    const response = await softFetch(`${base}/api/v1`, {
      method: "GET",
      headers: { accept: "application/json" },
    });
    const text = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: text.slice(0, 240) || `Soft /api/v1 returned ${response.status}.`,
      };
    }
    return { ok: true, status: response.status, message: text.slice(0, 240) || "Soft is reachable." };
  } catch (error) {
    return {
      ok: false,
      message: unreachableMessage(error, base),
    };
  }
}

export async function searchLoads(body: LaneoraSearchBody): Promise<LaneoraSearchResult> {
  assertSearchBody(body);
  if ((process.env.LOADS_ADAPTER ?? "").trim().toLowerCase() === "mock") {
    const { mockSearchLoads } = await import("@/lib/live-loads-mock");
    return mockSearchLoads(body);
  }
  const raw = await authorizedJson<Record<string, unknown>>("POST", "/api/v1/loads/search", body);
  const searchId = String(raw.search_id ?? "").trim();
  const rows = Array.isArray(raw.loads) ? (raw.loads as LaneoraLoad[]) : [];
  const wantedEquipment = new Set((body.equipment ?? []).map((code) => String(code).trim().toUpperCase()).filter(Boolean));
  const maxLength = typeof body.length_ft === "number" && body.length_ft > 0 ? body.length_ft : null;
  const maxWeight = typeof body.weight_lbs === "number" && body.weight_lbs > 0 ? body.weight_lbs : null;
  const loads = rows
    .map((row) => mapLaneoraLoad(row, searchId))
    .filter((load) => {
      if (wantedEquipment.size) {
        const code = equipmentCodeFromLabel(load.equipment);
        if (!code || !wantedEquipment.has(code)) return false;
      }
      if (maxLength != null && load.lengthFt != null && load.lengthFt > maxLength) return false;
      if (maxWeight != null) {
        const lbs = Number(String(load.weight).replace(/[^\d.]/g, ""));
        if (Number.isFinite(lbs) && lbs > maxWeight) return false;
      }
      return true;
    });
  cacheLiveLoads(searchId, loads);
  return {
    ok: true,
    search_id: searchId,
    count: loads.length,
    loads,
  };
}

function equipmentCodeFromLabel(label: string | null | undefined): string | null {
  const text = String(label ?? "").trim();
  if (!text) return null;
  const upper = text.toUpperCase();
  if (ALLOWED_EQUIPMENT.has(upper)) return upper;
  return EQUIPMENT_CODE[text.toLowerCase()] ?? null;
}

export async function getLoadDetail(searchId: string, matchId: string): Promise<LaneoraDetailResult> {
  const sid = searchId.trim();
  const mid = matchId.trim();
  if (!sid || !mid) {
    throw new LaneoraApiError(400, "search_id and match_id are required.");
  }
  if ((process.env.LOADS_ADAPTER ?? "").trim().toLowerCase() === "mock") {
    const { mockLoadDetail } = await import("@/lib/live-loads-mock");
    return mockLoadDetail(sid, mid);
  }
  const query = new URLSearchParams({ search_id: sid, match_id: mid });
  const raw = await authorizedJson<Record<string, unknown>>(
    "GET",
    `/api/v1/loads/detail?${query.toString()}`,
  );
  return toPublicLoadDetail(raw, sid, mid);
}

/** Strip Soft/DAT/raw GraphQL before anything reaches the browser. */
export function toPublicLoadDetail(
  raw: Record<string, unknown>,
  fallbackSearchId = "",
  fallbackMatchId = "",
): PublicLoadDetail {
  const dotRaw = raw.dot && typeof raw.dot === "object" ? (raw.dot as Record<string, unknown>) : {};
  const peerRaw = raw.peer_rating && typeof raw.peer_rating === "object"
    ? (raw.peer_rating as Record<string, unknown>)
    : {};
  return {
    ok: true,
    search_id: String(raw.search_id ?? fallbackSearchId),
    id: String(raw.id ?? fallbackMatchId),
    dot: {
      ...(typeof dotRaw.broker_mc === "string" ? { broker_mc: dotRaw.broker_mc } : {}),
      ...(typeof dotRaw.carrier_mc === "string" ? { carrier_mc: dotRaw.carrier_mc } : {}),
      ...(typeof dotRaw.dot_number === "string" ? { dot_number: dotRaw.dot_number } : {}),
    },
    peer_rating: {
      average: typeof peerRaw.average === "number" ? peerRaw.average : null,
      count: typeof peerRaw.count === "number" ? peerRaw.count : null,
    },
  };
}

const ALLOWED_EQUIPMENT = new Set(Object.keys(EQUIPMENT_LABEL));

export function mapEquipmentCodes(equipment: string | string[] | undefined): string[] | undefined {
  if (equipment == null || equipment === "" || equipment === "all") return undefined;
  const values = Array.isArray(equipment) ? equipment : [equipment];
  const codes = values
    .map((value) => {
      const raw = String(value).trim();
      if (!raw || raw.toLowerCase() === "all") return "";
      return EQUIPMENT_CODE[raw.toLowerCase()] ?? raw.toUpperCase();
    })
    .filter((code) => ALLOWED_EQUIPMENT.has(code));
  return codes.length ? [...new Set(codes)] : undefined;
}

export function equipmentChoicesForLaneora() {
  return LIVE_EQUIPMENT_CHOICES;
}

export function equipmentLabel(code: string) {
  return EQUIPMENT_LABEL[code.toUpperCase()] ?? code;
}

export function mapLaneoraLoad(row: LaneoraLoad, searchId: string): LoadListing {
  const originCity = row.origin?.city?.trim() || row.city?.trim() || "";
  const originState = (row.origin?.state ?? row.state ?? "").toString().trim().toUpperCase();
  const destinationCity = row.destination?.city?.trim() || "";
  const destinationState = (row.destination?.state ?? "").toString().trim().toUpperCase();
  const equipmentCode = String(row.equipment ?? "").trim().toUpperCase();
  const equipment = EQUIPMENT_LABEL[equipmentCode] ?? (row.equipment?.trim() || "Truck");
  const weight = typeof row.weight_lbs === "number" && row.weight_lbs > 0
    ? `${row.weight_lbs.toLocaleString()} lbs`
    : "—";
  const lengthFt = typeof row.length_ft === "number" && row.length_ft > 0 ? row.length_ft : null;
  const capacity = String(row.capacity ?? "").trim().toUpperCase() || null;
  const size = capacity === "PARTIAL" ? "Partial" : capacity === "FULL" ? "Full" : lengthFt ? `${lengthFt} ft` : "—";
  const rateAmount = typeof row.rate === "number" && Number.isFinite(row.rate) ? row.rate : null;
  const rpmAmount = typeof row.rate_per_mile === "number" && Number.isFinite(row.rate_per_mile)
    ? row.rate_per_mile
    : null;
  const comments = normalizeComments(row.comments);
  const pickup = row.availability?.earliest?.slice(0, 10)
    || row.created_when?.slice(0, 10)
    || "Posted";
  const phone = [row.phone, row.phone_extension].filter(Boolean).join(" x").trim() || null;
  const originDh = typeof row.origin?.deadhead_miles === "number" && row.origin.deadhead_miles >= 0
    ? Math.round(row.origin.deadhead_miles)
    : null;

  return {
    id: String(row.id || row.posting_id || `${originCity}-${destinationCity}`),
    source: "Laneora",
    sourceUrl: "",
    pickup,
    originCity,
    originState,
    destinationCity,
    destinationState,
    miles: typeof row.miles === "number" && row.miles > 0 ? Math.round(row.miles) : null,
    equipment,
    weight,
    size,
    rate: rateAmount != null ? money(rateAmount) : null,
    perMile: rpmAmount != null ? `$${rpmAmount.toFixed(2)}/mi` : null,
    postedAge: ageFromCreated(row.created_when),
    ageShort: ageShortFromCreated(row.created_when),
    brokerName: row.company?.trim() || null,
    brokerPhone: phone,
    brokerEmail: row.email?.trim() || null,
    brokerDot: null,
    brokerGrade: typeof row.credit_score === "number" ? String(row.credit_score) : null,
    notes: comments.length ? comments.join(" · ") : null,
    creditScore: typeof row.credit_score === "number" ? row.credit_score : null,
    daysToPay: typeof row.days_to_pay === "number" ? row.days_to_pay : null,
    comments,
    lengthFt,
    searchId: searchId || null,
    matchId: String(row.id || ""),
    capacity,
    rateAmount,
    ratePerMileAmount: rpmAmount,
    originDeadhead: originDh,
  };
}

export function isLaneoraUnavailable(error: unknown) {
  if (!(error instanceof LaneoraApiError)) {
    return /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network|unreachable|AbortError/i.test(
      error instanceof Error ? error.message : String(error),
    );
  }
  return error.status === 409 || error.status === 502 || error.status === 503 || error.status === 504;
}

async function authorizedJson<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const run = async (token: string) => {
    const { base } = laneoraConfig();
    const headers: Record<string, string> = {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    };
    const init: RequestInit = { method, headers };
    if (method === "POST") {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(body ?? {});
    }
    return softFetch(`${base}${path}`, init);
  };

  let token = await getToken();
  let response = await run(token);
  if (response.status === 401) {
    invalidateToken();
    token = await getToken(true);
    response = await run(token);
  }

  const payload = await readJson(response);
  if (!response.ok) {
    throw new LaneoraApiError(
      response.status,
      apiMessage(payload, `Live board request failed (${response.status}).`),
      payload,
    );
  }
  return payload as T;
}

async function softFetch(url: string, init: RequestInit) {
  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
    });
  } catch (error) {
    const { base } = laneoraConfig();
    // Never log request bodies / broker PII — path + status class only.
    const safeCause = error instanceof Error ? error.name : "fetch_error";
    throw new LaneoraApiError(503, unreachableMessage(error, base), { cause: safeCause });
  }
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text.slice(0, 400) };
  }
}

function apiMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const row = payload as Record<string, unknown>;
  for (const key of ["error", "message", "detail", "reason"]) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function unreachableMessage(error: unknown, base: string) {
  const tip =
    " Live board upstream must be reachable from the Next.js host (LAN, VPN/tunnel, or LANEORA_API_BASE).";
  const detail = error instanceof Error ? error.message : String(error);
  return `Live board is unreachable at ${base || "(unset)"}. ${detail}.${tip}`;
}

function assertSearchBody(body: LaneoraSearchBody) {
  if (!body || typeof body !== "object") {
    throw new LaneoraApiError(400, "Send a JSON search body.");
  }
  if (!hasOrigin(body.origin)) {
    throw new LaneoraApiError(400, "Origin is required (city/state, states[], or place string).");
  }
  if (body.capacity && !["BOTH", "FULL", "PARTIAL"].includes(body.capacity)) {
    throw new LaneoraApiError(400, "Capacity must be BOTH, FULL, or PARTIAL.");
  }
  if (body.limit != null && (!Number.isFinite(body.limit) || body.limit < 1 || body.limit > 500)) {
    throw new LaneoraApiError(400, "limit must be between 1 and 500.");
  }
}

function hasOrigin(origin: LaneoraPlace | undefined) {
  if (typeof origin === "string") return origin.trim().length > 0;
  if (!origin || typeof origin !== "object") return false;
  if (Array.isArray(origin.states) && origin.states.length) return true;
  if (origin.city?.trim() && origin.state?.trim()) return true;
  if (origin.state?.trim()) return true;
  return false;
}

function normalizeComments(value: LaneoraLoad["comments"]) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function money(amount: number) {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 ? 2 : 0,
  });
}

function ageFromCreated(created: string | null | undefined) {
  if (!created) return null;
  const at = Date.parse(created);
  if (!Number.isFinite(at)) return null;
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (minutes < 90) return `Posted ${Math.max(1, minutes)} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `Posted ${hours} hr ago`;
  return `Posted ${Math.round(hours / 24)} days ago`;
}

/** Compact age like DAT One result column (12m / 2h / 1d). */
function ageShortFromCreated(created: string | null | undefined) {
  if (!created) return null;
  const at = Date.parse(created);
  if (!Number.isFinite(at)) return null;
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
