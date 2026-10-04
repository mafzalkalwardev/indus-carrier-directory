import pg from "pg";

const client = new pg.Client({ connectionString: "postgresql://postgres:carrier@127.0.0.1:5432/carrier" });
await client.connect();
const dockets = await client.query("SELECT docket_number, op_auth_type, op_auth_status, bipd_file FROM dockets WHERE dot_number = '5265189'");
const policies = await client.query("SELECT dot_number, max_cov_amount, policy_no, insurance_company_name FROM insurance_policies WHERE dot_number = '5265189'");
const sample = await client.query("SELECT bipd_file FROM dockets WHERE bipd_file IS NOT NULL LIMIT 3");
console.log("dockets", dockets.rows);
console.log("policies", policies.rows);
console.log("sample bipd", sample.rows);
await client.end();
