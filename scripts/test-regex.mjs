import pg from "pg";

const client = new pg.Client({ connectionString: "postgresql://postgres:carrier@127.0.0.1:5432/carrier" });
await client.connect();
const counts = await client.query(`
  SELECT
    count(*) FILTER (WHERE max_cov_amount IS NULL) AS null_amount,
    count(*) FILTER (WHERE max_cov_amount IS NOT NULL) AS has_amount
  FROM insurance_policies
`);
const bipd = await client.query(`
  SELECT
    count(*) FILTER (WHERE bipd_file IS NULL) AS null_bipd,
    count(*) FILTER (WHERE bipd_file > 0) AS positive_bipd
  FROM dockets
`);
console.log(counts.rows[0], bipd.rows[0]);
const match = await client.query(`
  SELECT
    '1000000.00' ~ '^-?[0-9]+(\\.[0-9]+)?$' AS doubled,
    '1000000.00' ~ '^-?[0-9]+(\\.[0-9]+)?$' AS one
`);
console.log(match.rows[0]);
await client.end();
