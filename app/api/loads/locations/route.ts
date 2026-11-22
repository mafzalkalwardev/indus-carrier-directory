import { suggestPlaces } from "@/lib/places";
import { loadsHelperAuthHeaders } from "@/lib/helper-auth";
import { allowSameOrigin } from "@/lib/request-origin";

export type LocationSuggestion = {
  label: string;
  city: string;
  state: string;
  postal_code?: string;
};

export async function GET(request: Request) {
  if (!allowSameOrigin(request)) {
    return Response.json({ error: "Cross-origin locations are not allowed." }, { status: 403 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || url.searchParams.get("term") || "").trim();
  if (q.length < 2) {
    return Response.json({ ok: true, suggestions: [] as LocationSuggestion[] });
  }

  const fromHelper = await fetchHelperSuggestions(q);
  if (fromHelper.length) {
    return Response.json({ ok: true, source: "live", suggestions: fromHelper });
  }

  // Local fallback so the UI still typeaheads when the helper is down.
  const local = suggestPlaces(q).map((place) => {
    if (place.value.includes(",")) {
      const [city, state] = place.value.split(",").map((part) => part.trim());
      return { label: place.label, city: city || place.label, state: (state || "").toUpperCase() };
    }
    // State-only hits — use as destination/state hints with empty city.
    return { label: place.label, city: "", state: place.value.toUpperCase() };
  });
  return Response.json({ ok: true, source: "local", suggestions: local });
}

async function fetchHelperSuggestions(q: string): Promise<LocationSuggestion[]> {
  const base = (
    process.env.LOADS_HELPER_BASE
    || process.env.MOTUS_PROXY_BASE
    || "http://127.0.0.1:8799"
  ).replace(/\/+$/, "");
  try {
    const response = await fetch(
      `${base}/locations?q=${encodeURIComponent(q)}&limit=10`,
      {
        headers: loadsHelperAuthHeaders({ Accept: "application/json" }),
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      },
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as {
      ok?: boolean;
      suggestions?: Array<{
        label?: string;
        city?: string;
        state?: string;
        postal_code?: string;
      }>;
    };
    if (!payload.ok || !Array.isArray(payload.suggestions)) return [];
    return payload.suggestions
      .map((row) => ({
        label: String(row.label || "").trim(),
        city: String(row.city || "").trim(),
        state: String(row.state || "").trim().toUpperCase(),
        postal_code: row.postal_code ? String(row.postal_code) : undefined,
      }))
      .filter((row) => row.label);
  } catch {
    return [];
  }
}
