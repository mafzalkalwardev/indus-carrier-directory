import pg from "pg";

const client = new pg.Client({ connectionString: "postgresql://postgres:carrier@127.0.0.1:5432/carrier" });
await client.connect();
const counts = await client.query(
  "SELECT (SELECT count(*) FROM carriers) AS carriers, (SELECT count(*) FROM dockets) AS dockets, (SELECT trust_score FROM carriers WHERE dot_number = '5265189') AS score",
);
console.log(counts.rows[0]);
await client.end();
