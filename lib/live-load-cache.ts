import type { LoadListing } from "@/lib/loads";

type CacheEntry = { load: LoadListing; at: number };

const TTL_MS = 30 * 60 * 1000;
const store = new Map<string, CacheEntry>();

function key(searchId: string, matchId: string) {
  return `${searchId.trim()}::${matchId.trim()}`;
}

export function cacheLiveLoads(searchId: string, loads: LoadListing[]) {
  const sid = searchId.trim();
  if (!sid) return;
  const now = Date.now();
  for (const load of loads) {
    const mid = (load.matchId || load.id || "").trim();
    if (!mid) continue;
    store.set(key(sid, mid), { load, at: now });
  }
  if (store.size > 5000) prune(now);
}

export function getCachedLiveLoad(searchId: string, matchId: string): LoadListing | null {
  const entry = store.get(key(searchId, matchId));
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) {
    store.delete(key(searchId, matchId));
    return null;
  }
  return entry.load;
}

function prune(now: number) {
  for (const [k, entry] of store) {
    if (now - entry.at > TTL_MS) store.delete(k);
  }
}
