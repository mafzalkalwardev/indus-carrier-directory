import os
from pathlib import Path

import psycopg
from psycopg import sql

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_DIR = ROOT / "schema"
SAFETY_TABLESPACE = "fmcsa_safety"
SAFETY_DIR = Path(r"C:/carrier-data/pg-safety")


def database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        env_path = ROOT / ".env"
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip())
        url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL is not set. Start Postgres with npm run db.")
    return url


def connect():
    conn = psycopg.connect(database_url(), autocommit=False)
    with conn.cursor() as cur:
        cur.execute("SET statement_timeout = 0")
        cur.execute("SET synchronous_commit = off")
    conn.commit()
    return conn


def split_sql(script: str) -> list[str]:
    parts: list[str] = []
    buf: list[str] = []
    in_dollar = False
    i = 0
    while i < len(script):
        if script.startswith("$$", i):
            in_dollar = not in_dollar
            buf.append("$$")
            i += 2
            continue
        if script[i] == ";" and not in_dollar:
            statement = "".join(buf).strip()
            if statement:
                parts.append(statement)
            buf = []
            i += 1
            continue
        buf.append(script[i])
        i += 1
    tail = "".join(buf).strip()
    if tail:
        parts.append(tail)
    return parts


def apply_schema(conn) -> None:
    for name in ("001_schema.sql", "002_functions.sql", "003_fleet.sql", "004_officers.sql", "005_dockets.sql", "006_leads.sql"):
        script = (SCHEMA_DIR / name).read_text(encoding="utf-8")
        with conn.cursor() as cur:
            for statement in split_sql(script):
                cur.execute(statement)
        conn.commit()
    with conn.cursor() as cur:
        for table in ("inspections", "crashes"):
            for year in range(2000, 2029):
                cur.execute(
                    f"""
                    CREATE TABLE IF NOT EXISTS {table}_y{year} PARTITION OF {table}
                    FOR VALUES FROM ('{year}-01-01') TO ('{year + 1}-01-01')
                    """
                )
    conn.commit()
    ensure_safety_tablespace(conn)
    move_safety_relations(conn)
    with conn.cursor() as cur:
        cur.execute("UPDATE carriers SET insurance_cancel_pending = false WHERE insurance_cancel_pending")
        cur.execute(
            """
            UPDATE carriers c SET insurance_cancel_pending = true
            FROM (
              SELECT DISTINCT dot_number
              FROM insurance_history
              WHERE cancl_effective_date >= current_date
            ) pending
            WHERE c.dot_number = pending.dot_number
            """
        )
    conn.commit()


def ensure_safety_tablespace(conn) -> None:
    SAFETY_DIR.mkdir(parents=True, exist_ok=True)
    conn.commit()
    previous = conn.autocommit
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_tablespace WHERE spcname = %s", (SAFETY_TABLESPACE,))
            if cur.fetchone() is None:
                cur.execute(
                    sql.SQL("CREATE TABLESPACE {} LOCATION {}").format(
                        sql.Identifier(SAFETY_TABLESPACE),
                        sql.Literal(SAFETY_DIR.as_posix()),
                    )
                )
                print(f"created tablespace {SAFETY_TABLESPACE} at {SAFETY_DIR}", flush=True)
    finally:
        conn.autocommit = previous


def move_safety_relations(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT c.relkind, c.relname
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            LEFT JOIN pg_tablespace t ON t.oid = c.reltablespace
            WHERE n.nspname = 'public'
              AND c.relkind IN ('r', 'p', 'i', 'I')
              AND COALESCE(t.spcname, 'pg_default') <> %s
              AND (
                c.relname LIKE 'inspections%%'
                OR c.relname LIKE 'crashes%%'
                OR c.relname LIKE 'inspection_units%%'
                OR c.relname LIKE 'inspection_violations%%'
                OR                 c.relname LIKE 'sms_measures%%'
                OR c.relname LIKE 'oos_orders%%'
                OR c.relname LIKE 'carrier_fleet%%'
              )
            ORDER BY c.relkind, c.relname
            """,
            (SAFETY_TABLESPACE,),
        )
        relations = cur.fetchall()
        for relkind, name in relations:
            verb = "INDEX" if relkind in ("i", "I") else "TABLE"
            cur.execute(
                sql.SQL("ALTER {} {} SET TABLESPACE {}").format(
                    sql.SQL(verb),
                    sql.Identifier(name),
                    sql.Identifier(SAFETY_TABLESPACE),
                )
            )
        if relations:
            print(f"moved {len(relations)} safety relations onto {SAFETY_TABLESPACE}", flush=True)
    conn.commit()


def record_feed(conn, feed_key: str, view_id: str, source_updated_at, row_count: int, status: str, note: str = "") -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO feed_runs (feed_key, view_id, source_updated_at, row_count, status, note)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (feed_key, view_id, source_updated_at, row_count, status, note),
        )
