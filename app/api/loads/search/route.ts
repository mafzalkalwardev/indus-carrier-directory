import {
  LaneoraApiError,
  mapEquipmentCodes,
  searchLoads,
  type LaneoraPlace,
  type LaneoraSearchBody,
} from "@/lib/live-loads";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { allowSameOrigin } from "@/lib/request-origin";

export async function POST(request: Request) {
  if (!allowSameOrigin(request)) {
    return Response.json({ error: "Cross-origin search is not allowed." }, { status: 403 });
  }

  const limited = rateLimit(`loads-search:${clientIp(request)}`, { limit: 30, windowMs: 60_000 });
  if (!limited.ok) {
    return Response.json(
      { error: "Too many searches. Try again shortly.", code: "RATE_LIMIT" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Send a JSON search body.", code: "BAD_BODY" }, { status: 400 });
  }

  try {
    const searchBody = normalizeSearchBody(body as Record<string, unknown>);
    const result = await searchLoads(searchBody);
    return Response.json(result);
  } catch (error) {
    return laneoraErrorResponse(error);
  }
}

function normalizeSearchBody(body: Record<string, unknown>): LaneoraSearchBody {
  const origin = placeFrom(body.origin ?? {
    city: body.origin_city ?? body.originCity,
    state: body.origin_state ?? body.originState,
    deadhead_miles: body.origin_deadhead_miles ?? body.originDeadhead,
    states: body.origin_states,
  });
  const destinationRaw = body.destination ?? {
    city: body.destination_city ?? body.destinationCity,
    state: body.destination_state ?? body.destinationState,
    deadhead_miles: body.destination_deadhead_miles ?? body.destinationDeadhead,
    states: body.destination_states,
  };
  const destination = placeFrom(destinationRaw);
  const equipment = mapEquipmentCodes(
    (body.equipment as string | string[] | undefined)
      ?? (body.trailer as string | undefined),
  );
  const capacityRaw = String(body.capacity ?? "BOTH").trim().toUpperCase();
  const capacity = capacityRaw === "FULL" || capacityRaw === "PARTIAL" || capacityRaw === "BOTH"
    ? capacityRaw
    : "BOTH";
  const limitRaw = body.limit == null || body.limit === "" ? 100 : Number(body.limit);
  const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, Math.floor(limitRaw))) : 100;
  const maxAgeRaw = body.max_age_minutes ?? body.maxAgeMinutes;
  const maxAge = maxAgeRaw == null || maxAgeRaw === "" ? undefined : Number(maxAgeRaw);
  if (maxAge != null && (!Number.isFinite(maxAge) || maxAge < 1 || maxAge > 10080)) {
    throw new LaneoraApiError(400, "max_age_minutes must be between 1 and 10080.");
  }
  const destStates = typeof destination === "object" && destination && Array.isArray(destination.states)
    ? destination.states
    : null;
  const originStates = typeof origin === "object" && origin && Array.isArray(origin.states)
    ? origin.states
    : null;
  if (destStates && destStates.length > 51) {
    throw new LaneoraApiError(400, "Too many destination states.");
  }
  if (originStates && originStates.length > 51) {
    throw new LaneoraApiError(400, "Too many origin states.");
  }

  const search: LaneoraSearchBody = {
    origin: origin ?? { state: "TX" },
    capacity,
    limit,
  };
  if (destination) search.destination = destination;
  if (equipment?.length) search.equipment = equipment;
  const earliest = String(body.earliest ?? "").trim();
  const latest = String(body.latest ?? "").trim();
  if (earliest) search.earliest = earliest;
  if (latest) search.latest = latest;
  if (maxAge != null) search.max_age_minutes = maxAge;

  const orderBy = String(body.order_by ?? body.orderBy ?? "").trim().toUpperCase();
  if (orderBy) search.order_by = orderBy;
  if (body.bookable_only === true || body.bookableOnly === true || body.bookable_only === "1") {
    search.bookable_only = true;
  }
  const tracking = String(body.tracking ?? "ALL").trim().toUpperCase();
  if (tracking === "ALL" || tracking === "TRACKING" || tracking === "NO_TRACKING") {
    search.tracking = tracking;
  }
  if (typeof body.include_load_board === "boolean") search.include_load_board = body.include_load_board;
  else if (typeof body.includeLoadBoard === "boolean") search.include_load_board = body.includeLoadBoard;
  if (typeof body.include_private_network === "boolean") search.include_private_network = body.include_private_network;
  else if (typeof body.includePrivateNetwork === "boolean") {
    search.include_private_network = body.includePrivateNetwork;
  }
  const lengthRaw = body.length_ft ?? body.lengthFt;
  const length = lengthRaw == null || lengthRaw === "" ? undefined : Number(lengthRaw);
  if (length != null && Number.isFinite(length) && length > 0) search.length_ft = length;
  const weightRaw = body.weight_lbs ?? body.weightLbs;
  const weight = weightRaw == null || weightRaw === "" ? undefined : Number(weightRaw);
  if (weight != null && Number.isFinite(weight) && weight > 0) search.weight_lbs = weight;
  return search;
}

function placeFrom(value: unknown): LaneoraPlace | undefined {
  if (typeof value === "string") {
    const text = value.trim();
    return text ? text : undefined;
  }
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const city = String(row.city ?? "").trim();
  const state = String(row.state ?? "").trim().toUpperCase();
  const states = Array.isArray(row.states)
    ? row.states.map((item) => String(item).trim().toUpperCase()).filter(Boolean)
    : undefined;
  const deadheadRaw = row.deadhead_miles ?? row.deadheadMiles;
  const deadhead = deadheadRaw == null || deadheadRaw === "" ? undefined : Number(deadheadRaw);
  const latitude = row.latitude == null || row.latitude === "" ? undefined : Number(row.latitude);
  const longitude = row.longitude == null || row.longitude === "" ? undefined : Number(row.longitude);

  const hasPlace = Boolean(city || state || (states && states.length));
  const hasDeadhead = deadhead != null && Number.isFinite(deadhead);
  if (!hasPlace && !hasDeadhead) return undefined;
  return {
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(states?.length ? { states } : {}),
    ...(hasDeadhead ? { deadhead_miles: deadhead } : {}),
    ...(latitude != null && Number.isFinite(latitude) ? { latitude } : {}),
    ...(longitude != null && Number.isFinite(longitude) ? { longitude } : {}),
  };
}

async function laneoraErrorResponse(error: unknown) {
  const { classifyLoadsError, publicLoadsMessage } = await import("@/lib/loads-errors");
  const code = classifyLoadsError(error);
  const status = error instanceof LaneoraApiError
    ? (error.status >= 400 && error.status < 600 ? error.status : 502)
    : code === "BOARD_DOWN" ? 503 : 502;
  return Response.json({ error: publicLoadsMessage(code), code }, { status });
}
