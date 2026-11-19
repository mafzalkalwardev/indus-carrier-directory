/**
 * Stream tables from local Postgres into Neon via COPY.
 * Usage:
 *   node scripts/migrate-to-neon.mjs
 *   node scripts/migrate-to-neon.mjs --safety
 *   node scripts/migrate-to-neon.mjs --tables=carriers,dockets --skip-existing
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import pg from "pg";
import copyStreams from "pg-copy-streams";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(root, ".env.vercel"));
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const LOCAL_URL = process.env.LOCAL_DATABASE_URL || "postgresql://postgres:carrier@127.0.0.1:5432/carrier";
const REMOTE_URL =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL;

if (!REMOTE_URL) {
  console.error("Missing Neon DATABASE_URL");
  process.exit(1);
}

const CORE_TABLES = [
  "carriers",
  "dockets",
  "census_dockets",
  "authority_history",
  "insurance_policies",
  "insurance_history",
  "revocations",
  "process_agents",
  "carrier_officers",
  "carrier_fleet",
  "motus_authorities",
  "sms_measures",
  "oos_orders",
];

const SAFETY_TABLES = [
  "inspections",
  "inspection_units",
  "inspection_violations",
  "crashes",
];

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--tables="))?.slice("--tables=".length);
const includeSafety = args.includes("--safety");
const skipExisting = args.includes("--skip-existing");

const tables = only
  ? only.split(",").map((t) => t.trim()).filter(Boolean)
  : includeSafety
    ? [...CORE_TABLES, ...SAFETY_TABLES]
    : CORE_TABLES;

function makeClient(url) {
  return new pg.Client({
    connectionString: url,
    ssl: /neon\.tech|sslmode=require/i.test(url) ? { rejectUnauthorized: false } : undefined,
  });
}

function quoteIdent(name) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`Bad table name: ${name}`);
  return `"${name}"`;
}

async function tableExists(c, name) {
  const { rows } = await c.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
    [name],
  );
  return rows.length > 0;
}

async function rowCount(c, name) {
  const { rows } = await c.query(`SELECT count(*)::bigint AS n FROM ${quoteIdent(name)}`);
  return Number(rows[0].n);
}

async function copyTable(local, remote, name) {
  const q = quoteIdent(name);
  if (!(await tableExists(local, name))) {
    console.log(`skip ${name} (missing locally)`);
    return;
  }
  if (!(await tableExists(remote, name))) {
    console.log(`skip ${name} (missing on Neon)`);
    return;
  }

  const localCount = await rowCount(local, name);
  const remoteCount = await rowCount(remote, name);
  if (skipExisting && remoteCount > 0) {
    console.log(`skip ${name} (already ${remoteCount.toLocaleString()} rows)`);
    return;
  }
  if (localCount === 0) {
    console.log(`skip ${name} (empty locally)`);
    return;
  }

  console.log(`copy ${name}: ${localCount.toLocaleString()} rows…`);
  const started = Date.now();

  await remote.query("BEGIN");
  try {
    await remote.query(`TRUNCATE ${q} CASCADE`);
    // Parent partitioned tables can't use COPY table TO STDOUT; SELECT form works.
    const source = local.query(copyStreams.to(`COPY (SELECT * FROM ${q}) TO STDOUT`));
    const dest = remote.query(copyStreams.from(`COPY ${q} FROM STDIN`));
    await pipeline(source, dest);
    await remote.query("COMMIT");
  } catch (error) {
    await remote.query("ROLLBACK").catch(() => undefined);
    throw error;
  }

  const after = await rowCount(remote, name);
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`done ${name}: ${after.toLocaleString()} rows in ${secs}s`);
}

const local = makeClient(LOCAL_URL);
const remote = makeClient(REMOTE_URL);
await local.connect();
await remote.connect();
await local.query("SET statement_timeout = 0");
await remote.query("SET statement_timeout = 0");
await remote.query("SET synchronous_commit = off");

console.log(`Migrating ${tables.length} tables to Neon`);
for (const table of tables) {
  try {
    await copyTable(local, remote, table);
  } catch (error) {
    console.error(`FAILED ${table}:`, error instanceof Error ? error.message : error);
    process.exitCode = 1;
    break;
  }
}

await local.end();
await remote.end();
console.log(process.exitCode ? "Migration stopped with errors." : "Migration finished.");
