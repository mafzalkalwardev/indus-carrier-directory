import { LaneoraApiError, getLoadDetail, toPublicLoadDetail, getCachedLiveLoad } from "@/lib/live-loads";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { allowSameOrigin } from "@/lib/request-origin";

export async function GET(request: Request) {
  if (!allowSameOrigin(request)) {
    return Response.json({ error: "Cross-origin detail is not allowed." }, { status: 403 });
  }

  const limited = rateLimit(`loads-detail:${clientIp(request)}`, { limit: 60, windowMs: 60_000 });
  if (!limited.ok) {
    return Response.json(
      { error: "Too many detail requests. Try again shortly.", code: "RATE_LIMIT" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const url = new URL(request.url);
  const searchId = url.searchParams.get("search_id")?.trim() ?? "";
  const matchId = (url.searchParams.get("match_id") ?? url.searchParams.get("id") ?? "").trim();

  if (!searchId || !matchId) {
    return Response.json({ error: "Missing load identifiers." }, { status: 400 });
  }

  try {
    const result = await getLoadDetail(searchId, matchId);
    const safe = toPublicLoadDetail(result as unknown as Record<string, unknown>, searchId, matchId);
    const cached = getCachedLiveLoad(searchId, matchId);
    return Response.json({
      ...safe,
      ...(cached
        ? {
            load: {
              origin: `${cached.originCity}, ${cached.originState}`,
              destination: `${cached.destinationCity}, ${cached.destinationState}`,
              pickup: cached.pickup,
              equipment: cached.equipment,
              weight: cached.weight,
              size: cached.size,
              miles: cached.miles,
              rate: cached.rate,
              rpm: cached.perMile,
              age: cached.postedAge,
              broker: cached.brokerName,
              phone: cached.brokerPhone,
              email: cached.brokerEmail,
              credit: cached.creditScore ?? cached.brokerGrade,
              days_to_pay: cached.daysToPay,
              length: cached.lengthFt,
              comments: cached.comments?.join(" · ") ?? cached.notes,
              capacity: cached.capacity,
            },
          }
        : {}),
    });
  } catch (error) {
    const status = error instanceof LaneoraApiError
      ? (error.status >= 400 && error.status < 600 ? error.status : 502)
      : 503;
    return Response.json({ error: "Could not load that freight detail." }, { status });
  }
}
