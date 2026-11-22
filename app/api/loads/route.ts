import { availableLoads, readLoadQuery } from "@/lib/loads";
import {
  createPostedLoad,
  ensurePostedLoadsTable,
  updatePostedLoadStatus,
  type PostedLoadSource,
} from "@/lib/posted-loads";

function adminAuthorized(request: Request) {
  const expected = process.env.LOADS_ADMIN_KEY?.trim();
  if (!expected) return false;
  const provided = request.headers.get("x-loads-admin-key")?.trim() ?? "";
  return provided.length > 0 && provided === expected;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = readLoadQuery({
    state: url.searchParams.get("state") ?? undefined,
    city: url.searchParams.get("city") ?? undefined,
    equipment: url.searchParams.get("equipment") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
  });
  try {
    await ensurePostedLoadsTable();
    const result = await availableLoads(query);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load the board.";
    return Response.json({ error: message, loads: [], notes: [message] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!adminAuthorized(request)) {
    return Response.json({ error: "Admin key required." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Send a JSON load." }, { status: 400 });
  }

  const originCity = String(body.originCity ?? "").trim();
  const originState = String(body.originState ?? "").trim().toUpperCase();
  const destinationCity = String(body.destinationCity ?? "").trim();
  const destinationState = String(body.destinationState ?? "").trim().toUpperCase();
  const equipment = String(body.equipment ?? "").trim();
  const weight = String(body.weight ?? "").trim();
  const size = String(body.size ?? "Full").trim() || "Full";
  const rate = String(body.rate ?? "").trim();
  const perMile = String(body.perMile ?? "").trim();
  const pickupDate = String(body.pickupDate ?? "").trim();
  const notes = String(body.notes ?? "").trim();
  const brokerName = String(body.brokerName ?? "").trim();
  const brokerPhone = String(body.brokerPhone ?? "").trim();
  const brokerEmail = String(body.brokerEmail ?? "").trim();
  const brokerDot = String(body.brokerDot ?? "").replace(/\D/g, "");
  const sourceRaw = String(body.source ?? "Indus").trim();
  const source: PostedLoadSource = sourceRaw === "Laneora desk" ? "Laneora desk" : "Indus";
  const milesRaw = body.miles;
  const miles =
    milesRaw === null || milesRaw === undefined || milesRaw === ""
      ? null
      : Number(milesRaw);

  if (originCity.length < 2 || originCity.length > 60) {
    return Response.json({ error: "Enter an origin city." }, { status: 400 });
  }
  if (!/^[A-Z]{2}$/.test(originState)) {
    return Response.json({ error: "Origin state must be a 2-letter code." }, { status: 400 });
  }
  if (destinationCity.length < 2 || destinationCity.length > 60) {
    return Response.json({ error: "Enter a destination city." }, { status: 400 });
  }
  if (!/^[A-Z]{2}$/.test(destinationState)) {
    return Response.json({ error: "Destination state must be a 2-letter code." }, { status: 400 });
  }
  if (equipment.length < 2 || equipment.length > 60) {
    return Response.json({ error: "Enter equipment." }, { status: 400 });
  }
  if (miles != null && (!Number.isFinite(miles) || miles < 0 || miles > 5000)) {
    return Response.json({ error: "Miles look wrong." }, { status: 400 });
  }
  if (weight.length > 40 || size.length > 20 || rate.length > 40 || perMile.length > 40) {
    return Response.json({ error: "One of those fields is too long." }, { status: 400 });
  }
  if (notes.length > 800 || brokerName.length > 120 || brokerPhone.length > 40 || brokerEmail.length > 120) {
    return Response.json({ error: "One of those fields is too long." }, { status: 400 });
  }
  if (brokerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brokerEmail)) {
    return Response.json({ error: "That broker email does not look right." }, { status: 400 });
  }

  try {
    const load = await createPostedLoad({
      originCity,
      originState,
      destinationCity,
      destinationState,
      equipment,
      weight: weight || null,
      size,
      miles,
      rate: rate || null,
      perMile: perMile || null,
      pickupDate: pickupDate || null,
      notes: notes || null,
      brokerName: brokerName || null,
      brokerPhone: brokerPhone || null,
      brokerEmail: brokerEmail || null,
      brokerDot: brokerDot || null,
      source,
      status: "open",
    });
    return Response.json({ ok: true, load });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the load.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!adminAuthorized(request)) {
    return Response.json({ error: "Admin key required." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Send id and status." }, { status: 400 });
  }
  const idRaw = String(body.id ?? "").replace(/^indus-/, "");
  const id = Number(idRaw);
  const status = String(body.status ?? "");
  if (!Number.isInteger(id) || id < 1) {
    return Response.json({ error: "Need a posted load id." }, { status: 400 });
  }
  if (status !== "open" && status !== "filled" && status !== "hidden") {
    return Response.json({ error: "Status must be open, filled, or hidden." }, { status: 400 });
  }
  try {
    const load = await updatePostedLoadStatus(id, status);
    if (!load) return Response.json({ error: "Load not found." }, { status: 404 });
    return Response.json({ ok: true, load });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the load.";
    return Response.json({ error: message }, { status: 500 });
  }
}
