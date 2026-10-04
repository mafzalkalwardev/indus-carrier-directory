import argparse
import sys

from fmcsa_ingest.datasets import CORE_FEEDS, FEEDS, SAFETY_FEEDS
from fmcsa_ingest.db import apply_schema, connect, record_feed
from fmcsa_ingest.download import download_feed, source_updated_at
from fmcsa_ingest.load import drop_staging, load_census_dockets, load_csv, recompute, transform


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Load public FMCSA datasets into Postgres")
    parser.add_argument("command", choices=["sync", "score"])
    parser.add_argument("--safety", action="store_true", help="Load inspections, crashes, SMS, and out-of-service orders")
    parser.add_argument("--only", default="", help="Comma-separated feed keys")
    parser.add_argument("--reuse", action="store_true", help="Reuse a CSV already in data/raw")
    parser.add_argument("--skip-score", action="store_true", help="Skip score and safety aggregate refresh")
    parser.add_argument("--keep-csv", action="store_true", help="Keep the downloaded CSV after a successful load")
    parser.add_argument("--dockets-only", action="store_true", help="Load census MC numbers without rewriting carrier rows")
    return parser.parse_args(argv)


def selected_feeds(args: argparse.Namespace) -> list[str]:
    if args.only:
        keys = [key.strip() for key in args.only.split(",") if key.strip()]
    elif args.safety:
        keys = SAFETY_FEEDS
    else:
        keys = CORE_FEEDS
    unknown = [key for key in keys if key not in FEEDS]
    if unknown:
        raise SystemExit(f"Unknown feed keys: {', '.join(unknown)}")
    return keys


def sync(args: argparse.Namespace) -> None:
    keys = selected_feeds(args)
    conn = connect()
    try:
        print("applying schema", flush=True)
        apply_schema(conn)
        for key in keys:
            feed = FEEDS[key]
            print(f"feed {key} ({feed['view_id']})", flush=True)
            updated = source_updated_at(feed["view_id"])
            path = download_feed(key, feed["view_id"], args.reuse)
            try:
                _columns, table, count = load_csv(conn, key, path)
                print(f"  transforming {key}", flush=True)
                if args.dockets_only and key == "census":
                    load_census_dockets(conn, table, _columns)
                else:
                    transform(conn, feed["kind"], table, _columns)
                drop_staging(conn, table)
                record_feed(conn, key, feed["view_id"], updated, count, "ok")
                conn.commit()
                print(f"  committed {key}", flush=True)
                if not args.keep_csv and not args.reuse:
                    path.unlink(missing_ok=True)
            except Exception:
                conn.rollback()
                record_feed(conn, key, feed["view_id"], updated, None, "error")
                conn.commit()
                raise
        if not args.skip_score and not args.dockets_only:
            recompute(conn)
            conn.commit()
            print("scores updated", flush=True)
    finally:
        conn.close()


def score_only() -> None:
    conn = connect()
    try:
        apply_schema(conn)
        recompute(conn)
        conn.commit()
        print("scores updated", flush=True)
    finally:
        conn.close()


def main() -> None:
    args = parse_args(sys.argv[1:])
    if args.command == "sync":
        sync(args)
    elif args.command == "score":
        score_only()


if __name__ == "__main__":
    main()
