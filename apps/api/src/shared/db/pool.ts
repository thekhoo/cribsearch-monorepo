import { Pool } from "pg";
import { resolvePostgresUrl } from "../config/ssm";

let pool: Pool | null = null;

export const getPool = async (): Promise<Pool> => {
  if (pool) return pool;
  pool = new Pool({ connectionString: await resolvePostgresUrl(), max: 3 });
  return pool;
};

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
