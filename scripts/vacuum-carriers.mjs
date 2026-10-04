import pg from "pg";

const client = new pg.Client({ connectionString: "postgresql://postgres:carrier@127.0.0.1:5432/carrier" });
await client.connect();
console.log("vacuum start");
await client.query("VACUUM carriers");
const size = await client.query("SELECT pg_size_pretty(pg_relation_size('carriers')) AS size");
console.log("vacuum done", size.rows[0]);
await client.end();
