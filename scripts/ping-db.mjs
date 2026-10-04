import pg from "pg";

const client = new pg.Client({ connectionString: "postgresql://postgres:carrier@127.0.0.1:5432/carrier" });
await client.connect();
await client.query("SET statement_timeout = '15s'");
const result = await client.query("SELECT 1 AS ok");
console.log(result.rows[0]);
await client.end();
