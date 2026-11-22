#!/usr/bin/env python3
"""
Laneora Soft live load search helper (Frankfurt capture host).

Uses the already-running Laneora Chrome (CDP :9334) only to harvest a short-lived
DAT Bearer token, then calls DAT GraphQL FindLoads from this host (Surfshark US egress).
Does not change cookie capture / push scripts.
"""
from __future__ import annotations

import json
import os
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import websocket

CDP = "http://127.0.0.1:9334"
GRAPHQL = "https://freight.api.dat.com/one-web-bff/graphql"
# Bind loopback by default. Override with LOADS_HELPER_BIND=0.0.0.0 only behind firewall + token.
_BIND_HOST = (os.environ.get("LOADS_HELPER_BIND") or "127.0.0.1").strip() or "127.0.0.1"
_BIND_PORT = int((os.environ.get("LOADS_HELPER_PORT") or "8799").strip() or "8799")
BIND = (_BIND_HOST, _BIND_PORT)
# Shared secret with Next.js / Motus enrich / Soft tunnel callers. Required unless LOADS_HELPER_AUTH=off (dev only).
HELPER_TOKEN = (os.environ.get("LOADS_HELPER_TOKEN") or "").strip()
HELPER_AUTH_OFF = (os.environ.get("LOADS_HELPER_AUTH") or "").strip().lower() in {"0", "off", "false", "no"}
TOKEN_LOCK = threading.Lock()
TOKEN_CACHE: dict[str, Any] = {"token": "", "at": 0.0}

FIND_LOADS_QUERY = """
query FindLoads($criteria: FreightSearchV4SearchCriteriaInput!) {
  freightSearchV4 {
    findLoads(criteria: $criteria) {
      __typename
      ... on FreightSearchV4FindLoadsSuccess {
        searchId
        results {
          resultId
          comments
          estimatedRatePerMile
          servicedWhen
          tripLength { miles }
          originDeadheadMiles { miles }
          availability { earliestWhen latestWhen }
          assetInfo {
            postingId
            equipmentType
            origin { city stateProv }
            destination { city stateProv }
            capacity { fullPartial maximumLengthFeet maximumWeightPounds }
          }
          rateInfo {
            nonBookable { rateUsd basis }
          }
          posterInfo {
            companyName
            city
            state
            contact { email phone { number extension } }
            credit { creditScore daysToPay }
          }
          posterDotIds { dotNumber brokerMcNumber carrierMcNumber }
        }
      }
    }
  }
}
"""

LOCATION_QUERY = """
query GetLocationSuggestions($lookupTerm: String!) {
  locationSuggestions(term: $lookupTerm) {
    id
    name
    city
    state
    latitude
    longitude
    postalCode
  }
}
"""


def _cdp_targets() -> list[dict[str, Any]]:
    with urllib.request.urlopen(f"{CDP}/json/list", timeout=8) as resp:
        return json.loads(resp.read().decode())


def _pick_page() -> dict[str, Any]:
    pages = [t for t in _cdp_targets() if t.get("type") == "page" and "one.dat.com" in (t.get("url") or "")]
    for page in pages:
        if "search-loads" in (page.get("url") or ""):
            return page
    if not pages:
        raise RuntimeError("Laneora Chrome has no open DAT One page on CDP 9334.")
    return pages[0]


def _cdp_recv_until(ws, predicate, timeout_s: float) -> Any:
    end = time.time() + timeout_s
    while time.time() < end:
        ws.settimeout(max(0.2, min(1.0, end - time.time())))
        try:
            data = json.loads(ws.recv())
        except Exception:
            continue
        hit = predicate(data)
        if hit is not None:
            return hit
    return None


def _token_from_network_event(data: dict[str, Any]) -> str | None:
    if data.get("method") != "Network.requestWillBeSent":
        return None
    req = (data.get("params") or {}).get("request") or {}
    url = req.get("url") or ""
    if "freight.api" not in url and "graphql" not in url:
        return None
    headers = req.get("headers") or {}
    auth = headers.get("Authorization") or headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


def harvest_bearer(force: bool = False) -> str:
    with TOKEN_LOCK:
        if not force and TOKEN_CACHE["token"] and time.time() - float(TOKEN_CACHE["at"]) < 12 * 60:
            return str(TOKEN_CACHE["token"])

    page = _pick_page()
    ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=30)
    try:
        msg_id = 1
        ws.send(json.dumps({"id": msg_id, "method": "Network.enable", "params": {"maxPostDataSize": 50000}}))
        msg_id += 1

        # 1) Prefer an already-open search-loads tab; navigate if needed.
        url = page.get("url") or ""
        if "search-loads" not in url:
            ws.send(
                json.dumps(
                    {
                        "id": msg_id,
                        "method": "Page.navigate",
                        "params": {"url": "https://one.dat.com/search-loads"},
                    }
                )
            )
            msg_id += 1

        # 2) Try reading a token from page storage without a hard reload.
        ws.send(
            json.dumps(
                {
                    "id": msg_id,
                    "method": "Runtime.evaluate",
                    "params": {
                        "returnByValue": True,
                        "awaitPromise": True,
                        "expression": """
(() => {
  const bags = [localStorage, sessionStorage];
  for (const bag of bags) {
    for (let i = 0; i < bag.length; i++) {
      const k = bag.key(i) || '';
      const v = bag.getItem(k) || '';
      if (/access_token|id_token|bearer|auth0/i.test(k) && v.length > 40) return v.replace(/^Bearer\\s+/i,'');
      const m = v.match(/"access_token"\\s*:\\s*"([^"]+)"/);
      if (m && m[1]) return m[1];
    }
  }
  return '';
})()
""",
                    },
                }
            )
        )
        stored = _cdp_recv_until(
            ws,
            lambda d: (d.get("result") or {}).get("result", {}).get("value") if d.get("id") == msg_id else None,
            4,
        )
        msg_id += 1
        if isinstance(stored, str) and len(stored) > 40:
            with TOKEN_LOCK:
                TOKEN_CACHE["token"] = stored
                TOKEN_CACHE["at"] = time.time()
            return stored

        # 3) Soft nudge: reload so SPA reissues authenticated GraphQL.
        ws.send(json.dumps({"id": msg_id, "method": "Page.reload", "params": {"ignoreCache": False}}))
        msg_id += 1
        token = _cdp_recv_until(ws, _token_from_network_event, 20)
        if not token:
            # One more navigate+reload pass.
            ws.send(
                json.dumps(
                    {
                        "id": msg_id,
                        "method": "Page.navigate",
                        "params": {"url": "https://one.dat.com/search-loads"},
                    }
                )
            )
            msg_id += 1
            token = _cdp_recv_until(ws, _token_from_network_event, 18)
        if not token:
            raise RuntimeError("Could not harvest board session token from Chrome.")
        with TOKEN_LOCK:
            TOKEN_CACHE["token"] = token
            TOKEN_CACHE["at"] = time.time()
        return str(token)
    finally:
        ws.close()


def graphql(token: str, payload: dict[str, Any], *, _retried: bool = False) -> dict[str, Any]:
    req = urllib.request.Request(
        GRAPHQL,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "dat-source-app": "datone.web|1.0",
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
            "Origin": "https://one.dat.com",
            "Referer": "https://one.dat.com/search-loads",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "ignore")[:500]
        if exc.code in (401, 403) and not _retried:
            fresh = harvest_bearer(force=True)
            return graphql(fresh, payload, _retried=True)
        raise RuntimeError(f"DAT GraphQL HTTP {exc.code}: {body}") from exc


def _place_from_suggestion(row: dict[str, Any], city: str, state: str) -> dict[str, Any]:
    return {
        "placeId": row.get("id"),
        "city": row.get("city") or city,
        "stateProv": (row.get("state") or state or "").upper()[:2],
        "latitude": row.get("latitude"),
        "longitude": row.get("longitude"),
        "postalCode": row.get("postalCode"),
    }


def suggest_locations(term: str, limit: int = 10) -> list[dict[str, Any]]:
    """DAT locationSuggestions for typeahead (city / ZIP / place)."""
    q = (term or "").strip()
    if len(q) < 2:
        return []
    token = harvest_bearer()
    data = graphql(
        token,
        {"operationName": "GetLocationSuggestions", "variables": {"lookupTerm": q}, "query": LOCATION_QUERY},
    )
    rows = (((data.get("data") or {}).get("locationSuggestions")) or [])
    out: list[dict[str, Any]] = []
    for row in rows[: max(1, min(20, limit))]:
        if not isinstance(row, dict):
            continue
        city = str(row.get("city") or "").strip()
        state = str(row.get("state") or "").strip().upper()[:2]
        name = str(row.get("name") or "").strip()
        postal = str(row.get("postalCode") or "").strip()
        label = name or (", ".join([p for p in (city, state) if p]))
        if not label:
            continue
        out.append(
            {
                "label": label,
                "city": city,
                "state": state,
                "postal_code": postal,
                "latitude": row.get("latitude"),
                "longitude": row.get("longitude"),
            }
        )
    return out


def resolve_place(token: str, city: str, state: str) -> dict[str, Any] | None:
    city = city.strip()
    state = state.strip().upper()[:2]
    terms: list[str] = []
    if city and state:
        terms.append(f"{city}, {state}")
    if city:
        terms.append(city)
    if state and not city:
        terms.append(state)
    seen: set[str] = set()
    for term in terms:
        key = term.lower()
        if not term or key in seen:
            continue
        seen.add(key)
        data = graphql(
            token,
            {"operationName": "GetLocationSuggestions", "variables": {"lookupTerm": term}, "query": LOCATION_QUERY},
        )
        rows = (((data.get("data") or {}).get("locationSuggestions")) or [])
        if not rows:
            continue
        if state:
            for row in rows:
                if str(row.get("state") or "").upper()[:2] == state:
                    return _place_from_suggestion(row, city, state)
        return _place_from_suggestion(rows[0], city, state)
    return None


def equipment_types(raw: Any) -> list[str]:
    values = raw if isinstance(raw, list) else ([raw] if raw else ["V"])
    out: list[str] = []
    for item in values:
        text = str(item).strip().upper()
        if text in ("VAN", "DRY VAN", "DRYVAN"):
            out.append("V")
        elif text in ("REEFER", "REFRIGERATED"):
            out.append("R")
        elif text in ("FLATBED", "FLAT", "STEPDECK", "STEP DECK", "CONESTOGA", "HOTSHOT"):
            out.append("F")
        elif text in ("STRAIGHT BOX", "BOX", "BOX TRUCK", "SPRINTER"):
            out.append("SB")
        elif text in ("POWER ONLY", "POWER", "PO"):
            out.append("PO")
        elif text in ("V", "R", "F", "SB", "PO", "VP", "VG", "VM", "MV"):
            out.append(text)
    return sorted(set(out)) or ["V"]


def map_load(row: dict[str, Any]) -> dict[str, Any]:
    asset = row.get("assetInfo") or {}
    origin = asset.get("origin") or {}
    dest = asset.get("destination") or {}
    capacity = asset.get("capacity") or {}
    rate_info = row.get("rateInfo") or {}
    rate = rate_info.get("nonBookable") or {}
    if not isinstance(rate, dict):
        rate = {}
    # Some DAT rows expose bookable / alternate rate blobs.
    for key in ("bookable", "bookableRate", "rate"):
        alt = rate_info.get(key)
        if isinstance(alt, dict) and alt.get("rateUsd") is not None and rate.get("rateUsd") is None:
            rate = alt
            break
    poster = row.get("posterInfo") or {}
    contact = poster.get("contact") or {}
    phone = contact.get("phone") or {}
    credit = poster.get("credit") or {}
    dots = row.get("posterDotIds") or {}
    comments = row.get("comments") or []
    if isinstance(comments, str):
        comments = [comments]
    miles = ((row.get("tripLength") or {}).get("miles"))
    rpm = row.get("estimatedRatePerMile")
    deadhead = ((row.get("originDeadheadMiles") or {}).get("miles"))
    rate_usd = rate.get("rateUsd")
    # When DAT omits flat rate but has RPM + miles, derive a display flat.
    if rate_usd is None and rpm not in (None, "") and miles not in (None, ""):
        try:
            rate_usd = round(float(rpm) * float(miles))
        except (TypeError, ValueError):
            rate_usd = None
    return {
        "id": str(row.get("resultId") or asset.get("postingId") or ""),
        "posting_id": str(asset.get("postingId") or ""),
        "origin": {
            "city": origin.get("city"),
            "state": origin.get("stateProv"),
            "states": [],
            "latitude": origin.get("latitude"),
            "longitude": origin.get("longitude"),
            "deadhead_miles": deadhead,
        },
        "destination": {
            "city": dest.get("city"),
            "state": dest.get("stateProv"),
            "states": [],
            "latitude": dest.get("latitude"),
            "longitude": dest.get("longitude"),
            "deadhead_miles": None,
        },
        "availability": row.get("availability") or {},
        "equipment": asset.get("equipmentType"),
        "capacity": capacity.get("fullPartial"),
        "length_ft": capacity.get("maximumLengthFeet"),
        "weight_lbs": capacity.get("maximumWeightPounds"),
        "miles": miles,
        "rate": rate_usd,
        "currency": "USD",
        "rate_per_mile": rpm,
        "company": poster.get("companyName"),
        "city": poster.get("city"),
        "state": poster.get("state"),
        "phone": phone.get("number"),
        "phone_extension": phone.get("extension") or "",
        "email": contact.get("email"),
        "credit_score": credit.get("creditScore"),
        "days_to_pay": credit.get("daysToPay"),
        "comments": comments,
        "reference": row.get("postersReferenceId") or "",
        "created_when": row.get("servicedWhen"),
        "dot_number": dots.get("dotNumber"),
        "broker_mc": dots.get("brokerMcNumber"),
        "carrier_mc": dots.get("carrierMcNumber"),
        "detail": row,
    }


def search(body: dict[str, Any]) -> dict[str, Any]:
    origin_in = body.get("origin") or {}
    dest_in = body.get("destination") or {}
    if isinstance(origin_in, str):
        parts = [p.strip() for p in origin_in.split(",", 1)]
        origin_in = {"city": parts[0], "state": parts[1] if len(parts) > 1 else ""}
    if isinstance(dest_in, str):
        parts = [p.strip() for p in dest_in.split(",", 1)]
        dest_in = {"city": parts[0], "state": parts[1] if len(parts) > 1 else ""}

    token = harvest_bearer()
    origin_place = resolve_place(token, str(origin_in.get("city") or ""), str(origin_in.get("state") or ""))
    if not origin_place:
        raise RuntimeError("Could not resolve origin city/state.")

    # DAT requires criteria.lane.destination (FreightSearchV4LocationSpecifierInput!).
    # Open destination = all US states via area.states (DAT One "Anywhere" shape).
    US_STATES = [
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID",
        "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
        "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA",
        "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    ]
    lane: dict[str, Any] = {"origin": {"place": origin_place}}
    dest_city = str(dest_in.get("city") or "").strip()
    dest_state = str(dest_in.get("state") or "").strip().upper()
    dest_states = dest_in.get("states") if isinstance(dest_in.get("states"), list) else []
    if dest_city or dest_state:
        dest_place = resolve_place(token, dest_city, dest_state)
        if dest_place:
            lane["destination"] = {"place": dest_place}
        elif dest_state:
            lane["destination"] = {"area": {"states": [dest_state[:2]]}}
        else:
            lane["destination"] = {"area": {"states": list(US_STATES)}}
    elif dest_states:
        lane["destination"] = {"area": {"states": [str(s).upper()[:2] for s in dest_states]}}
    else:
        lane["destination"] = {"area": {"states": list(US_STATES)}}

    capacity = str(body.get("capacity") or "BOTH").upper()
    if capacity not in ("BOTH", "FULL", "PARTIAL"):
        capacity = "BOTH"
    limit = int(body.get("limit") or 100)
    limit = max(1, min(500, limit))
    max_age = int(body.get("max_age_minutes") or 240)
    origin_dh = origin_in.get("deadhead_miles")
    dest_dh = dest_in.get("deadhead_miles") if isinstance(dest_in, dict) else None
    try:
        origin_dh_n = int(float(origin_dh)) if origin_dh not in (None, "") else 100
    except (TypeError, ValueError):
        origin_dh_n = 100
    try:
        dest_dh_n = int(float(dest_dh)) if dest_dh not in (None, "") else 150
    except (TypeError, ValueError):
        dest_dh_n = 150

    bookable_only = bool(body.get("bookable_only") or body.get("bookableOnly"))
    tracking = str(body.get("tracking") or "ALL").upper()
    if tracking not in ("ALL", "TRACKING", "NO_TRACKING"):
        tracking = "ALL"
    # JSON null must not become False — DAT rejects both boards off (RequestError).
    def _flag(primary: str, alt: str, default: bool = True) -> bool:
        if primary in body:
            val = body.get(primary)
        elif alt in body:
            val = body.get(alt)
        else:
            return default
        return default if val is None else bool(val)

    include_board = _flag("include_load_board", "includeLoadBoard", True)
    include_private = _flag("include_private_network", "includePrivateNetwork", True)
    order_by = str(body.get("order_by") or body.get("orderBy") or "AGE_ASC").upper()
    if order_by not in ("AGE_ASC", "AGE_DESC", "RATE_DESC", "RATE_ASC", "DISTANCE_ASC", "DISTANCE_DESC"):
        order_by = "AGE_ASC"

    criteria: dict[str, Any] = {
        "audience": {
            "includeLoadBoard": include_board,
            "includePrivateNetwork": include_private,
        },
        "lane": lane,
        "equipment": {"types": equipment_types(body.get("equipment"))},
        "filters": {
            "excludePostingIds": [],
            "includeOnlyBookable": bookable_only,
            "tracking": tracking,
        },
        "maxAgeMinutes": max_age,
        "maxOriginDeadheadMiles": origin_dh_n,
        "maxDestinationDeadheadMiles": dest_dh_n,
        "capacity": {"fullPartial": capacity},
        "orderBy": order_by,
        "limit": limit,
        "delivery": {"notify": False, "includeSimilarResults": False},
    }
    try:
        length_ft = body.get("length_ft", body.get("lengthFt"))
        if length_ft not in (None, ""):
            criteria["capacity"]["maximumLengthFeet"] = int(float(length_ft))
    except (TypeError, ValueError):
        pass
    try:
        weight_lbs = body.get("weight_lbs", body.get("weightLbs"))
        if weight_lbs not in (None, ""):
            criteria["capacity"]["maximumWeightPounds"] = int(float(weight_lbs))
    except (TypeError, ValueError):
        pass
    earliest = str(body.get("earliest") or "").strip()
    latest = str(body.get("latest") or "").strip()
    if earliest or latest:
        criteria["availability"] = {
            "earliestWhen": earliest or latest,
            "latestWhen": latest or earliest,
        }

    data = graphql(
        token,
        {"operationName": "FindLoads", "variables": {"criteria": criteria}, "query": FIND_LOADS_QUERY},
    )
    find = (((data.get("data") or {}).get("freightSearchV4") or {}).get("findLoads") or {})
    if find.get("__typename") not in (None, "FreightSearchV4FindLoadsSuccess"):
        err = ((find.get("error") or {}).get("message")) or find.get("__typename") or "FindLoads failed"
        raise RuntimeError(str(err))
    results = find.get("results") or []
    loads = [map_load(row) for row in results if isinstance(row, dict)]
    return {
        "ok": True,
        "search_id": str(find.get("searchId") or f"search-{int(time.time())}"),
        "count": len(loads),
        "loads": loads,
    }


def motus_via_chrome(dot: str) -> dict[str, Any]:
    """Fetch Motus carrier JSON via Laneora Chrome (Surfshark US egress).

    Direct VPS/Soft IPs are Akamai-blocked (HTTP 403). Chrome's VPN egress works.
    """
    dot = "".join(ch for ch in str(dot) if ch.isdigit())
    if not dot:
        raise RuntimeError("DOT required")
    page = _pick_page()
    ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=30)
    try:
        expr = f"""
(async () => {{
  const res = await fetch('https://motus.dot.gov/api/carriers/{dot}', {{
    headers: {{
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36'
    }}
  }});
  const text = await res.text();
  return JSON.stringify({{ status: res.status, body: text.slice(0, 500000) }});
}})()
"""
        ws.send(
            json.dumps(
                {
                    "id": 1,
                    "method": "Runtime.evaluate",
                    "params": {"expression": expr, "awaitPromise": True, "returnByValue": True},
                }
            )
        )
        payload = _cdp_recv_until(
            ws,
            lambda d: (d.get("result") or {}).get("result", {}).get("value") if d.get("id") == 1 else None,
            20,
        )
        if not isinstance(payload, str) or not payload:
            raise RuntimeError("Motus Chrome fetch returned empty response")
        parsed = json.loads(payload)
        status = int(parsed.get("status") or 0)
        body_text = parsed.get("body") or ""
        if status == 404:
            return {"ok": True, "status": 404, "empty": True, "data": None}
        if status != 200:
            raise RuntimeError(f"Motus HTTP {status}: {body_text[:200]}")
        data = json.loads(body_text) if body_text else None
        return {"ok": True, "status": 200, "empty": False, "data": data}
    finally:
        ws.close()


def _authorized(handler: BaseHTTPRequestHandler) -> bool:
    """Require Bearer LOADS_HELPER_TOKEN on mutating/data routes (not /health)."""
    if HELPER_AUTH_OFF:
        return True
    if not HELPER_TOKEN:
        handler._json(503, {"ok": False, "error": "LOADS_HELPER_TOKEN is not configured on helper."})
        return False
    auth = handler.headers.get("Authorization") or handler.headers.get("authorization") or ""
    expected = f"Bearer {HELPER_TOKEN}"
    header_token = handler.headers.get("X-Loads-Helper-Token") or ""
    if auth == expected or header_token == HELPER_TOKEN:
        return True
    handler._json(401, {"ok": False, "error": "Unauthorized"})
    return False


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:  # noqa: A003
        print(f"[loads-search] {self.address_string()} {fmt % args}")

    def _json(self, code: int, payload: dict[str, Any]) -> None:
        raw = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self) -> None:  # noqa: N802
        path = self.path.split("?", 1)[0].rstrip("/")
        if path == "/health":
            self._json(
                200,
                {
                    "ok": True,
                    "service": "laneora-loads-search-cdp",
                    "auth": "off" if HELPER_AUTH_OFF else ("required" if HELPER_TOKEN else "misconfigured"),
                },
            )
            return
        if path.startswith("/motus/"):
            if not _authorized(self):
                return
            dot = path.rsplit("/", 1)[-1]
            try:
                self._json(200, motus_via_chrome(dot))
            except Exception as exc:  # noqa: BLE001
                self._json(502, {"ok": False, "error": str(exc)})
            return
        if path == "/locations":
            if not _authorized(self):
                return
            from urllib.parse import parse_qs, urlparse

            qs = parse_qs(urlparse(self.path).query)
            term = (qs.get("q") or qs.get("term") or [""])[0]
            try:
                limit = int((qs.get("limit") or ["10"])[0])
            except ValueError:
                limit = 10
            try:
                self._json(200, {"ok": True, "query": term, "suggestions": suggest_locations(term, limit)})
            except Exception as exc:  # noqa: BLE001
                self._json(502, {"ok": False, "error": str(exc), "suggestions": []})
            return
        self._json(404, {"ok": False, "error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path.rstrip("/") != "/search":
            self._json(404, {"ok": False, "error": "not found"})
            return
        if not _authorized(self):
            return
        length = int(self.headers.get("Content-Length") or "0")
        body = json.loads(self.rfile.read(length).decode() if length else "{}")
        try:
            self._json(200, search(body if isinstance(body, dict) else {}))
        except Exception as exc:  # noqa: BLE001
            self._json(502, {"ok": False, "error": str(exc)})


def main() -> None:
    if not HELPER_TOKEN and not HELPER_AUTH_OFF:
        print(
            "WARNING: LOADS_HELPER_TOKEN unset — /search and /motus will return 503 until configured "
            "(or set LOADS_HELPER_AUTH=off for local dev only).",
            flush=True,
        )
    server = ThreadingHTTPServer(BIND, Handler)
    print(f"laneora loads search on http://{BIND[0]}:{BIND[1]} auth={'off' if HELPER_AUTH_OFF else 'on'}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
