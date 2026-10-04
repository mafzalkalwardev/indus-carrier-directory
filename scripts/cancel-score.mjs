import pg from "pg";

const client = new pg.Client({ connectionString: "postgresql://postgres:carrier@127.0.0.1:5432/carrier" });
await client.connect();
const result = await client.query("SELECT pg_cancel_backend(7452) AS cancelled");
console.log(result.rows[0]);
await client.end();
