import pg from "pg";

const client = new pg.Client({ connectionString: "postgresql://postgres:carrier@127.0.0.1:5432/carrier" });
await client.connect();
await client.query("SET statement_timeout = '30s'");
const sizes = await client.query(`
  SELECT c.relname, pg_size_pretty(pg_relation_size(c.oid)) AS size
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'i')
  ORDER BY pg_relation_size(c.oid) DESC
  LIMIT 20
`);
console.log(sizes.rows);
await client.end();
