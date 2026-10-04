import pg from "pg";

const client = new pg.Client({ connectionString: "postgresql://postgres:carrier@127.0.0.1:5432/carrier" });
await client.connect();
await client.query("SET statement_timeout = '10s'");
const result = await client.query("SELECT pid, pg_cancel_backend(pid) FROM pg_stat_activity WHERE pid IN (20628, 7444)");
console.log(result.rows);
await client.end();
