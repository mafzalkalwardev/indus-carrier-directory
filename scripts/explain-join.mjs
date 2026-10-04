import pg from "pg";

const client = new pg.Client({ connectionString: "postgresql://postgres:carrier@127.0.0.1:5432/carrier" });
await client.connect();
const plan = await client.query(`
EXPLAIN
SELECT c2.dot_number
FROM carriers c2
LEFT JOIN (
  SELECT dot_number, bool_or(op_auth_status ILIKE 'active') AS any_active
  FROM dockets
  GROUP BY dot_number
) d ON d.dot_number = c2.dot_number
LEFT JOIN (
  SELECT dot_number, count(*) AS revocation_count
  FROM revocations
  GROUP BY dot_number
) r ON r.dot_number = c2.dot_number
`);
console.log(plan.rows.map((row) => row["QUERY PLAN"]).join("\n"));
await client.end();
