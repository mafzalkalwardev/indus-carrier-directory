import pg from "pg";

const client = new pg.Client({ connectionString: "postgresql://postgres:carrier@127.0.0.1:5432/carrier" });
await client.connect();
await client.query("SET statement_timeout = '8s'");
const activity = await client.query(
  "SELECT pid, wait_event_type, wait_event, now() - query_start AS runtime, left(query, 80) AS query FROM pg_stat_activity WHERE datname = 'carrier' AND pid <> pg_backend_pid() AND state = 'active'",
);
console.log(JSON.stringify(activity.rows, null, 2));
await client.end();
