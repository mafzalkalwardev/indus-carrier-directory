import pg from "pg";
import { readFileSync } from "node:fs";

const client = new pg.Client({ connectionString: "postgresql://postgres:carrier@127.0.0.1:5432/carrier" });
await client.connect();
const db = await client.query(
  "SELECT blks_read, blks_hit, temp_files, temp_bytes, tup_updated FROM pg_stat_database WHERE datname = 'carrier'",
);
console.log("db", db.rows[0]);
const act = await client.query(
  "SELECT wait_event, now() - query_start AS runtime FROM pg_stat_activity WHERE pid = 7452",
);
console.log("act", act.rows[0]);
await client.end();
