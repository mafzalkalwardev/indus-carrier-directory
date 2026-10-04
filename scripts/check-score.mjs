import pg from "pg";

const client = new pg.Client({ connectionString: "postgresql://postgres:carrier@127.0.0.1:5432/carrier" });
await client.connect();
await client.query("SET statement_timeout = '20s'");
const row = await client.query(
  `SELECT legal_name, authority_status, common_authority_status, bipd_on_file, insurance_current,
          authority_granted_date, revocation_count, score_authority, score_age, score_insurance,
          score_revocation, score_safety, trust_score, trust_grade, power_units, total_drivers, email
   FROM carriers WHERE dot_number = '5265189'`,
);
console.log(row.rows[0]);
await client.end();
