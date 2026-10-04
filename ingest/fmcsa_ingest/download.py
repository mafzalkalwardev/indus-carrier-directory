import csv
from datetime import datetime, timezone
from pathlib import Path

import httpx

from fmcsa_ingest.db import ROOT

RAW_DIR = ROOT / "data" / "raw"
SAFETY_RAW = Path(r"C:/carrier-data/raw")
EXPORT_URL = "https://data.transportation.gov/api/v3/views/{view_id}/export.csv?accessType=DOWNLOAD"
META_URL = "https://data.transportation.gov/api/views/{view_id}.json"


def csv_path(feed_key: str) -> Path:
    from fmcsa_ingest.datasets import SAFETY_FEEDS

    base = SAFETY_RAW if feed_key in SAFETY_FEEDS or feed_key == "census" else RAW_DIR
    base.mkdir(parents=True, exist_ok=True)
    return base / f"{feed_key}.csv"


def download_feed(feed_key: str, view_id: str, reuse: bool) -> Path:
    path = csv_path(feed_key)
    if reuse and path.exists() and path.stat().st_size > 0:
        print(f"  reusing {path} ({path.stat().st_size / 1_048_576:.1f} MB)", flush=True)
        return path

    url = EXPORT_URL.format(view_id=view_id)
    print(f"  downloading {url}", flush=True)
    timeout = httpx.Timeout(connect=60.0, read=600.0, write=60.0, pool=60.0)
    written = 0
    with httpx.stream("GET", url, timeout=timeout, follow_redirects=True, headers={"User-Agent": "carrier-directory/1.0"}) as response:
        response.raise_for_status()
        content_type = response.headers.get("content-type", "")
        if "csv" not in content_type and "text" not in content_type and "octet-stream" not in content_type:
            raise RuntimeError(f"{feed_key} returned {content_type}, expected CSV")
        tmp = path.with_suffix(".csv.part")
        with tmp.open("wb") as handle:
            for chunk in response.iter_bytes(1024 * 1024):
                handle.write(chunk)
                written += len(chunk)
                if written // (50 * 1_048_576) != (written - len(chunk)) // (50 * 1_048_576):
                    print(f"  {feed_key}: {written / 1_048_576:.0f} MB", flush=True)
        tmp.replace(path)
    print(f"  saved {path.name} ({written / 1_048_576:.1f} MB)", flush=True)
    return path


def source_updated_at(view_id: str):
    try:
        timeout = httpx.Timeout(30.0)
        response = httpx.get(META_URL.format(view_id=view_id), timeout=timeout, follow_redirects=True, headers={"User-Agent": "carrier-directory/1.0"})
        response.raise_for_status()
        payload = response.json()
        raw = payload.get("rowsUpdatedAt")
        if raw is None:
            return None
        return datetime.fromtimestamp(int(raw), tz=timezone.utc)
    except Exception as exc:
        print(f"  could not read source timestamp for {view_id}: {exc}", flush=True)
        return None


def read_header(path: Path) -> list[str]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        header = next(csv.reader(handle))
    seen: dict[str, int] = {}
    columns: list[str] = []
    for index, cell in enumerate(header):
        name = cell.strip().lower().replace(" ", "_").replace("-", "_")
        if not name:
            name = f"col_{index}"
        if name[0].isdigit():
            name = f"c_{name}"
        count = seen.get(name, 0) + 1
        seen[name] = count
        if count > 1:
            name = f"{name}_{count}"
        columns.append(name)
    return columns
