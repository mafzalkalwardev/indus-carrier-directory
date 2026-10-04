import pg from "pg";

const client = new pg.Client({ connectionString: "postgresql://postgres:carrier@127.0.0.1:5432/carrier" });
await client.connect();
const stats = await client.query(
  "SELECT n_tup_upd, n_tup_hot_upd, n_live_tup, n_dead_tup, pg_size_pretty(pg_total_relation_size('carriers')) AS size FROM pg_stat_user_tables WHERE relname = 'carriers'",
);
console.log(JSON.stringify(stats.rows, null, 2));
await client.end();
