import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pool?: Pool };

export function getPool() {
  if (!globalForPg.pool) {
    globalForPg.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return globalForPg.pool;
}

export async function query<T extends Record<string, unknown>>(text: string, params: unknown[] = []) {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}
