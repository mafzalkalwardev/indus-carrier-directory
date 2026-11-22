import type { LaneoraSearchBody, LaneoraSearchResult, PublicLoadDetail } from "@/lib/laneora";
import type { LoadListing } from "@/lib/loads";
import { cacheLiveLoads } from "@/lib/live-load-cache";

/** Local UI adapter — no Soft/helper required when LOADS_ADAPTER=mock. */
export function mockSearchLoads(body: LaneoraSearchBody): LaneoraSearchResult {
  const origin = typeof body.origin === "string"
    ? { city: body.origin, state: "TX" }
    : body.origin;
  const searchId = `mock-${Date.now()}`;
  const load: LoadListing = {
    id: "mock-1",
    source: "Laneora",
    sourceUrl: "",
    pickup: "Posted",
    originCity: origin.city || "Dallas",
    originState: (origin.state || "TX").toUpperCase(),
    destinationCity: "Atlanta",
    destinationState: "GA",
    miles: 780,
    equipment: "Van",
    weight: "42,000 lbs",
    size: "Full",
    rate: "$2,400",
    perMile: "$3.08/mi",
    postedAge: "Posted 12 min ago",
    brokerName: "Mock Broker LLC",
    brokerPhone: "2145550100",
    brokerEmail: "desk@mock-broker.example",
    brokerDot: "1234567",
    brokerGrade: "91",
    notes: null,
    creditScore: 91,
    daysToPay: 28,
    comments: [],
    lengthFt: 53,
    searchId,
    matchId: "mock-1",
    capacity: "FULL",
    rateAmount: 2400,
    ratePerMileAmount: 3.08,
  };
  cacheLiveLoads(searchId, [load]);
  return { ok: true, search_id: searchId, count: 1, loads: [load] };
}

export function mockLoadDetail(searchId: string, matchId: string): PublicLoadDetail {
  return {
    ok: true,
    search_id: searchId,
    id: matchId,
    dot: { dot_number: "1234567", broker_mc: "MC123456" },
    peer_rating: { average: 4.2, count: 11 },
  };
}

export function useMockLoadsAdapter() {
  return (process.env.LOADS_ADAPTER ?? "").trim().toLowerCase() === "mock";
}
