/**
 * Enrich active carriers missing phone+email via MOTUS (bounded concurrency).
 * Safe for live site: short statements, low pool, row-level updates only.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/enrich-motus-missing.mjs
 *   node scripts/enrich-motus-missing.mjs --limit=5000 --concurrency=4
 */
import fs from "node:fs";
import pg from "pg";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);

const limit = Number(args.limit ?? 10000);
// CDP Motus proxy is serial-ish; keep concurrency low.
const concurrency = Math.max(1, Math.min(3, Number(args.concurrency ?? 2)));
const url = process.env.DATABASE_URL;
const motusBase = (process.env.MOTUS_PROXY_BASE || "http://127.0.0.1:8799").replace(/\/+$/, "");
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const lockPath = "/var/lock/carrier-motus-enrich.lock";
let lockFd;
try {
  lockFd = fs.openSync(lockPath, "wx");
  fs.writeFileSync(lockFd, String(process.pid));
} catch {
  console.error("another Motus enrich holds the lock; exiting");
  process.exit(0);
}
const releaseLock = () => {
  try {
    fs.closeSync(lockFd);
    fs.unlinkSync(lockPath);
  } catch {
    /* ignore */
  }
};
process.on("exit", releaseLock);
process.on("SIGINT", () => {
  releaseLock();
  process.exit(130);
});
process.on("SIGTERM", () => {
  releaseLock();
  process.exit(143);
});

const pool = new pg.Pool({
  connectionString: url,
  max: concurrency + 1,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

function blank(value) {
  const text = value?.trim?.() || String(value ?? "").trim();
  return text ? text : null;
}

async function enrichDot(dot) {
  const client = await pool.connect();
  try {
    await client.query("SET lock_timeout = '2s'");
    await client.query("SET statement_timeout = '12s'");
    const { rows } = await client.query(
      `SELECT motus_officers_at, motus_authorities_at, phone, email
       FROM carriers WHERE dot_number = $1`,
      [dot],
    );
    const row = rows[0];
    if (!row) return "missing";
    const day = 24 * 60 * 60 * 1000;
    const fresh = (value) => value && Date.now() - new Date(value).getTime() < day;
    if (fresh(row.motus_officers_at) && fresh(row.motus_authorities_at)) return "fresh";

    // Motus blocks cloud VPS IPs (403). Fetch via Laneora Chrome CDP helper (US VPN egress).
    const helperToken = (process.env.LOADS_HELPER_TOKEN || "").trim();
    const headers = { Accept: "application/json" };
    if (helperToken) {
      headers.Authorization = `Bearer ${helperToken}`;
      headers["X-Loads-Helper-Token"] = helperToken;
    }
    const response = await fetch(`${motusBase}/motus/${encodeURIComponent(dot)}`, {
      headers,
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) return `http_${response.status}`;
    const wrapped = await response.json();
    if (!wrapped?.ok) return `err:${String(wrapped?.error || "motus proxy failed").slice(0, 80)}`;
    if (wrapped.status === 404 || wrapped.empty) {
      await client.query(
        `UPDATE carriers SET motus_officers_at = now(), motus_authorities_at = now(), updated_at = now()
         WHERE dot_number = $1`,
        [dot],
      );
      return "empty";
    }
    if (wrapped.status === 403 || wrapped.status === 429) return `http_${wrapped.status}`;
    const body = wrapped.data ?? {};
    const officers = (body.entityOfficers ?? []).filter((o) => !o.disableDate);
    const authorities = [];
    for (const reg of body.entityRegistrations ?? []) {
      for (const item of reg.entityRegistrationOperatingAuthorities ?? []) {
        const auth = item.entityOperatingAuthority;
        if (!auth?.docketNumber || auth.disableDate) continue;
        authorities.push({
          docket: String(auth.docketNumber),
          type: auth.operatingAuthorityType?.operatingAuthorityType ?? "",
          status: auth.operatingAuthorityStatus?.operatingAuthorityStatusName ?? null,
        });
      }
    }

    // Company-level contacts (Motus rarely puts phone/email on officers).
    const companyPhones = (body.phoneNumbers ?? [])
      .map((row) => blank(row?.phoneNumber))
      .filter(Boolean);
    const companyEmails = (body.emailAddresses ?? [])
      .map((row) => blank(row?.emailAddress)?.toLowerCase() ?? null)
      .filter(Boolean);

    await client.query("BEGIN");
    await client.query(`DELETE FROM carrier_officers WHERE dot_number = $1`, [dot]);
    await client.query(`DELETE FROM motus_authorities WHERE dot_number = $1`, [dot]);
    let bestPhone = companyPhones[0] || null;
    let bestEmail = companyEmails[0] || null;
    for (const officer of officers) {
      const phone = blank(officer.phoneNumber);
      const email = blank(officer.email)?.toLowerCase() ?? null;
      if (!bestPhone && phone) bestPhone = phone;
      if (!bestEmail && email) bestEmail = email;
      const key =
        officer.entityOfficerId ||
        [officer.firstName, officer.lastName, officer.title, officer.email].filter(Boolean).join("|");
      if (!key) continue;
      await client.query(
        `INSERT INTO carrier_officers (
           dot_number, officer_key, first_name, middle_name, last_name, suffix, title, phone, email
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (dot_number, officer_key) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           middle_name = EXCLUDED.middle_name,
           last_name = EXCLUDED.last_name,
           suffix = EXCLUDED.suffix,
           title = EXCLUDED.title,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email`,
        [
          dot,
          key,
          blank(officer.firstName),
          blank(officer.middleName),
          blank(officer.lastName),
          blank(officer.suffix),
          blank(officer.title),
          phone,
          email,
        ],
      );
    }
    for (const auth of authorities) {
      await client.query(
        `INSERT INTO motus_authorities (dot_number, docket_number, authority_type, status)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (dot_number, docket_number, authority_type) DO UPDATE SET status = EXCLUDED.status`,
        [dot, auth.docket, auth.type, auth.status],
      );
    }
    await client.query(
      `UPDATE carriers SET
         phone = COALESCE(nullif(trim(phone),''), $2),
         phone_digits = COALESCE(nullif(phone_digits,''), regexp_replace(COALESCE($2,''), '\\D', '', 'g')),
         email = COALESCE(nullif(trim(email),''), $3),
         motus_officers_at = now(),
         motus_authorities_at = now(),
         updated_at = now()
       WHERE dot_number = $1`,
      [dot, bestPhone, bestEmail],
    );
    await client.query("COMMIT");
    return bestPhone || bestEmail ? "enriched" : "empty";
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    return `err:${error instanceof Error ? error.message.slice(0, 80) : "unknown"}`;
  } finally {
    client.release();
  }
}

const listClient = await pool.connect();
let rows;
try {
  // Listing gaps can scan a large table; keep this timeout separate from per-DOT work.
  await listClient.query("SET statement_timeout = '120s'");
  const listed = await listClient.query(
    `SELECT dot_number
     FROM carriers
     WHERE authority_status = 'Active'
       AND (phone IS NULL OR btrim(phone) = '')
       AND (email IS NULL OR btrim(email) = '')
     ORDER BY dot_number
     LIMIT $1`,
    [limit],
  );
  rows = listed.rows;
} finally {
  listClient.release();
}

console.log(`enriching ${rows.length} active carriers missing phone+email (concurrency=${concurrency})`);
let i = 0;
const counts = { enriched: 0, empty: 0, fresh: 0, err: 0, http_403: 0, other: 0 };
const heartbeatPath = process.env.MOTUS_ENRICH_HEARTBEAT || "/var/run/carrier-motus-enrich.status";
function writeHeartbeat(done, total) {
  try {
    fs.writeFileSync(
      heartbeatPath,
      JSON.stringify({ at: new Date().toISOString(), done, total, remaining: Math.max(0, total - done), counts }, null, 0) + "\n",
    );
  } catch {
    /* ignore */
  }
}
writeHeartbeat(0, rows.length);

async function worker() {
  while (i < rows.length) {
    const idx = i++;
    const dot = rows[idx].dot_number;
    const result = await enrichDot(dot);
    if (result === "enriched") counts.enriched++;
    else if (result === "empty") counts.empty++;
    else if (result === "fresh") counts.fresh++;
    else if (result === "http_403" || result === "http_429") counts.http_403++;
    else if (String(result).startsWith("err") || String(result).startsWith("http")) counts.err++;
    else counts.other++;
    if ((idx + 1) % 50 === 0 || idx + 1 === rows.length) {
      console.log(`progress ${idx + 1}/${rows.length}`, counts);
      writeHeartbeat(idx + 1, rows.length);
    }
    await new Promise((r) => setTimeout(r, 40));
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
await pool.end();
writeHeartbeat(rows.length, rows.length);
releaseLock();
console.log("done", counts);
process.exitCode = counts.err > rows.length * 0.5 ? 1 : 0;
