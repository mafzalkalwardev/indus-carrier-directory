#!/usr/bin/env python3
"""Patch Soft loads_api.py: keep SB/etc equipment + forward length/weight filters."""
from __future__ import annotations

from pathlib import Path

PATH = Path("/opt/laneora/server/loads_api.py")
BACKUP = Path("/opt/laneora/server/loads_api.py.bak-eq-length")

OLD_NORMALIZE = '''def _normalize_equipment(value: Any) -> list[str]:
    if value is None:
        return []
    raw = value if isinstance(value, list) else [value]
    out: list[str] = []
    for item in raw:
        text = str(item).strip().lower()
        if text in ("v", "van", "dry van", "dryvan"):
            out.append("V")
        elif text in ("r", "reefer", "refrigerated"):
            out.append("R")
        elif text in ("f", "flatbed", "flat"):
            out.append("F")
        elif text.upper() in ("V", "R", "F"):
            out.append(text.upper())
    return sorted(set(out))
'''

NEW_NORMALIZE = '''def _normalize_equipment(value: Any) -> list[str]:
    if value is None:
        return []
    raw = value if isinstance(value, list) else [value]
    out: list[str] = []
    aliases = {
        "v": "V", "van": "V", "dry van": "V", "dryvan": "V",
        "r": "R", "reefer": "R", "refrigerated": "R",
        "f": "F", "flatbed": "F", "flat": "F", "stepdeck": "F", "step deck": "F",
        "conestoga": "F", "hotshot": "F",
        "sb": "SB", "straight box": "SB", "box": "SB", "box truck": "SB", "sprinter": "SB",
        "po": "PO", "power": "PO", "power only": "PO",
        "vp": "VP", "van pallet": "VP",
        "vg": "VG", "van logistics": "VG",
        "vm": "VM", "van team": "VM",
        "mv": "MV", "moving van": "MV",
    }
    allowed = {"V", "R", "F", "SB", "PO", "VP", "VG", "VM", "MV"}
    for item in raw:
        text = str(item).strip()
        if not text:
            continue
        code = aliases.get(text.lower()) or text.upper()
        if code in allowed:
            out.append(code)
    return sorted(set(out))
'''

OLD_PLACE_TAIL = '''    if not city and not state and not states:
        return None
    return {
        "city": city,
        "state": state,
        "states": states,
        "latitude": value.get("latitude"),
        "longitude": value.get("longitude"),
        "deadhead_miles": deadhead_n,
    }
'''

NEW_PLACE_TAIL = '''    # Deadhead-only destination ("Anywhere" + DH-D) is valid for helper search.
    if not city and not state and not states and deadhead_n is None:
        return None
    return {
        "city": city,
        "state": state,
        "states": states,
        "latitude": value.get("latitude"),
        "longitude": value.get("longitude"),
        "deadhead_miles": deadhead_n,
    }
'''

OLD_REMOTE = '''        try:
            remote = _remote_find_loads(
                {
                    "origin": origin,
                    "destination": destination,
                    "equipment": equipment,
                    "capacity": capacity,
                    "earliest": body.get("earliest"),
                    "latest": body.get("latest"),
                    "max_age_minutes": body.get("max_age_minutes"),
                    "limit": limit,
                }
            )
'''

NEW_REMOTE = '''        length_ft = body.get("length_ft", body.get("lengthFt"))
        weight_lbs = body.get("weight_lbs", body.get("weightLbs"))
        try:
            remote_body = {
                "origin": origin,
                "destination": destination,
                "equipment": equipment,
                "capacity": capacity,
                "earliest": body.get("earliest"),
                "latest": body.get("latest"),
                "max_age_minutes": body.get("max_age_minutes"),
                "limit": limit,
                "order_by": body.get("order_by") or body.get("orderBy"),
                "bookable_only": body.get("bookable_only", body.get("bookableOnly")),
                "tracking": body.get("tracking"),
                "include_load_board": body.get("include_load_board", body.get("includeLoadBoard")),
                "include_private_network": body.get(
                    "include_private_network", body.get("includePrivateNetwork")
                ),
            }
            if length_ft not in (None, ""):
                remote_body["length_ft"] = length_ft
            if weight_lbs not in (None, ""):
                remote_body["weight_lbs"] = weight_lbs
            # Helper CDP rejects some null combos (e.g. include_load_board + include_private_network).
            remote_body = {k: v for k, v in remote_body.items() if v is not None}
            remote = _remote_find_loads(remote_body)
'''

STRIP_NONES_NEEDLE = "            remote = _remote_find_loads(remote_body)"
STRIP_NONES_REPL = (
    "            # Helper CDP rejects some null combos (e.g. include_load_board + include_private_network).\n"
    "            remote_body = {k: v for k, v in remote_body.items() if v is not None}\n"
    "            remote = _remote_find_loads(remote_body)"
)


def _ensure_strip_nones(text: str) -> tuple[str, bool]:
    if "if v is not None" in text and "remote_body.items()" in text:
        return text, False
    if STRIP_NONES_NEEDLE not in text:
        raise SystemExit("remote_find_loads call not found for null-strip")
    return text.replace(STRIP_NONES_NEEDLE, STRIP_NONES_REPL, 1), True


def main() -> None:
    text = PATH.read_text(encoding="utf-8")
    if "straight box" in text and 'remote_body["length_ft"]' in text:
        text, changed = _ensure_strip_nones(text)
        if changed:
            PATH.write_text(text, encoding="utf-8")
            print("PATCHED_NULL_STRIP", PATH)
        else:
            print("ALREADY_PATCHED")
        return
    if OLD_NORMALIZE not in text:
        raise SystemExit("normalize block not found")
    if OLD_PLACE_TAIL not in text:
        raise SystemExit("place tail not found")
    if OLD_REMOTE not in text:
        raise SystemExit("remote block not found")
    BACKUP.write_text(text, encoding="utf-8")
    text = text.replace(OLD_NORMALIZE, NEW_NORMALIZE, 1)
    text = text.replace(OLD_PLACE_TAIL, NEW_PLACE_TAIL, 1)
    text = text.replace(OLD_REMOTE, NEW_REMOTE, 1)
    PATH.write_text(text, encoding="utf-8")
    print("PATCHED", PATH)
    print("BACKUP", BACKUP)


if __name__ == "__main__":
    main()
