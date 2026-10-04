import pg from "pg";

const client = new pg.Client({ connectionString: "postgresql://postgres:carrier@127.0.0.1:5432/carrier" });
await client.connect();
const activity = await client.query(
  "SELECT pid, state, wait_event_type, wait_event, now() - query_start AS runtime, left(query, 200) AS query FROM pg_stat_activity WHERE datname = 'carrier' AND pid <> pg_backend_pid()",
);
console.log(JSON.stringify(activity.rows, null, 2));
const counts = await client.query("SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 8");
console.log(JSON.stringify(counts.rows, null, 2));
await client.end();
