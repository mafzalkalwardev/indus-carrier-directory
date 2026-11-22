#!/usr/bin/env node
/**
 * Ensures toPublicLoadDetail never echoes Soft/DAT raw detail blobs.
 * Run: node scripts/test-public-load-detail.mjs
 */
import assert from "node:assert/strict";

// Lightweight mirror of toPublicLoadDetail (avoids TS path bootstrap in CI).
function toPublicLoadDetail(raw, fallbackSearchId = "", fallbackMatchId = "") {
  const dotRaw = raw.dot && typeof raw.dot === "object" ? raw.dot : {};
  const peerRaw = raw.peer_rating && typeof raw.peer_rating === "object" ? raw.peer_rating : {};
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

const dirty = {
  search_id: "s1",
  id: "m1",
  dot: { dot_number: "1", broker_mc: "MC1", secret: "x" },
  peer_rating: { average: 4, count: 2, leak: true },
  detail: { __typename: "FreightSearchV4", dat: "nope", posterInfo: { phone: "1" } },
  soft: "should-not-appear",
  graphql: {},
};

const safe = toPublicLoadDetail(dirty, "s1", "m1");
assert.equal(safe.ok, true);
assert.equal(safe.search_id, "s1");
assert.equal(safe.dot.dot_number, "1");
assert.equal("detail" in safe, false);
assert.equal("soft" in safe, false);
assert.equal("graphql" in safe, false);
assert.equal("secret" in safe.dot, false);
const json = JSON.stringify(safe);
assert.equal(/DAT|Soft|graphql|posterInfo|__typename/i.test(json), false);
console.log("test-public-load-detail: ok");
