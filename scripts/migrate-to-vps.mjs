/**
 * Stream tables from Neon (or LOCAL_DATABASE_URL) into VPS Postgres via SSH tunnel-friendly URL.
 * Usage:
 *   node scripts/migrate-to-vps.mjs
 *   node scripts/migrate-to-vps.mjs --safety
 *   node scripts/migrate-to-vps.mjs --tables=carriers,dockets --skip-existing
 *
 * Env:
 *   SOURCE_DATABASE_URL  (defaults to Neon from .env.vercel)
 *   TARGET_DATABASE_URL  (VPS postgres, often via localhost after ssh -L)
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

const SOURCE_URL =
  process.env.SOURCE_DATABASE_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL;
const TARGET_URL =
  process.env.TARGET_DATABASE_URL ||
  process.env.VPS_DATABASE_URL ||
  "postgresql://carrier:carrier_vps_2026@127.0.0.1:15432/carrier";

if (!SOURCE_URL) {
  console.error("Missing SOURCE_DATABASE_URL / Neon DATABASE_URL");
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

async function copyTable(source, target, name) {
  const q = quoteIdent(name);
  if (!(await tableExists(source, name))) {
    console.log(`skip ${name} (missing on source)`);
    return;
  }
  if (!(await tableExists(target, name))) {
    console.log(`skip ${name} (missing on target — apply schema first)`);
    return;
  }

  const sourceCount = await rowCount(source, name);
  const targetCount = await rowCount(target, name);
  if (skipExisting && targetCount > 0) {
    console.log(`skip ${name} (already ${targetCount.toLocaleString()} rows)`);
    return;
  }
  if (sourceCount === 0) {
    console.log(`skip ${name} (empty on source)`);
    return;
  }

  console.log(`copy ${name}: ${sourceCount.toLocaleString()} rows…`);
  const started = Date.now();

  await target.query("BEGIN");
  try {
    await target.query(`TRUNCATE ${q} CASCADE`);
    const from = source.query(copyStreams.to(`COPY (SELECT * FROM ${q}) TO STDOUT`));
    const to = target.query(copyStreams.from(`COPY ${q} FROM STDIN`));
    await pipeline(from, to);
    await target.query("COMMIT");
  } catch (error) {
    await target.query("ROLLBACK").catch(() => undefined);
    throw error;
  }

  const after = await rowCount(target, name);
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`done ${name}: ${after.toLocaleString()} rows in ${secs}s`);
}

const source = makeClient(SOURCE_URL);
const target = makeClient(TARGET_URL);
await source.connect();
await target.connect();
await source.query("SET statement_timeout = 0");
await target.query("SET statement_timeout = 0");
await target.query("SET synchronous_commit = off");

console.log(`Migrating ${tables.length} tables Neon/source → VPS`);
for (const table of tables) {
  try {
    await copyTable(source, target, table);
  } catch (error) {
    console.error(`FAILED ${table}:`, error instanceof Error ? error.message : error);
    process.exitCode = 1;
    break;
  }
}

await source.end();
await target.end();
console.log(process.exitCode ? "Migration stopped with errors." : "Migration finished.");
