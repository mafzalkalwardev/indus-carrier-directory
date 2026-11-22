import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pool?: Pool };

export function getPool() {
  if (!globalForPg.pool) {
    globalForPg.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Shared Postgres on VPS — keep low to avoid exhausting max_connections (80).
      max: Number(process.env.PG_POOL_MAX || 8),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 15_000,
      query_timeout: 15_000,
      idle_in_transaction_session_timeout: 20_000,
    });
  }
  return globalForPg.pool;
}

export async function query<T extends Record<string, unknown>>(text: string, params: unknown[] = []) {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}
